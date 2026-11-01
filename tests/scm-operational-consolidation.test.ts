import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import scmV1Routes from "../src/routes/scm-v1.routes.js";
import { ensureOperationalBffTables } from "../src/scm/kernel/operational-bff-tables.js";
import {
  getShipment360View,
  executeCockpitWorkItem,
} from "../src/scm/contexts/operational-intelligence/operations-cockpit-bff.context.js";
import {
  createOperationalShipment,
  createInitialRoutePlan,
} from "../src/scm/contexts/operational-core/operational-core.context.js";
import { outboxBus } from "../src/scm/kernel/outbox-bus.js";
import { PDFService, HBLData } from "../src/services/pdf.service.js";

describe("SCM Operational Consolidation End-to-End Milestone", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(scmV1Routes, { prefix: "/api/scm/v1" });
    await app.ready();
    await ensureOperationalBffTables();
  });

  afterAll(async () => {
    await app.close();
  });

  it("completes full lifecycle: Shipment creation -> DAG workflow -> In-situ execution -> Unblocking -> HBL PDF Generation", async () => {
    const ref = `SHP-CONSOL-${Date.now()}`;

    // 1. Create Operational Shipment
    const shipment = await createOperationalShipment({
      shipmentReference: ref,
      serviceType: "OCEAN_FCL",
      customerPartyId: "pty_global_importer",
    });

    expect(shipment.shipmentId).toBeDefined();
    expect(shipment.shipmentReference).toBe(ref);

    // 2. Plan initial multimodal route corridor
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

    // 3. Relay outbox events to instantiate DAG workflow & 360 projection
    await outboxBus.relayPendingEvents();

    const viewBefore = await getShipment360View(shipment.shipmentId);
    expect(viewBefore).toBeDefined();
    expect(viewBefore.workflow?.definitionCode).toBe("OCEAN_EXPORT_STANDARD");
    expect(viewBefore.tasks.length).toBeGreaterThan(0);

    // Identify initial open task and downstream blocked tasks
    const firstTask = viewBefore.tasks.find(
      (t) => t.status === "OPEN" && !t.isBlocked,
    );
    expect(firstTask).toBeDefined();

    const blockedTask = viewBefore.tasks.find((t) => t.isBlocked);
    expect(blockedTask).toBeDefined();

    // 4. In-Situ Execution of first task via Cockpit BFF
    const execRes = await executeCockpitWorkItem(firstTask!.taskId, {
      confirmationNumber: "CARR-BOOKING-99481",
      notes: "Booking confirmed by Mediterranean Shipping Co.",
    });

    expect(execRes.success).toBe(true);
    expect(execRes.executedWorkItemId).toBe(firstTask!.taskId);

    // Verify projection updated
    const viewAfter = await getShipment360View(shipment.shipmentId);
    const updatedFirstTask = viewAfter.tasks.find(
      (t) => t.taskId === firstTask!.taskId,
    );
    expect(updatedFirstTask?.status).toBe("COMPLETED");

    // 5. Verify House Bill of Lading (HBL) generation via REST endpoint
    const hblResponse = await app.inject({
      method: "GET",
      url: `/api/scm/v1/operational/shipments/${shipment.shipmentId}/bol`,
      headers: {
        "x-user-id": "usr_ops_lead",
        "x-organization-id": "org_atlas_global",
      },
    });

    expect(hblResponse.statusCode).toBe(200);
    expect(hblResponse.headers["content-type"]).toBe("application/pdf");
    expect(hblResponse.rawPayload.length).toBeGreaterThan(500);

    // 6. Verify direct PDFService generation integrity
    const sampleHBL: HBLData = {
      shipmentId: ref,
      shipper: "Global Industrial Motors S.A.",
      consignee: "Atlantic Machinery LLC",
      portOfLoading: "ESVLC",
      portOfDischarge: "USNYC",
      vessel: "MSC OSCAR",
      voyage: "V.2409W",
      containers: [
        {
          containerNumber: "MSCU9284710",
          type: "40' High Cube",
          sealNumber: "SL-994821",
        },
      ],
      commodities: [
        {
          description: "High Torque Electric Induction Motors",
          hsCode: "8501.52.00",
          pieces: 120,
          grossWeightKg: 18400,
          volumeCbm: 52.4,
        },
      ],
      issueDate: "2026-11-01",
    };

    const directPdf = await PDFService.generateHBL(sampleHBL);
    expect(Buffer.isBuffer(directPdf)).toBe(true);
    expect(directPdf.slice(0, 4).toString("ascii")).toBe("%PDF");
  });
});
