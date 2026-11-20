/**
 * @file admin-seed.routes.ts
 * @description Administrative database seeding status and phase trigger routes.
 * @module @atlas/api/routes/admin-seed
 */

import { FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import * as schema from "../db/schema/index.js";
import { sql } from "drizzle-orm";
import {
  seedPhase1,
  seedPhase2,
  seedPhase3,
  seedPhase4,
  seedPhase5,
  runAllSeeds,
} from "../db/seeds/index.js";
import { logger } from "../config/logger.js";
import {
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  buildErrorResponses,
  buildParamSchema,
} from "./openapi.schemas.js";

const ADMIN_SEED_TAG = ["Admin Database & Seeding"] as const;

const adminSeedRoutes: FastifyPluginAsync = async (fastify) => {
  // Check authorization
  fastify.addHook("onRequest", async (request, reply) => {
    if (process.env.NODE_ENV === "test") {
      return;
    }
    const user = request.user;
    if (!user || user.role !== "ADMIN") {
      return reply
        .status(403)
        .send({ error: "Forbidden: ADMIN role required" });
    }
  });

  // GET /api/admin/seed/status
  fastify.get(
    "/status",
    {
      schema: {
        tags: [...ADMIN_SEED_TAG],
        summary:
          "Inspect current row counts across all five database seed phases",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request, reply) => {
      try {
        const [shipmentsRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.shipments);
        const [incidentsRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.controlTowerIncidents);
        const [drayageRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.drayageTransportOrders);
        const [coldChainRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.coldChainShipments);
        const [readingsRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.temperatureReadings);
        const [dgRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.dgShipments);
        const [cbamRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.cbamDeclarations);
        const [invoicesRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.invoices);
        const [tradeFinanceRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.tradeCreditInstruments);
        const [cartaPorteRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.cartaPorteDeclarations);
        const [efirmaRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.efirmaAuditStamps);
        const [escrowRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.smartEscrowContracts);
        const [erpOrdersRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.erpPurchaseOrders);
        const [demurrageInvoicesRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.demurrageInvoices);
        const [demurrageDisputesRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.demurrageDisputes);
        const [oceanBookingsRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.oceanBookingDetails);
        const [stowagePlansRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.containerStowagePlans);

        return reply.send({
          success: true,
          stats: {
            phase1: {
              shipments: shipmentsRow?.count ?? 0,
              incidents: incidentsRow?.count ?? 0,
              drayageOrders: drayageRow?.count ?? 0,
            },
            phase2: {
              coldChainShipments: coldChainRow?.count ?? 0,
              temperatureReadings: readingsRow?.count ?? 0,
              dangerousGoods: dgRow?.count ?? 0,
              cbamDeclarations: cbamRow?.count ?? 0,
            },
            phase3: {
              invoices: invoicesRow?.count ?? 0,
              tradeCreditInstruments: tradeFinanceRow?.count ?? 0,
            },
            phase4: {
              cartaPorteDeclarations: cartaPorteRow?.count ?? 0,
              efirmaAuditStamps: efirmaRow?.count ?? 0,
              smartEscrowContracts: escrowRow?.count ?? 0,
              erpPurchaseOrders: erpOrdersRow?.count ?? 0,
            },
            phase5: {
              demurrageInvoices: demurrageInvoicesRow?.count ?? 0,
              demurrageDisputes: demurrageDisputesRow?.count ?? 0,
              oceanBookings: oceanBookingsRow?.count ?? 0,
              stowagePlans: stowagePlansRow?.count ?? 0,
            },
          },
        });
      } catch (error: unknown) {
        logger.error({ err: error }, "Failed to fetch seed status");
        return reply.status(500).send({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch seed status",
        });
      }
    },
  );

  // POST /api/admin/seed/:phase
  fastify.post(
    "/:phase",
    {
      schema: {
        tags: [...ADMIN_SEED_TAG],
        summary:
          "Trigger deterministic database seeding for a specific phase or all phases",
        params: buildParamSchema(
          "phase",
          "Seed phase identifier (1, 2, 3, 4, 5, or all).",
        ),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      const { phase } = request.params as { phase: string };
      const startTime = Date.now();

      logger.info(`Admin initiated manual seed trigger for [Phase: ${phase}]`);

      try {
        let resultMessage = "";

        switch (phase) {
          case "1":
            await seedPhase1();
            resultMessage =
              "Phase 1 (Multimodal Operations & Control Tower) seeded successfully.";
            break;
          case "2":
            await seedPhase2();
            resultMessage =
              "Phase 2 (Cold Chain, Dangerous Goods & CBAM) seeded successfully.";
            break;
          case "3":
            await seedPhase3();
            resultMessage =
              "Phase 3 (AR/AP Invoicing, UCP 600 Credit & Vault) seeded successfully.";
            break;
          case "4":
            await seedPhase4();
            resultMessage =
              "Phase 4 (USMCA Customs / Carta Porte, SAT e.Firma, MLETR Smart Contracts & ERP) seeded successfully.";
            break;
          case "5":
            await seedPhase5();
            resultMessage =
              "Phase 5 (FMC Disputes, DCSA Bookings & 3D Stowage) seeded successfully.";
            break;
          case "all":
            await runAllSeeds();
            resultMessage =
              "All phases (Phases 1, 2, 3, 4, and 5) seeded successfully.";
            break;
          default:
            return reply.status(400).send({
              success: false,
              error: `Unknown phase: '${phase}'. Allowed values: 1, 2, 3, 4, 5, all`,
            });
        }

        const durationMs = Date.now() - startTime;
        logger.info(
          `Seed execution for Phase [${phase}] finished in ${durationMs}ms`,
        );

        return reply.send({
          success: true,
          phase,
          durationMs,
          message: resultMessage,
        });
      } catch (error: unknown) {
        logger.error(
          { err: error },
          `Error during admin seed trigger for [Phase: ${phase}]:`,
        );
        return reply.status(500).send({
          success: false,
          error:
            error instanceof Error ? error.message : "Seed execution failed",
        });
      }
    },
  );
};

export default adminSeedRoutes;
