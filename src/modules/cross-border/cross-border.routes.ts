import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../../db/index.js";
import * as schema from "../../db/schema/index.js";
import { eq } from "drizzle-orm";
import {
  VehicleConfigurationSct,
  CartaPorteInput,
  UsmcaRvcInput,
  ImmexTariffOptimizationInput,
  CustomsDwellPredictionInput,
  CustomsPortKey,
  buildAndStampCartaPorte31,
  calculateUsmcaRegionalValueContent,
  calculateImmexTariffOptimization,
  predictCustomsDwellTime,
  USMCA_DEMO_PRESETS,
} from "@atlas/shared";

// Zod Validation Schemas
const CartaPorteLocationSchema = z.object({
  tipoUbicacion: z.enum(["Origen", "Destino"]),
  rfc: z.string().min(12).max(13),
  nombre: z.string().min(1),
  direccion: z.string().min(1),
  codigoPostal: z.string().min(5).max(10),
  fechaHora: z.string(),
});

const CartaPorteMercanciaSchema = z.object({
  claveProdServ: z.string().min(8),
  descripcion: z.string().min(1),
  cantidad: z.number().positive(),
  claveUnidad: z.string().min(1),
  pesoKg: z.number().positive(),
  fraccionArancelaria: z.string().optional(),
  materialPeligroso: z.boolean().optional(),
  claveMaterialPeligroso: z.string().optional(),
  tipoEmbalaje: z.string().optional(),
  valorDeclaradoUsd: z.number().optional(),
});

const CartaPorteAutotransporteSchema = z.object({
  configVehicular: z.enum([
    "T3S2",
    "T3S3",
    "T3S1",
    "C2",
    "C3",
  ]) as z.ZodType<VehicleConfigurationSct>,
  placa: z.string().min(1),
  anioModelo: z.number().int().min(1990).max(2035),
  permisoSct: z.string().min(1),
  numPermisoSct: z.string().min(1),
  aseguradoraRespCivil: z.string().min(1),
  polizaRespCivil: z.string().min(1),
  aseguradoraMedioAmbiente: z.string().optional(),
  polizaMedioAmbiente: z.string().optional(),
});

const CartaPorteOperadorSchema = z.object({
  rfc: z.string().min(12).max(13),
  nombre: z.string().min(1),
  numLicencia: z.string().min(1),
});

export const CartaPorteInputSchema = z.object({
  shipmentRef: z.string().min(1),
  rfcEmisor: z.string().min(12).max(13),
  razonSocialEmisor: z.string().min(1),
  regimenFiscalEmisor: z.string().optional(),
  rfcReceptor: z.string().min(12).max(13),
  razonSocialReceptor: z.string().min(1),
  origen: CartaPorteLocationSchema,
  destino: CartaPorteLocationSchema,
  distanciaRecorridaKm: z.number().positive(),
  mercancias: z.array(CartaPorteMercanciaSchema).min(1),
  autotransporte: CartaPorteAutotransporteSchema,
  operador: CartaPorteOperadorSchema,
  subtotalMxn: z.number().nonnegative(),
  ivaMxn: z.number().nonnegative(),
  retencionIvaMxn: z.number().nonnegative(),
  totalMxn: z.number().positive(),
});

export const UsmcaRvcInputSchema = z.object({
  hsCode: z.string().min(4),
  productDescription: z.string().min(1),
  method: z.enum(["NET_COST", "TRANSACTION_VALUE"]),
  transactionValueUsd: z.number().positive().optional(),
  netCostUsd: z.number().positive().optional(),
  nonOriginatingMaterialsCostUsd: z.number().nonnegative(),
  originatingMaterialsCostUsd: z.number().nonnegative().optional(),
  laborAndOverheadUsd: z.number().nonnegative().optional(),
  targetRvcThresholdPercent: z.number().positive().max(100).optional(),
});

export const ImmexTariffOptimizationInputSchema = z.object({
  hsCode: z.string().min(4),
  goodsDescription: z.string().min(1),
  declaredValueUsd: z.number().positive(),
  originCountry: z.enum(["MX", "US", "CA", "CN", "DE", "JP", "OTHER"]),
  isImmexProgramActive: z.boolean().optional(),
  usmcaEligible: z.boolean().optional(),
});

export const CustomsDwellPredictionInputSchema = z.object({
  pedimentoNumber: z.string().min(1),
  customsPortCode: z.enum([
    "MXNLD",
    "MXZLO",
    "MXVER",
    "MXATM",
    "MXMEX",
  ]) as z.ZodType<CustomsPortKey>,
  trafficLightOutcome: z.enum([
    "GREEN_CLEARANCE",
    "RED_INSPECTION",
    "PENDING_SELECTION",
  ]),
  fraccionArancelaria: z.string().min(4),
  importerRfc: z.string().min(12).max(13),
  hasReeferCargo: z.boolean(),
  historicalDwellHours: z.number().nonnegative().optional(),
});

export const crossBorderRoutes: FastifyPluginAsync = async (fastify) => {
  // 0. Declarations from SQLite
  fastify.get("/declarations", async (request, reply) => {
    const { shipmentId } = request.query as { shipmentId?: string };
    if (shipmentId) {
      const [decl] = await db
        .select()
        .from(schema.cartaPorteDeclarations)
        .where(eq(schema.cartaPorteDeclarations.shipmentId, shipmentId))
        .limit(1);
      return reply.send({
        success: true,
        declaration: decl ?? null,
      });
    }
    const all = await db.select().from(schema.cartaPorteDeclarations).limit(50);
    return reply.send({
      success: true,
      declarations: all,
    });
  });

  // 1. Get presets
  fastify.get("/presets", async (_request, reply) => {
    return reply.status(200).send({
      success: true,
      presets: Object.values(USMCA_DEMO_PRESETS),
    });
  });

  // 2. CFDI 4.0 con Complemento Carta Porte 3.1 PAC Stamping
  fastify.post("/carta-porte/stamp", async (request, reply) => {
    const parseResult = CartaPorteInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "Invalid Carta Porte 3.1 input payload",
        issues: parseResult.error.issues,
      });
    }

    try {
      const stampingResult = buildAndStampCartaPorte31(
        parseResult.data as CartaPorteInput,
      );

      // Persist to SQLite if shipment exists
      const targetShipmentId =
        (request.body as any).shipmentId || parseResult.data.shipmentRef;
      if (targetShipmentId) {
        const [existingShipment] = await db
          .select({ id: schema.shipments.id })
          .from(schema.shipments)
          .where(eq(schema.shipments.id, targetShipmentId))
          .limit(1);

        if (existingShipment) {
          const idCcp = stampingResult.idCCP;
          const cpId = `cp_${existingShipment.id}`;
          const cpData = {
            id: cpId,
            shipmentId: existingShipment.id,
            idCcp: idCcp,
            transporteTipo: "AUTOTRANSPORTE_FEDERAL",
            rfcEmisor: parseResult.data.rfcEmisor,
            rfcReceptor: parseResult.data.rfcReceptor,
            origenJson: JSON.stringify(parseResult.data.origen),
            destinoJson: JSON.stringify(parseResult.data.destino),
            vehiculoJson: JSON.stringify(parseResult.data.autotransporte),
            operadorJson: JSON.stringify(parseResult.data.operador),
            mercanciasJson: JSON.stringify(parseResult.data.mercancias),
            xmlTimbrado: stampingResult.stampedXml,
            qrCodeData: stampingResult.qrCodeSatUrl,
            rvcPercentage: 78.5,
            immexPedimentoTipo: "AF",
            customsDwellHoursPredicted: 4.2,
            status: "STAMPED" as const,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          await db
            .insert(schema.cartaPorteDeclarations)
            .values(cpData)
            .onConflictDoUpdate({
              target: schema.cartaPorteDeclarations.id,
              set: {
                idCcp: idCcp,
                xmlTimbrado: stampingResult.stampedXml,
                qrCodeData: stampingResult.qrCodeSatUrl,
                updatedAt: Date.now(),
              },
            });

          const mirrorDocId = `doc_cp_${existingShipment.id}`;
          const mirrorDoc = {
            id: mirrorDocId,
            shipmentId: existingShipment.id,
            name: `Carta de Porte CFDI 4.0 (${parseResult.data.shipmentRef})`,
            type: "CARTA_PORTE",
            documentReference: parseResult.data.shipmentRef,
            sha256Hash: stampingResult.uuid,
            status: "SIGNED",
            signedBy: parseResult.data.operador.nombre,
            signerTitle: "Operador de Autotransporte",
            signerCertificate: stampingResult.selloSat,
            signedAt: new Date(),
            payloadData: {
              idCcp: idCcp,
              qrCodeData: stampingResult.qrCodeSatUrl,
            },
            fileSize: 45200,
            url: `/api/documents/${mirrorDocId}/pdf`,
          };

          await db
            .insert(schema.documents)
            .values(mirrorDoc)
            .onConflictDoUpdate({
              target: schema.documents.id,
              set: {
                documentReference: parseResult.data.shipmentRef,
                sha256Hash: stampingResult.uuid,
                signedAt: new Date(),
              },
            });
        }
      }

      return reply.status(200).send({
        success: true,
        data: stampingResult,
      });
    } catch (err: any) {
      return reply.status(500).send({
        error: "Failed to stamp Carta Porte 3.1",
        message: err.message,
      });
    }
  });

  // Direct Operational Action: Generate Carta Porte for a shipment
  fastify.post("/carta-porte/generate-for-shipment", async (request, reply) => {
    const { shipmentId } = request.body as { shipmentId: string };
    if (!shipmentId) {
      return reply.status(400).send({ error: "shipmentId is required" });
    }

    const [shipment] = await db
      .select()
      .from(schema.shipments)
      .where(eq(schema.shipments.id, shipmentId))
      .limit(1);

    if (!shipment) {
      return reply
        .status(404)
        .send({ error: `Shipment not found: ${shipmentId}` });
    }

    const generatedInput: CartaPorteInput = {
      shipmentRef: shipment.id,
      rfcEmisor: "TLM010101XYZ",
      razonSocialEmisor: "Transportes Logísticos Mexicanos S.A.",
      regimenFiscalEmisor: "601",
      rfcReceptor: "AME981012ABC",
      razonSocialReceptor: "American Logistic Hub LLC",
      origen: {
        tipoUbicacion: "Origen",
        rfc: "TLM010101XYZ",
        nombre: `Hub Fronterizo Origen (${shipment.origin || "Laredo"})`,
        direccion: "Parque Industrial Transfronterizo 100",
        codigoPostal: "88275",
        fechaHora: new Date().toISOString(),
      },
      destino: {
        tipoUbicacion: "Destino",
        rfc: "AME981012ABC",
        nombre: `Terminal Destino (${shipment.destination || "San Antonio"})`,
        direccion: "Logistics Boulevard 500",
        codigoPostal: "78219",
        fechaHora: new Date(Date.now() + 86400000).toISOString(),
      },
      distanciaRecorridaKm: 240,
      mercancias: [
        {
          claveProdServ: "25174801",
          descripcion: `Carga Consolidada Expedición ${shipment.id}`,
          cantidad: 500,
          claveUnidad: "H87",
          pesoKg: 24000,
          fraccionArancelaria: "8708.29.99",
          materialPeligroso: false,
          valorDeclaradoUsd: 145000,
        },
      ],
      autotransporte: {
        configVehicular: "T3S2",
        placa: "99-AA-1B",
        anioModelo: 2024,
        permisoSct: "TPAF01",
        numPermisoSct: "SCT-FED-481920",
        aseguradoraRespCivil: "Seguros Atlas S.A.",
        polizaRespCivil: "POL-RC-2026-99",
      },
      operador: {
        rfc: "GARM800512HA1",
        nombre: "Manuel Garcia Ruiz",
        numLicencia: "LIC-FED-TAMPS-0091",
      },
      subtotalMxn: 45000,
      ivaMxn: 7200,
      retencionIvaMxn: 1800,
      totalMxn: 50400,
    };

    const stampingResult = buildAndStampCartaPorte31(generatedInput);
    const cpId = `cp_${shipment.id}`;
    const cpRecord = {
      id: cpId,
      shipmentId: shipment.id,
      idCcp: stampingResult.idCCP,
      transporteTipo: "AUTOTRANSPORTE_FEDERAL",
      rfcEmisor: generatedInput.rfcEmisor,
      rfcReceptor: generatedInput.rfcReceptor,
      origenJson: JSON.stringify(generatedInput.origen),
      destinoJson: JSON.stringify(generatedInput.destino),
      vehiculoJson: JSON.stringify(generatedInput.autotransporte),
      operadorJson: JSON.stringify(generatedInput.operador),
      mercanciasJson: JSON.stringify(generatedInput.mercancias),
      xmlTimbrado: stampingResult.stampedXml,
      qrCodeData: stampingResult.qrCodeSatUrl,
      rvcPercentage: 78.5,
      immexPedimentoTipo: "AF",
      customsDwellHoursPredicted: 4.2,
      status: "STAMPED" as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db
      .insert(schema.cartaPorteDeclarations)
      .values(cpRecord)
      .onConflictDoUpdate({
        target: schema.cartaPorteDeclarations.id,
        set: cpRecord,
      });

    return reply.status(200).send({
      success: true,
      declaration: cpRecord,
      stamping: stampingResult,
    });
  });

  // 3. T-MEC / USMCA Rules of Origin RVC Calculator
  fastify.post("/usmca/rvc", async (request, reply) => {
    const parseResult = UsmcaRvcInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "Invalid USMCA RVC input payload",
        issues: parseResult.error.issues,
      });
    }

    try {
      const rvcResult = calculateUsmcaRegionalValueContent(
        parseResult.data as UsmcaRvcInput,
      );
      return reply.status(200).send({
        success: true,
        data: rvcResult,
      });
    } catch (err: any) {
      return reply.status(500).send({
        error: "Failed to calculate USMCA RVC",
        message: err.message,
      });
    }
  });

  // 4. IMMEX Tariff Exemption & Pedimento Optimizer
  fastify.post("/immex/optimize", async (request, reply) => {
    const parseResult = ImmexTariffOptimizationInputSchema.safeParse(
      request.body,
    );
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "Invalid IMMEX optimization input payload",
        issues: parseResult.error.issues,
      });
    }

    try {
      const immexResult = calculateImmexTariffOptimization(
        parseResult.data as ImmexTariffOptimizationInput,
      );
      return reply.status(200).send({
        success: true,
        data: immexResult,
      });
    } catch (err: any) {
      return reply.status(500).send({
        error: "Failed to calculate IMMEX optimization",
        message: err.message,
      });
    }
  });

  // 5. Machine Learning Customs Dwell & Red Channel Predictor
  fastify.post("/customs/predict", async (request, reply) => {
    const parseResult = CustomsDwellPredictionInputSchema.safeParse(
      request.body,
    );
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "Invalid Customs Dwell Prediction input payload",
        issues: parseResult.error.issues,
      });
    }

    try {
      const predictionResult = predictCustomsDwellTime(
        parseResult.data as CustomsDwellPredictionInput,
      );
      return reply.status(200).send({
        success: true,
        data: predictionResult,
      });
    } catch (err: any) {
      return reply.status(500).send({
        error: "Failed to predict customs dwell time",
        message: err.message,
      });
    }
  });
};

export default crossBorderRoutes;
