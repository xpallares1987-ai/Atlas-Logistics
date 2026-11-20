/**
 * @file unece-transport.routes.ts
 * @description Fastify endpoints for querying SQLite-cached UNECE Transport Statistics
 * (STAT__40-TRTRANS: Road, Rail, Inland Waterway tonne-km & Transport Infrastructure)
 * and triggering live zero-cost refreshes from the UNECE PX-Web REST API.
 * @module @atlas/routes/unece-transport
 * @see {@link https://w3.unece.org/PXWeb2015/pxweb/en/STAT/STAT__40-TRTRANS/}
 */

import { FastifyPluginAsync } from "fastify";
import {
  queryUneceTransportStatistics,
  syncUneceTransportStatistics,
  seedUneceTransportStatsFromSnapshot,
  UNECE_CORRIDOR_COUNTRIES,
} from "../services/unece-transport-stats.service.js";
import {
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  buildErrorResponses,
  openApiObject,
} from "./openapi.schemas.js";

const UNECE_TRANSPORT_TAG = ["UNECE Transport Statistics"] as const;

const uneceTransportRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/analytics/unece-transport
   * Query real UNECE freight & infrastructure benchmarks from SQLite.
   */
  fastify.get<{
    Querystring: {
      mode?: string;
      country?: string;
      yearFrom?: string;
      yearTo?: string;
    };
  }>(
    "/",
    {
      schema: {
        tags: [...UNECE_TRANSPORT_TAG],
        summary:
          "Query cached UNECE freight and transport infrastructure statistics",
        querystring: openApiObject({
          mode: { type: "string" },
          country: { type: "string" },
          yearFrom: { type: "string" },
          yearTo: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { mode, country, yearFrom, yearTo } = request.query || {};
        let result = await queryUneceTransportStatistics({
          mode,
          country,
          yearFrom: yearFrom ? parseInt(yearFrom, 10) : undefined,
          yearTo: yearTo ? parseInt(yearTo, 10) : undefined,
        });

        // Automatically hydrate from verified committed snapshot if table is empty
        if (result.count === 0) {
          const seeded = await seedUneceTransportStatsFromSnapshot();
          if (seeded > 0) {
            result = await queryUneceTransportStatistics({
              mode,
              country,
              yearFrom: yearFrom ? parseInt(yearFrom, 10) : undefined,
              yearTo: yearTo ? parseInt(yearTo, 10) : undefined,
            });
          }
        }

        return reply.send({
          success: true,
          source: "UNECE Statistical Database (STAT__40-TRTRANS)",
          sourceUrl:
            "https://w3.unece.org/PXWeb2015/pxweb/en/STAT/STAT__40-TRTRANS/",
          countries: UNECE_CORRIDOR_COUNTRIES.map((c) => ({
            code: c.iso2,
            name: c.name,
          })),
          ...result,
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to query UNECE transport statistics";
        return reply.status(500).send({ success: false, error: message });
      }
    },
  );

  /**
   * POST /api/analytics/unece-transport/sync
   * Trigger live on-demand sync from the UNECE PX-Web REST API ($0.00 cost).
   */
  fastify.post(
    "/sync",
    {
      schema: {
        tags: [...UNECE_TRANSPORT_TAG],
        summary: "Trigger live refresh from the UNECE PX-Web REST API",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 502]),
        },
      },
    },
    async (_request, reply) => {
      try {
        const syncResult = await syncUneceTransportStatistics();
        return reply.send({
          success: true,
          source: "UNECE PX-Web REST API (Live)",
          ...syncResult,
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to sync UNECE PX-Web transport statistics";
        return reply.status(502).send({ success: false, error: message });
      }
    },
  );
};

export default uneceTransportRoutes;
