/**
 * @file air-cargo.routes.ts
 * @description Fastify routes for Air Cargo (MAWB/HAWB), IATA volumetric rating (1:6000), IATA DGR lithium/dry-ice compliance screening, IATA Cargo-XML (XFWB/XFHL), Cargo-IMP (FWB/FHL), and IATA airport/DGR catalogs.
 * @module @atlas/api/modules/air-cargo/routes
 */

import { FastifyPluginAsync } from "fastify";
import { db } from "../../db/index.js";
import { iataAirports, dgrRegistry } from "../../db/schema/air_cargo.js";
import { like, or } from "drizzle-orm";
import { AirwayBillService } from "./airwaybill.service.js";
import { AirCargoRatingService } from "./rating.service.js";
import { AirCargoComplianceService } from "./compliance.service.js";
import { AirwayBillXmlService } from "./airwaybill-xml.service.js";
import { PDFService } from "../../services/pdf.service.js";
import { domainEventBus } from "../../lib/events/domain-event-bus.js";
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

type AirwayBillFilter = NonNullable<
  Parameters<typeof AirwayBillService.listAirwayBills>[0]
>;
type CalculateAirRatingInput = Parameters<
  typeof AirCargoRatingService.calculateRating
>[0];
type ScreenDgrInput = Parameters<
  typeof AirCargoComplianceService.screenCompliance
>[0];
type CreateAirwayBillInput = Parameters<
  typeof AirwayBillService.createAirwayBill
>[0];
type AirWaybillPdfInput = Parameters<typeof PDFService.generateAirWaybill>[0];
type CargoXmlInput = Parameters<
  typeof AirwayBillXmlService.generateCargoXml
>[0];
type CargoImpInput = Parameters<
  typeof AirwayBillXmlService.generateCargoImp
>[0];

interface AirwayBillListQuery {
  type?: AirwayBillFilter["type"];
  status?: AirwayBillFilter["status"];
  airport?: string;
  search?: string;
  q?: string;
}

interface SearchCatalogQuery {
  q?: string;
  search?: string;
}

type CalculateAirRatingBody = Partial<CalculateAirRatingInput>;
type ScreenDgrBody = Partial<ScreenDgrInput>;
type CreateAirwayBillBody = Partial<CreateAirwayBillInput>;

// ============================================================================
// 2. FASTIFY ROUTE PLUGIN REGISTRATION
// ============================================================================

const airCargoRoutes: FastifyPluginAsync = async (fastify, _opts) => {
  // 1. List Airway Bills (with consolidation hierarchy)
  fastify.get(
    "/air-cargo/awb",
    {
      schema: {
        tags: ["Air Cargo"],
        summary: "List Master and House Airway Bills (MAWB/HAWB)",
        querystring: openApiObject({
          type: { type: "string" },
          status: { type: "string" },
          airport: { type: "string" },
          search: { type: "string" },
          q: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const query = (request.query as AirwayBillListQuery | undefined) || {};
        const awbs = await AirwayBillService.listAirwayBills({
          type: query.type,
          status: query.status,
          airport: query.airport,
          search: query.search || query.q,
        });

        return reply.send(awbs);
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .code(500)
          .send({ error: getErrorMessage(err, "Failed to list Airway Bills") });
      }
    },
  );

  // 2. Get Single Airway Bill by ID
  fastify.get(
    "/air-cargo/awb/:id",
    {
      schema: {
        tags: ["Air Cargo"],
        summary: "Retrieve a single Airway Bill by ID",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const awb = await AirwayBillService.getAirwayBillById(id);

        if (!awb) {
          return reply.code(404).send({ error: "Airway Bill not found" });
        }

        return reply.send(awb);
      } catch (err: unknown) {
        request.log.error(err);
        return reply.code(500).send({
          error: getErrorMessage(err, "Failed to retrieve Airway Bill"),
        });
      }
    },
  );

  // 3. Compute Volumetric Weight & Air Cargo Rating
  fastify.post(
    "/air-cargo/calculate-rating",
    {
      schema: {
        tags: ["Air Cargo"],
        summary:
          "Calculate IATA 1:6000 volumetric weight and air freight rating",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const body = (request.body as CalculateAirRatingBody | undefined) || {};

        if (
          !body.pieces ||
          !Array.isArray(body.pieces) ||
          body.pieces.length === 0
        ) {
          return reply
            .code(400)
            .send({ error: "Pieces array with dimensions is required" });
        }

        const rating = AirCargoRatingService.calculateRating({
          originAirport: body.originAirport || "MAD",
          destinationAirport: body.destinationAirport || "JFK",
          pieces: body.pieces,
          actualGrossWeightKg: Number(body.actualGrossWeightKg || 0),
          customRatePerKg: body.customRatePerKg
            ? Number(body.customRatePerKg)
            : undefined,
          currency: body.currency || "EUR",
          fuelRatePerKg: body.fuelRatePerKg
            ? Number(body.fuelRatePerKg)
            : undefined,
          securityRatePerKg: body.securityRatePerKg
            ? Number(body.securityRatePerKg)
            : undefined,
          awbDocFee: body.awbDocFee ? Number(body.awbDocFee) : undefined,
          terminalHandlingRatePerKg: body.terminalHandlingRatePerKg
            ? Number(body.terminalHandlingRatePerKg)
            : undefined,
        });

        return reply.send(rating);
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .code(500)
          .send({
            error: getErrorMessage(err, "Failed to compute air rating"),
          });
      }
    },
  );

  // 4. Screen DGR & Special Handling Codes
  fastify.post(
    "/air-cargo/screen-dgr",
    {
      schema: {
        tags: ["Air Cargo"],
        summary:
          "Screen air cargo consignment for IATA DGR and special handling codes",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const body = (request.body as ScreenDgrBody | undefined) || {};
        if (!body.natureOfGoods && !body.unNumber) {
          return reply
            .code(400)
            .send({ error: "Nature of goods or UN number is required" });
        }

        const result = await AirCargoComplianceService.screenCompliance({
          natureOfGoods: body.natureOfGoods || "",
          unNumber: body.unNumber,
          grossWeightKg: Number(body.grossWeightKg || 0),
          declaredValuePerKg: body.declaredValuePerKg
            ? Number(body.declaredValuePerKg)
            : undefined,
          isTempControlled: body.isTempControlled,
          tempRange: body.tempRange,
          isLithiumBattery: body.isLithiumBattery,
          batteryType: body.batteryType,
          batteryConfig: body.batteryConfig,
          batterySection: body.batterySection,
          hasDryIce: body.hasDryIce,
          dryIceNetWeightKg: body.dryIceNetWeightKg
            ? Number(body.dryIceNetWeightKg)
            : undefined,
        });

        return reply.send(result);
      } catch (err: unknown) {
        request.log.error(err);
        return reply.code(500).send({
          error: getErrorMessage(err, "Failed to screen DGR compliance"),
        });
      }
    },
  );

  // 5. Create Airway Bill
  fastify.post(
    "/air-cargo/awb",
    {
      schema: {
        tags: ["Air Cargo"],
        summary: "Issue a new Master or House Airway Bill (MAWB/HAWB)",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const body = (request.body as CreateAirwayBillBody | undefined) || {};

        if (
          !body.awbNumber ||
          !body.originAirport ||
          !body.destinationAirport ||
          !body.shipperData ||
          !body.consigneeData
        ) {
          return reply.code(400).send({
            error:
              "awbNumber, originAirport, destinationAirport, shipperData, and consigneeData are required",
          });
        }

        const newAwb = await AirwayBillService.createAirwayBill(
          body as CreateAirwayBillInput,
        );

        void domainEventBus.publish(
          "freight:consignment-dispatched",
          newAwb.id,
          {
            consignmentId: newAwb.id,
            trackingNumber: newAwb.awbNumber,
            origin: newAwb.originAirport,
            destination: newAwb.destinationAirport,
            transportMode: "AIR",
          },
        );

        return reply.code(201).send(newAwb);
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .code(400)
          .send({
            error: getErrorMessage(err, "Failed to create Airway Bill"),
          });
      }
    },
  );

  // 6. Stream Official IATA Standard Printable PDF
  fastify.get(
    "/air-cargo/awb/:id/pdf",
    {
      schema: {
        tags: ["Air Cargo"],
        summary: "Download official IATA Standard Airway Bill PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const awb = await AirwayBillService.getAirwayBillById(id);

        if (!awb) {
          return reply.code(404).send({ error: "Airway Bill not found" });
        }

        const pdfBuffer = await PDFService.generateAirWaybill(
          awb as unknown as AirWaybillPdfInput,
        );

        reply.header("Content-Type", "application/pdf");
        reply.header(
          "Content-Disposition",
          `inline; filename="IATA_AWB_${awb.awbNumber.replace(/[\s-]/g, "_")}.pdf"`,
        );
        return reply.send(pdfBuffer);
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .code(500)
          .send({ error: getErrorMessage(err, "Failed to generate AWB PDF") });
      }
    },
  );

  // 7. Stream IATA Cargo-XML (XFWB / XFHL)
  fastify.get(
    "/air-cargo/awb/:id/cargo-xml",
    {
      schema: {
        tags: ["Air Cargo"],
        summary: "Export IATA Cargo-XML (XFWB / XFHL) electronic message",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const awb = await AirwayBillService.getAirwayBillById(id);

        if (!awb) {
          return reply.code(404).send({ error: "Airway Bill not found" });
        }

        const xmlContent = AirwayBillXmlService.generateCargoXml(
          awb as unknown as CargoXmlInput,
        );

        reply.header("Content-Type", "application/xml; charset=utf-8");
        reply.header(
          "Content-Disposition",
          `attachment; filename="IATA_${awb.type === "HAWB" ? "XFHL" : "XFWB"}_${awb.awbNumber.replace(/[\s-]/g, "_")}.xml"`,
        );
        return reply.send(xmlContent);
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .code(500)
          .send({
            error: getErrorMessage(err, "Failed to generate Cargo-XML"),
          });
      }
    },
  );

  // 8. Stream IATA Cargo-IMP (FWB / FHL)
  fastify.get(
    "/air-cargo/awb/:id/cargo-imp",
    {
      schema: {
        tags: ["Air Cargo"],
        summary: "Export IATA Cargo-IMP (FWB/16 or FHL/4) EDI message",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const awb = await AirwayBillService.getAirwayBillById(id);

        if (!awb) {
          return reply.code(404).send({ error: "Airway Bill not found" });
        }

        const impContent = AirwayBillXmlService.generateCargoImp(
          awb as unknown as CargoImpInput,
        );

        reply.header("Content-Type", "text/plain; charset=utf-8");
        reply.header(
          "Content-Disposition",
          `attachment; filename="IATA_${awb.type === "HAWB" ? "FHL" : "FWB"}_${awb.awbNumber.replace(/[\s-]/g, "_")}.txt"`,
        );
        return reply.send(impContent);
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .code(500)
          .send({
            error: getErrorMessage(err, "Failed to generate Cargo-IMP"),
          });
      }
    },
  );

  // 9. IATA Airport Catalog
  fastify.get(
    "/air-cargo/airports",
    {
      schema: {
        tags: ["Air Cargo"],
        summary: "Search IATA global airport catalog",
        querystring: openApiObject({
          q: { type: "string" },
          search: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const query = (request.query as SearchCatalogQuery | undefined) || {};
        const q = query.q || query.search;

        if (q) {
          const results = await db
            .select()
            .from(iataAirports)
            .where(
              or(
                like(iataAirports.code, `%${q.toUpperCase()}%`),
                like(iataAirports.name, `%${q}%`),
                like(iataAirports.city, `%${q}%`),
              ),
            );
          return reply.send(results);
        }

        const airports = await db.select().from(iataAirports);
        return reply.send(airports);
      } catch (err: unknown) {
        request.log.error(err);
        return reply.code(500).send({
          error: getErrorMessage(err, "Failed to list IATA airports"),
        });
      }
    },
  );

  // 10. DGR Registry Search
  fastify.get(
    "/air-cargo/dgr-registry",
    {
      schema: {
        tags: ["Air Cargo"],
        summary: "Search IATA Dangerous Goods Regulations (DGR) UN catalog",
        querystring: openApiObject({
          q: { type: "string" },
          search: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const query = (request.query as SearchCatalogQuery | undefined) || {};
        const q = query.q || query.search;

        if (q) {
          const results = await db
            .select()
            .from(dgrRegistry)
            .where(
              or(
                like(dgrRegistry.unNumber, `%${q.toUpperCase()}%`),
                like(dgrRegistry.properShippingName, `%${q.toUpperCase()}%`),
              ),
            );
          return reply.send(results);
        }

        const dgrItems = await db.select().from(dgrRegistry);
        return reply.send(dgrItems);
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .code(500)
          .send({ error: getErrorMessage(err, "Failed to list DGR registry") });
      }
    },
  );
};

export default airCargoRoutes;
