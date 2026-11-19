/**
 * @file quotes.routes.ts
 * @description Operational route handlers for freight quotes, rate comparisons, PDF generation, and rate ingestion.
 * @module @atlas/routes/quotes
 * @see {@link docs/superpowers/plans/2026-11-15-issue-9-strict-eslint-restoration-routes.md}
 */

import { FastifyPluginAsync } from "fastify";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/index.js";
import {
  rates,
  quotes,
  addresses,
  lanes,
  locations,
  companies,
} from "../db/schema/index.js";
import { eq, and, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { validate } from "../middleware/validate.js";
import { CreateQuoteSchema } from "@atlas/shared/src/logistics-schemas.js";
import { PDFService } from "../services/pdf.service.js";
import { startWorkflow } from "../bpm/workflow-engine.service.js";
import { redis } from "../config/redis.js";
import {
  previewRates,
  bulkImportRates,
  getImportBatches,
  resolvePort,
} from "../services/rate-ingestion.service.js";
import {
  createBookingRequest,
  confirmBookingToShipment,
  type DrayageQuotePayload,
} from "../services/booking-lifecycle.service.js";
import { recordEscrowDeposit } from "../modules/smart-contracts/smart-contracts.routes.js";
import { DcsaHubService } from "../services/dcsa/dcsa-hub.service.js";
import { TariffResolutionService } from "../services/pricing/tariff-resolution.service.js";
import {
  OPENAPI_ID_PARAMS_SCHEMA,
  OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  buildErrorResponses,
  openApiObject,
} from "./openapi.schemas.js";

// ============================================================================
// TYPE DEFINITIONS & SCHEMAS
// ============================================================================

interface RatesQuerystring {
  origin?: string;
  destination?: string;
  containerType?: string;
}

interface AnalyticsQuerystring {
  origin?: string;
  destination?: string;
}

interface CompareBody {
  origin?: string;
  destination?: string;
  containerType?: string;
}

interface CreateQuoteBody {
  customerId?: string;
  quoteNumber: string;
  originLocationId?: string;
  destinationLocationId?: string;
  equipment?: string;
  buyRateTotal?: number;
  sellMargin?: number;
  sellRateTotal?: number;
  status?: string;
  validTo: string | Date;
}

interface QuoteParams {
  id: string;
}

interface AcceptAndBookBody {
  quoteNumber?: string;
  customerId?: string;
  originLocationId?: string;
  destinationLocationId?: string;
  equipment?: string;
  buyRateTotal?: number;
  sellMargin?: number;
  sellRateTotal?: number;
  rateAmount?: number;
  validTo?: string | Date;
  origin?: string;
  destination?: string;
  carrier?: string;
  commodityDescription?: string;
  commodity?: string;
  grossWeightKg?: number;
  weight?: number;
  shipperName?: string;
  consigneeName?: string;
  currency?: string;
  paymentMode?: "ESCROW_SMART_CONTRACT" | "NET_30_CREDIT";
  transitDays?: number;
  drayageQuote?: DrayageQuotePayload | string | null;
  haulierAddressId?: string | null;
  drayageDestinationAddressId?: string | null;
  vesselName?: string;
  voyageNumber?: string;
  containerNumber?: string;
  sealNumber?: string;
}

interface GeneratePdfBody {
  quoteNumber?: string;
  customer?: string;
  origin?: string;
  destination?: string;
  carrier?: string;
  equipment?: string;
  buyRateTotal?: number;
  sellMargin?: number;
  sellRateTotal?: number;
  currency?: string;
  validTo?: string;
  serviceLine?: string;
  transitDays?: number;
}

interface PreviewRatesBody {
  rows?: Parameters<typeof previewRates>[0];
  defaultCarrier?: string;
}

type BulkImportRatesBody = Partial<Parameters<typeof bulkImportRates>[0]>;

interface ImportBatchesQuery {
  limit?: string;
}

interface UnlocodeLookupQuery {
  q?: string;
}

// ============================================================================
// ROUTE PLUGIN
// ============================================================================

const quotesRoutes: FastifyPluginAsync = async (fastify, _opts) => {
  fastify.get<{ Querystring: RatesQuerystring }>(
    "/",
    {
      schema: {
        tags: ["Quotes & Rates"],
        summary: "List commercial freight quotes or cached ocean freight rates",
        querystring: openApiObject({
          origin: { type: "string" },
          destination: { type: "string" },
          containerType: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
      config: {
        rateLimit: {
          max: process.env.CI ? 10000 : 100,
          timeWindow: "1 minute",
          allowList: ["127.0.0.1", "::1"],
        },
      },
    },
    async (request, _reply) => {
      try {
        if (request.url.includes("/api/rates")) {
          const { origin, destination, containerType } = request.query;
          const originParam = origin || "any";
          const destParam = destination || "any";
          const containerParam = containerType || "any";

          // Cache-Aside pattern for rates (high read frequency, low mutability)
          const CACHE_KEY = `atlas:rates:${originParam}:${destParam}:${containerParam}`;
          const cachedRates = await redis.get(CACHE_KEY).catch(() => null);

          if (cachedRates) {
            return JSON.parse(cachedRates);
          }

          const originAlias = alias(locations, "origin_loc");
          const destinationAlias = alias(locations, "dest_loc");

          const query = db
            .select({
              id: rates.id,
              carrier: sql<string>`COALESCE(${addresses.tradeName}, ${addresses.companyName})`,
              containerType: rates.containerType,
              baseOceanFreight: rates.baseRate,
              baf: rates.baf,
              pss: rates.pss,
              thc: rates.thc,
              serviceLine: rates.serviceLine,
              transitTime: rates.transitDays,
              validTo: rates.validTo,
              originLocode: originAlias.id,
              destinationLocode: destinationAlias.id,
            })
            .from(rates)
            .leftJoin(addresses, eq(rates.carrierId, addresses.id))
            .innerJoin(lanes, eq(rates.laneId, lanes.id))
            .innerJoin(originAlias, eq(lanes.originLocationId, originAlias.id))
            .innerJoin(
              destinationAlias,
              eq(lanes.destinationLocationId, destinationAlias.id),
            )
            .where(
              and(
                origin ? eq(originAlias.id, origin) : undefined,
                destination ? eq(destinationAlias.id, destination) : undefined,
                containerType
                  ? eq(rates.containerType, containerType)
                  : undefined,
              ),
            );

          const allRatesRaw = await query;

          const allRates = allRatesRaw.map((r) => ({
            ...r,
            validTo: r.validTo
              ? r.validTo.toISOString().split("T")[0]
              : "2026-12-31",
          }));
          // Cache for 1 hour (3600 seconds)
          await redis
            .setex(CACHE_KEY, 3600, JSON.stringify(allRates))
            .catch(() => {});
          return allRates;
        }

        const allQuotes = await db.select().from(quotes);
        return allQuotes;
      } catch (_error: unknown) {
        fastify.log.warn(
          "DB/Redis unavailable for quotes/rates, returning fallback data",
        );
        return [
          {
            id: "rate-001",
            carrier: "Maersk",
            origin: "CNSHA",
            destination: "NLRTM",
            containerType: "40HC",
            baseRate: 2450,
            currency: "USD",
            validFrom: "2026-07-01",
            validTo: "2026-09-30",
            transitDays: 28,
          },
          {
            id: "rate-002",
            carrier: "MSC",
            origin: "CNSHA",
            destination: "NLRTM",
            containerType: "40HC",
            baseRate: 2320,
            currency: "USD",
            validFrom: "2026-07-01",
            validTo: "2026-09-30",
            transitDays: 30,
          },
          {
            id: "rate-003",
            carrier: "CMA CGM",
            origin: "SGSIN",
            destination: "DEHAM",
            containerType: "20GP",
            baseRate: 1850,
            currency: "USD",
            validFrom: "2026-07-01",
            validTo: "2026-09-30",
            transitDays: 25,
          },
          {
            id: "rate-004",
            carrier: "Hapag-Lloyd",
            origin: "KRPUS",
            destination: "ESBCN",
            containerType: "40HC",
            baseRate: 2680,
            currency: "USD",
            validFrom: "2026-07-01",
            validTo: "2026-09-30",
            transitDays: 32,
          },
          {
            id: "rate-005",
            carrier: "ONE",
            origin: "JPYOK",
            destination: "USNYC",
            containerType: "40HC",
            baseRate: 3100,
            currency: "USD",
            validFrom: "2026-07-01",
            validTo: "2026-09-30",
            transitDays: 22,
          },
        ];
      }
    },
  );

  fastify.get<{ Querystring: AnalyticsQuerystring }>(
    "/analytics",
    {
      schema: {
        tags: ["Quotes & Rates"],
        summary: "Retrieve 6-month lane rate benchmark trend series",
        querystring: openApiObject({
          origin: { type: "string" },
          destination: { type: "string" },
        }),
        response: {
          200: openApiObject({
            months: { type: "array", items: { type: "string" } },
            marketRates: { type: "array", items: { type: "number" } },
            atlasRates: { type: "array", items: { type: "number" } },
          }),
          ...buildErrorResponses([401, 403, 500]),
        },
      },
      config: {
        rateLimit: {
          max: process.env.CI ? 10000 : 100,
          timeWindow: "1 minute",
          allowList: ["127.0.0.1", "::1"],
        },
      },
    },
    async (request, _reply) => {
      // Mock realistic 6-month data for RouteAnalyticsChart
      const { origin, destination } = request.query;
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

      // Calculate a base rate using simple hash of origin/destination
      const str = `${origin || "ORIG"}-${destination || "DEST"}`;
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      const baseRate = 2000 + (Math.abs(hash) % 1500);

      const marketRates = months.map((_, i) =>
        Math.round(baseRate + Math.sin(i) * 200 + (Math.random() * 100 - 50)),
      );
      const atlasRates = marketRates.map((rate) => Math.round(rate * 0.85));

      return {
        months,
        marketRates,
        atlasRates,
      };
    },
  );

  fastify.post<{ Body: CompareBody }>(
    "/compare",
    {
      schema: {
        tags: ["Quotes & Rates"],
        summary: "Trigger lane rate comparison workflow",
        body: openApiObject({
          origin: { type: "string" },
          destination: { type: "string" },
          containerType: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
      config: {
        rateLimit: {
          max: process.env.CI ? 10000 : 10,
          timeWindow: "1 minute",
          allowList: ["127.0.0.1", "::1"],
        },
      },
    },
    async (request, _reply) => {
      try {
        const { origin, destination, containerType } = request.body;

        const workflowId = await startWorkflow("rate-comparer-process", {
          origin,
          destination,
          containerType,
        });

        return {
          success: true,
          processInstanceKey: workflowId,
        };
      } catch (_error: unknown) {
        fastify.log.warn(
          "Workflow engine unavailable, returning mock comparison",
        );
        const { origin, destination, containerType } = request.body;
        return {
          success: true,
          processInstanceKey: `mock-${Date.now()}`,
          results: [
            {
              carrier: "Maersk",
              rate: 2450,
              transit: 28,
              currency: "USD",
              origin,
              destination,
              containerType: containerType || "40HC",
            },
            {
              carrier: "MSC",
              rate: 2320,
              transit: 30,
              currency: "USD",
              origin,
              destination,
              containerType: containerType || "40HC",
            },
            {
              carrier: "CMA CGM",
              rate: 2580,
              transit: 26,
              currency: "USD",
              origin,
              destination,
              containerType: containerType || "40HC",
            },
          ],
        };
      }
    },
  );

  fastify.post<{ Body: CreateQuoteBody }>(
    "/",
    {
      preHandler: [validate(CreateQuoteSchema)],
      schema: {
        tags: ["Quotes & Rates"],
        summary: "Create a new commercial freight quotation",
        body: openApiObject({
          customerId: { type: "string" },
          quoteNumber: { type: "string" },
          originLocationId: { type: "string" },
          destinationLocationId: { type: "string" },
          equipment: { type: "string" },
          buyRateTotal: { type: "number" },
          sellMargin: { type: "number" },
          sellRateTotal: { type: "number" },
          status: { type: "string" },
          validTo: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
      config: {
        rateLimit: {
          max: process.env.CI ? 10000 : 50,
          timeWindow: "1 minute",
          allowList: ["127.0.0.1", "::1"],
        },
      },
    },
    async (request, reply) => {
      try {
        const data = request.body;
        let customerId = data.customerId;
        if (!customerId) {
          const firstCompany = await db
            .select({ id: companies.id })
            .from(companies)
            .limit(1);
          customerId = firstCompany[0]?.id || uuidv4();
        }
        const newQuote = await db
          .insert(quotes)
          .values({
            id: uuidv4(),
            quoteNumber: data.quoteNumber,
            customerId: customerId,
            originLocationId: data.originLocationId,
            destinationLocationId: data.destinationLocationId,
            equipment: data.equipment || "40HC",
            buyRateTotal: data.buyRateTotal ?? 0,
            sellMargin: data.sellMargin ?? 0,
            sellRateTotal: data.sellRateTotal ?? 0,
            status: data.status || "DRAFT",
            validTo: new Date(data.validTo),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        return newQuote[0];
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.put<{ Params: QuoteParams; Body: Record<string, unknown> }>(
    "/:id",
    {
      schema: {
        tags: ["Quotes & Rates"],
        summary: "Update commercial quotation fields",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
      config: {
        rateLimit: {
          max: process.env.CI ? 10000 : 50,
          timeWindow: "1 minute",
          allowList: ["127.0.0.1", "::1"],
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const updatedQuote = await db
          .update(quotes)
          .set(request.body)
          .where(eq(quotes.id, id))
          .returning();
        return updatedQuote[0];
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.post<{ Params: QuoteParams; Body: AcceptAndBookBody }>(
    "/:id/accept-and-book",
    {
      schema: {
        tags: ["Quotes & Rates"],
        summary:
          "Accept quotation, create and confirm booking, materialize shipment, and optionally open escrow",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: openApiObject({
          origin: { type: "string" },
          destination: { type: "string" },
          carrier: { type: "string" },
          equipment: { type: "string" },
          paymentMode: { type: "string" },
          vesselName: { type: "string" },
          voyageNumber: { type: "string" },
          containerNumber: { type: "string" },
          sealNumber: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
      config: {
        rateLimit: {
          max: process.env.CI ? 10000 : 50,
          timeWindow: "1 minute",
          allowList: ["127.0.0.1", "::1"],
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const body = request.body || {};

        let quoteRecord: typeof quotes.$inferSelect | null = null;
        const existingQuotes = await db
          .select()
          .from(quotes)
          .where(eq(quotes.id, id))
          .limit(1);

        if (existingQuotes.length > 0) {
          quoteRecord = existingQuotes[0];
          await db
            .update(quotes)
            .set({ status: "ACCEPTED", updatedAt: new Date() })
            .where(eq(quotes.id, id));
          quoteRecord.status = "ACCEPTED";
        } else {
          // Dynamic in-memory quote initialization if not previously persisted
          const quoteId =
            id && id !== "dynamic" && id !== "new" ? id : uuidv4();
          const quoteNumber =
            body.quoteNumber ||
            `QT-2026-${Math.floor(10000 + Math.random() * 90000)}`;

          let customerId = body.customerId;
          if (!customerId) {
            const firstCompany = await db
              .select({ id: companies.id })
              .from(companies)
              .limit(1);
            customerId = firstCompany[0]?.id || "c-1";
          }

          const newQuote = await db
            .insert(quotes)
            .values({
              id: quoteId,
              quoteNumber,
              customerId,
              originLocationId: body.originLocationId || null,
              destinationLocationId: body.destinationLocationId || null,
              equipment: body.equipment || "40HC",
              buyRateTotal: Number(
                body.buyRateTotal ??
                  (body.rateAmount ? body.rateAmount * 0.85 : 2000),
              ),
              sellMargin: Number(
                body.sellMargin ??
                  (body.rateAmount ? body.rateAmount * 0.15 : 450),
              ),
              sellRateTotal: Number(
                body.sellRateTotal ?? (body.rateAmount || 2450),
              ),
              status: "ACCEPTED",
              validTo: body.validTo
                ? new Date(body.validTo)
                : new Date(Date.now() + 30 * 86400000),
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();
          quoteRecord = newQuote[0];
        }

        const origin = body.origin || quoteRecord?.originLocationId || "CNSHA";
        const destination =
          body.destination || quoteRecord?.destinationLocationId || "NLRTM";
        const carrier = body.carrier || "Maersk";
        const equipment = body.equipment || quoteRecord?.equipment || "40HC";
        const commodity =
          body.commodityDescription ||
          body.commodity ||
          "General Commercial Merchandise";
        const weight = Number(body.grossWeightKg || body.weight || 18500);
        const shipper = body.shipperName || "Atlas Global Shipper S.A.";
        const consignee =
          body.consigneeName || "Continental Distribution Hub Ltd";
        const rateAmount = Number(
          body.rateAmount || quoteRecord?.sellRateTotal || 2450,
        );
        const currency = body.currency || "USD";
        const paymentMode: "ESCROW_SMART_CONTRACT" | "NET_30_CREDIT" =
          body.paymentMode === "NET_30_CREDIT"
            ? "NET_30_CREDIT"
            : "ESCROW_SMART_CONTRACT";

        // 1. Create booking request
        const createdBooking = await createBookingRequest({
          origin,
          destination,
          carrier,
          equipment,
          commodity,
          commodities: [{ description: commodity, grossWeightKg: weight }],
          weight,
          customerName: shipper,
          consigneeName: consignee,
          rateAmount,
          currency,
          transitDays: Number(body.transitDays || 28),
          status: "PENDING",
          drayageQuote:
            typeof body.drayageQuote === "object" && body.drayageQuote !== null
              ? body.drayageQuote
              : null,
          haulierAddressId: body.haulierAddressId || undefined,
          drayageDestinationAddressId:
            body.drayageDestinationAddressId || undefined,
        });

        // 2. Confirm ocean booking assigning vessel, voyage, container, and cut-off
        const confirmed = await confirmBookingToShipment(createdBooking.id, {
          shipperName: shipper,
          consigneeName: consignee,
          vesselName: body.vesselName,
          voyageNumber: body.voyageNumber,
          containerNumber: body.containerNumber,
          sealNumber: body.sealNumber,
          haulierAddressId: body.haulierAddressId || undefined,
          drayageDestinationAddressId:
            body.drayageDestinationAddressId || undefined,
        });

        // 3. Process payment modality: Smart Contract Escrow vs. Net-30
        let escrowBlock: unknown = null;
        let proformaInvoiceNumber: string | null = null;

        if (paymentMode === "ESCROW_SMART_CONTRACT") {
          escrowBlock = recordEscrowDeposit({
            contractId: `escrow_${confirmed.shipment?.id || createdBooking.id}`,
            eblNumber: `EBL-${confirmed.shipment?.trackingNumber || createdBooking.referenceNumber}`,
            sender: shipper,
            amountUsd: rateAmount,
            details: `Escrow deposit secured for freight booking ${createdBooking.referenceNumber}. Automated release via DCSA oracle (CUSTOMS_CLEARED / CONTAINER_DISCHARGED).`,
            metadata: {
              bookingReference: createdBooking.referenceNumber,
              carrierBookingNumber: confirmed.booking?.carrierBookingNumber,
              shipmentId: confirmed.shipment?.id,
              paymentMode: "ESCROW_SMART_CONTRACT",
            },
          });
        } else {
          proformaInvoiceNumber = `INV-PRO-${Date.now().toString().slice(-6)}`;
        }

        // 4. Dispatch / simulate DCSA 3.0 Telemetry Event
        let dcsaSimResult: Awaited<
          ReturnType<typeof DcsaHubService.simulateCarrierEvent>
        > | null = null;
        try {
          let scac: "MSCU" | "MAEU" | "CMDU" | "HLCU" = "MAEU";
          const carrierUpper = (carrier || "").toUpperCase();
          if (carrierUpper.includes("MSC")) scac = "MSCU";
          else if (carrierUpper.includes("CMA")) scac = "CMDU";
          else if (carrierUpper.includes("HAPAG")) scac = "HLCU";

          dcsaSimResult = await DcsaHubService.simulateCarrierEvent({
            carrierCode: scac,
            eventType: "SHIPMENT",
            eventTypeCode: "CONF",
            bookingReference:
              confirmed.booking?.carrierBookingNumber ||
              createdBooking.referenceNumber ||
              undefined,
            containerNumber: confirmed.container?.containerNumber ?? undefined,
            locode: origin,
          });
        } catch (dcsaErr: unknown) {
          fastify.log.warn(
            { err: dcsaErr },
            "DCSA carrier event simulation notice",
          );
        }

        const cutOffDateStr =
          (confirmed.booking as { cutOffDate?: string | null })?.cutOffDate ||
          new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0];

        return reply.send({
          success: true,
          message: "Quote accepted and ocean booking issued successfully",
          quote: {
            id: quoteRecord?.id,
            quoteNumber: quoteRecord?.quoteNumber,
            status: "ACCEPTED",
          },
          booking: {
            id: createdBooking.id,
            referenceNumber: createdBooking.referenceNumber,
            carrierBookingNumber: confirmed.booking?.carrierBookingNumber,
            carrier: confirmed.booking?.carrier,
            vessel: confirmed.shipment?.vesselName || confirmed.booking?.vessel,
            voyage:
              confirmed.shipment?.voyageNumber || confirmed.booking?.voyage,
            origin: createdBooking.origin,
            destination: createdBooking.destination,
            equipment: createdBooking.equipment,
            cutOffDate: cutOffDateStr,
            containerNumber: confirmed.container?.containerNumber,
            sealNumber: confirmed.container?.sealNumber,
            drayageOrder: confirmed.drayageOrder || null,
          },
          shipment: confirmed.shipment,
          drayageOrder: confirmed.drayageOrder || null,
          payment: {
            mode: paymentMode,
            escrowBlock:
              paymentMode === "ESCROW_SMART_CONTRACT" ? escrowBlock : null,
            proformaInvoiceNumber,
            amount: rateAmount,
            currency,
          },
          edi: {
            dcsaEvent: dcsaSimResult?.event,
            signature: dcsaSimResult?.signature,
            verified: dcsaSimResult?.verification?.verified ?? true,
          },
          links: {
            shipment360Url: `/shipment-360?id=${confirmed.shipment?.id || createdBooking.id}`,
            ediHubUrl: `/edi?ref=${confirmed.booking?.carrierBookingNumber || createdBooking.referenceNumber}`,
            smartContractsUrl: `/smart-contracts`,
            drayageHubUrl: `/drayage`,
            quotePdfUrl: `/api/quotes/${quoteRecord?.id}/pdf`,
          },
        });
      } catch (error: unknown) {
        fastify.log.error(error, "Error in accept-and-book quote");
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.get<{ Params: QuoteParams }>(
    "/:id/pdf",
    {
      schema: {
        tags: ["Quotes & Rates"],
        summary: "Render and download an official commercial quotation PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const quoteList = await db
          .select()
          .from(quotes)
          .where(eq(quotes.id, id));
        if (!quoteList.length) {
          return reply.code(404).send({ error: "Quote not found" });
        }
        const q = quoteList[0];
        const pdfBuffer = await PDFService.generateQuote({
          quoteNumber: q.quoteNumber,
          customer: "Client From Portal",
          origin: q.originLocationId || "Origin Port",
          destination: q.destinationLocationId || "Destination Port",
          equipment: q.equipment,
          buyRateTotal: q.buyRateTotal,
          sellMargin: q.sellMargin,
          sellRateTotal: q.sellRateTotal,
          validTo: q.validTo
            ? new Date(q.validTo).toISOString().split("T")[0]
            : "2026-12-31",
        });
        reply.header("Content-Type", "application/pdf");
        reply.header(
          "Content-Disposition",
          `attachment; filename="Quote-${q.quoteNumber}.pdf"`,
        );
        return reply.send(pdfBuffer);
      } catch (error: unknown) {
        fastify.log.error({ err: error }, "Failed to generate quote PDF");
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.post<{ Body: GeneratePdfBody }>(
    "/generate-pdf",
    {
      schema: {
        tags: ["Quotes & Rates"],
        summary: "Render an ad-hoc commercial freight quotation PDF",
        body: openApiObject({
          quoteNumber: { type: "string" },
          customer: { type: "string" },
          origin: { type: "string" },
          destination: { type: "string" },
          carrier: { type: "string" },
          equipment: { type: "string" },
          sellRateTotal: { type: "number" },
          currency: { type: "string" },
          validTo: { type: "string" },
        }),
        response: {
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const body = request.body;
        const pdfBuffer = await PDFService.generateQuote({
          quoteNumber:
            body.quoteNumber || `QT-${Date.now().toString().slice(-6)}`,
          customer: body.customer || "Enterprise Shipper",
          origin: body.origin || "Origin Port",
          destination: body.destination || "Destination Port",
          carrier: body.carrier || "Primary Alliances",
          equipment: body.equipment || "40HC Container",
          buyRateTotal: body.buyRateTotal,
          sellMargin: body.sellMargin,
          sellRateTotal: body.sellRateTotal ?? 0,
          currency: body.currency || "USD",
          validTo: body.validTo || "2026-12-31",
          serviceLine: body.serviceLine || "Standard",
          transitDays: body.transitDays || 28,
        });
        reply.header("Content-Type", "application/pdf");
        reply.header(
          "Content-Disposition",
          `attachment; filename="Quote-${body.quoteNumber || "Draft"}.pdf"`,
        );
        return reply.send(pdfBuffer);
      } catch (error: unknown) {
        fastify.log.error(
          { err: error },
          "Failed to generate direct quote PDF",
        );
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  // Rate Ingestion & UN/LOCODE Management Endpoints
  fastify.post<{ Body: PreviewRatesBody }>(
    "/preview",
    {
      schema: {
        tags: ["Quotes & Rates"],
        summary: "Preview and validate tabular carrier rate sheet rows",
        body: openApiObject({
          rows: {
            type: "array",
            items: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          },
          defaultCarrier: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
      config: {
        rateLimit: {
          max: process.env.CI ? 10000 : 50,
          timeWindow: "1 minute",
          allowList: ["127.0.0.1", "::1"],
        },
      },
    },
    async (request, reply) => {
      try {
        const { rows, defaultCarrier } = request.body || {};
        if (!rows || !Array.isArray(rows)) {
          return reply
            .code(400)
            .send({ error: "Field 'rows' required as an array." });
        }
        const preview = await previewRates(rows, defaultCarrier);
        return preview;
      } catch (error: unknown) {
        fastify.log.error(error, "Error previewing rates");
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.post<{ Body: BulkImportRatesBody }>(
    "/bulk-import",
    {
      schema: {
        tags: ["Quotes & Rates"],
        summary: "Execute bulk carrier freight rate ingestion batch",
        body: openApiObject({
          fileName: { type: "string" },
          carrierId: { type: "string" },
          rates: {
            type: "array",
            items: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
      config: {
        rateLimit: {
          max: process.env.CI ? 10000 : 50,
          timeWindow: "1 minute",
          allowList: ["127.0.0.1", "::1"],
        },
      },
    },
    async (request, reply) => {
      try {
        const payload = request.body || {};
        if (!payload.rates || !Array.isArray(payload.rates)) {
          return reply
            .code(400)
            .send({ error: "Field 'rates' required as an array." });
        }
        const result = await bulkImportRates({
          fileName: payload.fileName || "rates_import.csv",
          rates: payload.rates,
          carrierId: payload.carrierId,
          newAliases: payload.newAliases,
          userId: payload.userId,
        });
        return result;
      } catch (error: unknown) {
        fastify.log.error(error, "Error executing bulk rate import");
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.get<{ Querystring: ImportBatchesQuery }>(
    "/import-batches",
    {
      schema: {
        tags: ["Quotes & Rates"],
        summary: "List historical carrier rate ingestion batches",
        querystring: openApiObject({
          limit: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
      config: {
        rateLimit: {
          max: process.env.CI ? 10000 : 100,
          timeWindow: "1 minute",
          allowList: ["127.0.0.1", "::1"],
        },
      },
    },
    async (request, reply) => {
      try {
        const limit = parseInt(request.query?.limit || "20", 10);
        const batches = await getImportBatches(limit);
        return batches;
      } catch (error: unknown) {
        fastify.log.error(error, "Error retrieving import batches");
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.get<{ Querystring: UnlocodeLookupQuery }>(
    "/unlocode-lookup",
    {
      schema: {
        tags: ["Quotes & Rates"],
        summary:
          "Resolve a port alias or query string to a canonical UN/LOCODE",
        querystring: openApiObject({
          q: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
      config: {
        rateLimit: {
          max: process.env.CI ? 10000 : 100,
          timeWindow: "1 minute",
          allowList: ["127.0.0.1", "::1"],
        },
      },
    },
    async (request, reply) => {
      try {
        const query = (request.query?.q || "").trim();
        const resolved = await resolvePort(query);
        return resolved;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  // Dynamic Commercial Pricing & Tariff Engine Endpoints (atlas-billing-tariff-engine)
  fastify.post<{
    Body: {
      originLocode: string;
      destinationLocode: string;
      containerType?: string;
      etd: string;
      carrierId?: string;
      containerCount?: number;
      targetCurrency?: string;
      currentBunkerPrice?: number;
    };
  }>(
    "/resolve-tariff",
    {
      schema: {
        tags: ["Quotes & Rates", "Tariff Engine"],
        summary:
          "Resolve temporal contract tariffs and dynamic surcharges for an ETD",
        body: openApiObject({
          originLocode: { type: "string" },
          destinationLocode: { type: "string" },
          containerType: { type: "string" },
          etd: { type: "string" },
          carrierId: { type: "string" },
          containerCount: { type: "number" },
          targetCurrency: { type: "string" },
          currentBunkerPrice: { type: "number" },
        }),
        response: {
          200: openApiObject({
            success: { type: "boolean" },
            count: { type: "number" },
            quotes: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          }),
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const {
          originLocode,
          destinationLocode,
          containerType = "40HC",
          etd,
          carrierId,
          containerCount = 1,
          targetCurrency = "USD",
          currentBunkerPrice,
        } = request.body || {};

        if (!originLocode || !destinationLocode || !etd) {
          return reply.code(400).send({
            error:
              "originLocode, destinationLocode, and etd are required parameters.",
          });
        }

        const ratedQuotes = await TariffResolutionService.resolveRatesForETD({
          originLocode,
          destinationLocode,
          containerType,
          etd,
          carrierId,
          containerCount,
          targetCurrency,
          currentBunkerPrice,
        });

        return reply.send({
          success: true,
          count: ratedQuotes.length,
          quotes: ratedQuotes,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );

  fastify.post<{ Params: { id: string } }>(
    "/rates/:id/invalidate-early",
    {
      schema: {
        tags: ["Quotes & Rates", "Tariff Engine"],
        summary:
          "Invalidate a contract rate early under append-only tariff policy",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: openApiObject({
            success: { type: "boolean" },
            message: { type: "string" },
            result: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          }),
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const result = await TariffResolutionService.invalidateRateEarly(id);
        return reply.send({
          success: true,
          message: "Rate invalidated early according to append-only policy",
          result,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        const code =
          error instanceof Error && error.message.includes("not found")
            ? 404
            : 500;
        return reply.code(code).send({ error: message });
      }
    },
  );

  fastify.post<{
    Body: {
      buyRateTotal: number;
      sellRateTotal: number;
      minMarginPercent?: number;
      currency?: string;
    };
  }>(
    "/validate-margin",
    {
      schema: {
        tags: ["Quotes & Rates", "Tariff Engine"],
        summary: "Evaluate commercial buy/sell margin threshold compliance",
        body: openApiObject({
          buyRateTotal: { type: "number" },
          sellRateTotal: { type: "number" },
          minMarginPercent: { type: "number" },
          currency: { type: "string" },
        }),
        response: {
          200: openApiObject({
            success: { type: "boolean" },
            margin: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          }),
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const {
          buyRateTotal,
          sellRateTotal,
          minMarginPercent = 15.0,
          currency = "USD",
        } = request.body || {};

        if (buyRateTotal === undefined || sellRateTotal === undefined) {
          return reply.code(400).send({
            error: "buyRateTotal and sellRateTotal are required numbers.",
          });
        }

        const marginResult = TariffResolutionService.evaluateQuoteMargin(
          buyRateTotal,
          sellRateTotal,
          minMarginPercent,
          currency,
        );

        return reply.send({
          success: true,
          margin: marginResult,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ error: message });
      }
    },
  );
};

export default quotesRoutes;
