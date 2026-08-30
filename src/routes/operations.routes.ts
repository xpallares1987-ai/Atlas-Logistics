import { FastifyPluginAsync } from "fastify";
import crypto from "crypto";
import { db } from "../db/index.js";
import {
  cargoItems,
  shipmentContainers,
  shipments,
  schedules,
  bookings,
  customsDeclarations,
} from "../db/schema/operations.js";
import { lanes } from "../db/schema/pricing.js";
import { locations } from "../db/schema/core.js";
import { carriers } from "../db/schema/vendors.js";
import { invoices, invoiceItems } from "../db/schema/finance.js";
import { eq } from "drizzle-orm";

const operationsRoutes: FastifyPluginAsync = async (fastify, opts) => {
  // Get bookings
  fastify.get("/bookings", async (request, reply) => {
    try {
      const items = await db.select().from(bookings).limit(50);
      // Map DB fields to UI expected fields
      const mappedItems = items.map((b) => ({
        ...b,
        customer: b.customerId === "c-1" ? "Demo Customer Ltd" : b.customerId,
        consignee: "Demo Consignee",
        commodities: b.cargoDetails ? JSON.parse(b.cargoDetails) : [],
        containers: [],
      }));
      return reply.send(mappedItems);
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  // Carbon ESG Tracker Endpoint
  fastify.get("/esg/carbon", async (request, reply) => {
    try {
      const items = await db.select().from(bookings).limit(50);
      
      const mappedItems = items.map((b) => {
        const hash = ((b.origin || "a").charCodeAt(0) * (b.destination || "b").charCodeAt(0) * 100) || 5000;
        const distanceKm = hash + (b.id.length * 10);
        
        let weightTons = 10;
        if (b.cargoDetails) {
            try {
                const details = JSON.parse(b.cargoDetails);
                weightTons = details.reduce((acc: number, item: any) => acc + (Number(item.grossWeightKg) || 1000), 0) / 1000;
            } catch (e) {}
        }
        
        const mode = b.serviceType === "Air" ? "Air" : (b.serviceType === "Road" ? "Road" : "Ocean");
        
        // Emission factors (g CO2 per tonne-km): Air ~500, Road ~60, Ocean ~10
        const factor = mode === "Air" ? 500 : (mode === "Road" ? 60 : 10);
        const co2eTonnes = (distanceKm * weightTons * factor) / 1000000;
        
        return {
          id: b.id,
          reference: b.referenceNumber,
          mode: mode,
          origin: b.origin || "Unknown",
          destination: b.destination || "Unknown",
          weightTons: weightTons,
          distanceKm: distanceKm,
          co2eTonnes: co2eTonnes,
          date: b.createdAt ? new Date(b.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
        };
      });

      return reply.send(mappedItems);
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  // Demurrage Alerts Endpoints
  fastify.get("/demurrage", async (request, reply) => {
    try {
      const items = await db
        .select()
        .from(shipmentContainers)
        .innerJoin(shipments, eq(shipmentContainers.shipmentId, shipments.id))
        .limit(20);

      const containers = items.map((row) => {
        const c = row.shipment_containers;
        const s = row.shipments;
        
        const now = new Date();
        const hash = c.id.charCodeAt(0) * (c.containerNumber.charCodeAt(c.containerNumber.length - 1) || 1);
        const freeTimeDays = 5 + (hash % 5);
        const dwellDays = (hash % 12);
        
        return {
          id: c.id,
          reference: s.trackingNumber || `TRK-${s.id.substring(0, 5)}`,
          container: c.containerNumber,
          carrier: s.carrierId || "Maersk",
          pol: s.origin || "Unknown POL",
          pod: s.destination || "Unknown POD",
          eta: s.estimatedArrival ? new Date(s.estimatedArrival).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
          portArrivalDate: new Date(now.getTime() - (dwellDays * 24 * 60 * 60 * 1000)).toISOString().substring(0, 10),
          dwellDays: dwellDays,
          freeTimeDays: freeTimeDays,
          ratePerDay: 150 + (hash % 50),
          status: dwellDays > 0 ? "port" : "transit",
        };
      });
      
      if (containers.length === 0) {
        return reply.send([
          {
            id: "dem-1",
            reference: "TRK-99120",
            container: "MSKU-1928471",
            carrier: "Maersk",
            pol: "Shanghai",
            pod: "Rotterdam",
            eta: "2026-06-15",
            portArrivalDate: "2026-06-12",
            dwellDays: 9,
            freeTimeDays: 7,
            ratePerDay: 150,
            status: "port"
          },
          {
            id: "dem-2",
            reference: "TRK-99125",
            container: "CMAU-4819283",
            carrier: "CMA CGM",
            pol: "Singapore",
            pod: "Los Angeles",
            eta: "2026-06-20",
            portArrivalDate: "2026-06-19",
            dwellDays: 2,
            freeTimeDays: 5,
            ratePerDay: 200,
            status: "port"
          }
        ]);
      }
      return reply.send(containers);
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.post("/demurrage/mitigate", async (request, reply) => {
    try {
      const body = request.body as any;
      return reply.send({ success: true, message: "Mitigation email sent", data: body });
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  // Container Planner Endpoints
  fastify.get("/containers", async (request, reply) => {
    try {
      const items = await db.select().from(shipmentContainers).limit(10);
      if (items.length === 0) {
        return reply.send([{ id: "demo-cont-1", containerType: "40ft High Cube" }]);
      }
      return reply.send(items);
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.get("/containers/:id/cargo", async (request, reply) => {
    try {
      const { id } = request.params as any;
      const cargo = await db.select().from(cargoItems).where(eq(cargoItems.containerId, id));
      
      if (cargo.length === 0) {
        const demoCargo = [
          { id: "c1", label: "Electronics (Pallet)", color: "#3b82f6", width: 1.2, height: 1.5, depth: 1.0, weight: 450, x: 0, y: 0.75, z: 0 },
          { id: "c2", label: "Auto Parts", color: "#ef4444", width: 2.0, height: 1.2, depth: 1.5, weight: 800, x: -0.5, y: 0.6, z: 2 },
          { id: "c3", label: "Textiles", color: "#10b981", width: 1.0, height: 2.0, depth: 1.0, weight: 300, x: 0.5, y: 1.0, z: -2 },
        ];
        return reply.send(demoCargo);
      }
      return reply.send(cargo);
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.post("/containers/:id/optimize-load", async (request, reply) => {
    try {
      const { id } = request.params as any;
      const cargo = await db.select().from(cargoItems).where(eq(cargoItems.containerId, id));
      
      const itemsToPack = cargo.length > 0 ? cargo : [
          { id: "c1", label: "Electronics (Pallet)", color: "#3b82f6", width: 1.2, height: 1.5, depth: 1.0, weight: 450, x: 0, y: 0, z: 0 },
          { id: "c2", label: "Auto Parts", color: "#ef4444", width: 2.0, height: 1.2, depth: 1.5, weight: 800, x: 0, y: 0, z: 0 },
          { id: "c3", label: "Textiles", color: "#10b981", width: 1.0, height: 2.0, depth: 1.0, weight: 300, x: 0, y: 0, z: 0 },
          { id: "c4", label: "Machinery", color: "#f59e0b", width: 2.2, height: 1.8, depth: 2.0, weight: 1200, x: 0, y: 0, z: 0 },
      ];

      itemsToPack.sort((a, b) => {
        const volA = a.width * a.height * a.depth;
        const volB = b.width * b.height * b.depth;
        return volB - volA;
      });

      let currentZ = -5.5; 
      const packedItems = itemsToPack.map(item => {
        const zPos = currentZ + (item.depth / 2);
        const yPos = item.height / 2;
        const xPos = 0; 
        
        currentZ += item.depth + 0.1; 
        return {
          ...item,
          x: xPos,
          y: yPos,
          z: zPos
        };
      });

      return reply.send({
        items: packedItems,
        suggestion: "Heuristic packer ran successfully: Sorted by volume (descending) and placed back-to-front along the center axis."
      });
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  // LCL Engine Endpoints
  fastify.get("/lcl/cargo", async (request, reply) => {
    try {
      const lclBookings = await db.select().from(bookings).where(eq(bookings.serviceType, "LCL")).limit(50);
      
      if (lclBookings.length === 0) {
        return reply.send([
          { id: "itm-1", clientId: "c1", clientName: "TechCorp", typeId: "euro-pallet" },
          { id: "itm-2", clientId: "c1", clientName: "TechCorp", typeId: "euro-pallet" },
          { id: "itm-3", clientId: "c2", clientName: "GlobalMach", typeId: "heavy-box" },
          { id: "itm-4", clientId: "c3", clientName: "FreshFoods", typeId: "ind-pallet" },
          { id: "itm-5", clientId: "c4", clientName: "RetailPlus", typeId: "paper-roll" },
        ]);
      }
      
      const cargoPool = lclBookings.map((b, i) => {
        const types = ["euro-pallet", "ind-pallet", "heavy-box", "paper-roll"];
        return {
          id: b.id,
          clientId: b.customerId || `c${i}`,
          clientName: `Customer ${b.customerId || i}`,
          typeId: types[i % types.length]
        };
      });
      return reply.send(cargoPool);
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.post("/lcl/consolidate", async (request, reply) => {
    try {
      const { masterContainerId, assignedCargoIds } = request.body as any;
      return reply.send({ success: true, message: "LCL consolidation saved", masterContainerId, assignedCargoIds });
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  // Warehouse Endpoints
  fastify.get("/warehouse/inventory", async (request, reply) => {
    try {
      const pallets = [
        {
          pos: [-1, -1.3, 0],
          color: "#3b82f6",
          sku: "SKU-A101",
          weight: 450,
          destination: "New York (JFK)",
        },
        {
          pos: [1, -1.3, 0],
          color: "#ef4444",
          sku: "SKU-B202",
          weight: 800,
          destination: "Los Angeles (LAX)",
        },
        {
          pos: [-1, 0.7, 0],
          color: "#10b981",
          sku: "SKU-C303",
          weight: 120,
          destination: "Miami (MIA)",
        },
        {
          pos: [1, 2.7, 0],
          color: "#8b5cf6",
          sku: "SKU-D404",
          weight: 950,
          destination: "Chicago (ORD)",
        },
        {
          pos: [-1, -1.3, 4],
          color: "#f59e0b",
          sku: "SKU-E505",
          weight: 300,
          destination: "Houston (IAH)",
        },
        {
          pos: [1, 0.7, 4],
          color: "#06b6d4",
          sku: "SKU-F606",
          weight: 600,
          destination: "Seattle (SEA)",
        },
      ];
      return reply.send(pallets);
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  // Create booking
  fastify.post("/bookings", async (request, reply) => {
    try {
      const body = request.body as any;
      const newBooking = await db
        .insert(bookings)
        .values({
          id: `bkg_${Date.now()}`,
          referenceNumber: body.bookingReference || body.referenceNumber || `BKG-${Date.now()}`,
          customerId: body.customerId || "c-1",
          status: body.status || "DRAFT",
          origin: body.origin,
          destination: body.destination,
          serviceType: body.serviceType || "Ocean",
          equipment: body.equipment,
          vessel: body.vessel,
          voyage: body.voyage,
          cargoDetails: body.commodities ? JSON.stringify(body.commodities) : (body.commodity ? JSON.stringify([{ description: body.commodity, grossWeightKg: body.weight }]) : undefined),
        })
        .returning();
      return reply.send(newBooking[0]);
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  // Update booking
  fastify.put("/bookings/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;
      
      const updateData: any = {};
      if (body.status) updateData.status = body.status;
      if (body.origin) updateData.origin = body.origin;
      if (body.destination) updateData.destination = body.destination;
      if (body.equipment) updateData.equipment = body.equipment;
      if (body.vessel) updateData.vessel = body.vessel;
      if (body.voyage) updateData.voyage = body.voyage;
      if (body.commodities) updateData.cargoDetails = JSON.stringify(body.commodities);
      // Only update customerId if a valid company ID is provided (not free-text shipper names)
      if (body.customerId) {
        updateData.customerId = body.customerId;
      }

      const updated = await db
        .update(bookings)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(bookings.id, id))
        .returning();
      
      // Auto-generate Customs Declaration
      if (updated[0] && (updated[0].status === "DOCUMENTATION" || updated[0].status === "CONFIRMED")) {
        const existingDecl = await db
          .select()
          .from(customsDeclarations)
          .where(eq(customsDeclarations.shipmentId, updated[0].referenceNumber!))
          .limit(1);

        if (existingDecl.length === 0) {
          await db.insert(customsDeclarations).values({
            id: `decl_${crypto.randomUUID().substring(0,8)}`,
            shipmentId: updated[0].referenceNumber!,
            blNumber: `HBL-${updated[0].referenceNumber!}`,
            type: "Import",
            status: "Pending", // Draft state
            aiRiskScore: 0,
            aiRiskFlag: "Awaiting Document Upload",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      // Auto-generate AR Invoice when ON_BOARD
      if (updated[0] && updated[0].status === "ON_BOARD") {
        const existingInvoice = await db
          .select()
          .from(invoices)
          .where(eq(invoices.shipmentId, updated[0].referenceNumber!))
          .limit(1);

        if (existingInvoice.length === 0) {
          const newInvoiceId = `inv_${crypto.randomUUID().substring(0,8)}`;
          await db.insert(invoices).values({
            id: newInvoiceId,
            invoiceNumber: `INV-${updated[0].referenceNumber!}`,
            type: "AR",
            shipmentId: updated[0].referenceNumber!,
            companyId: updated[0].customerId || "c-1",
            amount: 1500.00, // Estimated demo value
            currency: "USD",
            status: "Draft",
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          await db.insert(invoiceItems).values({
            id: `item_${crypto.randomUUID().substring(0,8)}`,
            invoiceId: newInvoiceId,
            description: `Freight Charges - ${updated[0].origin} to ${updated[0].destination}`,
            quantity: 1,
            unitPrice: 1500.00,
            total: 1500.00,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      return reply.send({
        ...updated[0],
        customer: updated[0]?.customerId === "c-1" ? "Demo Customer Ltd" : updated[0]?.customerId,
        commodities: updated[0]?.cargoDetails ? JSON.parse(updated[0].cargoDetails) : [],
        containers: [],
      });
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  // Delete booking
  fastify.delete("/bookings/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await db.delete(bookings).where(eq(bookings.id, id));
      return reply.send({ success: true });
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });


};

export default operationsRoutes;
