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
  demurrageAlerts,
  warehouseTraffic,
} from "../db/schema/operations.js";
import { locations, companies } from "../db/schema/core.js";
import { warehouseInventory } from "../db/schema/support.js";
import { carriers } from "../db/schema/vendors.js";
import { invoices, invoiceItems } from "../db/schema/finance.js";
import { eq, isNull, inArray } from "drizzle-orm";
import { PDFService } from "../services/pdf.service.js";

const operationsRoutes: FastifyPluginAsync = async (fastify, opts) => {
  async function ensureSeedData() {
    const existing = await db.select().from(bookings).limit(1);
    if (existing.length === 0) {
      console.log("Seeding bookings table...");
      const { randomUUID } = crypto;

      const mockBookings = [
        {
          id: randomUUID(),
          referenceNumber: "BKG-A1B2C3",
          customerId: "c-1",
          status: "Pending",
          origin: "Shanghai, CN",
          destination: "Los Angeles, US",
          serviceType: "FCL",
          equipment: "40HC",
          cargoDetails: JSON.stringify([
            { description: "Electronics", grossWeightKg: 12000 },
          ]),
          estimatedDeparture: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: randomUUID(),
          referenceNumber: "BKG-X9Y8Z7",
          customerId: "c-2",
          status: "Pending",
          origin: "Rotterdam, NL",
          destination: "New York, US",
          serviceType: "LCL",
          equipment: "Pallets",
          cargoDetails: JSON.stringify([
            { description: "Machinery Parts", grossWeightKg: 3500 },
          ]),
          estimatedDeparture: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: randomUUID(),
          referenceNumber: "BKG-M5N6O7",
          customerId: "c-1",
          status: "Confirmed",
          origin: "Shenzhen, CN",
          destination: "Hamburg, DE",
          serviceType: "FCL",
          equipment: "20DC",
          vessel: "CMA CGM Marco Polo",
          voyage: "043E",
          cargoDetails: JSON.stringify([
            { description: "Toys", grossWeightKg: 8000 },
          ]),
          estimatedDeparture: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: randomUUID(),
          referenceNumber: "BKG-P2Q3R4",
          customerId: "c-3",
          status: "Completed",
          origin: "Mumbai, IN",
          destination: "Dubai, AE",
          serviceType: "Air",
          equipment: "ULD",
          cargoDetails: JSON.stringify([
            { description: "Pharmaceuticals", grossWeightKg: 1200 },
          ]),
          estimatedDeparture: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: randomUUID(),
          referenceNumber: "BKG-K8L9M0",
          customerId: "c-4",
          status: "Completed",
          origin: "Singapore, SG",
          destination: "Sydney, AU",
          serviceType: "FCL",
          equipment: "40HC",
          vessel: "OOCL Hong Kong",
          voyage: "078E",
          cargoDetails: JSON.stringify([
            { description: "Garments", grossWeightKg: 14500 },
          ]),
          estimatedDeparture: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.insert(bookings).values(mockBookings);
    }

    // Ensure some mock locations exist to satisfy foreign keys
    const existingLoc = await db.select().from(locations).limit(1);
    if (existingLoc.length === 0) {
      console.log("Seeding locations table...");
      await db.insert(locations).values([
        {
          id: "WH-BCN-01",
          type: "WAREHOUSE",
          name: "Barcelona Hub",
          address: "BCN Port",
          countryCode: "ES",
          timezone: "Europe/Madrid",
        },
        {
          id: "WH-EXT-VAL",
          type: "WAREHOUSE",
          name: "Valencia Logistics",
          address: "VAL Port",
          countryCode: "ES",
          timezone: "Europe/Madrid",
        },
      ]);
    }

    const existingTraffic = await db.select().from(warehouseTraffic).limit(1);
    if (existingTraffic.length === 0) {
      console.log("Seeding warehouse traffic...");
      const mockTraffic = [
        {
          id: "TRK-901",
          deviceNumber: "7892-LMX",
          deviceType: "TRUCK",
          status: "WAITING",
          eta: "10:30 AM",
          assignedDock: "DOCK-1",
          cargoDescription: "4 Reels (Paper Rolls)",
          totalWeightExpected: 100000,
          expectedQuantity: 4,
          type: "INBOUND",
        },
        {
          id: "TRK-902",
          deviceNumber: "7893-LMX",
          deviceType: "TRUCK",
          status: "DOCK_ASSIGNED",
          eta: "11:00 AM",
          assignedDock: "DOCK-2",
          cargoDescription: "10 Pallets (Electronics)",
          totalWeightExpected: 5000,
          expectedQuantity: 10,
          type: "OUTBOUND",
        },
      ];
      await db.insert(warehouseTraffic).values(mockTraffic);
    }

    const existingInventory = await db
      .select()
      .from(warehouseInventory)
      .limit(1);
    if (existingInventory.length === 0) {
      console.log("Seeding warehouse inventory...");
      const mockInventory = [
        {
          id: "SKU-A101-1",
          locationId: "WH-BCN-01",
          ownership: "INTERNAL",
          customer: "Global Packaging",
          productCode: "SKU-A101",
          itemDescription: "Paper Rolls",
          quantity: 4,
          status: "AVAILABLE",
          zone: "DRY",
        },
        {
          id: "SKU-B202-1",
          locationId: "WH-EXT-VAL",
          ownership: "EXTERNAL",
          customer: "Tech Solutions",
          productCode: "SKU-B202",
          itemDescription: "Electronics",
          quantity: 10,
          status: "RESERVED",
          zone: "DRY",
        },
        {
          id: "SKU-C303-1",
          locationId: "WH-BCN-01",
          ownership: "INTERNAL",
          customer: "Food Logistics",
          productCode: "SKU-C303",
          itemDescription: "Frozen Goods",
          quantity: 2,
          status: "AVAILABLE",
          zone: "COLD",
        },
      ];
      await db.insert(warehouseInventory).values(mockInventory);
    }
  }

  // Get companies
  fastify.get("/companies", async (request, reply) => {
    try {
      const allCompanies = await db
        .select({
          id: companies.id,
          name: companies.name,
        })
        .from(companies);
      return reply.send(allCompanies);
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  // Get bookings
  fastify.get("/bookings", async (request, reply) => {
    try {
      await ensureSeedData();
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
        const hash =
          (b.origin || "a").charCodeAt(0) *
            (b.destination || "b").charCodeAt(0) *
            100 || 5000;
        const distanceKm = hash + b.id.length * 10;

        let weightTons = 10;
        if (b.cargoDetails) {
          try {
            const details = JSON.parse(b.cargoDetails);
            weightTons =
              details.reduce(
                (acc: number, item: any) =>
                  acc + (Number(item.grossWeightKg) || 1000),
                0,
              ) / 1000;
          } catch (e) {}
        }

        const mode =
          b.serviceType === "Air"
            ? "Air"
            : b.serviceType === "Road"
              ? "Road"
              : "Ocean";

        // Emission factors (g CO2 per tonne-km): Air ~500, Road ~60, Ocean ~10
        const factor = mode === "Air" ? 500 : mode === "Road" ? 60 : 10;
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
          date: b.createdAt
            ? new Date(b.createdAt).toISOString().substring(0, 10)
            : new Date().toISOString().substring(0, 10),
        };
      });

      return reply.send(mappedItems);
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });
  // Container Planner Endpoints
  fastify.get("/containers", async (request, reply) => {
    try {
      const items = await db.select().from(shipmentContainers).limit(10);
      if (items.length === 0) {
        return reply.send([
          { id: "demo-cont-1", containerType: "40ft High Cube" },
        ]);
      }
      return reply.send(items);
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.get("/containers/:id/cargo", async (request, reply) => {
    try {
      const { id } = request.params as any;
      const cargo = await db
        .select()
        .from(cargoItems)
        .where(eq(cargoItems.containerId, id));

      if (cargo.length === 0) {
        const demoCargo = [
          {
            id: "c1",
            label: "Electronics (Pallet)",
            color: "#3b82f6",
            width: 1.2,
            height: 1.5,
            depth: 1.0,
            weight: 450,
            x: 0,
            y: 0.75,
            z: 0,
          },
          {
            id: "c2",
            label: "Auto Parts",
            color: "#ef4444",
            width: 2.0,
            height: 1.2,
            depth: 1.5,
            weight: 800,
            x: -0.5,
            y: 0.6,
            z: 2,
          },
          {
            id: "c3",
            label: "Textiles",
            color: "#10b981",
            width: 1.0,
            height: 2.0,
            depth: 1.0,
            weight: 300,
            x: 0.5,
            y: 1.0,
            z: -2,
          },
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
      const cargo = await db
        .select()
        .from(cargoItems)
        .where(eq(cargoItems.containerId, id));

      const itemsToPack =
        cargo.length > 0
          ? cargo
          : [
              {
                id: "c1",
                label: "Electronics (Pallet)",
                color: "#3b82f6",
                width: 1.2,
                height: 1.5,
                depth: 1.0,
                weight: 450,
                x: 0,
                y: 0,
                z: 0,
              },
              {
                id: "c2",
                label: "Auto Parts",
                color: "#ef4444",
                width: 2.0,
                height: 1.2,
                depth: 1.5,
                weight: 800,
                x: 0,
                y: 0,
                z: 0,
              },
              {
                id: "c3",
                label: "Textiles",
                color: "#10b981",
                width: 1.0,
                height: 2.0,
                depth: 1.0,
                weight: 300,
                x: 0,
                y: 0,
                z: 0,
              },
              {
                id: "c4",
                label: "Machinery",
                color: "#f59e0b",
                width: 2.2,
                height: 1.8,
                depth: 2.0,
                weight: 1200,
                x: 0,
                y: 0,
                z: 0,
              },
            ];

      itemsToPack.sort((a, b) => {
        const volA = a.width * a.height * a.depth;
        const volB = b.width * b.height * b.depth;
        return volB - volA;
      });

      let currentZ = -5.5;
      const packedItems = itemsToPack.map((item) => {
        const zPos = currentZ + item.depth / 2;
        const yPos = item.height / 2;
        const xPos = 0;

        currentZ += item.depth + 0.1;
        return {
          ...item,
          x: xPos,
          y: yPos,
          z: zPos,
        };
      });

      return reply.send({
        items: packedItems,
        suggestion:
          "Heuristic packer ran successfully: Sorted by volume (descending) and placed back-to-front along the center axis.",
      });
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  // LCL Engine Endpoints
  fastify.get("/lcl/cargo", async (request, reply) => {
    try {
      let unassignedCargo = await db
        .select()
        .from(cargoItems)
        .where(isNull(cargoItems.containerId));

      if (unassignedCargo.length === 0) {
        const types = ["euro-pallet", "ind-pallet", "paper-roll", "heavy-box"];
        const newCargo = Array.from({ length: 12 }).map((_, i) => ({
          id: `cargo_lcl_${Date.now()}_${i}`,
          shipmentId: `sh_demo_${Math.floor(Math.random() * 1000)}`,
          label: types[i % types.length],
          color: "#3b82f6",
          width: 1,
          height: 1,
          length: 1,
          weight: 1,
          isStacked: false,
        }));
        await db.insert(cargoItems).values(newCargo);
        unassignedCargo = await db
          .select()
          .from(cargoItems)
          .where(isNull(cargoItems.containerId));
      }

      const cargoPool = unassignedCargo.map((c) => {
        const validTypes = [
          "euro-pallet",
          "ind-pallet",
          "paper-roll",
          "heavy-box",
        ];
        return {
          id: c.id,
          clientId: c.shipmentId,
          clientName: `Shipment ${c.shipmentId.substring(0, 8)}`,
          typeId: validTypes.includes(c.label || "")
            ? c.label
            : validTypes[Math.floor(Math.random() * validTypes.length)],
        };
      });

      return reply.send(cargoPool);
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.post("/lcl/manifest/:containerId", async (request, reply) => {
    try {
      const { containerId } = request.params as any;
      const {
        specId,
        route,
        cargoItems: reqCargoItems,
        totalWeight,
      } = request.body as any;

      // Persist the packing manifest
      if (
        reqCargoItems &&
        Array.isArray(reqCargoItems) &&
        reqCargoItems.length > 0
      ) {
        // 1. Create a Master Shipment
        const masterShipmentId = `mbl-${containerId}`; // deterministic based on containerId
        await db
          .insert(shipments)
          .values({
            id: masterShipmentId,
            status: "consolidated",
            serviceType: "LCL-Master",
            trackingNumber: `MBL-${containerId.substring(0, 6)}`,
            companyId: "comp_1", // Default company
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: shipments.id,
            set: { updatedAt: new Date() },
          });

        // 2. Create the Shipment Container
        await db
          .insert(shipmentContainers)
          .values({
            id: containerId,
            shipmentId: masterShipmentId,
            containerNumber: `CONU-${containerId.substring(0, 8)}`,
            containerType: specId,
            weight: totalWeight,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: shipmentContainers.id,
            set: { updatedAt: new Date(), weight: totalWeight },
          });

        // 3. Assign cargo items
        const itemIds = reqCargoItems.map((c) => c.id);
        await db
          .update(cargoItems)
          .set({ containerId, updatedAt: new Date() })
          .where(inArray(cargoItems.id, itemIds));
      }

      const pdfBuffer = await PDFService.generateLclManifest({
        containerId,
        specId,
        route,
        cargoItems: reqCargoItems,
        totalWeight,
      });

      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename="LCL_Manifest_${containerId}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.post("/lcl/consolidate", async (request, reply) => {
    try {
      const { masterContainerId, assignedCargoIds } = request.body as any;
      if (assignedCargoIds && assignedCargoIds.length > 0) {
        await db
          .update(cargoItems)
          .set({ containerId: masterContainerId, updatedAt: new Date() })
          .where(inArray(cargoItems.id, assignedCargoIds));
      }
      return reply.send({
        success: true,
        message: "LCL consolidation saved",
        masterContainerId,
        assignedCargoIds,
      });
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.post("/lcl/optimize", async (request, reply) => {
    try {
      const { unassignedPool, containerSpec } = request.body as any;
      if (!unassignedPool || !containerSpec) {
        return reply.code(400).send({ error: "Missing parameters" });
      }

      const CARGO_TYPES: Record<string, any> = {
        "euro-pallet": { length: 1.2, width: 0.8, height: 1.4, weight: 0.8 },
        "ind-pallet": { length: 1.2, width: 1.0, height: 1.4, weight: 1.0 },
        "paper-roll": { length: 1.2, width: 1.2, height: 1.5, weight: 1.6 },
        "heavy-box": { length: 1.0, width: 1.0, height: 1.0, weight: 2.0 },
      };

      // FFD (First-Fit Decreasing) Heuristic Algorithm
      // 1. Sort cargo by Volume descending
      const poolWithDimensions = unassignedPool.map((item: any) => {
        const type = CARGO_TYPES[item.typeId] || {
          length: 1,
          width: 1,
          height: 1,
          weight: 1,
        };
        return {
          ...item,
          ...type,
          volume: type.length * type.width * type.height,
        };
      });

      poolWithDimensions.sort((a: any, b: any) => b.volume - a.volume);

      let currentWeight = 0;
      let currentVolume = 0;
      const maxWeight = containerSpec.maxWeight;
      const maxVolume = containerSpec.volume;
      const recommendedCargoIds: string[] = [];

      for (const item of poolWithDimensions) {
        if (
          currentWeight + item.weight <= maxWeight &&
          currentVolume + item.volume <= maxVolume
        ) {
          recommendedCargoIds.push(item.id);
          currentWeight += item.weight;
          currentVolume += item.volume;
        }
      }

      return reply.send({
        recommendedCargoIds,
        utilization: { weight: currentWeight, volume: currentVolume },
      });
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
          referenceNumber:
            body.bookingReference ||
            body.referenceNumber ||
            `BKG-${Date.now()}`,
          customerId: body.customerId || "c-1",
          status: body.status || "Pending",
          origin: body.origin,
          destination: body.destination,
          serviceType: body.serviceType || "Ocean",
          equipment: body.equipment,
          vessel: body.vessel,
          voyage: body.voyage,
          cargoDetails: body.commodities
            ? JSON.stringify(body.commodities)
            : body.commodity
              ? JSON.stringify([
                  { description: body.commodity, grossWeightKg: body.weight },
                ])
              : undefined,
        })
        .returning();
      return reply.send({
        ...newBooking[0],
        customer:
          newBooking[0]?.customerId === "c-1"
            ? "Demo Customer Ltd"
            : newBooking[0]?.customerId,
        commodities: newBooking[0]?.cargoDetails
          ? JSON.parse(newBooking[0].cargoDetails)
          : [],
        containers: [],
      });
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
      if (body.commodities)
        updateData.cargoDetails = JSON.stringify(body.commodities);
      // Map customer if provided
      if (body.customer && body.customer !== "Demo Customer Ltd") {
        updateData.customerId = body.customer;
      }

      const updated = await db
        .update(bookings)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(bookings.id, id))
        .returning();

      // Auto-generate Shipment and Customs Declaration
      if (
        updated[0] &&
        (updated[0].status === "DOCUMENTATION" ||
          updated[0].status === "CONFIRMED" ||
          updated[0].status === "Confirmed")
      ) {
        // Auto-create Shipment if it doesn't exist
        const existingShipment = await db
          .select()
          .from(shipments)
          .where(eq(shipments.id, updated[0].referenceNumber!))
          .limit(1);

        if (existingShipment.length === 0) {
          await db.insert(shipments).values({
            id: updated[0].referenceNumber!,
            status: "Pending", // initial status
            serviceType: updated[0].serviceType,
            vesselName: updated[0].vessel,
            voyageNumber: updated[0].voyage,
            origin: updated[0].origin,
            destination: updated[0].destination,
            companyId: updated[0].customerId || "c-1",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
        const existingDecl = await db
          .select()
          .from(customsDeclarations)
          .where(
            eq(customsDeclarations.shipmentId, updated[0].referenceNumber!),
          )
          .limit(1);

        if (existingDecl.length === 0) {
          await db.insert(customsDeclarations).values({
            id: `decl_${crypto.randomUUID().substring(0, 8)}`,
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
          const newInvoiceId = `inv_${crypto.randomUUID().substring(0, 8)}`;
          await db.insert(invoices).values({
            id: newInvoiceId,
            invoiceNumber: `INV-${updated[0].referenceNumber!}`,
            type: "AR",
            shipmentId: updated[0].referenceNumber!,
            companyId: updated[0].customerId || "c-1",
            amount: 1500.0, // Estimated demo value
            currency: "USD",
            status: "Draft",
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          await db.insert(invoiceItems).values({
            id: `item_${crypto.randomUUID().substring(0, 8)}`,
            invoiceId: newInvoiceId,
            description: `Freight Charges - ${updated[0].origin} to ${updated[0].destination}`,
            quantity: 1,
            unitPrice: 1500.0,
            total: 1500.0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      return reply.send({
        ...updated[0],
        customer:
          updated[0]?.customerId === "c-1"
            ? "Demo Customer Ltd"
            : updated[0]?.customerId,
        commodities: updated[0]?.cargoDetails
          ? JSON.parse(updated[0].cargoDetails)
          : [],
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

  // Demurrage & Detention Alerts GET
  fastify.get("/demurrage", async (request, reply) => {
    try {
      const containers = await db
        .select({
          id: shipmentContainers.id,
          containerNumber: shipmentContainers.containerNumber,
          shipmentId: shipments.id,
          origin: shipments.origin,
          destination: shipments.destination,
        })
        .from(shipmentContainers)
        .leftJoin(shipments, eq(shipmentContainers.shipmentId, shipments.id));

      const alerts: any[] = [];
      const now = Date.now();

      for (const c of containers) {
        if (!c.containerNumber) continue;

        let hash = 0;
        for (let i = 0; i < c.id.length; i++)
          hash = (hash << 5) - hash + c.id.charCodeAt(i);
        const freeTimeDays = 7;
        const dwellDays = 3 + (Math.abs(hash) % 10);
        const ratePerDay = 150;
        const remaining = freeTimeDays - dwellDays;

        if (remaining <= 2) {
          const existing = await db
            .select()
            .from(demurrageAlerts)
            .where(eq(demurrageAlerts.containerNumber, c.containerNumber));
          if (existing.length === 0 && c.shipmentId) {
            await db.insert(demurrageAlerts).values({
              id: crypto.randomUUID(),
              shipmentId: c.shipmentId,
              containerNumber: c.containerNumber,
              alertStatus: "active",
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        const dbAlert = await db
          .select()
          .from(demurrageAlerts)
          .where(eq(demurrageAlerts.containerNumber, c.containerNumber));
        if (dbAlert.length > 0 && dbAlert[0].alertStatus !== "dismissed") {
          alerts.push({
            id: c.id, // Using shipment container id
            reference: `SHP-${(c.shipmentId || "").substring(0, 6)}`,
            container: c.containerNumber,
            carrier: "Maersk",
            pol: c.origin || "Shanghai",
            pod: c.destination || "Los Angeles",
            eta: new Date(now + 86400000).toISOString(),
            portArrivalDate: new Date(now - dwellDays * 86400000).toISOString(),
            dwellDays,
            freeTimeDays,
            ratePerDay,
            status: "port",
          });
        }
      }
      return reply.send(alerts);
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  // POST /demurrage/mitigate
  fastify.post("/demurrage/mitigate", async (request, reply) => {
    try {
      const { containerId } = request.body as any;
      const sc = await db
        .select()
        .from(shipmentContainers)
        .where(eq(shipmentContainers.id, containerId));
      if (sc.length > 0 && sc[0].containerNumber) {
        await db
          .update(demurrageAlerts)
          .set({ alertStatus: "mitigated", updatedAt: new Date() })
          .where(eq(demurrageAlerts.containerNumber, sc[0].containerNumber));
      }
      return reply.send({ success: true });
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  // POST /demurrage/dismiss
  fastify.post("/demurrage/dismiss", async (request, reply) => {
    try {
      const { containerId } = request.body as any;
      const sc = await db
        .select()
        .from(shipmentContainers)
        .where(eq(shipmentContainers.id, containerId));
      if (sc.length > 0 && sc[0].containerNumber) {
        await db
          .update(demurrageAlerts)
          .set({ alertStatus: "dismissed", updatedAt: new Date() })
          .where(eq(demurrageAlerts.containerNumber, sc[0].containerNumber));
      }
      return reply.send({ success: true });
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  // --- WAREHOUSE TRAFFIC ENDPOINTS ---

  fastify.get("/warehouse/traffic", async (request, reply) => {
    try {
      await ensureSeedData();
      const traffic = await db.select().from(warehouseTraffic);
      return { success: true, data: traffic };
    } catch (error: any) {
      logger.error(error, "Failed to fetch warehouse traffic");
      return reply.code(500).send({ success: false, error: error.message });
    }
  });

  fastify.put("/warehouse/traffic/:id", async (request: any, reply) => {
    const { id } = request.params;
    const { status, assignedDock, eta } = request.body;
    try {
      const updated = await db
        .update(warehouseTraffic)
        .set({ status, assignedDock, eta, updatedAt: new Date() })
        .where(eq(warehouseTraffic.id, id))
        .returning();

      if (updated.length === 0) {
        return reply
          .code(404)
          .send({ success: false, error: "Traffic record not found" });
      }
      return { success: true, data: updated[0] };
    } catch (error: any) {
      logger.error(error, "Failed to update warehouse traffic");
      return reply.code(500).send({ success: false, error: error.message });
    }
  });

  // --- WAREHOUSE INVENTORY ENDPOINTS ---

  fastify.get("/warehouse/inventory", async (request, reply) => {
    try {
      await ensureSeedData();
      const inventory = await db.select().from(warehouseInventory);
      // Map to frontend structure
      const formatted = inventory.map((item, index) => {
        // Generate pseudo-random coordinates for the 3D grid based on the index
        const row = Math.floor(index / 2) - 1;
        const col = index % 2 === 0 ? -1 : 1;
        const z = 0;

        return {
          id: item.id,
          warehouseId: item.locationId,
          ownership: item.ownership,
          customer: item.customer,
          buyer: item.buyer,
          productCode: item.productCode,
          description: item.itemDescription,
          quantity: item.quantity,
          zone: item.zone,
          metadata: item.metadata ? JSON.parse(item.metadata as string) : {},
          status: item.status,
          // 3D visualizer required fields
          pos: [col, row * 2 + 0.7, z],
          color:
            item.status === "AVAILABLE"
              ? "#10b981"
              : item.status === "RESERVED"
                ? "#f59e0b"
                : "#3b82f6",
          sku: item.productCode,
          weight: item.quantity ? item.quantity * 100 : 500,
          destination: item.customer || "Unknown",
        };
      });
      return { success: true, data: formatted };
    } catch (error: any) {
      logger.error(error, "Failed to fetch warehouse inventory");
      return reply.code(500).send({ success: false, error: error.message });
    }
  });

  fastify.post("/warehouse/inventory", async (request: any, reply) => {
    const items = request.body.items; // Array of items to sync
    try {
      for (const item of items) {
        await db
          .insert(warehouseInventory)
          .values({
            id: item.id,
            locationId: item.warehouseId,
            ownership: item.ownership,
            customer: item.customer,
            buyer: item.buyer,
            productCode: item.productCode,
            itemDescription: item.description,
            quantity: item.quantity,
            zone: item.zone,
            metadata: JSON.stringify(item.metadata),
            status: item.status,
          })
          .onConflictDoUpdate({
            target: warehouseInventory.id,
            set: {
              quantity: item.quantity,
              status: item.status,
              zone: item.zone,
              updatedAt: new Date(),
            },
          });
      }
      return { success: true };
    } catch (error: any) {
      logger.error(error, "Failed to sync warehouse inventory");
      return reply.code(500).send({ success: false, error: error.message });
    }
  });
};

export default operationsRoutes;
