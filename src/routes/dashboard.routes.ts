import { FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import { shipments, locations, invoices } from "../db/schema/index.js";
import { sql, eq, desc, and, gte, lte } from "drizzle-orm";

const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/", async (request, reply) => {
    try {
      const { start, end } = request.query as { start?: string; end?: string };

      const invoiceConditions = [eq(invoices.type, "AR")];
      const shipmentConditions = [];
      const activeShipmentConditions = [eq(shipments.status, "IN_TRANSIT")];
      const completedShipmentConditions = [eq(shipments.status, "DELIVERED")];

      if (start) {
        const startDate = new Date(start);
        invoiceConditions.push(gte(invoices.createdAt, startDate));
        shipmentConditions.push(gte(shipments.createdAt, startDate));
        activeShipmentConditions.push(gte(shipments.createdAt, startDate));
        completedShipmentConditions.push(gte(shipments.createdAt, startDate));
      }
      if (end) {
        const endDate = new Date(end);
        invoiceConditions.push(lte(invoices.createdAt, endDate));
        shipmentConditions.push(lte(shipments.createdAt, endDate));
        activeShipmentConditions.push(lte(shipments.createdAt, endDate));
        completedShipmentConditions.push(lte(shipments.createdAt, endDate));
      }

      // 1. STATS
      // Total Revenue
      const revenueResult = await db
        .select({ total: sql<number>`SUM(${invoices.amount})` })
        .from(invoices)
        .where(and(...invoiceConditions));

      const totalRevenue = revenueResult[0]?.total || 0;

      // Active Shipments Count
      const activeShipmentsResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(shipments)
        .where(and(...activeShipmentConditions));
      const activeShipments = activeShipmentsResult[0]?.count || 0;

      // Completed Shipments Count
      const completedShipmentsResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(shipments)
        .where(and(...completedShipmentConditions));
      const completedShipments = completedShipmentsResult[0]?.count || 0;

      // 2. REVENUE CHART (Real Monthly Aggregation)
      const allInvoices = await db
        .select({ amount: invoices.amount, createdAt: invoices.createdAt })
        .from(invoices)
        .where(and(...invoiceConditions));

      const monthlyBuckets = new Map<string, number>();
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      for (const inv of allInvoices) {
        if (!inv.createdAt) continue;
        const d = new Date(inv.createdAt);
        const key = monthNames[d.getMonth()];
        monthlyBuckets.set(key, (monthlyBuckets.get(key) || 0) + inv.amount);
      }

      const revenueChart = Array.from(monthlyBuckets.entries()).map(
        ([name, value]) => ({
          name,
          value,
        }),
      );
      // If empty, supply some default zeros
      if (revenueChart.length === 0) {
        revenueChart.push({
          name: monthNames[new Date().getMonth()],
          value: 0,
        });
      }

      // 3. VOLUME BY STATUS
      const volumeQuery = await db
        .select({
          status: shipments.status,
          count: sql<number>`COUNT(*)`,
        })
        .from(shipments)
        .where(
          shipmentConditions.length > 0
            ? and(...shipmentConditions)
            : undefined,
        )
        .groupBy(shipments.status);

      const volumeByStatus = volumeQuery.map((row) => ({
        status: row.status.replace(/_/g, " "),
        count: row.count,
      }));

      // 4. ACTIVE SHIPMENTS LIST
      const activeList = await db
        .select({
          id: shipments.id,
          referenceNumber: shipments.referenceNumber,
          status: shipments.status,
          originId: shipments.originId,
          destinationId: shipments.destinationId,
          createdAt: shipments.createdAt,
        })
        .from(shipments)
        .where(eq(shipments.status, "IN_TRANSIT"))
        .orderBy(desc(shipments.createdAt))
        .limit(5);

      // Join with locations to get names
      const locs = await db.select().from(locations);
      const locMap = new Map(locs.map((l) => [l.id, l]));

      const enrichedActiveList = activeList.map((s) => ({
        ...s,
        origin: locMap.get(s.originId)?.name || "Unknown",
        destination: locMap.get(s.destinationId)?.name || "Unknown",
        originCoords: [
          locMap.get(s.originId)?.longitude || 0,
          locMap.get(s.originId)?.latitude || 0,
        ],
        destinationCoords: [
          locMap.get(s.destinationId)?.longitude || 0,
          locMap.get(s.destinationId)?.latitude || 0,
        ],
      }));

      return {
        success: true,
        data: {
          stats: {
            revenue: totalRevenue,
            activeShipments,
            completedShipments,
            satisfaction: 98, // Mocked for now
          },
          revenueChart,
          volumeByStatus,
          activeList: enrichedActiveList,
        },
      };
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ success: false, error: error.message });
    }
  });

  // WebSocket Live Updates
  fastify.get("/live", { websocket: true }, (connection, req) => {
    req.log.info("Client connected to dashboard live stream");

    let active = true;

    // Simulate push events every 5 seconds
    const interval = setInterval(async () => {
      if (!active) return;
      try {
        // Fetch real-time active shipment count
        const activeShipmentsResult = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(shipments)
          .where(eq(shipments.status, "IN_TRANSIT"));
        const activeShipments = activeShipmentsResult[0]?.count || 0;

        connection.socket.send(
          JSON.stringify({
            type: "STATS_UPDATE",
            data: {
              activeShipments,
              timestamp: new Date().toISOString(),
            },
          }),
        );
      } catch (err) {
        req.log.error("WebSocket broadcast error", err);
      }
    }, 5000);

    connection.socket.on("close", () => {
      active = false;
      clearInterval(interval);
      req.log.info("Client disconnected from dashboard live stream");
    });
  });
};

export default dashboardRoutes;
