/**
 * @file lcl.routes.ts
 * @description Operational route handlers for LCL container consolidation, 3D cargo stowage optimization, and manifest generation.
 * @module @atlas/routes/operations/lcl
 * @see {@link docs/superpowers/plans/2026-11-15-issue-9-strict-eslint-restoration-routes.md}
 */

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
  calculateChargeableWeight,
  prorateMasterCosts,
  calculateConsolidationProfitability,
  TransportConsolidationMode,
  CostAllocationBasis,
} from "@atlas/shared";
import {
  OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_ID_PARAMS_SCHEMA,
  buildErrorResponses,
  buildParamSchema,
} from "../openapi.schemas.js";

const LCL_TAG = ["LCL Consolidation & 3D Stowage"] as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ContainerParams {
  id: string;
}

interface ManifestParams {
  containerId: string;
}

interface ManifestCargoItem {
  id: string;
  [key: string]: unknown;
}

interface ManifestBody {
  specId?: string;
  route?: string;
  cargoItems?: ManifestCargoItem[];
  totalWeight?: number;
}

interface ConsolidateBody {
  masterContainerId?: string;
  assignedCargoIds?: string[];
}

interface CargoTypeDimension {
  length: number;
  width: number;
  height: number;
  weight: number;
}

interface PoolItem {
  id: string;
  typeId?: string;
  [key: string]: unknown;
}

interface ContainerSpec {
  maxWeight: number;
  volume: number;
  [key: string]: unknown;
}

interface OptimizeBody {
  unassignedPool?: PoolItem[];
  containerSpec?: ContainerSpec;
}

interface RawStowageItem {
  id: string;
  label?: string | null;
  name?: string;
  width?: number | null;
  height?: number | null;
  depth?: number | null;
  lengthM?: number;
  weight?: number | null;
  weightKg?: number;
  stackable?: boolean | null;
  color?: string | null;
}

// ============================================================================
// ROUTE PLUGIN
// ============================================================================

export const lclOperationsRoutes: FastifyPluginAsync = async (fastify) => {
  // Container Planner Endpoints
  fastify.get(
    "/containers",
    {
      schema: {
        tags: [...LCL_TAG],
        summary:
          "List shipment containers available for 3D cargo stowage planning",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request, reply) => {
      try {
        await ensureOperationsSeedData();
        const items = await db.select().from(shipmentContainers).limit(10);
        if (items.length === 0) {
          return reply.send([
            { id: "demo-cont-1", containerType: "40ft High Cube" },
          ]);
        }
        return reply.send(items);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.get<{ Params: ContainerParams }>(
    "/containers/:id/cargo",
    {
      schema: {
        tags: [...LCL_TAG],
        summary: "List stowed cargo packages assigned to a specific container",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
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
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.post<{ Params: ContainerParams }>(
    "/containers/:id/optimize-load",
    {
      schema: {
        tags: [...LCL_TAG],
        summary:
          "Compute 3D bin-packing stowage coordinates, CoG, and axle balance",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const cargo = await db
          .select()
          .from(cargoItems)
          .where(eq(cargoItems.containerId, id));

        const rawItems: RawStowageItem[] =
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
        const itemsToPack: CargoItemInput[] = rawItems.map((item) => ({
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
          x:
            Math.round(
              (p.x + p.effectiveWidthM / 2 - container.internalWidthM / 2) *
                100,
            ) / 100,
          y: Math.round((p.z + p.effectiveHeightM / 2) * 100) / 100,
          z:
            Math.round(
              (p.y + p.effectiveLengthM / 2 - container.internalLengthM / 2) *
                100,
            ) / 100,
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
          suggestion: `Optimized 3D Stowage: ${result.packedItems.length}/${itemsToPack.length} packages stowed. CoG Score: ${result.centerOfGravity.stabilityScore}/100. ${result.axleDistribution.legalComplianceSummary}`,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  // LCL Engine Endpoints
  fastify.get(
    "/lcl/cargo",
    {
      schema: {
        tags: [...LCL_TAG],
        summary:
          "List unassigned LCL cargo pool awaiting container consolidation",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request, reply) => {
      try {
        await ensureOperationsSeedData();
        let unassignedCargo = await db
          .select()
          .from(cargoItems)
          .where(isNull(cargoItems.containerId));

        if (unassignedCargo.length === 0) {
          const types = [
            "euro-pallet",
            "ind-pallet",
            "paper-roll",
            "heavy-box",
          ];
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
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.post<{ Params: ManifestParams; Body: ManifestBody }>(
    "/lcl/manifest/:containerId",
    {
      schema: {
        tags: [...LCL_TAG],
        summary:
          "Persist consolidated cargo items and stream an LCL Container Manifest PDF",
        params: buildParamSchema(
          "containerId",
          "Master LCL container identifier.",
        ),
        response: {
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        await ensureOperationsSeedData();
        const { containerId } = request.params;
        const {
          specId,
          route,
          cargoItems: reqCargoItems,
          totalWeight,
        } = request.body || {};

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
              trackingNumber: `MBL-${containerId.substring(0, 6).toUpperCase()}`,
              companyId: "c-1",
            })
            .onConflictDoNothing();

          await db
            .insert(shipmentContainers)
            .values({
              id: containerId,
              shipmentId: masterShipmentId,
              containerNumber: `CONU-${containerId.substring(0, 8).toUpperCase()}`,
              containerType: specId || "40HC",
              weight: Number(totalWeight) || 0,
            })
            .onConflictDoNothing();

          const validItemIds = reqCargoItems
            .map((c) => c.id)
            .filter(
              (id): id is string => typeof id === "string" && id.length > 0,
            );

          if (validItemIds.length > 0) {
            await db
              .update(cargoItems)
              .set({ containerId, updatedAt: new Date() })
              .where(inArray(cargoItems.id, validItemIds));
          }
        }

        const pdfBuffer = await PDFService.generateLclManifest({
          containerId,
          specId: specId || "40ft Dry Van",
          route: route || "CNSHA -> ESBCN",
          cargoItems: reqCargoItems || [],
          totalWeight: Number(totalWeight) || 0,
        });

        reply.header("Content-Type", "application/pdf");
        reply.header(
          "Content-Disposition",
          `attachment; filename="LCL_Manifest_${containerId}.pdf"`,
        );
        return reply.send(pdfBuffer);
      } catch (error: unknown) {
        fastify.log.error(error);
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.post<{ Body: ConsolidateBody }>(
    "/lcl/consolidate",
    {
      schema: {
        tags: [...LCL_TAG],
        summary:
          "Assign loose LCL cargo items into a master consolidation container",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { masterContainerId, assignedCargoIds } = request.body || {};
        if (
          assignedCargoIds &&
          Array.isArray(assignedCargoIds) &&
          assignedCargoIds.length > 0 &&
          masterContainerId
        ) {
          // Ensure container exists in shipmentContainers to satisfy foreign key constraint
          const existingContainer = await db
            .select()
            .from(shipmentContainers)
            .where(eq(shipmentContainers.id, masterContainerId))
            .limit(1);

          if (existingContainer.length === 0) {
            await db
              .insert(shipmentContainers)
              .values({
                id: masterContainerId,
                shipmentId: "sh_demo_master",
                containerNumber: `MSCU-${masterContainerId.toUpperCase()}-7`,
                containerType: "40HC",
                sealNumber: `SL-${Math.floor(100000 + Math.random() * 900000)}`,
              })
              .onConflictDoNothing();
          }

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
      } catch (error: unknown) {
        fastify.log.error(error);
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.post<{ Body: OptimizeBody }>(
    "/lcl/optimize",
    {
      schema: {
        tags: [...LCL_TAG],
        summary:
          "Recommend optimal LCL cargo assignments by volume and payload weight",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { unassignedPool, containerSpec } = request.body || {};
        if (!unassignedPool || !containerSpec) {
          return reply.code(400).send({ error: "Missing parameters" });
        }

        const CARGO_TYPES: Record<string, CargoTypeDimension> = {
          "euro-pallet": { length: 1.2, width: 0.8, height: 1.4, weight: 0.8 },
          "ind-pallet": { length: 1.2, width: 1.0, height: 1.4, weight: 1.0 },
          "paper-roll": { length: 1.2, width: 1.2, height: 1.5, weight: 1.6 },
          "heavy-box": { length: 1.0, width: 1.0, height: 1.0, weight: 2.0 },
        };

        const poolWithDimensions = unassignedPool.map((item) => {
          const type = (item.typeId && CARGO_TYPES[item.typeId]) || {
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

        poolWithDimensions.sort((a, b) => b.volume - a.volume);

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
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  // Consolidation Math & Freight Rating Endpoints (atlas-consolidation-math)
  fastify.post<{
    Body: {
      grossWeightKg: number;
      volumeCbm: number;
      mode?: TransportConsolidationMode;
    };
  }>(
    "/lcl/calculate-cw",
    {
      schema: {
        tags: [...LCL_TAG],
        summary:
          "Calculate LCL/Air/Road chargeable weight and dimensional ratio",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const {
          grossWeightKg,
          volumeCbm,
          mode = "OCEAN_LCL",
        } = request.body || {};

        if (grossWeightKg === undefined || volumeCbm === undefined) {
          return reply
            .code(400)
            .send({
              error: "grossWeightKg and volumeCbm are required numbers.",
            });
        }

        const result = calculateChargeableWeight({
          grossWeightKg,
          volumeCbm,
          mode,
        });

        return reply.send({
          success: true,
          result,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.post<{
    Body: {
      masterCostId?: string;
      masterCostName?: string;
      masterAmount: number;
      currency?: string;
      allocationBasis?: CostAllocationBasis;
      houseItems: Array<{
        shipmentId: string;
        houseDocumentNumber: string;
        grossWeightKg: number;
        volumeCbm: number;
        chargeableWeightKg: number;
      }>;
    };
  }>(
    "/lcl/prorate-costs",
    {
      schema: {
        tags: [...LCL_TAG],
        summary:
          "Prorate master freight costs across consolidated house shipments",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const {
          masterCostId = "mcost_default",
          masterCostName = "Master Ocean Freight",
          masterAmount,
          currency = "USD",
          allocationBasis = "CHARGEABLE_WEIGHT",
          houseItems,
        } = request.body || {};

        if (masterAmount === undefined || !Array.isArray(houseItems)) {
          return reply.code(400).send({
            error: "masterAmount and houseItems array are required fields.",
          });
        }

        const proratedResult = prorateMasterCosts({
          masterCostId,
          masterCostName,
          masterAmount,
          currency,
          allocationBasis,
          houseItems,
        });

        return reply.send({
          success: true,
          proratedResult,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.post<{
    Body: {
      consolidationReference: string;
      currency?: string;
      masterCosts: Array<{ name: string; amount: number }>;
      houseShipments: Array<{
        shipmentId: string;
        houseDocumentNumber: string;
        grossWeightKg: number;
        volumeCbm: number;
        chargeableWeightKg: number;
        revenueAmount: number;
        houseSpecificCosts: number;
      }>;
    };
  }>(
    "/lcl/profitability",
    {
      schema: {
        tags: [...LCL_TAG],
        summary:
          "Calculate consolidated master-versus-house LCL P&L profitability",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const {
          consolidationReference,
          currency = "USD",
          masterCosts,
          houseShipments,
        } = request.body || {};

        if (
          !consolidationReference ||
          !Array.isArray(masterCosts) ||
          !Array.isArray(houseShipments)
        ) {
          return reply.code(400).send({
            error:
              "consolidationReference, masterCosts, and houseShipments are required.",
          });
        }

        const pnl = calculateConsolidationProfitability({
          consolidationReference,
          currency,
          masterCosts,
          houseShipments,
        });

        return reply.send({
          success: true,
          pnl,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );
};
