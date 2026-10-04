import { FastifyPluginAsync } from "fastify";
import {
  EdiTokenizer,
  EdifactService,
  X12Service,
  EdiDispatcherService,
} from "../services/edi/index.js";
import { z } from "zod";

const inboundSchema = z.object({
  rawPayload: z.string().min(10, "EDI payload must be at least 10 characters"),
});

const generateSchema = z.object({
  format: z.enum(["IFTMIN", "204"]),
  bookingReference: z.string().min(1),
  partnerId: z.string().optional(),
  senderId: z.string().optional(),
  receiverId: z.string().optional(),
  instructionData: z.record(z.string(), z.any()),
});

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
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message || "Failed to process EDI transmission",
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
      let parsedEvents: any[] = [];

      if (standard === "EDIFACT") {
        parsedEvents = EdifactService.parseIFTSTA(ast);
      } else {
        parsedEvents = X12Service.parse214(ast);
      }

      return reply.send({
        success: true,
        standard,
        delimiters: ast.delimiters,
        segmentsCount: ast.segments.length,
        segments: ast.segments,
        parsedEvents,
      });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: err.message || "Syntactic error while parsing EDI document",
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
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message || "Failed to generate outbound EDI document",
      });
    }
  });

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
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message || "Failed to query EDI interchanges",
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
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message || "Failed to query EDI partners",
      });
    }
  });

  /**
   * Curated ready-to-test sample EDI messages for 1-click execution in UI
   */
  fastify.get("/samples", async (_request, reply) => {
    const samples = [
      {
        id: "maersk_iftsta_departure",
        name: "Maersk Line IFTSTA — Vessel Departure (Zarpe)",
        standard: "EDIFACT",
        messageType: "IFTSTA",
        carrier: "MAERSKLINE",
        bookingRef: "BK-2026-8819",
        description:
          "Reporte oficial de salida de buque (Vessel Departure) desde el Puerto de Valencia hacia New York Harbor.",
        payload:
          "UNB+UNOA:2+MAERSKLINE:ZZ+ATLASLOG:ZZ+261004:1430+100021'BGM+7+BK-2026-8819+9'RFF+BM:MSK992011'DTM+137:202610041200:203'LOC+7+ESVLC:139:6+VALENCIA PORT'LOC+11+USNYC:139:6+NEW YORK HARBOR'STS+1+VD'UNT+7+100021'UNZ+1+100021'",
      },
      {
        id: "msc_iftsta_customs_hold",
        name: "MSC Geneva IFTSTA — Customs Hold (Retención Aduanera)",
        standard: "EDIFACT",
        messageType: "IFTSTA",
        carrier: "MSCGVA",
        bookingRef: "BK-2026-8819",
        description:
          "Alerta de excepción inmediata: Retención aduanera en terminal para inspección de seguridad.",
        payload:
          "UNB+UNOA:2+MSCGVA:01+ATLASLOG:ZZ+261004:1615+100022'BGM+7+BK-2026-8819+9'RFF+BM:MEDU881023'DTM+137:202610041600:203'LOC+7+ESBCN:139:6+BARCELONA PORT'STS+1+X4'FTX+AAI+++CUSTOMS INSPECTION MANDATED BY TAXUD'UNT+7+100022'UNZ+1+100022'",
      },
      {
        id: "knight_x12_214_in_transit",
        name: "Knight-Swift ANSI X12 214 — En Route (En Tránsito Terrestre)",
        standard: "ANSI_X12",
        messageType: "214",
        carrier: "KNIGHTSWIFT",
        bookingRef: "BK-2026-8819",
        description:
          "Notificación de transporte por carretera de EE.UU./UE en ruta hacia destino con posición geográfica.",
        payload:
          "ISA*00*          *00*          *02*KNIGHTSWIFT    *ZZ*ATLASLOG       *261004*1540*U*00401*000008821*0*P*>~GS*QM*KNIGHTSWIFT*ATLASLOG*20261004*1540*8821*X*004010~ST*214*0001~B10*KS-991201*BK-2026-8819*KNIGHTSWIFT~LX*1~AT7*X6*NS***20261004*1530*LT~MS1*MADRID*ES*ES~SE*6*0001~GE*1*8821~IEA*1*000008821~",
      },
      {
        id: "jbhunt_x12_214_delivered",
        name: "J.B. Hunt ANSI X12 214 — Delivered (Entrega Confirmada)",
        standard: "ANSI_X12",
        messageType: "214",
        carrier: "JBHUNT",
        bookingRef: "BK-2026-8819",
        description:
          "Confirmación final de entrega en almacén de cliente con firma electrónica.",
        payload:
          "ISA*00*          *00*          *ZZ*JBHUNT         *ZZ*ATLASLOG       *261004*1800*U*00401*000009941*0*P*>~GS*QM*JBHUNT*ATLASLOG*20261004*1800*9941*X*004010~ST*214*0001~B10*JB-441092*BK-2026-8819*JBHUNT~LX*1~AT7*AG*NS***20261004*1745*LT~MS1*VALENCIA*ES*ES~SE*6*0001~GE*1*9941~IEA*1*000009941~",
      },
    ];

    return reply.send({
      success: true,
      data: samples,
    });
  });
};

export default ediRoutes;
