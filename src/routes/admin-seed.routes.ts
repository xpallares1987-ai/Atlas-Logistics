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

const adminSeedRoutes: FastifyPluginAsync = async (fastify) => {
  // Check authorization
  fastify.addHook("onRequest", async (request, reply) => {
    // In test or development environments, allow access for seamless developer experience
    if (
      process.env.NODE_ENV === "test" ||
      process.env.NODE_ENV === "development"
    ) {
      return;
    }
    const user = (request as any).user;
    if (!user || user.role !== "ADMIN") {
      return reply
        .status(403)
        .send({ error: "Forbidden: ADMIN role required" });
    }
  });

  // GET /api/admin/seed/status
  fastify.get("/status", async (_request, reply) => {
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
    } catch (error: any) {
      logger.error({ err: error }, "Failed to fetch seed status");
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // POST /api/admin/seed/:phase
  fastify.post("/:phase", async (request, reply) => {
    const { phase } = request.params as { phase: string };
    const startTime = Date.now();

    logger.info(`Admin initiated manual seed trigger for [Phase: ${phase}]`);

    try {
      let resultMessage = "";

      switch (phase) {
        case "1":
          await seedPhase1();
          resultMessage =
            "Fase 1 (Operaciones Multimodales & Control Tower) inyectada con éxito.";
          break;
        case "2":
          await seedPhase2();
          resultMessage =
            "Fase 2 (Cadena de Frío, Mercancías Peligrosas & CBAM) inyectada con éxito.";
          break;
        case "3":
          await seedPhase3();
          resultMessage =
            "Fase 3 (Facturación AR/AP, Créditos UCP 600 & Bóveda) inyectada con éxito.";
          break;
        case "4":
          await seedPhase4();
          resultMessage =
            "Fase 4 (Aduanas USMCA / Carta Porte, e.Firma SAT, Smart Contracts MLETR & ERP) inyectada con éxito.";
          break;
        case "5":
          await seedPhase5();
          resultMessage =
            "Fase 5 (Disputas FMC, Reservas DCSA & Estiba 3D) inyectada con éxito.";
          break;
        case "all":
          await runAllSeeds();
          resultMessage =
            "Todas las fases (Fases 1, 2, 3, 4 y 5) inyectadas con éxito.";
          break;
        default:
          return reply.status(400).send({
            success: false,
            error: `Fase desconocida: '${phase}'. Valores admitidos: 1, 2, 3, 4, 5, all`,
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
    } catch (error: any) {
      logger.error(
        { err: error },
        `Error during admin seed trigger for [Phase: ${phase}]:`,
      );
      return reply.status(500).send({ success: false, error: error.message });
    }
  });
};

export default adminSeedRoutes;
