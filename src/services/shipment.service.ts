import { db } from "../db/client.js";
import { shipments, shipment_events } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { createShipmentInstance } from "../bpm/zeebe-client.js";

export const shipmentService = {
  async getAllShipments(customer_id?: number) {
    let query = db.select().from(shipments);
    if (customer_id) {
      query = query.where(eq(shipments.customer_id, customer_id)) as any;
    }
    return await query;
  },

  async createShipment(data: any) {
    const tracking_number =
      data.tracking_number || `AWB-${Math.floor(Math.random() * 1000000)}`;

    const [shipment] = await db
      .insert(shipments)
      .values({
        ...data,
        tracking_number,
        status: data.status || "Booked",
        mode: data.mode || "Ocean FCL",
        origin_port: data.origin_port || "CNSHA",
        destination_port: data.destination_port || "ESBCN",
        ets: data.ets ? new Date(data.ets) : null,
        eta: data.eta ? new Date(data.eta) : null,
      })
      .returning();

    // Trigger Zeebe workflow if connected
    try {
      await createShipmentInstance(
        shipment.tracking_number,
        shipment.carrier_id,
      );
    } catch (err) {
      console.warn(`Could not start Zeebe process: ${(err as Error).message}`);
    }

    return shipment;
  },

  async getShipmentById(id: number) {
    return await db.query.shipments.findFirst({
      where: eq(shipments.id, id),
      with: {
        events: {
          orderBy: [desc(shipment_events.event_time)],
        },
      },
    });
  },

  async updateShipment(id: number, data: any) {
    const updateData: any = { ...data, updated_at: new Date() };
    if (data.ets) updateData.ets = new Date(data.ets);
    if (data.eta) updateData.eta = new Date(data.eta);

    const [updated] = await db
      .update(shipments)
      .set(updateData)
      .where(eq(shipments.id, id))
      .returning();

    return updated;
  },

  async addTrackingEvent(shipmentId: number, eventData: any) {
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, shipmentId));
    if (!shipment) return null;

    return await db.transaction(async (tx) => {
      const [event] = await tx
        .insert(shipment_events)
        .values({
          ...eventData,
          shipment_id: shipmentId,
          event_time: new Date(eventData.event_time),
        })
        .returning();

      await tx
        .update(shipments)
        .set({ status: eventData.status, updated_at: new Date() })
        .where(eq(shipments.id, shipmentId));

      return event;
    });
  },

  async advanceShipmentStatus(id: number) {
    const statusFlow = [
      "Booked",
      "Received",
      "OnBoard",
      "Discharged",
      "Delivered",
    ] as const;

    const [currentShipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, id));
    if (!currentShipment) {
      throw new Error("Shipment not found");
    }

    const currentIndex = statusFlow.indexOf(currentShipment.status as any);
    if (currentIndex === -1 || currentIndex === statusFlow.length - 1) {
      throw new Error("Cannot advance status further");
    }

    const newStatus = statusFlow[currentIndex + 1];

    return await db.transaction(async (tx) => {
      const [upd] = await tx
        .update(shipments)
        .set({ status: newStatus, updated_at: new Date() })
        .where(eq(shipments.id, id))
        .returning();

      await tx.insert(shipment_events).values({
        shipment_id: id,
        status: newStatus,
        location: "Auto-advanced location",
        description: `Status advanced to ${newStatus}`,
        event_time: new Date(),
      });

      return upd;
    });
  },
};
