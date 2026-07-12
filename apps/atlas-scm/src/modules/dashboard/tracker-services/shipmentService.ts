import { DbShipment, SharedDatabase } from "@/components";
import { AuditLog, Note, Shipment, ShipmentFilters } from "../types";

const db = new SharedDatabase("shipment_tracker_db");

const FILTERS_KEY = "shipment_filters";

export const ShipmentService = {
  async getShipments(): Promise<Shipment[]> {
    return (await db.shipments.toArray()) as unknown as Shipment[];
  },

  async saveShipments(shipments: Shipment[]) {
    await db.shipments.clear();
    await db.shipments.bulkAdd(shipments as DbShipment[]);
  },

  async addAuditEntry(
    shipmentId: string,
    action: string,
    details: string,
    author: string = "Operador",
  ) {
    const shipments = await this.getShipments();
    const index = shipments.findIndex((s) => s.id === shipmentId);
    if (index !== -1) {
      const entry: AuditLog = {
        id: crypto.randomUUID(),
        action,
        author,
        timestamp: new Date().toLocaleString(),
        details,
      };
      if (!shipments[index].auditHistory) shipments[index].auditHistory = [];
      shipments[index].auditHistory!.push(entry);
      await this.saveShipments(shipments);
      return shipments[index];
    }
    return null;
  },

  async addNote(shipmentId: string, text: string, author: string = "Operador") {
    const shipments = await this.getShipments();
    const index = shipments.findIndex((s) => s.id === shipmentId);

    if (index !== -1) {
      const shipment = shipments[index];
      const timestamp = new Date().toLocaleString();

      const auditEntry: AuditLog = {
        id: crypto.randomUUID(),
        action: "NOTE_ADDED",
        author,
        timestamp,
        details: `Nota: ${text.substring(0, 20)}...`,
      };

      const note: Note = {
        id: crypto.randomUUID(),
        text,
        author,
        date: timestamp,
      };

      if (!shipment.auditHistory) shipment.auditHistory = [];
      if (!shipment.notes) shipment.notes = [];

      shipment.auditHistory.push(auditEntry);
      shipment.notes.push(note);

      await this.saveShipments(shipments);
      return shipment;
    }
    return null;
  },

  checkExceptions(s: Shipment) {
    const today = new Date("2026-04-25");
    const eta = new Date(s.eta);
    const exceptions = [];
    if (today > eta && s.status !== "delivered")
      exceptions.push({ type: "delay", message: "RETRASO" });
    return exceptions;
  },

  filterShipments(shipments: Shipment[], filters: ShipmentFilters): Shipment[] {
    const term = (filters.term || "").toLowerCase();
    return shipments.filter((s) => {
      const m =
        s.reference.toLowerCase().includes(term) ||
        s.origin.toLowerCase().includes(term);
      const ms = filters.status === "all" || s.status === filters.status;
      return m && ms;
    });
  },

  async saveFilters(filters: ShipmentFilters): Promise<void> {
    await localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
  },
  async loadFilters(): Promise<ShipmentFilters | null> {
    const data = localStorage.getItem(FILTERS_KEY);
    return data ? JSON.parse(data) : null;
  },
};
