/**
 * @file road-freight.routes.ts
 * @description Fastify routes for European Road Freight consignments, ADR 1.1.3.6 dangerous goods exemption points, EU tachograph driving-time route optimization, e-CMR Geneva 24-box PDF, and Spanish Carta de Porte PDF generation.
 * @module @atlas/api/modules/road-freight/routes
 */

import { FastifyPluginAsync } from "fastify";
import { AdrComplianceService } from "./adr-compliance.service.js";
import { RoadRouteOptimizerService } from "./route-optimizer.service.js";
import { RoadWaybillService } from "./road-waybill.service.js";
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
// 1. DOMAIN PAYLOAD & QUERY INTERFACES
// ============================================================================

type ListConsignmentsFilter = NonNullable<
  Parameters<typeof RoadWaybillService.listConsignments>[0]
>;
type AdrExemptionItems = Parameters<
  typeof AdrComplianceService.calculateAdrExemption
>[0];
type CreateConsignmentInput = Parameters<
  typeof RoadWaybillService.createConsignment
>[0];

interface ListConsignmentsQuery {
  status?: ListConsignmentsFilter["status"];
  type?: ListConsignmentsFilter["type"];
  q?: string;
}

interface CalculateAdrBody {
  items?: AdrExemptionItems;
}

interface CalculateRouteBody {
  originCity?: string;
  destinationCity?: string;
  distanceKm?: number | string;
  totalPallets?: number | string;
  totalGrossWeightKg?: number | string;
  departureTime?: string | Date;
}

interface CreateConsignmentBody extends Partial<
  Omit<
    CreateConsignmentInput,
    | "totalDistanceKm"
    | "totalPallets"
    | "totalGrossWeightKg"
    | "pickupDate"
    | "deliveryDate"
  >
> {
  totalDistanceKm?: number | string;
  totalPallets?: number | string;
  totalGrossWeightKg?: number | string;
  pickupDate?: string | Date;
  deliveryDate?: string | Date;
}

// ============================================================================
// 2. FASTIFY ROUTE PLUGIN REGISTRATION
// ============================================================================

const ROAD_FREIGHT_TAG = ["Road Freight & e-CMR"] as const;

export const roadFreightRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. GET /api/road-freight/consignments - List road freight consignments
  fastify.get(
    "/consignments",
    {
      schema: {
        tags: [...ROAD_FREIGHT_TAG],
        summary:
          "List road freight consignments with status, type, and text search filters",
        querystring: openApiObject({
          status: { type: "string" },
          type: { type: "string" },
          q: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      const query = (request.query ?? {}) as ListConsignmentsQuery;
      try {
        const consignments = await RoadWaybillService.listConsignments({
          status: query.status,
          type: query.type,
          search: query.q,
        });
        return reply.send(consignments);
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .code(500)
          .send({ error: "Failed to list road consignments" });
      }
    },
  );

  // 2. GET /api/road-freight/consignments/:id - Get single consignment details
  fastify.get(
    "/consignments/:id",
    {
      schema: {
        tags: [...ROAD_FREIGHT_TAG],
        summary: "Retrieve road freight consignment detail by ID",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const consignment = await RoadWaybillService.getConsignmentById(id);
        if (!consignment) {
          return reply.code(404).send({ error: "Consignment not found" });
        }
        return reply.send(consignment);
      } catch (err: unknown) {
        request.log.error(err);
        return reply.code(500).send({ error: "Failed to fetch consignment" });
      }
    },
  );

  // 3. POST /api/road-freight/calculate-adr - Calculate ADR 1.1.3.6 points and exemptions
  fastify.post(
    "/calculate-adr",
    {
      schema: {
        tags: [...ROAD_FREIGHT_TAG],
        summary:
          "Calculate ADR 1.1.3.6 dangerous goods points, orange-plate obligation, and exemptions",
        body: openApiObject({
          items: { type: "array", items: OPENAPI_FLEXIBLE_OBJECT_SCHEMA },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as CalculateAdrBody;
      try {
        const items: AdrExemptionItems = Array.isArray(body.items)
          ? body.items
          : [];
        const result = AdrComplianceService.calculateAdrExemption(items);
        return reply.send({ success: true, adr: result });
      } catch (err: unknown) {
        return reply.code(400).send({ error: getErrorMessage(err) });
      }
    },
  );

  // 4. POST /api/road-freight/calculate-route - Calculate tachograph driving time and trailer capacity
  fastify.post(
    "/calculate-route",
    {
      schema: {
        tags: [...ROAD_FREIGHT_TAG],
        summary:
          "Plan EU 561/2006 tachograph driving schedule, rest breaks, and trailer load capacity",
        body: openApiObject({
          originCity: { type: "string" },
          destinationCity: { type: "string" },
          distanceKm: { type: "number" },
          totalPallets: { type: "number" },
          totalGrossWeightKg: { type: "number" },
          departureTime: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as CalculateRouteBody;
      if (!body.originCity || !body.destinationCity || !body.distanceKm) {
        return reply.code(400).send({
          error: "originCity, destinationCity, and distanceKm are required",
        });
      }

      try {
        const result = RoadRouteOptimizerService.planRouteAndSchedule({
          originCity: body.originCity,
          destinationCity: body.destinationCity,
          distanceKm: Number(body.distanceKm),
          totalPallets: Number(body.totalPallets || 1),
          totalGrossWeightKg: Number(body.totalGrossWeightKg || 1000),
          departureTime: body.departureTime
            ? new Date(body.departureTime)
            : new Date(),
        });
        return reply.send({ success: true, route: result });
      } catch (err: unknown) {
        return reply.code(400).send({ error: getErrorMessage(err) });
      }
    },
  );

  // 5. POST /api/road-freight/consignments - Create a new road consignment
  fastify.post(
    "/consignments",
    {
      schema: {
        tags: [...ROAD_FREIGHT_TAG],
        summary:
          "Create a new road freight e-CMR or Carta de Porte consignment",
        body: openApiObject({
          shipmentId: { type: "string" },
          consignmentType: { type: "string" },
          senderName: { type: "string" },
          consigneeName: { type: "string" },
          carrierName: { type: "string" },
          tractorPlate: { type: "string" },
          driverName: { type: "string" },
          originCity: { type: "string" },
          destinationCity: { type: "string" },
          totalDistanceKm: { type: "number" },
          totalPallets: { type: "number" },
          totalGrossWeightKg: { type: "number" },
          goodsDescription: { type: "string" },
        }),
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as CreateConsignmentBody;
      if (
        !body.consignmentType ||
        !body.senderName ||
        !body.consigneeName ||
        !body.carrierName ||
        !body.tractorPlate ||
        !body.driverName ||
        !body.originCity ||
        !body.destinationCity ||
        !body.totalDistanceKm ||
        !body.totalPallets ||
        !body.totalGrossWeightKg ||
        !body.goodsDescription
      ) {
        return reply.code(400).send({
          error: "Missing required road consignment parameters",
        });
      }

      try {
        const result = await RoadWaybillService.createConsignment({
          shipmentId: body.shipmentId,
          consignmentType: body.consignmentType,
          senderName: body.senderName,
          senderAddress: body.senderAddress || "N/A",
          senderCountry: body.senderCountry || "ES",
          consigneeName: body.consigneeName,
          consigneeAddress: body.consigneeAddress || "N/A",
          consigneeCountry: body.consigneeCountry || "ES",
          carrierName: body.carrierName,
          carrierVat: body.carrierVat || "N/A",
          tractorPlate: body.tractorPlate,
          trailerPlate: body.trailerPlate || "N/A",
          driverName: body.driverName,
          driverLicense: body.driverLicense || "N/A",
          driverPhone: body.driverPhone,
          originCity: body.originCity,
          destinationCity: body.destinationCity,
          totalDistanceKm: Number(body.totalDistanceKm),
          pickupDate: body.pickupDate ? new Date(body.pickupDate) : new Date(),
          deliveryDate: body.deliveryDate
            ? new Date(body.deliveryDate)
            : undefined,
          totalPallets: Number(body.totalPallets),
          totalGrossWeightKg: Number(body.totalGrossWeightKg),
          goodsDescription: body.goodsDescription,
          specialInstructions: body.specialInstructions,
          cargoItems: body.cargoItems,
        });

        return reply.code(201).send(result);
      } catch (err: unknown) {
        request.log.error(err);
        return reply.code(400).send({
          error: getErrorMessage(err, "Failed to create consignment"),
        });
      }
    },
  );

  // 6. GET /api/road-freight/consignments/:id/cmr-pdf - Download Geneva 24-box e-CMR PDF
  fastify.get(
    "/consignments/:id/cmr-pdf",
    {
      schema: {
        tags: [...ROAD_FREIGHT_TAG],
        summary: "Generate and download Geneva 24-box e-CMR Waybill PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const c = await RoadWaybillService.getConsignmentById(id);
        if (!c) {
          return reply.code(404).send({ error: "Consignment not found" });
        }

        const pdfBuffer = await PDFService.generateEcmrWaybill({
          consignmentNumber: c.consignmentNumber,
          senderName: c.senderName,
          senderAddress: c.senderAddress,
          senderCountry: c.senderCountry,
          consigneeName: c.consigneeName,
          consigneeAddress: c.consigneeAddress,
          consigneeCountry: c.consigneeCountry,
          carrierName: c.carrierName,
          carrierVat: c.carrierVat,
          tractorPlate: c.tractorPlate,
          trailerPlate: c.trailerPlate,
          driverName: c.driverName,
          originCity: c.originCity,
          destinationCity: c.destinationCity,
          pickupDate: c.pickupDate,
          deliveryDate: c.deliveryDate || undefined,
          totalPallets: c.totalPallets,
          totalGrossWeightKg: c.totalGrossWeightKg,
          isAdrHazardous: c.isAdrHazardous,
          adrTotalPoints: c.adrTotalPoints,
          orangePlatesRequired: c.orangePlatesRequired,
          tunnelRestrictionCode: c.tunnelRestrictionCode,
          goodsDescription: c.goodsDescription,
          specialInstructions: c.specialInstructions,
        });

        reply.header("Content-Type", "application/pdf");
        reply.header(
          "Content-Disposition",
          `attachment; filename="e-CMR-${c.consignmentNumber}.pdf"`,
        );
        return reply.send(pdfBuffer);
      } catch (err: unknown) {
        request.log.error(err);
        return reply.code(500).send({ error: "Failed to generate e-CMR PDF" });
      }
    },
  );

  // 7. GET /api/road-freight/consignments/:id/carta-porte-pdf - Download Spanish Carta de Porte PDF
  fastify.get(
    "/consignments/:id/carta-porte-pdf",
    {
      schema: {
        tags: [...ROAD_FREIGHT_TAG],
        summary: "Generate and download Spanish LOTT Carta de Porte PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const c = await RoadWaybillService.getConsignmentById(id);
        if (!c) {
          return reply.code(404).send({ error: "Consignment not found" });
        }

        const pdfBuffer = await PDFService.generateCartaDePorte({
          consignmentNumber: c.consignmentNumber,
          senderName: c.senderName,
          senderAddress: c.senderAddress,
          consigneeName: c.consigneeName,
          consigneeAddress: c.consigneeAddress,
          carrierName: c.carrierName,
          carrierVat: c.carrierVat,
          tractorPlate: c.tractorPlate,
          trailerPlate: c.trailerPlate,
          driverName: c.driverName,
          driverLicense: c.driverLicense,
          originCity: c.originCity,
          destinationCity: c.destinationCity,
          pickupDate: c.pickupDate,
          deliveryDate: c.deliveryDate || undefined,
          totalPallets: c.totalPallets,
          totalGrossWeightKg: c.totalGrossWeightKg,
          goodsDescription: c.goodsDescription,
          specialInstructions: c.specialInstructions,
        });

        reply.header("Content-Type", "application/pdf");
        reply.header(
          "Content-Disposition",
          `attachment; filename="CartaPorte-${c.consignmentNumber}.pdf"`,
        );
        return reply.send(pdfBuffer);
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .code(500)
          .send({ error: "Failed to generate Carta de Porte PDF" });
      }
    },
  );
};
