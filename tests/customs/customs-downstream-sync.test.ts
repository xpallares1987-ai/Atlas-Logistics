/**
 * @file customs-downstream-sync.test.ts
 * @description Integration tests for Customs Authority Gateway Downstream Synchronization (ADR 0038 / ADR 0039).
 * Validates encrypted PKCS#12 certificate storage, autonomous Control Tower incident injection on Orange/Red channels,
 * and automatic incident resolution upon Green channel release.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../src/db/index.js";
import {
  companies,
  addresses,
  shipments,
  customsClearances,
  customsClearanceShipments,
  customsPkiCertificates,
  customsFilingTransmissions,
  controlTowerIncidents,
} from "../../src/db/schema/index.js";
import { customsGatewayService } from "../../src/services/customs-gateway.service.js";
import { eq, and, inArray } from "drizzle-orm";

describe("Customs Gateway Downstream Synchronization (ADR 0038 / ADR 0039)", () => {
  const tenantId = "tenant-downstream-test";
  const testCompanyId = "comp_test_downstream_01";
  const testAddressId = "addr_test_downstream_01";
  const testShipmentId = `sh_downstream_${uuidv4().slice(0, 8)}`;
  const testClearanceId = `clr_downstream_${uuidv4().slice(0, 8)}`;
  const testClearanceNumber = `CLR-2026-RED-SYNC`;
  const testCertAlias = `AEAT_DOWNSTREAM_TEST_${uuidv4().slice(0, 8)}`;
  const testCertThumbprint = `A1B2C3D4E5F6${uuidv4().replace(/-/g, "").toUpperCase().slice(0, 52)}`;

  beforeAll(async () => {
    const now = new Date();

    // 0. Clean any lingering certificates for safety
    await db
      .delete(customsPkiCertificates)
      .where(eq(customsPkiCertificates.tenantId, tenantId));

    // 1. Seed Company & Declarant Address
    await db
      .insert(companies)
      .values({
        id: testCompanyId,
        name: "Test Importer Downstream Inc",
        taxId: "ESB99112233",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    await db
      .insert(addresses)
      .values({
        id: testAddressId,
        companyId: testCompanyId,
        companyName: "Test Declarant Forwarder",
        addressType: "CBA",
        taxId: "ESA44556677",
        street1: "Muelle Adosado 12",
        city: "Valencia",
        country: "ES",
        zipCode: "46024",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // 2. Seed Shipment
    await db
      .insert(shipments)
      .values({
        id: testShipmentId,
        trackingNumber: `SH-2026-DOWNSTREAM`,
        companyId: testCompanyId,
        status: "CUSTOMS_HOLD",
        origin: "SGSIN",
        destination: "ESVLC",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // 3. Seed Customs Clearance linked to shipment
    await db
      .insert(customsClearances)
      .values({
        id: testClearanceId,
        tenantId,
        clearanceNumber: testClearanceNumber,
        mrn: "26ES-PENDING-DOWNSTREAM-01",
        procedureType: "IMPORT_4000",
        status: "DRAFT",
        importerCompanyId: testCompanyId,
        declarantAddressId: testAddressId,
        customsOfficeCode: "ES460001",
        taricCode: "8504400000",
        goodsDescription: "Static power converters",
        originCountryCode: "SG",
        grossMassKg: 2450.0,
        netMassKg: 2200.0,
        customsValueEur: 120000.0,
        assessedDutyAmountEur: 2400.0,
        assessedVatAmountEur: 25200.0,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      })
      .onConflictDoNothing();

    await db
      .insert(customsClearanceShipments)
      .values({
        id: `cs_${Date.now()}`,
        clearanceId: testClearanceId,
        shipmentId: testShipmentId,
        allocatedNetMassKg: 2200.0,
      })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await db
      .delete(customsPkiCertificates)
      .where(eq(customsPkiCertificates.tenantId, tenantId));

    await db
      .delete(controlTowerIncidents)
      .where(eq(controlTowerIncidents.shipmentId, testShipmentId));

    await db
      .delete(customsFilingTransmissions)
      .where(eq(customsFilingTransmissions.clearanceId, testClearanceId));

    await db
      .delete(customsClearances)
      .where(eq(customsClearances.id, testClearanceId));

    await db.delete(shipments).where(eq(shipments.id, testShipmentId));
  });

  it("registers a digital certificate with encrypted PKCS#12 payload in vault", async () => {
    const rawBuffer = Buffer.from(
      "DUMMY_PKCS12_SECRET_PRIVATE_KEY_MATERIAL",
      "utf8",
    );
    const cert = await customsGatewayService.registerCertificate({
      tenantId,
      agency: "AEAT",
      certificateAlias: testCertAlias,
      thumbprintSha256: testCertThumbprint,
      issuerDn: "CN=AC FNMT Usuarios, OU=Ceres, O=FNMT, C=ES",
      subjectDn: "CN=DECLARANT TEST SA - A44556677, C=ES",
      validFrom: "2026-01-01T00:00:00Z",
      validUntil: "2028-01-01T23:59:59Z",
      pkcs12Buffer: rawBuffer,
    });

    expect(cert.id).toBeDefined();
    expect(cert.encryptedPkcs12Blob).toBeDefined();
    expect(cert.ivHex).toHaveLength(24);
    expect(cert.authTagHex).toHaveLength(32);
    expect(cert.encryptedPkcs12Blob).not.toContain("SECRET_PRIVATE_KEY");
  });

  it("submits clearance with simulated Red channel, injecting a Control Tower incident", async () => {
    // Clearance has -RED in clearanceNumber, triggering simulated Circuit Red
    const tx = await customsGatewayService.submitDeclaration({
      tenantId,
      clearanceId: testClearanceId,
      agency: "AEAT",
      simulateImmediateAck: true,
    });

    expect(tx.responseStatus).toBe("INSPECTION_RED");

    // 1. Verify clearance record updated
    const [updatedClr] = await db
      .select()
      .from(customsClearances)
      .where(eq(customsClearances.id, testClearanceId));

    expect(updatedClr.status).toBe("ROUTED");
    expect(updatedClr.routingChannel).toBe("RED");

    // 2. Verify Control Tower incident automatically created
    const incidents = await db
      .select()
      .from(controlTowerIncidents)
      .where(
        and(
          eq(controlTowerIncidents.shipmentId, testShipmentId),
          eq(controlTowerIncidents.incidentType, "CUSTOMS_HOLD"),
        ),
      );

    expect(incidents.length).toBeGreaterThanOrEqual(1);
    const incident = incidents[0];
    expect(incident.status).toBe("OPEN");
    expect(incident.severity).toBe("CRITICAL");
    expect(incident.title).toContain("Circuit Red");
  });

  it("automatically resolves the Control Tower incident when clearance receives Green channel", async () => {
    // Process a Green CUSRES payload to simulate authority granting Levante
    const simulatedGreenXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:aeat="https://www.agenciatributaria.gob.es/DUAv1">
  <soapenv:Body>
    <aeat:RespuestaDUA>
      <aeat:FilingReference>TX-AEAT-RESOLVE-01</aeat:FilingReference>
      <aeat:MRN>26ES08001234567890</aeat:MRN>
      <aeat:Circuito>VERDE</aeat:Circuito>
      <aeat:FechaLevante>${new Date().toISOString()}</aeat:FechaLevante>
      <aeat:Observaciones>LEVANTE CONCEDIDO TRAS RECONOCIMIENTO CONFORME</aeat:Observaciones>
    </aeat:RespuestaDUA>
  </soapenv:Body>
</soapenv:Envelope>`;

    // Get the latest transmission
    const [latestTx] = await customsGatewayService.listTransmissions({
      tenantId,
      clearanceId: testClearanceId,
      limit: 1,
    });

    await customsGatewayService.processCusresWebhook(
      latestTx.id,
      simulatedGreenXml,
      tenantId,
    );

    // 1. Verify clearance status is LEVANTE_RELEASED
    const [updatedClr] = await db
      .select()
      .from(customsClearances)
      .where(eq(customsClearances.id, testClearanceId));

    expect(updatedClr.status).toBe("LEVANTE_RELEASED");
    expect(updatedClr.routingChannel).toBe("GREEN");
    expect(updatedClr.mrn).toBe("26ES08001234567890");

    // 2. Verify Control Tower incident is now RESOLVED
    const [resolvedIncident] = await db
      .select()
      .from(controlTowerIncidents)
      .where(
        and(
          eq(controlTowerIncidents.shipmentId, testShipmentId),
          eq(controlTowerIncidents.incidentType, "CUSTOMS_HOLD"),
        ),
      );

    expect(resolvedIncident.status).toBe("RESOLVED");
    expect(resolvedIncident.resolutionAction).toContain(
      "Auto-resolved upon customs green channel release",
    );
    expect(resolvedIncident.resolvedAt).toBeDefined();
  });
});
