import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import addressesRoutes, {
  ensureAddressesTables,
} from "../src/routes/addresses.routes.js";
import { db } from "../src/db/index.js";
import {
  companies,
  addresses,
  addressContacts,
} from "../src/db/schema/index.js";
import { eq } from "drizzle-orm";

describe("Addresses Hub & Entity Directory (Tenant-Scoped)", () => {
  let app: FastifyInstance;
  const testTenantId = "tenant_test_org_01";
  let createdAddressId: string;

  beforeAll(async () => {
    await ensureAddressesTables();

    // Seed test tenant company
    await db
      .insert(companies)
      .values({
        id: testTenantId,
        name: "Test Forwarding Corp",
        taxId: "ESB99887766",
      })
      .onConflictDoNothing();

    app = Fastify();
    await app.register(addressesRoutes, { prefix: "/api/addresses" });
    await app.ready();
  });

  afterAll(async () => {
    // Clean up test records
    await db.delete(addresses).where(eq(addresses.companyId, testTenantId));
    await db.delete(companies).where(eq(companies.id, testTenantId));
    await app.close();
  });

  it("resolves UN/LOCODE lookup via in-memory trie index", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/addresses/unlocode-lookup?q=ESBCN",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    const bcn = body.find((item: any) => item.location === "ESBCN");
    expect(bcn).toBeDefined();
    expect(bcn.name).toBe("Barcelona");
    expect(bcn.country).toBe("ES");
  });

  it("creates a new logistics address with multiple individual contacts", async () => {
    const payload = {
      companyId: testTenantId,
      addressType: "CARRIER_AGENT",
      companyName: "Mediterranean Shipping Agency S.L.",
      tradeName: "MSC Barcelona Agency",
      taxId: "ESB12345678",
      street1: "Moll de Ponent s/n, Terminal Port",
      street2: "Edificio MSC, Planta 2",
      zipCode: "08039",
      city: "Barcelona",
      country: "ES",
      unLocode: "ESBCN",
      notes: "Horario de recepción documental: 08:00 a 17:30",
      contacts: [
        {
          fullName: "Marc Vila",
          email: "m.vila@msc-agency.com",
          phone: "+34 934 001 002",
          roleCategory: "OPERATIONS",
          jobTitle: "Head of Maritime Operations",
          isPrimary: true,
        },
        {
          fullName: "Laura Gomez",
          email: "l.gomez@msc-agency.com",
          phone: "+34 934 001 003",
          roleCategory: "CUSTOMS",
          jobTitle: "Customs Clearance Specialist",
          isPrimary: false,
        },
      ],
    };

    const res = await app.inject({
      method: "POST",
      url: "/api/addresses",
      payload,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeDefined();
    expect(body.companyName).toBe("Mediterranean Shipping Agency S.L.");
    expect(body.addressType).toBe("CARRIER_AGENT");
    expect(body.unLocode).toBe("ESBCN");
    expect(body.contacts.length).toBe(2);
    expect(body.contacts[0].isPrimary).toBe(true);

    createdAddressId = body.id;
  });

  it("detects potential duplicate by Tax ID and returns 409 warning without saving", async () => {
    const duplicatePayload = {
      companyId: testTenantId,
      addressType: "CARRIER",
      companyName: "MSC Mediterranean Shipping Agency",
      street1: "Moll de Ponent",
      zipCode: "08039",
      city: "Barcelona",
      country: "ES",
      taxId: "ESB12345678", // Same Tax ID
    };

    const res = await app.inject({
      method: "POST",
      url: "/api/addresses",
      payload: duplicatePayload,
    });

    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.duplicateWarning).toBe(true);
    expect(body.matchScore).toBeGreaterThanOrEqual(0.8);
    expect(body.matchedAddress).toBeDefined();
    expect(body.matchedAddress.companyName).toBe(
      "Mediterranean Shipping Agency S.L.",
    );
  });

  it("overrides duplicate warning when user explicitly confirms overrideWarning: true", async () => {
    const duplicateOverridePayload = {
      companyId: testTenantId,
      addressType: "TERMINAL",
      companyName: "MSC Mediterranean Shipping Terminal 2",
      street1: "Moll de Ponent s/n",
      zipCode: "08039",
      city: "Barcelona",
      country: "ES",
      taxId: "ESB12345678", // Same Tax ID, legitimate separate terminal branch
      overrideWarning: true,
    };

    const res = await app.inject({
      method: "POST",
      url: "/api/addresses",
      payload: duplicateOverridePayload,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeDefined();
    expect(body.addressType).toBe("TERMINAL");
  });

  it("fetches single address with linked contacts and pre-formatted B/L party boxes", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/addresses/${createdAddressId}`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(createdAddressId);
    expect(body.contacts.length).toBe(2);

    // Verify B/L formatters
    expect(body.blBoxes).toBeDefined();
    expect(body.blBoxes.shipper.lines[0]).toBe(
      "MEDITERRANEAN SHIPPING AGENCY S.L.",
    );
    expect(body.blBoxes.consignee).toBeDefined();
    expect(body.blBoxes.notify).toBeDefined();
    expect(body.blBoxes.agent).toBeDefined();
    expect(body.blBoxes.agent.rawBlock).toContain("FOR DELIVERY APPLY TO:");
  });

  it("lists tenant addresses with role filter", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/addresses?companyId=${testTenantId}&type=CARRIER_AGENT`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(1);
    expect(body[0].addressType).toBe("CARRIER_AGENT");
  });

  it("cascades delete of address contacts upon address deletion", async () => {
    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/api/addresses/${createdAddressId}`,
    });

    expect(deleteRes.statusCode).toBe(200);

    // Verify address is removed
    const getRes = await app.inject({
      method: "GET",
      url: `/api/addresses/${createdAddressId}`,
    });
    expect(getRes.statusCode).toBe(404);

    // Verify contacts were cascade deleted
    const orphanedContacts = await db
      .select()
      .from(addressContacts)
      .where(eq(addressContacts.addressId, createdAddressId));
    expect(orphanedContacts.length).toBe(0);
  });
});
