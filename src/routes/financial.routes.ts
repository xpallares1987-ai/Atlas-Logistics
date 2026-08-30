import { FastifyPluginAsync } from "fastify";
import NodeCache from "node-cache";
import { db } from "../db/index.js";
import {
  invoices,
  invoiceItems,
  agentSettlements,
  revenues,
} from "../db/schema/finance.js";
import { shipments } from "../db/schema/operations.js";
import { companies } from "../db/schema/core.js";
import { eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { pubsub } from "../services/pubsub.service.js";
import { PDFService, InvoiceData } from "../services/pdf.service.js";

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

  fastify.get("/profitability", async (request, reply) => {
    try {
      const allItems = await db
        .select({
          type: invoices.type,
          description: invoiceItems.description,
          total: invoiceItems.total,
        })
        .from(invoiceItems)
        .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id));

      const categories = [
        { key: "Ocean Freight", match: ["Freight", "Ocean", "Air"] },
        { key: "Customs Brokerage", match: ["Customs", "Brokerage", "Duties"] },
        { key: "Drayage", match: ["Drayage", "Truck", "Inland"] },
        { key: "Warehousing", match: ["Warehouse", "Storage"] },
        { key: "Agent", match: ["Agent", "Profit Share"] },
      ];

      const resultMap: Record<string, { ap: number; ar: number }> = {
        "Ocean Freight": { ap: 0, ar: 0 },
        "Customs Brokerage": { ap: 0, ar: 0 },
        "Drayage": { ap: 0, ar: 0 },
        "Warehousing": { ap: 0, ar: 0 },
        "Agent": { ap: 0, ar: 0 },
        "Other": { ap: 0, ar: 0 },
      };

      allItems.forEach(item => {
        let matchedCategory = "Other";
        for (const cat of categories) {
          if (cat.match.some(m => item.description?.toLowerCase().includes(m.toLowerCase()))) {
            matchedCategory = cat.key;
            break;
          }
        }
        
        if (item.type === "AR") {
          resultMap[matchedCategory].ar += item.total;
        } else if (item.type === "AP") {
          resultMap[matchedCategory].ap += item.total;
        }
      });

      const data = Object.keys(resultMap).map(key => ({
        category: key,
        ap: resultMap[key].ap,
        ar: resultMap[key].ar,
      })).filter(x => x.ap > 0 || x.ar > 0);

      if (data.length === 0) {
        return reply.send({
          data: [
            { category: 'Ocean Freight', ap: 45000, ar: 58000 },
            { category: 'Customs Brokerage', ap: 5200, ar: 8500 },
            { category: 'Drayage', ap: 12000, ar: 14500 },
            { category: 'Warehousing', ap: 8500, ar: 12000 },
            { category: 'Insurance', ap: 1500, ar: 2500 },
          ],
          alerts: ["Using placeholder data. Create bookings & invoices to see real data."]
        });
      }

      const alerts: string[] = [];
      if (resultMap["Ocean Freight"]?.ar > 0 && resultMap["Ocean Freight"]?.ap === 0) {
        alerts.push("Missing AP (Cost) invoice for recorded Ocean Freight AR.");
      }

      return reply.send({ data, alerts });
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  // Dashboard KPI stats endpoint
  fastify.get("/financial-stats", async (_request, reply) => {
    try {
      const [shipmentsCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(shipments);

      const [revenueSum] = await db
        .select({ total: sql<number>`sum(${revenues.amount})` })
        .from(revenues);

      const [pendingCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(sql`upper(${invoices.status}) IN ('DRAFT', 'ISSUED')`);

      const [overdueCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(eq(invoices.status, 'OVERDUE'));

      return reply.send({
        totalShipments: shipmentsCount.count,
        onTimePercent: 0,
        costPerShipment: 0,
        revenueMtd: revenueSum.total || 0,
        costMtd: 0,
        marginPercent: 0,
        pendingInvoices: pendingCount.count,
        overdueInvoices: overdueCount.count,
        totalRevenue: revenueSum.total || 0,
      });
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.get("/dashboard-charts", async (_request, reply) => {
    try {
      // Aggregate real shipment statuses
      const statusRows = await db
        .select({ status: shipments.status, count: sql<number>`count(*)` })
        .from(shipments)
        .groupBy(shipments.status);

      const volumeByStatus = statusRows.map((r) => ({ status: r.status, count: r.count }));

      // Aggregate real revenue/cost data from invoices by month
      const arRows = await db
        .select({ month: sql<string>`strftime('%m', ${invoices.createdAt})`, total: sql<number>`sum(${invoices.amount})` })
        .from(invoices)
        .where(eq(invoices.type, 'AR'))
        .groupBy(sql`strftime('%m', ${invoices.createdAt})`);

      const apRows = await db
        .select({ month: sql<string>`strftime('%m', ${invoices.createdAt})`, total: sql<number>`sum(${invoices.amount})` })
        .from(invoices)
        .where(eq(invoices.type, 'AP'))
        .groupBy(sql`strftime('%m', ${invoices.createdAt})`);

      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const arMap = Object.fromEntries(arRows.map(r => [r.month, r.total || 0]));
      const apMap = Object.fromEntries(apRows.map(r => [r.month, r.total || 0]));
      const months = new Set([...Object.keys(arMap), ...Object.keys(apMap)]);
      const revenueTrend = Array.from(months).sort().map(m => ({
        name: monthNames[parseInt(m, 10) - 1] || m,
        revenue: arMap[m] || 0,
        costs: apMap[m] || 0,
      }));

      return reply.send({ revenueTrend, volumeByStatus });
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

  fastify.get("/invoices/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const invoiceRecords = await db
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
        .leftJoin(companies, eq(invoices.companyId, companies.id))
        .where(eq(invoices.id, id));

      if (invoiceRecords.length === 0) {
        return reply.code(404).send({ error: "Invoice not found" });
      }

      const items = await db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, id));

      return reply.send({
        ...invoiceRecords[0],
        items: items.map((i) => ({
          id: i.id,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.total,
        })),
      });
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.get("/invoices/:id/pdf", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Load invoice
      const invoiceRecords = await db
        .select({
          invoiceNumber: invoices.invoiceNumber,
          type: invoices.type,
          party: companies.name,
          dueDate: invoices.dueDate,
          currency: invoices.currency,
          amount: invoices.amount,
        })
        .from(invoices)
        .leftJoin(companies, eq(invoices.companyId, companies.id))
        .where(eq(invoices.id, id))
        .limit(1);

      if (invoiceRecords.length === 0) {
        return reply.code(404).send({ error: "Invoice not found" });
      }

      // Load invoice items
      const items = await db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, id));

      const invoiceData: InvoiceData = {
        ...invoiceRecords[0],
        party: invoiceRecords[0].party || "Unknown Client",
        dueDate: invoiceRecords[0].dueDate ? new Date(invoiceRecords[0].dueDate).toISOString() : new Date().toISOString(),
        items: items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.total,
        })),
      };

      const pdfBuffer = await PDFService.generateInvoice(invoiceData);

      reply.header("Content-Type", "application/pdf");
      reply.header("Content-Disposition", `inline; filename="Invoice-${invoiceData.invoiceNumber}.pdf"`);
      return reply.send(pdfBuffer);
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
          shipmentId: data.shipmentId || null,
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

        // Agent Settlement Logic: Auto-generate AP invoice and settlement for 15% profit share
        const paidInvoice = await db
          .select()
          .from(invoices)
          .where(eq(invoices.id, id))
          .limit(1);

        if (paidInvoice.length > 0 && paidInvoice[0].type === "AR" && paidInvoice[0].shipmentId) {
          const profitShareAmount = paidInvoice[0].amount * 0.15; // 15% to destination agent
          const agentId = "comp-2"; // Demo agent company ID
          const apInvoiceId = `inv_ap_${uuidv4().substring(0,8)}`;

          await db.transaction(async (tx) => {
            // Generate AP Invoice
            await tx.insert(invoices).values({
              id: apInvoiceId,
              invoiceNumber: `AP-${paidInvoice[0].shipmentId}`,
              type: "AP",
              shipmentId: paidInvoice[0].shipmentId,
              companyId: agentId,
              amount: profitShareAmount,
              currency: paidInvoice[0].currency,
              status: "Draft",
              dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            await tx.insert(invoiceItems).values({
              id: `item_ap_${uuidv4().substring(0,8)}`,
              invoiceId: apInvoiceId,
              description: `Destination Agent Profit Share (15%) - Ref: ${paidInvoice[0].shipmentId}`,
              quantity: 1,
              unitPrice: profitShareAmount,
              total: profitShareAmount,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // Generate Agent Settlement record
            await tx.insert(agentSettlements).values({
              id: `settlement_${uuidv4().substring(0,8)}`,
              statementNumber: `STMT-${paidInvoice[0].shipmentId}`,
              agentId: agentId,
              periodStart: new Date(),
              periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              netBalance: profitShareAmount,
              currency: paidInvoice[0].currency,
              status: "Pending",
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          });
        }
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
