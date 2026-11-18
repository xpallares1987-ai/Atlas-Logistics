/**
 * @file edi.routes.ts
 * @description Operational route handlers for Electronic Data Interchange (EDI) processing, parsing, outbound generation, and interchange audit ledger.
 * @module @atlas/routes/edi
 * @see {@link docs/superpowers/plans/2026-11-15-issue-9-strict-eslint-restoration-routes.md}
 */

import { FastifyPluginAsync } from "fastify";
import {
  EdiTokenizer,
  EdifactService,
  EdifactDesadvService,
  EdifactIftstaService,
  X12Service,
  EdiDispatcherService,
} from "../services/edi/index.js";
import { z } from "zod";
import { db } from "../db/index.js";
import {
  shipments,
  shipmentContainers,
  customsDeclarations,
} from "../db/schema/operations.js";
import { shipmentEventLogs } from "../db/schema/audit.js";
import { eq } from "drizzle-orm";

// ============================================================================
// SCHEMAS & TYPE DEFINITIONS
// ============================================================================

const inboundSchema = z.object({
  rawPayload: z.string().min(10, "EDI payload must be at least 10 characters"),
});

const generateSchema = z.object({
  format: z.enum(["IFTMIN", "204", "304", "310", "315", "IFTSTA"]),
  bookingReference: z.string().min(1),
  partnerId: z.string().optional(),
  senderId: z.string().optional(),
  receiverId: z.string().optional(),
  instructionData: z.record(z.string(), z.unknown()),
});

interface DesadvGenerateQuery {
  senderId?: string;
  receiverId?: string;
}

// ============================================================================
// ROUTE PLUGIN
// ============================================================================

export const ediRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Process inbound carrier EDI message (AS2, SFTP, Webhook)
   */
  fastify.post("/inbound", async (request, reply) => {
    try {
      const parsed = inboundSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: "Invalid payload",
          details: parsed.error.issues,
        });
      }

      const result = await EdiDispatcherService.processInboundPayload(
        parsed.data.rawPayload,
      );

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to process EDI transmission";
      return reply.status(500).send({
        success: false,
        error: message,
      });
    }
  });

  /**
   * Interactive parser endpoint for UI workbench (returns AST & decomposed segments)
   */
  fastify.post("/parse", async (request, reply) => {
    try {
      const parsed = inboundSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: "Invalid payload",
          details: parsed.error.issues,
        });
      }

      const raw = parsed.data.rawPayload.trim();
      const standard = EdiTokenizer.detectStandard(raw);
      if (standard === "UNKNOWN") {
        return reply.status(400).send({
          success: false,
          error:
            "Unrecognized format. Must start with UNA/UNB (EDIFACT) or ISA (ANSI X12)",
        });
      }

      const ast = EdiTokenizer.tokenize(raw);
      let parsedEvents: unknown[] = [];

      if (standard === "EDIFACT") {
        const isDesadv = ast.segments.some((s) => {
          if (s.tag !== "UNH") return false;
          const el = s.elements[1];
          if (!el) return false;
          if (typeof el === "string") return el.includes("DESADV");
          const components =
            typeof el === "object" && el !== null && "components" in el
              ? (el as { components?: (string | undefined)[] }).components
              : undefined;
          return components?.some((c) => c && c.includes("DESADV"));
        });

        if (isDesadv) {
          const desadv = EdifactDesadvService.parse(ast);
          parsedEvents = [
            {
              senderId: desadv.consignor.code || "SUPPLIER",
              receiverId: desadv.consignee.code || "CUSTOMER",
              controlNumber: desadv.despatchAdviceNumber,
              bookingReference: desadv.orderReference,
              billOfLading: desadv.billOfLadingReference,
              statusCode: "DESPATCH_ADVICE",
              milestone: "DESPATCH_CONFIRMED",
              locationName: desadv.consignor.city || desadv.consignor.name,
              eventTimestamp: desadv.despatchDate,
              isException: false,
              details: `DESADV ${desadv.despatchAdviceNumber}: ${desadv.items.length} lines, ${desadv.totalPackages} packages, ${desadv.totalGrossWeightKg} kg`,
              despatchAdvice: desadv,
            },
          ];
        } else {
          parsedEvents = EdifactService.parseIFTSTA(ast);
        }
      } else {
        const is315 = ast.segments.some(
          (s) => s.tag === "ST" && s.elements[0] === "315",
        );
        if (is315) {
          parsedEvents = X12Service.parse315(ast);
        } else {
          parsedEvents = X12Service.parse214(ast);
        }
      }

      return reply.send({
        success: true,
        standard,
        delimiters: ast.delimiters,
        segmentsCount: ast.segments.length,
        segments: ast.segments,
        parsedEvents,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Syntactic error while parsing EDI document";
      return reply.status(400).send({
        success: false,
        error: message,
      });
    }
  });

  /**
   * Generate outbound EDI instruction (IFTMIN or ANSI X12 204)
   */
  fastify.post("/generate", async (request, reply) => {
    try {
      const parsed = generateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: "Invalid payload",
          details: parsed.error.issues,
        });
      }

      const result = await EdiDispatcherService.generateOutbound({
        format: parsed.data.format,
        bookingReference: parsed.data.bookingReference,
        partnerId: parsed.data.partnerId,
        senderId: parsed.data.senderId,
        receiverId: parsed.data.receiverId,
        instructionData: parsed.data.instructionData,
      });

      return reply.status(201).send({
        success: true,
        data: result,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to generate outbound EDI document";
      return reply.status(500).send({
        success: false,
        error: message,
      });
    }
  });

  /**
   * Dispatch Carrier Customs Release Status (ANSI X12 315 / UN/EDIFACT IFTSTA)
   */
  fastify.post(
    "/shipments/:shipmentId/dispatch-customs-release",
    async (request, reply) => {
      try {
        const { shipmentId } = request.params as { shipmentId: string };
        const body = (request.body || {}) as {
          standard?: "ANSI_X12" | "EDIFACT";
          carrierScac?: string;
          remarks?: string;
        };

        const [shipment] = await db
          .select()
          .from(shipments)
          .where(eq(shipments.id, shipmentId))
          .limit(1);

        if (!shipment) {
          return reply.status(404).send({
            success: false,
            error: `Shipment '${shipmentId}' not found`,
          });
        }

        const containers = await db
          .select()
          .from(shipmentContainers)
          .where(eq(shipmentContainers.shipmentId, shipmentId))
          .limit(1);
        const primaryContainer = containers[0];

        const declarations = await db
          .select()
          .from(customsDeclarations)
          .where(eq(customsDeclarations.shipmentId, shipmentId))
          .limit(1);
        const declaration = declarations[0];

        const standard = body.standard || "ANSI_X12";
        const carrierScac = body.carrierScac || "MSCU";
        const bookingRef =
          shipment.trackingNumber || `BK-${shipmentId.slice(0, 8)}`;
        const blNumber = `BL-${shipment.trackingNumber || shipmentId.slice(0, 8)}`;
        const containerNumber =
          primaryContainer?.containerNumber || "MSKU9284712";
        const sealNumber = primaryContainer?.sealNumber || "SL-928471";
        const portLocode = shipment.destination?.slice(0, 5) || "ESVLC";

        let result;
        if (standard === "ANSI_X12") {
          result = await EdiDispatcherService.generateOutbound({
            format: "315",
            bookingReference: bookingRef,
            senderId: "ATLASLOG",
            receiverId: carrierScac,
            instructionData: {
              senderId: "ATLASLOG",
              receiverId: carrierScac,
              controlNumber: Math.floor(
                100000000 + Math.random() * 900000000,
              ).toString(),
              bookingReference: bookingRef,
              billOfLadingNumber: blNumber,
              containerNumber,
              sealNumber,
              vesselName: shipment.vesselName || "VESSEL",
              voyageNumber: shipment.voyageNumber || "2601W",
              carrierScac,
              statusCode: "CR",
              milestone: "CUSTOMS_CLEARED",
              portLocode,
              eventTimestamp: new Date().toISOString(),
              isException: false,
            },
          });
        } else {
          result = await EdiDispatcherService.generateOutbound({
            format: "IFTSTA",
            bookingReference: bookingRef,
            senderId: "ATLASLOG",
            receiverId: carrierScac,
            instructionData: {
              statusCode: "74",
              bookingReference: bookingRef,
              billOfLading: blNumber,
              containerNumber,
              vesselName: shipment.vesselName || "VESSEL",
              voyageNumber: shipment.voyageNumber || "2601W",
              locationCode: portLocode,
              locationName: "PORT TERMINAL",
              eventTimestamp: new Date().toISOString(),
              exceptionReason:
                body.remarks ||
                (declaration
                  ? `DUA ${declaration.duaNumber} CLEARED`
                  : undefined),
            },
          });
        }

        const eventId = `evt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
        await db.insert(shipmentEventLogs).values({
          id: eventId,
          shipmentId,
          status: "CARRIER_EDI_NOTIFIED",
          location: `${portLocode} — Dispatched ${standard} status (${result.format}) to ${carrierScac}`,
          recordedAt: new Date(),
        });

        return reply.status(201).send({
          success: true,
          data: result,
          milestone: {
            id: eventId,
            status: "CARRIER_EDI_NOTIFIED",
          },
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to dispatch carrier customs release EDI";
        return reply.status(500).send({
          success: false,
          error: message,
        });
      }
    },
  );

  /**
   * Dispatch Shipping Instructions (ANSI X12 304 / UN/EDIFACT IFTMIN) with SOLAS VGM
   */
  fastify.post(
    "/shipments/:shipmentId/dispatch-shipping-instructions",
    async (request, reply) => {
      try {
        const { shipmentId } = request.params as { shipmentId: string };
        const body = (request.body || {}) as {
          standard?: "ANSI_X12" | "EDIFACT";
          carrierScac?: string;
          vgmWeightKg?: number;
        };

        const [shipment] = await db
          .select()
          .from(shipments)
          .where(eq(shipments.id, shipmentId))
          .limit(1);

        if (!shipment) {
          return reply.status(404).send({
            success: false,
            error: `Shipment '${shipmentId}' not found`,
          });
        }

        const containers = await db
          .select()
          .from(shipmentContainers)
          .where(eq(shipmentContainers.shipmentId, shipmentId))
          .limit(1);
        const primaryContainer = containers[0];

        const standard = body.standard || "ANSI_X12";
        const carrierScac = body.carrierScac || "MSCU";
        const bookingRef =
          shipment.trackingNumber || `BK-${shipmentId.slice(0, 8)}`;
        const blNumber = `BL-${shipment.trackingNumber || shipmentId.slice(0, 8)}`;
        const containerNumber =
          primaryContainer?.containerNumber || "MSKU9284712";
        const sealNumber = primaryContainer?.sealNumber || "SL-928471";
        const vgmKg = body.vgmWeightKg || primaryContainer?.weight || 24500;

        let result;
        if (standard === "ANSI_X12") {
          result = await EdiDispatcherService.generateOutbound({
            format: "304",
            bookingReference: bookingRef,
            senderId: "ATLASLOG",
            receiverId: carrierScac,
            instructionData: {
              bookingReference: bookingRef,
              billOfLadingNumber: blNumber,
              carrierScac,
              vesselName: shipment.vesselName || "MSC OSCAR",
              voyageNumber: shipment.voyageNumber || "2601W",
              shipper: {
                name: "Atlas Global Forwarding SL",
                address: "Av. Port 42",
                city: "Barcelona",
                state: "CT",
                postalCode: "08039",
                countryCode: "ES",
              },
              consignee: {
                name: "Continental Distribution Hub LLC",
                address: "420 Broadway Ave",
                city: "New York",
                state: "NY",
                postalCode: "10013",
                countryCode: "US",
              },
              portOfLoading: {
                locode: "ESBCN",
                portName: "Barcelona Container Terminal",
              },
              portOfDischarge: {
                locode: "USNYC",
                portName: "New York Red Hook Terminal",
              },
              container: {
                containerNumber,
                equipmentType: "40HC",
                sealNumber,
                grossWeightKg: vgmKg,
                verifiedGrossMassKg: vgmKg,
                vgmVerificationMethod: "METHOD_1",
                vgmAuthorizedPerson: "ATLAS LOGISTICS DECLARANT",
              },
              cargo: {
                description:
                  "Commercial Freight Goods - Electronics & Industrial Components",
                hsCode: "85044090",
                grossWeightKg: vgmKg - 3800,
                volumeCbm: 65.4,
                packageCount: 480,
                packageType: "PK",
              },
            },
          });
        } else {
          result = await EdiDispatcherService.generateOutbound({
            format: "IFTMIN",
            bookingReference: bookingRef,
            senderId: "ATLASLOG",
            receiverId: carrierScac,
            instructionData: {
              bookingReference: bookingRef,
              vesselName: shipment.vesselName || "MSC OSCAR",
              voyageNumber: shipment.voyageNumber || "2601W",
              portOfLoading: "ESBCN",
              portOfDischarge: "USNYC",
              shipperName: "Atlas Global Forwarding SL",
              consigneeName: "Continental Distribution Hub LLC",
              containerNumber,
              sealNumber,
              grossWeightKg: vgmKg,
              verifiedGrossMassKg: vgmKg,
              goodsDescription:
                "Commercial Freight Goods - Electronics & Industrial Components",
            },
          });
        }

        const eventId = `evt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
        await db.insert(shipmentEventLogs).values({
          id: eventId,
          shipmentId,
          status: "SHIPPING_INSTRUCTIONS_FILED",
          location: `Barcelona Terminal — Dispatched Shipping Instructions (${result.format}) to ${carrierScac} [VGM: ${vgmKg}kg]`,
          recordedAt: new Date(),
        });

        return reply.status(201).send({
          success: true,
          data: result,
          milestone: {
            id: eventId,
            status: "SHIPPING_INSTRUCTIONS_FILED",
          },
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to dispatch Shipping Instructions EDI";
        return reply.status(500).send({
          success: false,
          error: message,
        });
      }
    },
  );

  /**
   * Retrieve historical audit ledger of interchanges
   */
  fastify.get("/interchanges", async (_request, reply) => {
    try {
      const interchanges = await EdiDispatcherService.listInterchanges(100, 0);
      return reply.send({
        success: true,
        data: interchanges,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to query EDI interchanges";
      return reply.status(500).send({
        success: false,
        error: message,
      });
    }
  });

  /**
   * Retrieve configured trading partners
   */
  fastify.get("/partners", async (_request, reply) => {
    try {
      const partners = await EdiDispatcherService.listPartners();
      return reply.send({
        success: true,
        data: partners,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to query EDI partners";
      return reply.status(500).send({
        success: false,
        error: message,
      });
    }
  });

  /**
   * Curated ready-to-test sample EDI messages for 1-click execution in UI
   */
  fastify.get("/samples", async (_request, reply) => {
    const samples = [
      {
        id: "msc_x12_315_vessel_departure",
        name: "MSC ANSI X12 315 — Ocean Vessel Departure",
        standard: "ANSI_X12",
        messageType: "315",
        carrier: "MSCU",
        bookingRef: "BK-2026-9042",
        description:
          "Official telemetry departure report for container vessel MSC OSCAR from Valencia to New York Harbor.",
        payload:
          "ISA*00*          *00*          *ZZ*MSCU           *ZZ*ATLASLOG       *261102*1200*U*00401*000099481*0*P*>~GS*QO*MSCU*ATLASLOG*20261102*1200*9948*X*004010~ST*315*0001~B4*N*12*VD*20261102*1130*ESVLC*MSCU*9821034~N9*BM*MSCU99482103~N9*BN*BK-2026-9042~N9*SN*SL-994821~Q2*9839420*US*20261102***24500*K*V.2611W**MSC OSCAR~R4*R*UN*ESVLC***VALENCIA TERMINAL~R4*D*UN*USNYC***NEW YORK HARBOR~SE*11*0001~GE*1*9948~IEA*1*000099481~",
      },
      {
        id: "maersk_x12_315_rollover",
        name: "Maersk ANSI X12 315 — Rollover Exception",
        standard: "ANSI_X12",
        messageType: "315",
        carrier: "MAEU",
        bookingRef: "BK-2026-9042",
        description:
          "Critical maritime exception alert: Vessel capacity reached. Container rolled over to next scheduled departure.",
        payload:
          "ISA*00*          *00*          *ZZ*MAEU           *ZZ*ATLASLOG       *261102*1400*U*00401*000099482*0*P*>~GS*QO*MAEU*ATLASLOG*20261102*1400*9949*X*004010~ST*315*0001~B4*N*12*RL*20261102*1345*ESVLC*MAEU*7749102~N9*BM*MAEU77491023~N9*BN*BK-2026-9042~Q2*9778810*DK*20261102***22000*K*V.4402E**MAERSK MC-KINNEY~R4*R*UN*ESVLC***VALENCIA TERMINAL~SE*8*0001~GE*1*9949~IEA*1*000099482~",
      },
      {
        id: "hapag_x12_304_si",
        name: "Hapag-Lloyd ANSI X12 304 — Shipping Instructions & SOLAS VGM",
        standard: "ANSI_X12",
        messageType: "304",
        carrier: "HLCU",
        bookingRef: "BK-2026-9042",
        description:
          "Complete ocean shipping instructions with certified VGM weighing (SOLAS Method 1) and seal details.",
        payload:
          "ISA*00*          *00*          *ZZ*ATLASLOG       *ZZ*HLCU           *261102*1000*U*00401*000099483*0*P*>~GS*SO*ATLASLOG*HLCU*20261102*1000*9950*X*004010~ST*304*0001~B2*HLCU*BK-2026-9042***L~B2A*00~Y4*HLCU8810239*40HC***24500*K*SL-881920~W09*24500*K*SM1*ATLAS LOGISTICS DECLARANT~N1*SH*IBERIA INDUSTRIAL SL~N3*AV. PUERTO 42~N4*VALENCIA*VC*46024*ES~N1*CN*GLOBAL ATLANTIC MACHINERY LLC~N3*420 BROADWAY AVE~N4*NEW YORK*NY*10013*US~R4*L*UN*ESVLC***VALENCIA PORT~R4*D*UN*USNYC***NEW YORK HARBOR~Q2*9839420*US*20261102***24500*K*V.2611W**HAPAG ROTTERDAM~LX*1~L5*1*MACHINERY PARTS & COMPONENTS*72083800~L0*1*24500*K*24500*K*68.2*X*480*PK~SE*19*0001~GE*1*9950~IEA*1*000099483~",
      },
      {
        id: "maersk_iftsta_departure",
        name: "Maersk Line IFTSTA — Vessel Departure",
        standard: "EDIFACT",
        messageType: "IFTSTA",
        carrier: "MAERSKLINE",
        bookingRef: "BK-2026-8819",
        description:
          "Official vessel departure telemetry report from Valencia Port to New York Harbor.",
        payload:
          "UNB+UNOA:2+MAERSKLINE:ZZ+ATLASLOG:ZZ+261004:1430+100021'BGM+7+BK-2026-8819+9'RFF+BM:MSK992011'DTM+137:202610041200:203'LOC+7+ESVLC:139:6+VALENCIA PORT'LOC+11+USNYC:139:6+NEW YORK HARBOR'STS+1+VD'UNT+7+100021'UNZ+1+100021'",
      },
      {
        id: "msc_iftsta_customs_hold",
        name: "MSC Geneva IFTSTA — Customs Hold",
        standard: "EDIFACT",
        messageType: "IFTSTA",
        carrier: "MSCGVA",
        bookingRef: "BK-2026-8819",
        description:
          "Immediate operational exception alert: Customs terminal hold for security inspection.",
        payload:
          "UNB+UNOA:2+MSCGVA:01+ATLASLOG:ZZ+261004:1615+100022'BGM+7+BK-2026-8819+9'RFF+BM:MEDU881023'DTM+137:202610041600:203'LOC+7+ESBCN:139:6+BARCELONA PORT'STS+1+X4'FTX+AAI+++CUSTOMS INSPECTION MANDATED BY TAXUD'UNT+7+100022'UNZ+1+100022'",
      },
      {
        id: "knight_x12_214_in_transit",
        name: "Knight-Swift ANSI X12 214 — En Route",
        standard: "ANSI_X12",
        messageType: "214",
        carrier: "KNIGHTSWIFT",
        bookingRef: "BK-2026-8819",
        description:
          "Road freight telemetry update en route to destination with geographic coordinates.",
        payload:
          "ISA*00*          *00*          *02*KNIGHTSWIFT    *ZZ*ATLASLOG       *261004*1540*U*00401*000008821*0*P*>~GS*QM*KNIGHTSWIFT*ATLASLOG*20261004*1540*8821*X*004010~ST*214*0001~B10*KS-991201*BK-2026-8819*KNIGHTSWIFT~LX*1~AT7*X6*NS***20261004*1530*LT~MS1*MADRID*ES*ES~SE*6*0001~GE*1*8821~IEA*1*000008821~",
      },
      {
        id: "jbhunt_x12_214_delivered",
        name: "J.B. Hunt ANSI X12 214 — Delivered",
        standard: "ANSI_X12",
        messageType: "214",
        carrier: "JBHUNT",
        bookingRef: "BK-2026-8819",
        description:
          "Final delivery confirmation at customer facility with electronic signature.",
        payload:
          "ISA*00*          *00*          *ZZ*JBHUNT         *ZZ*ATLASLOG       *261004*1800*U*00401*000009941*0*P*>~GS*QM*JBHUNT*ATLASLOG*20261004*1800*9941*X*004010~ST*214*0001~B10*JB-441092*BK-2026-8819*JBHUNT~LX*1~AT7*AG*NS***20261004*1745*LT~MS1*VALENCIA*ES*ES~SE*6*0001~GE*1*9941~IEA*1*000009941~",
      },
      {
        id: "edifact_desadv_d96a_standard",
        name: "UN/EDIFACT D96A DESADV — Despatch Advice",
        standard: "EDIFACT",
        messageType: "DESADV",
        carrier: "LOGISTICS-HUB",
        bookingRef: "BK-2026-67116",
        description:
          "Electronic international despatch advice for 10 packages with line item itemization, weight, and UOM.",
        payload:
          "UNB+UNOA:2+SUPPLIER01+ATLASLOG+261111:1200+100099'UNH+1+DESADV:D:96A:UN'BGM+351+DESADV-2026-8819+9'DTM+137:202611111200:203'RFF+ON:ORD-2026-9921'RFF+BM:MSKU9284712'NAD+SE+SUPPLIER01::92+Global Industrial Parts S.L.+Poligono Prat+Barcelona++08820+ES'NAD+CN+CUSTOMER01::92+Atlas Logistics Hub+Carrer Motors 10+Barcelona++08040+ES'CPS+1'PAC+10++CT'MEA+WT+G+KGM:850'LIN+1++SENSOR-X100:IN'IMD+F++:::Industrial Telemetry Sensors'QTY+12:500:PCE'MEA+WT+G+KGM:850'PAC+10++CT'UNT+15+1'UNZ+1+100099'",
      },
    ];

    return reply.send({
      success: true,
      data: samples,
    });
  });

  // ==========================================================================
  // UN/EDIFACT D96A DESADV & IFTSTA Gateway Endpoints
  // ==========================================================================

  /**
   * Parse EDIFACT DESADV message into structured JSON DespatchAdvice
   */
  fastify.post("/desadv/parse", async (request, reply) => {
    try {
      const parsed = inboundSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: "Invalid DESADV payload",
          details: parsed.error.issues,
        });
      }

      const advice = EdifactDesadvService.parse(parsed.data.rawPayload);
      return reply.send({
        success: true,
        data: advice,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to parse DESADV";
      return reply.status(500).send({
        success: false,
        error: message,
      });
    }
  });

  /**
   * Generate EDIFACT D96A DESADV message text from JSON structure
   */
  fastify.post<{ Querystring: DesadvGenerateQuery }>(
    "/desadv/generate",
    async (request, reply) => {
      try {
        const body = request.body as Parameters<
          typeof EdifactDesadvService.generate
        >[0];
        if (
          !body ||
          !body.despatchAdviceNumber ||
          !body.consignor ||
          !body.consignee
        ) {
          return reply.status(400).send({
            success: false,
            error:
              "Missing required DespatchAdvice attributes (despatchAdviceNumber, consignor, consignee)",
          });
        }

        const senderId = request.query?.senderId || "ATLASLOG";
        const receiverId = request.query?.receiverId || "PARTNER";

        const ediText = EdifactDesadvService.generate(
          body,
          senderId,
          receiverId,
        );
        return reply.send({
          success: true,
          data: {
            ediText,
            messageType: "DESADV",
            version: "D96A",
            senderId,
            receiverId,
          },
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to generate DESADV";
        return reply.status(500).send({
          success: false,
          error: message,
        });
      }
    },
  );

  /**
   * Ingest DESADV with transactional outbox event emission
   */
  fastify.post("/desadv/ingest", async (request, reply) => {
    try {
      const parsed = inboundSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: "Invalid DESADV payload",
          details: parsed.error.issues,
        });
      }

      const result = await EdifactDesadvService.ingest(parsed.data.rawPayload);
      return reply.status(201).send(result);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to ingest DESADV";
      return reply.status(500).send({
        success: false,
        error: message,
      });
    }
  });

  /**
   * Generate EDIFACT D96A IFTSTA status message
   */
  fastify.post("/iftsta/generate", async (request, reply) => {
    try {
      const body = request.body as Parameters<
        typeof EdifactIftstaService.generateIFTSTA
      >[0] & {
        senderId?: string;
        receiverId?: string;
      };
      if (!body || !body.statusCode) {
        return reply.status(400).send({
          success: false,
          error: "Missing required statusCode for IFTSTA",
        });
      }

      const ediText = EdifactIftstaService.generateIFTSTA(
        body,
        body.senderId || "ATLASLOG",
        body.receiverId || "PARTNER",
      );
      return reply.send({
        success: true,
        data: {
          ediText,
          messageType: "IFTSTA",
          version: "D96A",
        },
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to generate IFTSTA";
      return reply.status(500).send({
        success: false,
        error: message,
      });
    }
  });

  /**
   * Generate technical ACK CONTRL
   */
  fastify.post("/contrl/generate", async (request, reply) => {
    try {
      const body = (request.body || {}) as {
        interchangeSender?: string;
        interchangeReceiver?: string;
        referenceControlNum?: string;
        status?: "ACCEPTED" | "REJECTED";
        errorMessage?: string;
      };

      const ediText = EdifactIftstaService.generateCONTRL(
        body.interchangeSender || "PARTNER",
        body.interchangeReceiver || "ATLASLOG",
        body.referenceControlNum || `CTRL-${Date.now()}`,
        body.status || "ACCEPTED",
        body.errorMessage,
      );

      return reply.send({
        success: true,
        data: {
          ediText,
          messageType: "CONTRL",
        },
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to generate CONTRL";
      return reply.status(500).send({
        success: false,
        error: message,
      });
    }
  });
};

export default ediRoutes;
