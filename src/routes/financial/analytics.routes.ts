import { FastifyPluginAsync } from "fastify";
import NodeCache from "node-cache";
import { db } from "../../db/index.js";
import { invoices, invoiceItems, revenues } from "../../db/schema/finance.js";
import { shipments, bookings } from "../../db/schema/operations.js";
import { eq, sql } from "drizzle-orm";

// Cache for 12 hours (43200 seconds)
const currencyCache = new NodeCache({ stdTTL: 43200 });

export const financialAnalyticsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/financials", async (request, reply) => {
    try {
      return [];
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
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
      return reply.code(500).send({ error: error.message });
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
        Drayage: { ap: 0, ar: 0 },
        Warehousing: { ap: 0, ar: 0 },
        Agent: { ap: 0, ar: 0 },
        Other: { ap: 0, ar: 0 },
      };

      allItems.forEach((item) => {
        let matchedCategory = "Other";
        for (const cat of categories) {
          if (
            cat.match.some((m) =>
              item.description?.toLowerCase().includes(m.toLowerCase()),
            )
          ) {
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

      const data = Object.keys(resultMap)
        .map((key) => ({
          category: key,
          ap: resultMap[key].ap,
          ar: resultMap[key].ar,
        }))
        .filter((x) => x.ap > 0 || x.ar > 0);

      if (data.length === 0) {
        return reply.send({
          data: [
            { category: "Ocean Freight", ap: 45000, ar: 58000 },
            { category: "Customs Brokerage", ap: 5200, ar: 8500 },
            { category: "Drayage", ap: 12000, ar: 14500 },
            { category: "Warehousing", ap: 8500, ar: 12000 },
            { category: "Insurance", ap: 1500, ar: 2500 },
          ],
          alerts: [
            "Using placeholder data. Create bookings & invoices to see real data.",
          ],
        });
      }

      const alerts: string[] = [];
      if (
        resultMap["Ocean Freight"]?.ar > 0 &&
        resultMap["Ocean Freight"]?.ap === 0
      ) {
        alerts.push("Missing AP (Cost) invoice for recorded Ocean Freight AR.");
      }

      return reply.send({ data, alerts });
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
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
        .where(sql`${invoices.status} IN ('DRAFT', 'ISSUED')`);

      const [overdueCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(eq(invoices.status, "OVERDUE"));

      const hasData = shipmentsCount.count > 0;

      return reply.send({
        totalShipments: hasData ? shipmentsCount.count : 1250,
        onTimePercent: 92.5,
        costPerShipment: 450,
        revenueMtd: hasData ? revenueSum.total || 0 : 1500000,
        costMtd: 1100000,
        marginPercent: 26.7,
        pendingInvoices: hasData ? pendingCount.count : 38,
        overdueInvoices: hasData ? overdueCount.count : 7,
        totalRevenue: hasData ? revenueSum.total || 0 : 4200000,
      });
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  fastify.get("/dashboard-charts", async (_request, reply) => {
    try {
      const revenueTrend = [
        { name: "Jan", revenue: 450000, costs: 320000 },
        { name: "Feb", revenue: 520000, costs: 380000 },
        { name: "Mar", revenue: 480000, costs: 350000 },
        { name: "Apr", revenue: 610000, costs: 420000 },
        { name: "May", revenue: 590000, costs: 410000 },
        { name: "Jun", revenue: 750000, costs: 490000 },
      ];

      const statusCounts = await db
        .select({
          status: bookings.status,
          count: sql<number>`count(*)`,
        })
        .from(bookings)
        .groupBy(bookings.status);

      let volumeByStatus = [
        { status: "In Transit", count: 0 },
        { status: "Completed", count: 0 },
        { status: "Pending", count: 0 },
        { status: "Confirmed", count: 0 },
      ];

      statusCounts.forEach((row) => {
        const item = volumeByStatus.find((v) => v.status === row.status);
        if (item) {
          item.count = row.count;
        } else {
          volumeByStatus.push({ status: row.status, count: row.count });
        }
      });

      if (statusCounts.length === 0) {
        volumeByStatus = [
          { status: "In Transit", count: 420 },
          { status: "Pending", count: 150 },
          { status: "Completed", count: 850 },
          { status: "Confirmed", count: 35 },
        ];
      }

      return reply.send({ revenueTrend, volumeByStatus });
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });
};
