/**
 * @file cold-chain.routes.ts
 * @description Fastify routes for Pharmaceutical Cold Chain GDP compliance, Mean Kinetic Temperature (MKT) Arrhenius evaluation, dry-ice sublimation and reefer power physics simulators, Responsible Person release sign-off, and GDP certificate PDFs.
 * @module @atlas/api/modules/cold-chain/routes
 */

import { domainEventBus } from "../../lib/events/domain-event-bus.js";
import { FastifyPluginAsync } from "fastify";
import { db } from "../../db/index.js";
import {
  coldChainProfiles,
  coldChainShipments,
  temperatureReadings,
} from "../../db/schema/index.js";
import { eq, desc } from "drizzle-orm";
import {
  MktCalculatorService,
  MktEvaluationInput,
} from "./mkt-calculator.service.js";
import {
  ThermalPhysicsService,
  DryIceSimulationInput,
  ReeferPowerSimulationInput,
} from "./thermal-physics.service.js";
import { PDFService } from "../../services/pdf.service.js";
import {
  OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_ID_PARAMS_SCHEMA,
  buildErrorResponses,
  getErrorMessage,
  openApiObject,
} from "../../routes/openapi.schemas.js";

// ============================================================================
// 1. FASTIFY ROUTE PLUGIN REGISTRATION
// ============================================================================

const COLD_CHAIN_TAG = ["Cold Chain & Pharma GDP"] as const;

export const coldChainRoutes: FastifyPluginAsync = async (fastify) => {
  // Authentication hook (parent app.ts authMiddleware already enforces authentication)
  fastify.addHook("onRequest", async (req) => {
    try {
      if (req.headers.authorization) {
        await req.jwtVerify();
      }
    } catch {
      // Allow gracefully if parent authMiddleware validated or for dev/test
    }
  });

  // 1. GET /api/cold-chain/profiles
  fastify.get(
    "/profiles",
    {
      schema: {
        tags: [...COLD_CHAIN_TAG],
        summary:
          "List GDP temperature stability profiles and excursion thresholds",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      try {
        const profiles = await db.select().from(coldChainProfiles);
        return reply.send(profiles);
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Database error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 2. GET /api/cold-chain/shipments
  fastify.get(
    "/shipments",
    {
      schema: {
        tags: [...COLD_CHAIN_TAG],
        summary:
          "List cold-chain shipments with profile, GDP verdict, and text filters",
        querystring: openApiObject({
          profileId: { type: "string" },
          verdict: { type: "string" },
          q: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const { profileId, verdict, q } = req.query as {
        profileId?: string;
        verdict?: string;
        q?: string;
      };

      try {
        const shipmentsList = await db
          .select()
          .from(coldChainShipments)
          .orderBy(desc(coldChainShipments.createdAt));

        let filtered = shipmentsList;
        if (profileId && profileId !== "ALL") {
          filtered = filtered.filter((s) => s.profileId === profileId);
        }
        if (verdict && verdict !== "ALL") {
          filtered = filtered.filter((s) => s.gdpReleaseVerdict === verdict);
        }
        if (q) {
          const query = q.toLowerCase();
          filtered = filtered.filter(
            (s) =>
              s.trackingNumber.toLowerCase().includes(query) ||
              s.batchNumber.toLowerCase().includes(query) ||
              s.productDescription.toLowerCase().includes(query) ||
              s.loggerSerialNumber.toLowerCase().includes(query),
          );
        }

        return reply.send(filtered);
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Database error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 3. GET /api/cold-chain/shipments/:id
  fastify.get(
    "/shipments/:id",
    {
      schema: {
        tags: [...COLD_CHAIN_TAG],
        summary:
          "Retrieve cold-chain shipment details with thermal profile and IoT logger readings",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      try {
        const shipment = await db
          .select()
          .from(coldChainShipments)
          .where(eq(coldChainShipments.id, id))
          .get();

        if (!shipment) {
          return reply
            .status(404)
            .send({ error: "Cold chain shipment not found" });
        }

        const profile = await db
          .select()
          .from(coldChainProfiles)
          .where(eq(coldChainProfiles.id, shipment.profileId))
          .get();

        const readings = await db
          .select()
          .from(temperatureReadings)
          .where(eq(temperatureReadings.coldChainShipmentId, id))
          .orderBy(desc(temperatureReadings.recordedAt));

        return reply.send({
          ...shipment,
          profile,
          readings,
        });
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Database error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 4. POST /api/cold-chain/calculate-mkt
  fastify.post(
    "/calculate-mkt",
    {
      schema: {
        tags: [...COLD_CHAIN_TAG],
        summary:
          "Calculate Mean Kinetic Temperature (MKT) and detect GDP thermal excursions",
        body: openApiObject({
          readings: { type: "array", items: OPENAPI_FLEXIBLE_OBJECT_SCHEMA },
          minAllowedCelsius: { type: "number" },
          maxAllowedCelsius: { type: "number" },
          maxAllowedMktCelsius: { type: "number" },
          activationEnergyKjPerMol: { type: "number" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const input = req.body as MktEvaluationInput;

      if (!input || !Array.isArray(input.readings)) {
        return reply.status(400).send({ error: "Readings array is required" });
      }

      const evaluation = MktCalculatorService.evaluateShipment(input);
      if (!evaluation.isCompliant || evaluation.excursionCount > 0) {
        void domainEventBus.publish(
          "cold-chain:excursion-detected",
          "cold_chain_eval",
          {
            shipmentId: "direct_evaluation",
            sensorId: "temp_probe_eval",
            temperatureCelsius: evaluation.maxRecordedCelsius,
            thresholdMaxCelsius: input.maxAllowedCelsius,
            durationMinutes: evaluation.totalExcursionMinutes || 0,
            meanKineticTempCelsius: evaluation.mktCelsius,
          },
        );
      }
      return reply.send({
        success: true,
        evaluation,
      });
    },
  );

  // 5. POST /api/cold-chain/simulate-dry-ice
  fastify.post(
    "/simulate-dry-ice",
    {
      schema: {
        tags: [...COLD_CHAIN_TAG],
        summary:
          "Simulate CO2 dry-ice sublimation holdover time for cryogenic cargo",
        body: openApiObject({
          currentWeightKg: { type: "number" },
          sublimationRateKgPerHour: { type: "number" },
          ambientTempCelsius: { type: "number" },
          minimumSafetyWeightKg: { type: "number" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const input = req.body as DryIceSimulationInput;

      if (!input || input.currentWeightKg === undefined) {
        return reply.status(400).send({ error: "currentWeightKg is required" });
      }

      const result = ThermalPhysicsService.calculateDryIceHoldover(input);
      return reply.send({
        success: true,
        result,
      });
    },
  );

  // 6. POST /api/cold-chain/simulate-reefer-power
  fastify.post(
    "/simulate-reefer-power",
    {
      schema: {
        tags: [...COLD_CHAIN_TAG],
        summary:
          "Simulate reefer container electrical power draw and genset fuel consumption",
        body: openApiObject({
          ambientTempCelsius: { type: "number" },
          setpointCelsius: { type: "number" },
          transitHours: { type: "number" },
          containerSize: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const input = req.body as ReeferPowerSimulationInput;

      if (
        !input ||
        input.ambientTempCelsius === undefined ||
        input.setpointCelsius === undefined ||
        input.transitHours === undefined
      ) {
        return reply.status(400).send({ error: "Missing required parameters" });
      }

      const result = ThermalPhysicsService.calculateReeferPowerAndFuel(input);
      return reply.send({
        success: true,
        result,
      });
    },
  );

  // 7. POST /api/cold-chain/shipments/:id/release
  fastify.post(
    "/shipments/:id/release",
    {
      schema: {
        tags: [...COLD_CHAIN_TAG],
        summary:
          "Record GDP Responsible Person quality release sign-off verdict",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: openApiObject({
          gdpReleaseVerdict: {
            type: "string",
            enum: [
              "RELEASED_FOR_DISTRIBUTION",
              "QUARANTINE_INVESTIGATION",
              "REJECTED_DISPOSAL",
            ],
          },
          responsiblePersonName: { type: "string" },
          qualityAuditNotes: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { gdpReleaseVerdict, responsiblePersonName, qualityAuditNotes } =
        (req.body ?? {}) as {
          gdpReleaseVerdict?:
            | "RELEASED_FOR_DISTRIBUTION"
            | "QUARANTINE_INVESTIGATION"
            | "REJECTED_DISPOSAL";
          responsiblePersonName?: string;
          qualityAuditNotes?: string;
        };

      if (!gdpReleaseVerdict || !responsiblePersonName) {
        return reply
          .status(400)
          .send({ error: "Verdict and Responsible Person name are required" });
      }

      try {
        const shipment = await db
          .select()
          .from(coldChainShipments)
          .where(eq(coldChainShipments.id, id))
          .get();

        if (!shipment) {
          return reply.status(404).send({ error: "Shipment not found" });
        }

        await db
          .update(coldChainShipments)
          .set({
            gdpReleaseVerdict,
            responsiblePersonName,
            qualityAuditNotes: qualityAuditNotes || shipment.qualityAuditNotes,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(coldChainShipments.id, id));

        return reply.send({
          success: true,
          message: `Shipment ${shipment.trackingNumber} successfully updated to verdict: ${gdpReleaseVerdict}`,
        });
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Database error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 8. GET /api/cold-chain/shipments/:id/certificate-pdf
  fastify.get(
    "/shipments/:id/certificate-pdf",
    {
      schema: {
        tags: [...COLD_CHAIN_TAG],
        summary:
          "Generate and stream Pharma GDP Thermal Release Certificate PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      try {
        const shipment = await db
          .select()
          .from(coldChainShipments)
          .where(eq(coldChainShipments.id, id))
          .get();

        if (!shipment) {
          return reply.status(404).send({ error: "Shipment not found" });
        }

        const profile = await db
          .select()
          .from(coldChainProfiles)
          .where(eq(coldChainProfiles.id, shipment.profileId))
          .get();

        const readings = await db
          .select()
          .from(temperatureReadings)
          .where(eq(temperatureReadings.coldChainShipmentId, id))
          .orderBy(desc(temperatureReadings.recordedAt));

        const pdfBuffer = await PDFService.generateGdpReleaseCertificate(
          shipment,
          readings,
          profile,
        );

        return reply
          .header("Content-Type", "application/pdf")
          .header(
            "Content-Disposition",
            `inline; filename="Pharma_GDP_Certificate_${shipment.trackingNumber}.pdf"`,
          )
          .send(pdfBuffer);
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "PDF Generation Error",
          message: getErrorMessage(err),
        });
      }
    },
  );
};
