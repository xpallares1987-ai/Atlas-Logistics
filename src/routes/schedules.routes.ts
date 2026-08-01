import { FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import { schedules, carriers } from "../db/schema/index.js";
import { eq } from "drizzle-orm";
import { addDays, subDays } from "date-fns";

const schedulesRoutes: FastifyPluginAsync = async (fastify, opts) => {
  fastify.get("/", async (request, reply) => {
    try {
      const allSchedules = await db
        .select({
          id: schedules.id,
          vessel: schedules.vesselName,
          voyage: schedules.voyageNumber,
          departureDate: schedules.departureDate,
          arrivalDate: schedules.arrivalDate,
          carrierName: carriers.name,
        })
        .from(schedules)
        .leftJoin(carriers, eq(schedules.carrierId, carriers.id));

      const mappedSchedules = allSchedules.map((sch) => {
        const depDate = sch.departureDate;
        const arrDate = sch.arrivalDate;
        const transitTime = Math.round(
          (arrDate.getTime() - depDate.getTime()) / (1000 * 3600 * 24),
        );

        return {
          id: sch.id,
          carrier: sch.carrierName || "Unknown Carrier",
          vessel: sch.vessel || "TBD",
          voyage: sch.voyage || "TBD",
          departure: depDate.toISOString().split("T")[0],
          arrival: arrDate.toISOString().split("T")[0],
          transitTime,
          cutOffVgm: subDays(depDate, 4).toISOString().split("T")[0] + " 12:00",
          cutOffSi: subDays(depDate, 3).toISOString().split("T")[0] + " 18:00",
          cutOffCy: subDays(depDate, 2).toISOString().split("T")[0] + " 10:00",
          status: "On Time",
        };
      });

      return reply.send(mappedSchedules);
    } catch (error: any) {
      request.log.error(error);
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.get("/:id/pricing", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      // Simulate dynamic pricing based on random load
      const basePrice = 1200;
      const loadFactor = Math.random() * 0.5 + 0.8; // Random multiplier between 0.8 and 1.3
      const dynamicPrice = Math.round(basePrice * loadFactor);

      return reply.send({
        scheduleId: id,
        price: dynamicPrice,
        currency: "USD",
        validUntil: addDays(new Date(), 1).toISOString(), // valid for 24 hours
      });
    } catch (error: any) {
      request.log.error(error);
      reply.code(500).send({ error: error.message });
    }
  });
};

export default schedulesRoutes;
