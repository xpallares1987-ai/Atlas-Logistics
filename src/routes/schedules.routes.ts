import { FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import { schedules, carriers, lanes, locations, rates } from "../db/schema/index.js";
import { eq, like, and } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

const originLocs = alias(locations, "origin_locations");
const destLocs = alias(locations, "destination_locations");
import { addDays, subDays } from "date-fns";

const schedulesRoutes: FastifyPluginAsync = async (fastify, opts) => {
  fastify.get("/", async (request, reply) => {
    try {
      const { origin, destination, date } = request.query as any;

      let query = db
        .select({
          id: schedules.id,
          vessel: schedules.vesselName,
          voyage: schedules.voyageNumber,
          departureDate: schedules.departureDate,
          arrivalDate: schedules.arrivalDate,
          carrierName: carriers.name,
        })
        .from(schedules)
        .leftJoin(carriers, eq(schedules.carrierId, carriers.id))
        .leftJoin(lanes, eq(schedules.laneId, lanes.id))
        .leftJoin(originLocs, eq(lanes.originLocationId, originLocs.id))
        .leftJoin(destLocs, eq(lanes.destinationLocationId, destLocs.id));

      if (origin || destination) {
        const conditions = [];
        if (origin) {
          const searchOrigin = origin.split(" ")[0]; // Just take first word to match like "Shanghai"
          conditions.push(like(originLocs.name, `%${searchOrigin}%`));
        }
        if (destination) {
          const searchDest = destination.split(" ")[0];
          conditions.push(like(destLocs.name, `%${searchDest}%`));
        }
        if (conditions.length > 0) {
          query.where(and(...conditions));
        }
      }

      const allSchedules = await query;

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
      
      const sch = await db.select({ laneId: schedules.laneId }).from(schedules).where(eq(schedules.id, id)).limit(1);
      
      let basePrice = 1200;
      if (sch.length > 0 && sch[0].laneId) {
        const rateRec = await db.select().from(rates).where(eq(rates.laneId, sch[0].laneId)).limit(1);
        if (rateRec.length > 0) {
           basePrice = rateRec[0].baseRate + rateRec[0].baf + rateRec[0].pss + rateRec[0].thc;
        }
      }

      // Simulate dynamic pricing based on random load on top of the base rate from the DB
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
