import { FastifyPluginAsync } from "fastify";
import { db } from "../../db/index.js";
import { invoices, agentSettlements } from "../../db/schema/finance.js";
import { companies } from "../../db/schema/core.js";
import { eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { PDFService } from "../../services/pdf.service.js";
import { ensureFinancialSeedData } from "./seed-data.js";

export const settlementsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/agent-settlements", async (request, reply) => {
    try {
      await ensureFinancialSeedData();

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
      return reply.code(500).send({ error: error.message });
    }
  });

  fastify.post("/agent-settlements", async (request, reply) => {
    try {
      const { agentId, periodStart, periodEnd, currency } = request.body as any;

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
      return reply.code(500).send({ error: error.message });
    }
  });

  fastify.get("/agent-settlements/:id/invoices", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const settlementRecord = await db
        .select()
        .from(agentSettlements)
        .where(eq(agentSettlements.id, id))
        .limit(1);

      if (settlementRecord.length === 0) {
        return reply.code(404).send({ error: "Settlement not found" });
      }

      const st = settlementRecord[0];

      const apInvoices = await db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          amount: invoices.amount,
          currency: invoices.currency,
          status: invoices.status,
          dueDate: invoices.dueDate,
          createdAt: invoices.createdAt,
          shipmentId: invoices.shipmentId,
        })
        .from(invoices)
        .where(
          sql`${invoices.companyId} = ${st.agentId} AND ${invoices.type} = 'AP' AND ${invoices.createdAt} >= ${st.periodStart} AND ${invoices.createdAt} <= ${st.periodEnd}`,
        );

      return reply.send(apInvoices);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  fastify.get("/agent-settlements/:id/pdf", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const records = await db
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
        .where(eq(agentSettlements.id, id))
        .limit(1);

      if (records.length === 0) {
        return reply.code(404).send({ error: "Settlement not found" });
      }

      const st = records[0];

      const pdfData = {
        statementNumber: st.statementNumber,
        agentName: st.agentName || "Unknown Agent",
        periodStart: st.periodStart.toISOString(),
        periodEnd: st.periodEnd.toISOString(),
        netBalance: st.netBalance,
        currency: st.currency,
        status: st.status,
      };

      const pdfBuffer = await PDFService.generateAgentSettlement(pdfData);

      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename=Settlement_${st.statementNumber}.pdf`,
      );
      return reply.send(pdfBuffer);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });
};
