import { FastifyPluginAsync } from "fastify";
import { db } from "../../db/index.js";
import {
  cargoItems,
  shipmentContainers,
  shipments,
} from "../../db/schema/operations.js";
import { eq, isNull, inArray } from "drizzle-orm";
import { PDFService } from "../../services/pdf.service.js";
import { ensureOperationsSeedData } from "./seed-data.js";

export const lclOperationsRoutes: FastifyPluginAsync = async (fastify) => {
  // Container Planner Endpoints
  fastify.get("/containers", async (request, reply) => {
    try {
      await ensureOperationsSeedData();
      const items = await db.select().from(shipmentContainers).limit(10);
      if (items.length === 0) {
        return reply.send([
          { id: "demo-cont-1", containerType: "40ft High Cube" },
        ]);
      }
      return reply.send(items);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
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
      return reply.code(500).send({ error: error.message });
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
      return reply.code(500).send({ error: error.message });
    }
  });

  // LCL Engine Endpoints
  fastify.get("/lcl/cargo", async (request, reply) => {
    try {
      await ensureOperationsSeedData();
      let unassignedCargo = await db
        .select()
        .from(cargoItems)
        .where(isNull(cargoItems.containerId));

      if (unassignedCargo.length === 0) {
        const types = ["euro-pallet", "ind-pallet", "paper-roll", "heavy-box"];
        const newCargo = Array.from({ length: 12 }).map((_, i) => ({
          id: `cargo_lcl_${Date.now()}_${i}`,
          shipmentId: "sh_demo_master",
          label: types[i % types.length],
          color: "#3b82f6",
          width: 1,
          height: 1,
          depth: 1,
          weight: 1,
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
      return reply.code(500).send({ error: error.message });
    }
  });

  fastify.post("/lcl/manifest/:containerId", async (request, reply) => {
    try {
      await ensureOperationsSeedData();
      const { containerId } = request.params as any;
      const {
        specId,
        route,
        cargoItems: reqCargoItems,
        totalWeight,
      } = request.body as any;

      if (
        reqCargoItems &&
        Array.isArray(reqCargoItems) &&
        reqCargoItems.length > 0
      ) {
        const masterShipmentId = `mbl-${containerId}`;
        await db
          .insert(shipments)
          .values({
            id: masterShipmentId,
            status: "consolidated",
            serviceType: "LCL-Master",
            trackingNumber: `MBL-${containerId.substring(0, 6)}`,
            companyId: "c-1",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: shipments.id,
            set: { updatedAt: new Date() },
          });

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
      return reply.code(500).send({ error: error.message });
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
      return reply.code(500).send({ error: error.message });
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
      return reply.code(500).send({ error: error.message });
    }
  });
};
