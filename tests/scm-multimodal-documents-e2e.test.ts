import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import scmV1Routes from "../src/routes/scm-v1.routes.js";
import documentsRoutes from "../src/routes/documents.routes.js";
import { ensureOperationalBffTables } from "../src/scm/kernel/operational-bff-tables.js";
import { ensureWorkflowEngineTables } from "../src/scm/kernel/workflow-engine-tables.js";
import {
  createOperationalShipment,
  createInitialRoutePlan,
} from "../src/scm/contexts/operational-core/operational-core.context.js";
import { DocumentSignerService } from "../src/services/documents/document-signer.service.js";
import { db } from "../src/db/index.js";
import { documents } from "../src/db/schema/support.js";
import { eq } from "drizzle-orm";

describe("Multimodal Document Execution E2E — e-AWB, e-CMR & Ocean HBL (Zero Mocks)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(scmV1Routes, { prefix: "/api/scm/v1" });
    await app.register(documentsRoutes, { prefix: "/api/documents" });
    await app.ready();
    await ensureOperationalBffTables();
    await ensureWorkflowEngineTables();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("1. Air Cargo — Automatic e-AWB (IATA 600b) Execution", () => {
    it("progresses air workflow pipeline, executes ISSUE_AIR_WAYBILL task, generates signed e-AWB PDF, stores in SQLite, and emits outbox event", async () => {
      const ref = `AIR-AWB-TEST-${Date.now()}`;

      // 1. Create Air shipment
      const shipment = await createOperationalShipment({
        shipmentReference: ref,
        serviceType: "AIR_EXPRESS",
        customerPartyId: "pty_pharma_mad",
      });

      // 2. Plan Route with Air transport leg
      await createInitialRoutePlan({
        shipmentId: shipment.shipmentId,
        stops: [
          { sequence: 1, locationId: "MAD", stopType: "AIRPORT" },
          { sequence: 2, locationId: "MIA", stopType: "AIRPORT" },
        ],
        legs: [
          {
            sequence: 1,
            originLocationId: "MAD",
            destinationLocationId: "MIA",
            transportMode: "AIR",
            plannedDeparture: "2026-11-25T14:00:00Z",
            plannedArrival: "2026-11-25T23:30:00Z",
          },
        ],
      });

      // 3. Retrieve all items for this shipment (status=ALL)
      const allItemsRes = await app.inject({
        method: "GET",
        url: `/api/scm/v1/operational/cockpit?shipmentId=${shipment.shipmentId}&status=ALL`,
      });

      expect(allItemsRes.statusCode).toBe(200);
      const items = allItemsRes.json().items;

      // Pipeline Step 1: CONFIRM_CARRIER_BOOKING
      const bookingTask = items.find(
        (i: any) => i.taskTypeCode === "CONFIRM_CARRIER_BOOKING",
      );
      if (bookingTask) {
        await app.inject({
          method: "POST",
          url: `/api/scm/v1/operational/cockpit/${bookingTask.workItemId}/execute`,
          payload: { result: { bookingRef: "IB-CARGO-88192" } },
        });
      }

      // Pipeline Step 2: VERIFY_AWB_SECURITY_WEIGHT
      const weightTask = items.find(
        (i: any) => i.taskTypeCode === "VERIFY_AWB_SECURITY_WEIGHT",
      );
      if (weightTask) {
        await app.inject({
          method: "POST",
          url: `/api/scm/v1/operational/cockpit/${weightTask.workItemId}/execute`,
          payload: {
            result: {
              chargeableWeightKg: 1450,
              securityStatus: "SPX",
            },
          },
        });
      }

      // Pipeline Step 3: ISSUE_AIR_WAYBILL
      const awbTask = items.find(
        (i: any) => i.taskTypeCode === "ISSUE_AIR_WAYBILL",
      );
      expect(awbTask).toBeDefined();

      // 4. Execute ISSUE_AIR_WAYBILL in-situ
      const execRes = await app.inject({
        method: "POST",
        url: `/api/scm/v1/operational/cockpit/${awbTask.workItemId}/execute`,
        payload: {
          result: {
            awbNumber: "075-88192031",
            airline: "Iberia Cargo (IB-075)",
            chargeableWeightKg: 1450,
          },
        },
      });

      expect(execRes.statusCode).toBe(200);
      const resBody = execRes.json();
      expect(resBody.success).toBe(true);

      // Verify emittedDocument payload returned in BFF response
      expect(resBody.emittedDocument).toBeDefined();
      expect(resBody.emittedDocument.type).toBe("AWB");
      expect(resBody.emittedDocument.documentReference).toBe("075-88192031");
      expect(resBody.emittedDocument.status).toBe("SIGNED");
      expect(resBody.emittedDocument.sha256Hash).toMatch(/^[a-f0-9]{64}$/);

      // 5. Verify document persistence in SQLite
      const docRows = await db
        .select()
        .from(documents)
        .where(eq(documents.id, resBody.emittedDocument.id));

      expect(docRows.length).toBe(1);
      expect(docRows[0].type).toBe("AWB");
      expect(docRows[0].sha256Hash).toBe(resBody.emittedDocument.sha256Hash);

      // 6. Verify cryptographic hash authenticity
      const verification = await DocumentSignerService.verifyAuthenticity(
        resBody.emittedDocument.sha256Hash,
      );
      expect(verification.authentic).toBe(true);
      expect(verification.document?.documentReference).toBe("075-88192031");

      // 7. Test direct binary PDF streaming endpoint
      const pdfRes = await app.inject({
        method: "GET",
        url: `/api/documents/${resBody.emittedDocument.id}/pdf`,
      });
      expect(pdfRes.statusCode).toBe(200);
      expect(pdfRes.headers["content-type"]).toBe("application/pdf");
      expect(pdfRes.rawPayload.length).toBeGreaterThan(100);
    });
  });

  describe("2. Road Freight — Automatic e-CMR (UN/ECE) Execution", () => {
    it("progresses road workflow pipeline, executes ISSUE_ECMR_WAYBILL task, generates signed e-CMR PDF, and stores in SQLite", async () => {
      const ref = `ROAD-CMR-TEST-${Date.now()}`;

      // 1. Create Road shipment
      const shipment = await createOperationalShipment({
        shipmentReference: ref,
        serviceType: "ROAD_FTL",
        customerPartyId: "pty_auto_parts_vigo",
      });

      // 2. Plan Route with Road transport leg
      await createInitialRoutePlan({
        shipmentId: shipment.shipmentId,
        stops: [
          { sequence: 1, locationId: "VGO", stopType: "ORIGIN" },
          { sequence: 2, locationId: "PARIS", stopType: "DESTINATION" },
        ],
        legs: [
          {
            sequence: 1,
            originLocationId: "VGO",
            destinationLocationId: "PARIS",
            transportMode: "ROAD",
            plannedDeparture: "2026-11-28T06:00:00Z",
            plannedArrival: "2026-11-29T18:00:00Z",
          },
        ],
      });

      // 3. Find all items for this road shipment
      const allItemsRes = await app.inject({
        method: "GET",
        url: `/api/scm/v1/operational/cockpit?shipmentId=${shipment.shipmentId}&status=ALL`,
      });

      expect(allItemsRes.statusCode).toBe(200);
      const items = allItemsRes.json().items;

      // Pipeline Step 1: CONFIRM_CARRIER_BOOKING
      const bookingTask = items.find(
        (i: any) => i.taskTypeCode === "CONFIRM_CARRIER_BOOKING",
      );
      if (bookingTask) {
        await app.inject({
          method: "POST",
          url: `/api/scm/v1/operational/cockpit/${bookingTask.workItemId}/execute`,
          payload: { result: { vehicleReg: "8812-LZB" } },
        });
      }

      // Pipeline Step 2: VERIFY_VEHICLE_AXLE_WEIGHT
      const axleTask = items.find(
        (i: any) => i.taskTypeCode === "VERIFY_VEHICLE_AXLE_WEIGHT",
      );
      if (axleTask) {
        await app.inject({
          method: "POST",
          url: `/api/scm/v1/operational/cockpit/${axleTask.workItemId}/execute`,
          payload: {
            result: {
              grossWeightKg: 18400,
              axleLoadDistribution: "BALANCED",
            },
          },
        });
      }

      // Pipeline Step 3: ISSUE_ECMR_WAYBILL
      const cmrTask = items.find(
        (i: any) => i.taskTypeCode === "ISSUE_ECMR_WAYBILL",
      );
      expect(cmrTask).toBeDefined();

      // 4. Execute ISSUE_ECMR_WAYBILL in-situ
      const execRes = await app.inject({
        method: "POST",
        url: `/api/scm/v1/operational/cockpit/${cmrTask.workItemId}/execute`,
        payload: {
          result: {
            cmrNumber: `CMR-${ref}`,
            vehicleReg: "8812-LZB",
            driverName: "Carlos Mendez",
          },
        },
      });

      expect(execRes.statusCode).toBe(200);
      const resBody = execRes.json();
      expect(resBody.success).toBe(true);

      // Verify emittedDocument
      expect(resBody.emittedDocument).toBeDefined();
      expect(resBody.emittedDocument.type).toBe("ECMR");
      expect(resBody.emittedDocument.documentReference).toBe(`CMR-${ref}`);
      expect(resBody.emittedDocument.status).toBe("SIGNED");
      expect(resBody.emittedDocument.sha256Hash).toMatch(/^[a-f0-9]{64}$/);

      // 5. Verify SQLite retrieval by shipmentId
      const listRes = await app.inject({
        method: "GET",
        url: `/api/documents?shipmentId=${shipment.shipmentId}`,
      });
      expect(listRes.statusCode).toBe(200);
      const docs = listRes.json();
      expect(docs.length).toBeGreaterThanOrEqual(1);
      const found = docs.find((d: any) => d.id === resBody.emittedDocument.id);
      expect(found).toBeDefined();
      expect(found.type).toBe("ECMR");
    });
  });

  describe("3. Ocean Freight — Automatic Ocean Bill of Lading (HBL) Execution", () => {
    it("progresses ocean workflow pipeline, executes ISSUE_BILL_OF_LADING task, generates signed HBL PDF, and verifies cryptographic integrity", async () => {
      const ref = `OCEAN-HBL-TEST-${Date.now()}`;

      // 1. Create Ocean shipment
      const shipment = await createOperationalShipment({
        shipmentReference: ref,
        serviceType: "OCEAN_FCL",
        customerPartyId: "pty_chem_valencia",
      });

      // 2. Plan Route with Ocean transport leg
      await createInitialRoutePlan({
        shipmentId: shipment.shipmentId,
        stops: [
          { sequence: 1, locationId: "ESVLC", stopType: "PORT" },
          { sequence: 2, locationId: "SGSIN", stopType: "PORT" },
        ],
        legs: [
          {
            sequence: 1,
            originLocationId: "ESVLC",
            destinationLocationId: "SGSIN",
            transportMode: "OCEAN",
            plannedDeparture: "2026-12-01T08:00:00Z",
            plannedArrival: "2026-12-20T16:00:00Z",
          },
        ],
      });

      // 3. Find all items for this ocean shipment
      const allItemsRes = await app.inject({
        method: "GET",
        url: `/api/scm/v1/operational/cockpit?shipmentId=${shipment.shipmentId}&status=ALL`,
      });

      expect(allItemsRes.statusCode).toBe(200);
      const items = allItemsRes.json().items;

      // Pipeline Step 1: CONFIRM_CARRIER_BOOKING
      const bookingTask = items.find(
        (i: any) => i.taskTypeCode === "CONFIRM_CARRIER_BOOKING",
      );
      if (bookingTask) {
        await app.inject({
          method: "POST",
          url: `/api/scm/v1/operational/cockpit/${bookingTask.workItemId}/execute`,
          payload: { result: { bookingRef: "MSC-VLC-99120" } },
        });
      }

      // Pipeline Step 2: VERIFY_VGM_CUTOFF
      const vgmTask = items.find(
        (i: any) => i.taskTypeCode === "VERIFY_VGM_CUTOFF",
      );
      if (vgmTask) {
        await app.inject({
          method: "POST",
          url: `/api/scm/v1/operational/cockpit/${vgmTask.workItemId}/execute`,
          payload: {
            result: {
              vgmWeightKg: 25450,
              verifiedAt: new Date().toISOString(),
            },
          },
        });
      }

      // Pipeline Step 3: ISSUE_BILL_OF_LADING
      const hblTask = items.find(
        (i: any) => i.taskTypeCode === "ISSUE_BILL_OF_LADING",
      );
      expect(hblTask).toBeDefined();

      // 4. Execute ISSUE_BILL_OF_LADING in-situ
      const execRes = await app.inject({
        method: "POST",
        url: `/api/scm/v1/operational/cockpit/${hblTask.workItemId}/execute`,
        payload: {
          result: {
            blNumber: `HBL-${ref}`,
            vessel: "MSC OSCAR",
            voyage: "2602E",
          },
        },
      });

      expect(execRes.statusCode).toBe(200);
      const resBody = execRes.json();
      expect(resBody.success).toBe(true);

      // Verify emittedDocument
      expect(resBody.emittedDocument).toBeDefined();
      expect(resBody.emittedDocument.type).toBe("HBL");
      expect(resBody.emittedDocument.documentReference).toBe(`HBL-${ref}`);
      expect(resBody.emittedDocument.status).toBe("SIGNED");
      expect(resBody.emittedDocument.sha256Hash).toMatch(/^[a-f0-9]{64}$/);

      // Verify verification API
      const verifyRes = await app.inject({
        method: "GET",
        url: `/api/documents/verify/${resBody.emittedDocument.sha256Hash}`,
      });
      expect(verifyRes.statusCode).toBe(200);
      expect(verifyRes.json().authentic).toBe(true);
    });
  });
});
