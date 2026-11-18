/**
 * @file demurrage.routes.ts
 * @description Operational route handlers for container demurrage & detention tracking, mitigation, and alert dismissal.
 * @module @atlas/routes/operations/demurrage
 * @see {@link docs/superpowers/plans/2026-11-15-issue-9-strict-eslint-restoration-routes.md}
 */

import { FastifyPluginAsync } from "fastify";
import crypto from "crypto";
import { db } from "../../db/index.js";
import {
  shipmentContainers,
  shipments,
  demurrageAlerts,
} from "../../db/schema/operations.js";
import { eq } from "drizzle-orm";
import { ensureOperationsSeedData } from "./seed-data.js";
import {
  DemurrageEngineService,
  RecordEquipmentEventInput,
  CalculateDAndDOptions,
  GenerateDailyAccrualsOptions,
  CertifySolasVgmInput,
} from "../../services/equipment/demurrage-engine.service.js";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface DemurrageContainerAlert {
  id: string;
  reference: string;
  container: string;
  carrier: string;
  pol: string;
  pod: string;
  eta: string;
  portArrivalDate: string;
  dwellDays: number;
  freeTimeDays: number;
  ratePerDay: number;
  status: string;
}

interface DemurrageActionBody {
  containerId: string;
}

// ============================================================================
// ROUTE PLUGIN
// ============================================================================

export const demurrageOperationsRoutes: FastifyPluginAsync = async (
  fastify,
) => {
  // Demurrage & Detention Alerts GET
  fastify.get("/demurrage", async (_request, reply) => {
    try {
      await ensureOperationsSeedData();
      const containers = await db
        .select({
          id: shipmentContainers.id,
          containerNumber: shipmentContainers.containerNumber,
          shipmentId: shipments.id,
          origin: shipments.origin,
          destination: shipments.destination,
        })
        .from(shipmentContainers)
        .leftJoin(shipments, eq(shipmentContainers.shipmentId, shipments.id))
        .limit(50);

      const existingAlerts = await db.select().from(demurrageAlerts);
      const alertMap = new Map<string, typeof demurrageAlerts.$inferSelect>(
        existingAlerts.map((a) => [a.containerNumber, a]),
      );

      const alerts: DemurrageContainerAlert[] = [];
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

        let dbAlert = alertMap.get(c.containerNumber);
        if (remaining <= 2 && !dbAlert && c.shipmentId) {
          const newAlertId = crypto.randomUUID();
          const [newAlert] = await db
            .insert(demurrageAlerts)
            .values({
              id: newAlertId,
              shipmentId: c.shipmentId,
              containerNumber: c.containerNumber,
              alertStatus: "active",
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();
          dbAlert = newAlert;
          if (dbAlert) {
            alertMap.set(c.containerNumber, dbAlert);
          }
        }

        if (dbAlert && dbAlert.alertStatus !== "dismissed") {
          alerts.push({
            id: c.id,
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
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Internal Server Error";
      return reply.code(500).send({ error: message });
    }
  });

  // POST /demurrage/mitigate
  fastify.post<{ Body: DemurrageActionBody }>(
    "/demurrage/mitigate",
    async (request, reply) => {
      try {
        const { containerId } = request.body || {};
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
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  // POST /demurrage/dismiss
  fastify.post<{ Body: DemurrageActionBody }>(
    "/demurrage/dismiss",
    async (request, reply) => {
      try {
        const { containerId } = request.body || {};
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
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  // ============================================================================
  // EQUIPMENT CONTROL & D&D LIFECYCLE ENDPOINTS
  // ============================================================================

  // POST /demurrage/events - Record equipment lifecycle milestone
  fastify.post<{ Body: RecordEquipmentEventInput }>(
    "/demurrage/events",
    async (request, reply) => {
      try {
        const result = await DemurrageEngineService.recordEquipmentEvent(
          request.body,
        );
        return reply.code(201).send({
          success: true,
          data: result,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(400).send({
          success: false,
          error: message,
        });
      }
    },
  );

  // GET /demurrage/containers/:containerNumber/lifecycle - Get container event log
  fastify.get<{ Params: { containerNumber: string } }>(
    "/demurrage/containers/:containerNumber/lifecycle",
    async (request, reply) => {
      try {
        const events = await DemurrageEngineService.getContainerLifecycle(
          request.params.containerNumber,
        );
        return reply.send({
          containerNumber: request.params.containerNumber.toUpperCase(),
          events,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  // POST /demurrage/calculate - Calculate Demurrage & Detention dwell and fees
  fastify.post<{
    Body: {
      containerNumber: string;
      options?: CalculateDAndDOptions;
    };
  }>("/demurrage/calculate", async (request, reply) => {
    try {
      const { containerNumber, options } = request.body || {};
      if (!containerNumber) {
        return reply.code(400).send({ error: "containerNumber is required" });
      }

      const result = await DemurrageEngineService.calculateEquipmentDAndD(
        containerNumber,
        options,
      );
      return reply.send({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Internal Server Error";
      return reply.code(400).send({ error: message });
    }
  });

  // POST /demurrage/run-accruals - Automated daily penalty accrual worker
  fastify.post<{ Body?: GenerateDailyAccrualsOptions }>(
    "/demurrage/run-accruals",
    async (request, reply) => {
      try {
        const summary =
          await DemurrageEngineService.generateDailyDemurrageAccruals(
            request.body || {},
          );
        return reply.send({
          success: true,
          data: summary,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  // POST /demurrage/vgm-certify - Certify SOLAS Verified Gross Mass (VGM)
  fastify.post<{ Body: CertifySolasVgmInput }>(
    "/demurrage/vgm-certify",
    async (request, reply) => {
      try {
        const result = await DemurrageEngineService.certifySolasVgm(
          request.body,
        );
        return reply.code(201).send({
          success: true,
          data: result,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(400).send({
          success: false,
          error: message,
        });
      }
    },
  );
};
