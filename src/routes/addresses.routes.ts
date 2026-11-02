import { FastifyPluginAsync } from "fastify";
import { v4 as uuidv4 } from "uuid";
import { db, client } from "../db/index.js";
import {
  addresses,
  addressContacts,
  companies,
  AddressType,
  ContactRoleCategory,
} from "../db/schema/index.js";
import { eq, and, or, like, desc } from "drizzle-orm";
import {
  searchUnlocodes,
  formatAllBlBoxes,
  DEFAULT_UNLOCODE_HUBS,
} from "@atlas/shared";
import { getCurrentTenant } from "../lib/tenancy/tenancy-context.js";

/**
 * Clean & normalize string for fuzzy duplicate comparison
 */
function normalizeString(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
    .replace(/\b(s\.?l\.?|s\.?a\.?|ltd|llc|gmbh|inc|corp|co)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Trigram / Token Jaccard similarity between two normalized strings
 */
function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);

  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;

  const tokens1 = new Set(norm1.split(" "));
  const tokens2 = new Set(norm2.split(" "));

  let intersection = 0;
  for (const t of tokens1) {
    if (tokens2.has(t)) intersection++;
  }

  const union = new Set([...tokens1, ...tokens2]).size;
  return union === 0 ? 0 : intersection / union;
}

let tablesEnsured = false;
export async function ensureAddressesTables() {
  if (tablesEnsured) return;
  await client.execute(`CREATE TABLE IF NOT EXISTS addresses (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    address_type TEXT NOT NULL,
    company_name TEXT NOT NULL,
    trade_name TEXT,
    tax_id TEXT,
    street_1 TEXT NOT NULL,
    street_2 TEXT,
    zip_code TEXT NOT NULL,
    city TEXT NOT NULL,
    federal_state TEXT,
    country TEXT NOT NULL,
    un_locode TEXT,
    is_default_shipper INTEGER DEFAULT 0,
    is_default_consignee INTEGER DEFAULT 0,
    is_default_notify INTEGER DEFAULT 0,
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    metadata TEXT,
    tags TEXT
  );`);

  try {
    await client.execute(
      `ALTER TABLE addresses ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;`,
    );
  } catch {}
  try {
    await client.execute(
      `ALTER TABLE addresses ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;`,
    );
  } catch {}
  try {
    await client.execute(`ALTER TABLE addresses ADD COLUMN metadata TEXT;`);
  } catch {}
  try {
    await client.execute(`ALTER TABLE addresses ADD COLUMN tags TEXT;`);
  } catch {}

  await client.execute(`CREATE TABLE IF NOT EXISTS address_contacts (
    id TEXT PRIMARY KEY,
    address_id TEXT NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    mobile TEXT,
    role_category TEXT DEFAULT 'OPERATIONS',
    job_title TEXT,
    is_primary INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    metadata TEXT,
    tags TEXT
  );`);

  try {
    await client.execute(
      `ALTER TABLE address_contacts ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;`,
    );
  } catch {}
  try {
    await client.execute(
      `ALTER TABLE address_contacts ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;`,
    );
  } catch {}
  try {
    await client.execute(
      `ALTER TABLE address_contacts ADD COLUMN metadata TEXT;`,
    );
  } catch {}
  try {
    await client.execute(`ALTER TABLE address_contacts ADD COLUMN tags TEXT;`);
  } catch {}

  tablesEnsured = true;
}

const addressesRoutes: FastifyPluginAsync = async (fastify, opts) => {
  await ensureAddressesTables();

  // UN/LOCODE Lookup
  fastify.get("/unlocode-lookup", async (request, reply) => {
    try {
      const q = ((request.query as any)?.q || "").trim();
      if (!q) {
        return DEFAULT_UNLOCODE_HUBS.slice(0, 15);
      }
      const results = searchUnlocodes(q, undefined, 20);
      return results;
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // GET /api/addresses - List addresses with optional filters
  fastify.get("/", async (request, reply) => {
    try {
      const tenant = getCurrentTenant();
      const query = (request.query as any) || {};

      let tenantId = query.companyId || tenant?.organizationId;
      if (!tenantId) {
        const firstCompany = await db
          .select({ id: companies.id })
          .from(companies)
          .limit(1);
        tenantId = firstCompany[0]?.id || "c-1";
      }

      const conditions: any[] = [eq(addresses.companyId, tenantId)];

      if (query.type) {
        conditions.push(eq(addresses.addressType, query.type));
      }
      if (query.unLocode) {
        conditions.push(eq(addresses.unLocode, query.unLocode.toUpperCase()));
      }
      if (query.search) {
        const term = `%${query.search}%`;
        conditions.push(
          or(
            like(addresses.companyName, term),
            like(addresses.city, term),
            like(addresses.taxId, term),
            like(addresses.unLocode, term),
          ),
        );
      }

      const rows = await db
        .select()
        .from(addresses)
        .where(and(...conditions))
        .orderBy(desc(addresses.createdAt));

      // Fetch linked contacts for each address
      const results = await Promise.all(
        rows.map(async (addr) => {
          const contacts = await db
            .select()
            .from(addressContacts)
            .where(eq(addressContacts.addressId, addr.id));
          return {
            ...addr,
            contacts,
          };
        }),
      );

      return results;
    } catch (err: any) {
      fastify.log.error(err, "Failed to list addresses");
      return reply.code(500).send({ error: err.message });
    }
  });

  // POST /api/addresses - Create address with duplicate detection & contacts
  fastify.post("/", async (request, reply) => {
    try {
      const tenant = getCurrentTenant();
      const body = (request.body as any) || {};

      let tenantId = body.companyId || tenant?.organizationId;
      if (!tenantId) {
        const firstCompany = await db
          .select({ id: companies.id })
          .from(companies)
          .limit(1);
        tenantId = firstCompany[0]?.id || "c-1";
      }

      // Check existing tenant addresses for duplicate detection
      const existing = await db
        .select()
        .from(addresses)
        .where(eq(addresses.companyId, tenantId));

      let matchedDuplicate: any = null;
      let highestScore = 0;

      for (const item of existing) {
        // 1. Tax ID Exact match
        if (
          body.taxId &&
          item.taxId &&
          body.taxId.trim().toUpperCase() === item.taxId.trim().toUpperCase()
        ) {
          matchedDuplicate = item;
          highestScore = 1.0;
          break;
        }

        // 2. Fuzzy text similarity match
        const proposedCombined = `${body.companyName || ""} ${body.street1 || ""} ${body.city || ""}`;
        const existingCombined = `${item.companyName || ""} ${item.street1 || ""} ${item.city || ""}`;
        const score = calculateSimilarity(proposedCombined, existingCombined);

        if (score > highestScore) {
          highestScore = score;
          if (score >= 0.8) {
            matchedDuplicate = item;
          }
        }
      }

      // If duplicate detected and overrideWarning is NOT confirmed:
      if (highestScore >= 0.8 && matchedDuplicate && !body.overrideWarning) {
        return reply.code(409).send({
          duplicateWarning: true,
          message:
            "Se ha detectado una dirección similar registrada para esta empresa.",
          matchScore: Math.round(highestScore * 100) / 100,
          matchedAddress: {
            id: matchedDuplicate.id,
            companyName: matchedDuplicate.companyName,
            addressType: matchedDuplicate.addressType,
            street1: matchedDuplicate.street1,
            city: matchedDuplicate.city,
            unLocode: matchedDuplicate.unLocode,
            taxId: matchedDuplicate.taxId,
          },
        });
      }

      const addressId = body.id || `addr_${uuidv4().substring(0, 8)}`;
      const now = new Date();

      const inserted = await db
        .insert(addresses)
        .values({
          id: addressId,
          companyId: tenantId,
          addressType: body.addressType as AddressType,
          companyName: body.companyName,
          tradeName: body.tradeName || null,
          taxId: body.taxId ? body.taxId.trim().toUpperCase() : null,
          street1: body.street1,
          street2: body.street2 || null,
          zipCode: body.zipCode,
          city: body.city,
          federalState: body.federalState || null,
          country: body.country,
          unLocode: body.unLocode ? body.unLocode.trim().toUpperCase() : null,
          isDefaultShipper: Boolean(body.isDefaultShipper),
          isDefaultConsignee: Boolean(body.isDefaultConsignee),
          isDefaultNotify: Boolean(body.isDefaultNotify),
          notes: body.notes || null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const createdAddress = inserted[0];
      const createdContacts: any[] = [];

      if (Array.isArray(body.contacts) && body.contacts.length > 0) {
        for (const c of body.contacts) {
          const contactId = `ct_${uuidv4().substring(0, 8)}`;
          const insertedContact = await db
            .insert(addressContacts)
            .values({
              id: contactId,
              addressId: createdAddress.id,
              fullName: c.fullName,
              email: c.email,
              phone: c.phone || null,
              mobile: c.mobile || null,
              roleCategory: (c.roleCategory ||
                "OPERATIONS") as ContactRoleCategory,
              jobTitle: c.jobTitle || null,
              isPrimary: Boolean(c.isPrimary),
              createdAt: now,
              updatedAt: now,
            })
            .returning();
          createdContacts.push(insertedContact[0]);
        }
      }

      return reply.code(201).send({
        ...createdAddress,
        contacts: createdContacts,
      });
    } catch (err: any) {
      fastify.log.error(err, "Failed to create address");
      return reply.code(500).send({ error: err.message });
    }
  });

  // GET /api/addresses/:id - Get address with contacts and B/L format blocks
  fastify.get("/:id", async (request, reply) => {
    try {
      const { id } = request.params as any;
      const rows = await db
        .select()
        .from(addresses)
        .where(eq(addresses.id, id))
        .limit(1);

      if (rows.length === 0) {
        return reply.code(404).send({ error: "Address not found" });
      }

      const addr = rows[0];
      const contacts = await db
        .select()
        .from(addressContacts)
        .where(eq(addressContacts.addressId, id));

      const primaryContact = contacts.find((c) => c.isPrimary) || contacts[0];

      // Generate pre-rendered Maritime B/L party shape boxes
      const blBoxes = formatAllBlBoxes({
        shipper: {
          companyName: addr.companyName,
          tradeName: addr.tradeName || undefined,
          taxId: addr.taxId || undefined,
          street1: addr.street1,
          street2: addr.street2 || undefined,
          zipCode: addr.zipCode,
          city: addr.city,
          country: addr.country,
          unLocode: addr.unLocode || undefined,
        },
        shipperContact: primaryContact
          ? {
              fullName: primaryContact.fullName,
              email: primaryContact.email,
              phone: primaryContact.phone || undefined,
            }
          : undefined,
        consignee: {
          companyName: addr.companyName,
          tradeName: addr.tradeName || undefined,
          taxId: addr.taxId || undefined,
          street1: addr.street1,
          street2: addr.street2 || undefined,
          zipCode: addr.zipCode,
          city: addr.city,
          country: addr.country,
          unLocode: addr.unLocode || undefined,
        },
        notify: {
          companyName: addr.companyName,
          taxId: addr.taxId || undefined,
          street1: addr.street1,
          street2: addr.street2 || undefined,
          zipCode: addr.zipCode,
          city: addr.city,
          country: addr.country,
          unLocode: addr.unLocode || undefined,
        },
        notifyContact: primaryContact
          ? {
              fullName: primaryContact.fullName,
              email: primaryContact.email,
              phone: primaryContact.phone || undefined,
            }
          : undefined,
        agent: {
          companyName: addr.companyName,
          street1: addr.street1,
          zipCode: addr.zipCode,
          city: addr.city,
          country: addr.country,
          unLocode: addr.unLocode || undefined,
        },
        agentContact: primaryContact
          ? {
              fullName: primaryContact.fullName,
              phone: primaryContact.phone || undefined,
            }
          : undefined,
      });

      return {
        ...addr,
        contacts,
        blBoxes,
      };
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // PUT /api/addresses/:id - Update address & sync contacts
  fastify.put("/:id", async (request, reply) => {
    try {
      const { id } = request.params as any;
      const body = (request.body as any) || {};

      const updated = await db
        .update(addresses)
        .set({
          addressType: body.addressType,
          companyName: body.companyName,
          tradeName: body.tradeName || null,
          taxId: body.taxId ? body.taxId.trim().toUpperCase() : null,
          street1: body.street1,
          street2: body.street2 || null,
          zipCode: body.zipCode,
          city: body.city,
          federalState: body.federalState || null,
          country: body.country,
          unLocode: body.unLocode ? body.unLocode.trim().toUpperCase() : null,
          isDefaultShipper: Boolean(body.isDefaultShipper),
          isDefaultConsignee: Boolean(body.isDefaultConsignee),
          isDefaultNotify: Boolean(body.isDefaultNotify),
          notes: body.notes || null,
          updatedAt: new Date(),
        })
        .where(eq(addresses.id, id))
        .returning();

      if (updated.length === 0) {
        return reply.code(404).send({ error: "Address not found" });
      }

      // If contacts array provided, refresh contacts
      if (Array.isArray(body.contacts)) {
        await db
          .delete(addressContacts)
          .where(eq(addressContacts.addressId, id));
        for (const c of body.contacts) {
          await db.insert(addressContacts).values({
            id: c.id || `ct_${uuidv4().substring(0, 8)}`,
            addressId: id,
            fullName: c.fullName,
            email: c.email,
            phone: c.phone || null,
            mobile: c.mobile || null,
            roleCategory: c.roleCategory || "OPERATIONS",
            jobTitle: c.jobTitle || null,
            isPrimary: Boolean(c.isPrimary),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      const finalContacts = await db
        .select()
        .from(addressContacts)
        .where(eq(addressContacts.addressId, id));

      return {
        ...updated[0],
        contacts: finalContacts,
      };
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // DELETE /api/addresses/:id - Delete address and cascade contacts
  fastify.delete("/:id", async (request, reply) => {
    try {
      const { id } = request.params as any;

      // Delete contacts first
      await db.delete(addressContacts).where(eq(addressContacts.addressId, id));

      const deleted = await db
        .delete(addresses)
        .where(eq(addresses.id, id))
        .returning();

      if (deleted.length === 0) {
        return reply.code(404).send({ error: "Address not found" });
      }

      return {
        success: true,
        message: "Address and contacts successfully deleted",
        id,
      };
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });
};

export default addressesRoutes;
