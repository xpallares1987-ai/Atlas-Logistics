/**
 * @file settlements.routes.ts
 * @description Operational route handlers for agent billing settlements, statement balances, and PDF statement exports.
 * @module @atlas/routes/financial/settlements
 * @see {@link docs/superpowers/plans/2026-11-15-issue-9-strict-eslint-restoration-routes.md}
 */

import { FastifyPluginAsync } from "fastify";
import { db } from "../../db/index.js";
import { invoices, agentSettlements } from "../../db/schema/finance.js";
import { companies } from "../../db/schema/core.js";
import { eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { PDFService } from "../../services/pdf.service.js";
import { ensureFinancialSeedData } from "./seed-data.js";
import {
  OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_ID_PARAMS_SCHEMA,
  buildErrorResponses,
} from "../openapi.schemas.js";

const SETTLEMENTS_TAG = ["Financial Settlements"] as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CreateSettlementBody {
  agentId: string;
  periodStart: string;
  periodEnd: string;
  currency?: string;
}

interface SettlementParams {
  id: string;
}

// ============================================================================
// ROUTE PLUGIN
// ============================================================================

export const settlementsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/agent-settlements",
    {
      schema: {
        tags: [...SETTLEMENTS_TAG],
        summary: "List agent billing settlement statements",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request, reply) => {
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
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.post<{ Body: CreateSettlementBody }>(
    "/agent-settlements",
    {
      schema: {
        tags: [...SETTLEMENTS_TAG],
        summary:
          "Generate a new agent settlement statement for a billing period",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { agentId, periodStart, periodEnd, currency } =
          request.body || {};

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
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.get<{ Params: SettlementParams }>(
    "/agent-settlements/:id/invoices",
    {
      schema: {
        tags: [...SETTLEMENTS_TAG],
        summary: "List AP invoices included in an agent settlement statement",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

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
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.get<{ Params: SettlementParams }>(
    "/agent-settlements/:id/pdf",
    {
      schema: {
        tags: [...SETTLEMENTS_TAG],
        summary: "Download official PDF statement for an agent settlement",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

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
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );
};

export default settlementsRoutes;
