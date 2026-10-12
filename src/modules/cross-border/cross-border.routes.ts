import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
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
  configVehicular: z.enum(["T3S2", "T3S3", "T3S1", "C2", "C3"]) as z.ZodType<VehicleConfigurationSct>,
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
  customsPortCode: z.enum(["MXNLD", "MXZLO", "MXVER", "MXATM", "MXMEX"]) as z.ZodType<CustomsPortKey>,
  trafficLightOutcome: z.enum(["GREEN_CLEARANCE", "RED_INSPECTION", "PENDING_SELECTION"]),
  fraccionArancelaria: z.string().min(4),
  importerRfc: z.string().min(12).max(13),
  hasReeferCargo: z.boolean(),
  historicalDwellHours: z.number().nonnegative().optional(),
});

export const crossBorderRoutes: FastifyPluginAsync = async (fastify) => {
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
      const stampingResult = buildAndStampCartaPorte31(parseResult.data as CartaPorteInput);
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
      const rvcResult = calculateUsmcaRegionalValueContent(parseResult.data as UsmcaRvcInput);
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
    const parseResult = ImmexTariffOptimizationInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "Invalid IMMEX optimization input payload",
        issues: parseResult.error.issues,
      });
    }

    try {
      const immexResult = calculateImmexTariffOptimization(parseResult.data as ImmexTariffOptimizationInput);
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
    const parseResult = CustomsDwellPredictionInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "Invalid Customs Dwell Prediction input payload",
        issues: parseResult.error.issues,
      });
    }

    try {
      const predictionResult = predictCustomsDwellTime(parseResult.data as CustomsDwellPredictionInput);
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
