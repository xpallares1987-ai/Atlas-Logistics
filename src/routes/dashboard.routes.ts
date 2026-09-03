import { FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import { shipments, invoices } from "../db/schema/index.js";
import { sql, eq, desc, and, gte, lte } from "drizzle-orm";

const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/", async (request, reply) => {
    try {
      const { start, end } = request.query as { start?: string; end?: string };

      // Validate date parameters
      if (start && isNaN(new Date(start).getTime())) {
        return reply
          .code(400)
          .send({ success: false, error: "Invalid start date format" });
      }
      if (end && isNaN(new Date(end).getTime())) {
        return reply
          .code(400)
          .send({ success: false, error: "Invalid end date format" });
      }

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

      const monthExpression = sql<string>`strftime('%Y-%m', ${invoices.createdAt}, 'unixepoch')`;
      const [
        revenueResult,
        activeShipmentsResult,
        completedShipmentsResult,
        monthlyRevenue,
        volumeQuery,
        activeList,
      ] = await Promise.all([
        db
          .select({ total: sql<number>`COALESCE(SUM(${invoices.amount}), 0)` })
          .from(invoices)
          .where(and(...invoiceConditions)),
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(shipments)
          .where(and(...activeShipmentConditions)),
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(shipments)
          .where(and(...completedShipmentConditions)),
        db
          .select({
            month: monthExpression,
            total: sql<number>`COALESCE(SUM(${invoices.amount}), 0)`,
          })
          .from(invoices)
          .where(and(...invoiceConditions))
          .groupBy(monthExpression)
          .orderBy(monthExpression),
        db
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
          .groupBy(shipments.status),
        db
          .select({
            id: shipments.id,
            referenceNumber: shipments.trackingNumber,
            status: shipments.status,
            origin: shipments.origin,
            destination: shipments.destination,
            vessel: shipments.vesselName,
            type: shipments.serviceType,
            createdAt: shipments.createdAt,
          })
          .from(shipments)
          .where(and(...activeShipmentConditions))
          .orderBy(desc(shipments.createdAt))
          .limit(5),
      ]);

      const totalRevenue = revenueResult[0]?.total || 0;
      const activeShipments = activeShipmentsResult[0]?.count || 0;
      const completedShipments = completedShipmentsResult[0]?.count || 0;

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

      for (const row of monthlyRevenue) {
        if (!row.month) continue;
        const [year, month] = row.month.split("-");
        const monthIndex = Number(month) - 1;
        if (monthIndex >= 0 && monthIndex < monthNames.length) {
          const label = `${monthNames[monthIndex]} ${year}`;
          monthlyBuckets.set(label, row.total);
        }
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

      const volumeByStatus = volumeQuery.map((row) => ({
        status: row.status.replace(/_/g, " "),
        count: row.count,
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
          activeList,
        },
      };
    } catch (error: unknown) {
      request.log.error(error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.code(500).send({ success: false, error: message });
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

        connection.send(
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

    connection.on("close", () => {
      active = false;
      clearInterval(interval);
      req.log.info("Client disconnected from dashboard live stream");
    });
  });
};

export default dashboardRoutes;
