import { FastifyPluginAsync } from "fastify";
import NodeCache from "node-cache";
import { db } from "../db/index.js";
import {
  invoices,
  invoiceItems,
  agentSettlements,
} from "../db/schema/finance.js";
import { companies } from "../db/schema/core.js";
import { eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { pubsub } from "../services/pubsub.service.js";

// Cache for 12 hours (43200 seconds)
const currencyCache = new NodeCache({ stdTTL: 43200 });

const financialRoutes: FastifyPluginAsync = async (fastify, opts) => {
  fastify.get("/financials", async (request, reply) => {
    try {
      return [];
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.get("/exchange-rates", async (request, reply) => {
    try {
      const cachedRates = currencyCache.get("rates");
      if (cachedRates) {
        return reply.send({ data: cachedRates, source: "cache" });
      }

      const response = await fetch(
        "https://api.frankfurter.app/latest?to=USD,GBP,JPY,CNY",
      );
      if (!response.ok) {
        throw new Error("Failed to fetch exchange rates");
      }
      const data = await response.json();
      currencyCache.set("rates", data.rates);

      return reply.send({ data: data.rates, source: "api" });
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  // Dashboard KPI stats endpoint
  fastify.get("/financial-stats", async (_request, reply) => {
    try {
      return reply.send({
        totalShipments: 1250,
        onTimePercent: 92.5,
        costPerShipment: 450,
        revenueMtd: 1500000,
        costMtd: 1100000,
        marginPercent: 26.7,
        pendingInvoices: 38,
        overdueInvoices: 7,
        totalRevenue: 4200000,
        totalCost: 3100000,
      });
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.get("/invoices", async (request, reply) => {
    try {
      const allInvoices = await db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          type: invoices.type,
          party: companies.name,
          partyId: invoices.companyId,
          amount: invoices.amount,
          currency: invoices.currency,
          status: invoices.status,
          dueDate: invoices.dueDate,
          shipmentId: invoices.shipmentId,
        })
        .from(invoices)
        .leftJoin(companies, eq(invoices.companyId, companies.id));

      return reply.send(allInvoices);
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.post("/invoices", async (request, reply) => {
    try {
      const data: any = request.body;
      const invoiceId = uuidv4();

      await db.transaction(async (tx) => {
        await tx.insert(invoices).values({
          id: invoiceId,
          invoiceNumber: data.invoiceNumber,
          type: data.type || "AR",
          companyId: data.partyId || "00000000-0000-0000-0000-000000000000",
          amount: data.totalAmount || 0,
          taxAmount: data.taxAmount || 0,
          currency: data.currency || "USD",
          status: "Draft",
          dueDate: data.dueDate ? new Date(data.dueDate) : new Date(),
          createdAt: new Date(),
        });

        if (data.lines && data.lines.length > 0) {
          const itemsToInsert = data.lines.map((l: any) => ({
            id: uuidv4(),
            invoiceId,
            description: l.description,
            quantity: l.quantity || 1,
            unitPrice: l.unitPrice || 0,
            total: l.amount || 0,
            createdAt: new Date(),
          }));
          await tx.insert(invoiceItems).values(itemsToInsert);
        }
      });

      // Emit accounting sync event
      pubsub.emit("accounting.sync.requested", {
        invoiceId,
        invoiceNumber: data.invoiceNumber,
        status: "Draft",
        timestamp: new Date().toISOString(),
      });

      return reply.code(201).send({ id: invoiceId });
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.put("/invoices/:id/status", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { status } = request.body as { status: string };

      await db
        .update(invoices)
        .set({ status, updatedAt: new Date() })
        .where(eq(invoices.id, id));

      if (status === "Paid") {
        pubsub.emit("accounting.sync.requested", {
          invoiceId: id,
          status: "Paid",
          timestamp: new Date().toISOString(),
        });
      }

      return reply.send({ success: true });
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.get("/agent-settlements", async (request, reply) => {
    try {
      const settlements = await db
        .select({
          id: agentSettlements.id,
          statementNumber: agentSettlements.statementNumber,
          agentName: companies.name,
          periodStart: agentSettlements.periodStart,
          periodEnd: agentSettlements.periodEnd,
          netBalance: agentSettlements.netBalance,
          currency: agentSettlements.currency,
          status: agentSettlements.status,
        })
        .from(agentSettlements)
        .leftJoin(companies, eq(agentSettlements.agentId, companies.id))
        .orderBy(sql`${agentSettlements.createdAt} DESC`);

      return reply.send(settlements);
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.post("/agent-settlements", async (request, reply) => {
    try {
      const { agentId, periodStart, periodEnd, currency } = request.body as any;

      // Aggregates AP invoices for this agent in this period
      const result = await db
        .select({ netBalance: sql<number>`SUM(${invoices.amount})` })
        .from(invoices)
        .where(
          sql`${invoices.companyId} = ${agentId} AND ${invoices.type} = 'AP'`,
        );

      const balance = result[0]?.netBalance || 0;

      const newSettlement = await db
        .insert(agentSettlements)
        .values({
          id: uuidv4(),
          statementNumber: `STMT-${Date.now()}`,
          agentId,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          netBalance: balance,
          currency: currency || "USD",
          status: "Pending",
          createdAt: new Date(),
        })
        .returning();

      return reply.send(newSettlement[0]);
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });
};

export default financialRoutes;
