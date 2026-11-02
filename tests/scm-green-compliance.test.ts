import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import scmV1Routes from "../src/routes/scm-v1.routes.js";
import { ensureOperationalBffTables } from "../src/scm/kernel/operational-bff-tables.js";
import {
  ensureScmFoundationTables,
  outboxBus,
} from "../src/scm/kernel/outbox-bus.js";
import {
  createOperationalShipment,
  createInitialRoutePlan,
} from "../src/scm/contexts/operational-core/operational-core.context.js";
import {
  createAndSubmitCustomsCase,
  placeCustomsInspectionHold,
  clearCustomsHoldAndRelease,
} from "../src/scm/contexts/trade-consolidation/trade-consolidation.context.js";
import { listOperationalExceptionsForShipment } from "../src/scm/contexts/operational-intelligence/operational-exceptions.context.js";
import { computeShipmentGreenCompliance } from "../src/scm/contexts/operational-intelligence/green-compliance.projector.js";

describe("SCM Green Compliance, EU CBAM and Customs DUA Integration Suite", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(scmV1Routes, { prefix: "/api/scm/v1" });
    await app.ready();
    await ensureOperationalBffTables();
    await ensureScmFoundationTables();
  });

  afterAll(async () => {
    await app.close();
  });

  it("calculates unified GLEC Scope 3, CBAM liability and Customs DUA model", async () => {
    const ref = `SHP-GREEN-${Date.now()}`;

    // 1. Create shipment with multimodal maritime corridor
    const shipment = await createOperationalShipment({
      shipmentReference: ref,
      serviceType: "OCEAN_FCL",
      customerPartyId: "pty_global_importer",
    });

    await createInitialRoutePlan({
      shipmentId: shipment.shipmentId,
      stops: [
        { sequence: 1, locationId: "ESVLC", stopType: "PORT" },
        { sequence: 2, locationId: "USNYC", stopType: "PORT" },
      ],
      legs: [
        {
          sequence: 1,
          originLocationId: "ESVLC",
          destinationLocationId: "USNYC",
          transportMode: "OCEAN",
          plannedDeparture: "2026-12-01T10:00:00Z",
          plannedArrival: "2026-12-14T20:00:00Z",
        },
      ],
    });

    await outboxBus.relayPendingEvents();

    // 2. Direct projector computation
    const compliance = await computeShipmentGreenCompliance(
      shipment.shipmentId,
    );

    // GLEC Scope 3 Verifications
    expect(compliance.shipmentId).toBe(shipment.shipmentId);
    expect(compliance.glec.totalTco2eWtw).toBeGreaterThan(1.0);
    expect(compliance.glec.totalTco2eTtw).toBeGreaterThan(0.5);
    expect(compliance.glec.totalTco2eWtt).toBeGreaterThan(0.1);
    expect(compliance.glec.carbonIntensityGco2ePerTkm).toBeGreaterThan(5.0);
    expect(compliance.glec.methodology).toContain("ISO 14083");
    expect(
      compliance.glec.offsetRecommendation.creditsNeededTons,
    ).toBeGreaterThanOrEqual(1);
    expect(compliance.glec.offsetRecommendation.pricePerTonEur).toBe(25);

    // CBAM Verifications
    expect(compliance.cbam.isApplicable).toBe(true);
    expect(compliance.cbam.totalEmbeddedEmissionsTco2e).toBeGreaterThan(10);
    expect(compliance.cbam.estimatedCbamLiabilityEur).toBeGreaterThan(1000);
    expect(compliance.cbam.euEtsBenchmarkPriceEur).toBe(85.5);
    expect(compliance.cbam.reportingPeriod).toBe("2026-Q4");

    // Customs DUA initial status
    expect(compliance.customs.channel).toBe("GREEN");
    expect(compliance.customs.mrnNumber).toContain("ES");
    expect(compliance.customs.hasActiveHold).toBe(false);

    // 3. REST endpoint verification
    const res = await app.inject({
      method: "GET",
      url: `/api/scm/v1/operational/shipments/${shipment.shipmentId}/green-compliance`,
      headers: {
        "x-user-id": "usr_compliance_officer",
        "x-organization-id": "org_atlas_compliance",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.glec.certificateNumber).toBeDefined();
    expect(body.cbam.estimatedCbamLiabilityEur).toBe(
      compliance.cbam.estimatedCbamLiabilityEur,
    );
  });

  it("streams official binary PDFs and XML registry documents with high integrity", async () => {
    const ref = `SHP-DOCS-${Date.now()}`;
    const shipment = await createOperationalShipment({
      shipmentReference: ref,
      serviceType: "OCEAN_FCL",
      customerPartyId: "pty_global_importer",
    });

    const headers = {
      "x-user-id": "usr_compliance_officer",
      "x-organization-id": "org_atlas_compliance",
    };

    // 1. Scope 3 Carbon Certificate PDF
    const certRes = await app.inject({
      method: "GET",
      url: `/api/scm/v1/operational/shipments/${shipment.shipmentId}/carbon-certificate`,
      headers,
    });
    expect(certRes.statusCode).toBe(200);
    expect(certRes.headers["content-type"]).toBe("application/pdf");
    expect(certRes.rawPayload.subarray(0, 5).toString()).toBe("%PDF-");
    expect(certRes.rawPayload.length).toBeGreaterThan(1000);

    // 2. CBAM Declaration Report PDF
    const cbamPdfRes = await app.inject({
      method: "GET",
      url: `/api/scm/v1/operational/shipments/${shipment.shipmentId}/cbam-report`,
      headers,
    });
    expect(cbamPdfRes.statusCode).toBe(200);
    expect(cbamPdfRes.headers["content-type"]).toBe("application/pdf");
    expect(cbamPdfRes.rawPayload.subarray(0, 5).toString()).toBe("%PDF-");

    // 3. CBAM Registry XML
    const cbamXmlRes = await app.inject({
      method: "GET",
      url: `/api/scm/v1/operational/shipments/${shipment.shipmentId}/cbam-xml`,
      headers,
    });
    expect(cbamXmlRes.statusCode).toBe(200);
    expect(cbamXmlRes.headers["content-type"]).toContain("application/xml");
    const cbamXml = cbamXmlRes.payload;
    expect(cbamXml).toContain("<CBAMQuarterlyReport");
    expect(cbamXml).toContain("72083800");
    expect(cbamXml).toContain("</CBAMQuarterlyReport>");
    expect(cbamXml).toContain("<TotalNetMassTonnes>24.5</TotalNetMassTonnes>");

    // 4. Customs DUA Clearance PDF
    const duaPdfRes = await app.inject({
      method: "GET",
      url: `/api/scm/v1/operational/shipments/${shipment.shipmentId}/dua-pdf`,
      headers,
    });
    expect(duaPdfRes.statusCode).toBe(200);
    expect(duaPdfRes.headers["content-type"]).toBe("application/pdf");
    expect(duaPdfRes.rawPayload.subarray(0, 5).toString()).toBe("%PDF-");

    // 5. Customs DUA AEAT XML
    const duaXmlRes = await app.inject({
      method: "GET",
      url: `/api/scm/v1/operational/shipments/${shipment.shipmentId}/dua-xml`,
      headers,
    });
    expect(duaXmlRes.statusCode).toBe(200);
    expect(duaXmlRes.headers["content-type"]).toContain("application/xml");
    const duaXml = duaXmlRes.payload;
    expect(duaXml).toContain("<DeclaracionAduaneraDUA");
    expect(duaXml).toContain("</DeclaracionAduaneraDUA>");
    expect(duaXml).toContain("<TipoPorcentaje>4.00%</TipoPorcentaje>");
    expect(duaXml).toContain("<TipoPorcentaje>21.00%</TipoPorcentaje>");
    expect(duaXml).not.toContain("400.00%");
    expect(duaXml).not.toContain("2100.00%");
  });

  it("manages bidirectional customs inspection holds and operational gating exceptions", async () => {
    const ref = `SHP-CUSTOMS-HOLD-${Date.now()}`;
    const shipment = await createOperationalShipment({
      shipmentReference: ref,
      serviceType: "OCEAN_FCL",
      customerPartyId: "pty_global_importer",
    });

    await createInitialRoutePlan({
      shipmentId: shipment.shipmentId,
      stops: [
        { sequence: 1, locationId: "ESVLC", stopType: "PORT" },
        { sequence: 2, locationId: "USNYC", stopType: "PORT" },
      ],
      legs: [
        {
          sequence: 1,
          originLocationId: "ESVLC",
          destinationLocationId: "USNYC",
          transportMode: "OCEAN",
          plannedDeparture: "2026-12-01T10:00:00Z",
          plannedArrival: "2026-12-14T20:00:00Z",
        },
      ],
    });

    await outboxBus.relayPendingEvents();

    // 1. Submit customs clearance case
    const customsCase = await createAndSubmitCustomsCase({
      shipmentId: shipment.shipmentId,
      procedureType: "IMPORT_CLEARANCE",
      jurisdictionCountry: "ES",
      customsOfficeLocode: "ESVLC",
      declarantEoriOrTaxId: "ESA99482103",
      tariffItems: [
        {
          hsCode: "72083800",
          goodsDescription: "Bobinas de acero laminado en caliente",
          countryOfOrigin: "CN",
          statisticalValueEur: 45000,
          dutyRatePercent: 2.5,
          vatRatePercent: 21,
        },
      ],
    });

    expect(customsCase.customsCaseId).toBeDefined();

    // 2. Customs authority issues Canal Rojo (Physical Inspection Hold)
    const heldCase = await placeCustomsInspectionHold({
      customsCaseId: customsCase.customsCaseId,
      channel: "RED_PHYSICAL_INSPECTION",
      reasonCode: "PHYSICAL_SCAN_SUSPICION",
      authorityNotes:
        "Discrepancia de densidad en escáner de contenedor. Inspección física requerida.",
    });

    expect(heldCase.state).toBe("UNDER_INSPECTION_HOLD");
    expect(heldCase.channelAssigned).toBe("RED_PHYSICAL_INSPECTION");
    expect(heldCase.openHoldsCount).toBe(1);

    // 3. Verify that an operational blocking exception was automatically raised
    const exceptions = await listOperationalExceptionsForShipment(
      shipment.shipmentId,
    );
    expect(exceptions.length).toBeGreaterThan(0);
    const activeEx = exceptions.find((e) => e.status === "OPEN");
    expect(activeEx).toBeDefined();
    expect(activeEx?.isBlocking).toBe(true);
    expect(activeEx?.severity).toBe("CRITICAL");
    expect(activeEx?.title).toContain("Retención Aduanera");

    // Verify projection reflects the hold
    const complianceWithHold = await computeShipmentGreenCompliance(
      shipment.shipmentId,
    );
    expect(complianceWithHold.customs.hasActiveHold).toBe(true);
    expect(complianceWithHold.customs.channel).toBe("RED");

    // 4. Clear customs hold and release cargo (Levante)
    const releasedCase = await clearCustomsHoldAndRelease({
      customsCaseId: customsCase.customsCaseId,
      clearOpenHolds: true,
      resolutionNotes:
        "Inspección física completada sin hallazgos anómalos. Levante de mercancías concedido.",
    });

    expect(releasedCase.state).toBe("RELEASED");
    expect(releasedCase.openHoldsCount).toBe(0);

    // 5. Verify the operational exception was automatically resolved
    const updatedExceptions = await listOperationalExceptionsForShipment(
      shipment.shipmentId,
    );
    const openEx = updatedExceptions.find((e) => e.status === "OPEN");
    expect(openEx).toBeUndefined();

    const resolvedEx = updatedExceptions.find((e) => e.status === "RESOLVED");
    expect(resolvedEx).toBeDefined();
    expect(resolvedEx?.resolutionNotes).toContain(
      "Inspección física completada",
    );

    // Verify projection reflects clearance
    const complianceReleased = await computeShipmentGreenCompliance(
      shipment.shipmentId,
    );
    expect(complianceReleased.customs.hasActiveHold).toBe(false);
  });
});
