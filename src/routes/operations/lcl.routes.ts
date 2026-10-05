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
import {
  EQUIPMENT_CATALOG,
  optimizeStowage3D,
  CargoItemInput,
} from "@atlas/shared";

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

      const rawItems =
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
              },
              {
                id: "c2",
                label: "Auto Parts",
                color: "#ef4444",
                width: 2.0,
                height: 1.2,
                depth: 1.5,
                weight: 800,
              },
              {
                id: "c3",
                label: "Textiles",
                color: "#10b981",
                width: 1.0,
                height: 2.0,
                depth: 1.0,
                weight: 300,
              },
              {
                id: "c4",
                label: "Machinery",
                color: "#f59e0b",
                width: 2.2,
                height: 1.8,
                depth: 2.0,
                weight: 1200,
              },
            ];

      const container = EQUIPMENT_CATALOG["40ft_hc"];

      // Map to 3D Bin Packing Inputs
      const itemsToPack: CargoItemInput[] = rawItems.map((item: any) => ({
        id: item.id,
        name: item.label || item.name || "Cargo Item",
        widthM: Number(item.width),
        lengthM: Number(item.depth || item.lengthM || 1.2),
        heightM: Number(item.height),
        weightKg: Number(item.weight || item.weightKg || 500),
        stackable: item.stackable !== false,
        color: item.color || "#3b82f6",
      }));

      const result = optimizeStowage3D(container, itemsToPack, {
        centerPayload: true,
      });

      // Transform from corner origin (0, 0, 0) to centered Three.js coordinates
      const threeJsItems = result.packedItems.map((p) => ({
        id: p.id,
        label: p.name,
        color: p.color || "#3b82f6",
        width: p.effectiveWidthM,
        height: p.effectiveHeightM,
        depth: p.effectiveLengthM,
        weight: p.weightKg,
        x: Math.round((p.x + p.effectiveWidthM / 2 - container.internalWidthM / 2) * 100) / 100,
        y: Math.round((p.z + p.effectiveHeightM / 2) * 100) / 100,
        z: Math.round((p.y + p.effectiveLengthM / 2 - container.internalLengthM / 2) * 100) / 100,
      }));

      return reply.send({
        items: threeJsItems,
        metrics: {
          volumeUtilizationPercent: result.volumeUtilizationPercent,
          weightUtilizationPercent: result.weightUtilizationPercent,
          totalCargoWeightKg: result.totalCargoWeightKg,
          centerOfGravity: result.centerOfGravity,
          axleDistribution: result.axleDistribution,
          imoSegregation: result.imoSegregation,
        },
        suggestion: `Estiba 3D Optimizada: ${result.packedItems.length}/${itemsToPack.length} bultos estibados. CoG Score: ${result.centerOfGravity.stabilityScore}/100. ${result.axleDistribution.legalComplianceSummary}`,
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
