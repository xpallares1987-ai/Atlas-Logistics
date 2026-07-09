import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { ShipmentService } from "./shipmentService";
import { Shipment } from "../types";

describe("ShipmentService", () => {
  const INITIAL_SHIPMENTS: Shipment[] = [
    {
      id: "1",
      reference: "HAWB-9921",
      container: "MSCU1234567",
      origin: "Shanghai",
      destination: "Barcelona",
      originCoords: [31.2304, 121.4737],
      destCoords: [41.3851, 2.1734],
      status: "transit",
      mode: "sea",
      eta: "2026-05-10",
      freeTimeDays: 7,
      demurrageRate: 150,
      milestones: [
        {
          label: "Booking",
          key: "booking",
          completed: true,
          date: "2026-04-10",
        },
        {
          label: "En Tránsito",
          key: "transit",
          completed: true,
          date: "2026-04-18",
        },
        { label: "Entregado", key: "delivered", completed: false },
      ],
      notes: [],
      auditHistory: [
        {
          id: "a1",
          action: "CREATE",
          author: "System",
          timestamp: "2026-04-10 09:00",
          details: "Embarque inicializado",
        },
      ],
    },
    {
      id: "2",
      reference: "AIR-4452",
      container: "MAWB-778899",
      origin: "Frankfurt",
      destination: "Mexico City",
      originCoords: [50.1109, 8.6821],
      destCoords: [19.4326, -99.1332],
      status: "booking",
      mode: "air",
      eta: "2026-04-20",
      freeTimeDays: 3,
      demurrageRate: 50,
      milestones: [
        {
          label: "Booking",
          key: "booking",
          completed: true,
          date: "2026-04-15",
        },
        { label: "Salida", key: "transit", completed: false },
      ],
      notes: [],
      auditHistory: [
        {
          id: "a2",
          action: "CREATE",
          author: "System",
          timestamp: "2026-04-15 14:30",
          details: "Reserva aérea confirmada",
        },
      ],
    },
    {
      id: "3",
      reference: "HAWB-7710",
      container: "HLXU1122334",
      origin: "Ningbo",
      destination: "Madrid",
      originCoords: [29.8683, 121.544],
      destCoords: [40.4168, -3.7038],
      status: "customs",
      mode: "sea",
      eta: "2026-04-26",
      portArrivalDate: "2026-04-20",
      freeTimeDays: 4,
      demurrageRate: 120,
      milestones: [
        {
          label: "En Puerto",
          key: "port",
          completed: true,
          date: "2026-04-20",
        },
        {
          label: "Aduanas",
          key: "customs",
          completed: true,
          date: "2026-04-22",
        },
      ],
      notes: [],
      auditHistory: [
        {
          id: "a3",
          action: "UPDATE",
          author: "Admin",
          timestamp: "2026-04-22 11:20",
          details: "Ingreso a terminal portuaria",
        },
      ],
    },
  ];

  beforeEach(async () => {
    // Reset to initial state for each test to avoid leakage
    await ShipmentService.saveShipments(INITIAL_SHIPMENTS);
  });

  it("should return shipments from DB", async () => {
    const shipments = await ShipmentService.getShipments();
    expect(shipments.length).toBe(3);
    expect(shipments[0].reference).toBe("HAWB-9921");
  });

  it("should save and retrieve shipments", async () => {
    const newShipments: Shipment[] = [
      {
        id: "test-1",
        reference: "REF-TEST",
        container: "CONT-TEST",
        origin: "A",
        destination: "B",
        originCoords: [0, 0],
        destCoords: [0, 0],
        status: "booking",
        mode: "air",
        eta: "2026-01-01",
        freeTimeDays: 0,
        demurrageRate: 0,
        milestones: [],
        notes: [],
        auditHistory: [],
      },
    ];
    await ShipmentService.saveShipments(newShipments);
    const retrieved = await ShipmentService.getShipments();
    expect(retrieved).toEqual(newShipments);
  });

  it("should add an audit entry to a shipment", async () => {
    const shipments = await ShipmentService.getShipments();
    const targetId = shipments[0].id;
    const result = await ShipmentService.addAuditEntry(
      targetId,
      "UPDATE",
      "Details test",
      "Tester",
    );

    expect(result).not.toBeNull();
    expect(result?.auditHistory?.length).toBeGreaterThan(1);
    const lastEntry = result?.auditHistory?.at(-1);
    expect(lastEntry?.action).toBe("UPDATE");
    expect(lastEntry?.author).toBe("Tester");
    expect(lastEntry?.details).toBe("Details test");
  });

  it("should return null when adding audit entry to non-existent shipment", async () => {
    const result = await ShipmentService.addAuditEntry(
      "non-existent",
      "ACTION",
      "Details",
    );
    expect(result).toBeNull();
  });

  it("should add a note and corresponding audit entry", async () => {
    const shipments = await ShipmentService.getShipments();
    const targetId = shipments[0].id;
    const result = await ShipmentService.addNote(
      targetId,
      "This is a test note",
      "NoteAuthor",
    );

    expect(result).not.toBeNull();
    expect(result?.notes?.length).toBe(1);
    expect(result?.notes?.[0].text).toBe("This is a test note");
    expect(result?.notes?.[0].author).toBe("NoteAuthor");

    const auditNoteEntry = result?.auditHistory?.find(
      (a) => a.action === "NOTE_ADDED",
    );
    expect(auditNoteEntry).toBeDefined();
    expect(auditNoteEntry?.details).toContain(
      "This is a test note".substring(0, 20),
    );
  });

  it("should return null when adding note to non-existent shipment", async () => {
    const result = await ShipmentService.addNote("non-existent", "text");
    expect(result).toBeNull();
  });

  it("should check for delay exceptions", () => {
    const delayedShipment = {
      eta: "2026-04-20",
      status: "transit",
    } as unknown as Shipment;
    const exceptions = ShipmentService.checkExceptions(delayedShipment);
    expect(exceptions.length).toBe(1);
    expect(exceptions[0].type).toBe("delay");

    const onTimeShipment = {
      eta: "2026-05-01",
      status: "transit",
    } as unknown as Shipment;
    expect(ShipmentService.checkExceptions(onTimeShipment).length).toBe(0);

    const deliveredLateShipment = {
      eta: "2026-04-20",
      status: "delivered",
    } as unknown as Shipment;
    expect(ShipmentService.checkExceptions(deliveredLateShipment).length).toBe(
      0,
    );
  });

  it("should filter shipments by term (reference or origin)", async () => {
    const all = await ShipmentService.getShipments();

    const byRef = ShipmentService.filterShipments(all, {
      term: "HAWB-9921",
      status: "all",
    });
    expect(byRef.length).toBe(1);
    expect(byRef[0].reference).toBe("HAWB-9921");

    const byOrigin = ShipmentService.filterShipments(all, {
      term: "Shanghai",
      status: "all",
    });
    expect(byOrigin.length).toBe(1);
    expect(byOrigin[0].origin).toBe("Shanghai");

    const byLowerOrigin = ShipmentService.filterShipments(all, {
      term: "shanghai",
      status: "all",
    });
    expect(byLowerOrigin.length).toBe(1);
  });

  it("should filter shipments by status", async () => {
    const all = await ShipmentService.getShipments();
    const filtered = ShipmentService.filterShipments(all, {
      term: "",
      status: "transit",
    });
    expect(filtered.every((s) => s.status === "transit")).toBe(true);
    expect(filtered.length).toBe(1);
  });

  it("should initialize auditHistory if missing when adding audit entry", async () => {
    const shipments = await ShipmentService.getShipments();
    const targetId = shipments[0].id;
    // Force missing auditHistory
    delete shipments[0].auditHistory;
    await ShipmentService.saveShipments(shipments);

    const result = await ShipmentService.addAuditEntry(
      targetId,
      "FIX",
      "Repaired history",
    );
    expect(result?.auditHistory).toBeDefined();
    expect(result?.auditHistory?.length).toBe(1);
  });

  it("should initialize auditHistory and notes if missing when adding a note", async () => {
    const shipments = await ShipmentService.getShipments();
    const targetId = shipments[0].id;
    // Force missing arrays
    delete shipments[0].auditHistory;
    delete shipments[0].notes;
    await ShipmentService.saveShipments(shipments);

    const result = await ShipmentService.addNote(targetId, "Resurrected note");
    expect(result?.auditHistory).toBeDefined();
    expect(result?.notes).toBeDefined();
    expect(result?.notes?.length).toBe(1);
  });
});
