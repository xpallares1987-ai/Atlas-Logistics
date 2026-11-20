/**
 * @file carbon-insetting.routes.ts
 * @description Fastify routes for Scope 3 Carbon Insetting (Book-and-Claim) cryptographic token issuance, shipment allocation, ledger verification, and FuelEU Maritime pooling.
 * @module @atlas/api/modules/carbon-insetting/routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { CarbonInsettingService } from "./carbon-insetting.service.js";
import {
  CarbonInsettingLedgerService,
  IssueTokenDTO,
  AllocateTokenDTO,
} from "./carbon-insetting-ledger.service.js";
import { FuelType, TransportMode, PoolVesselInput } from "@atlas/shared";
import {
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_ID_PARAMS_SCHEMA,
  buildErrorResponses,
  getErrorMessage,
  openApiObject,
} from "../../routes/openapi.schemas.js";

// ============================================================================
// 1. DOMAIN PAYLOAD INTERFACES
// ============================================================================

interface IssueInsettingTokenBody {
  fuelType?: FuelType;
  fuelVolumeMT?: number;
  bunkerLocation?: string;
  bunkerPortLocode?: string;
  bdnReference?: string;
  sustainabilityCertificateNumber?: string;
  allocatedShipmentRef?: string;
  beneficiaryCompany?: string;
  transportMode?: TransportMode;
  certifiedGhgIntensityGco2eqPerMj?: number;
  unitPriceEurPerMj?: number;
}

interface AllocateInsettingTokenBody {
  tokenId?: string;
  shipmentId?: string;
  beneficiaryCompanyId?: string;
  beneficiaryName?: string;
  transportMode?: AllocateTokenDTO["transportMode"];
  allocatedEnergyMj?: number;
  leadAuditorVerifier?: string;
}

type MappedRetirementStatus = "ACTIVE_AVAILABLE" | "ALLOCATED_RETIRED";

// ============================================================================
// 2. FASTIFY ROUTE PLUGIN REGISTRATION
// ============================================================================

const CARBON_INSETTING_TAG = ["Carbon Insetting & Book-and-Claim"] as const;

export default async function carbonInsettingRoutes(fastify: FastifyInstance) {
  const legacyService = new CarbonInsettingService();

  // 1. GET /api/carbon-insetting/fuels - Alternative Fuels Catalog
  fastify.get(
    "/fuels",
    {
      schema: {
        tags: [...CARBON_INSETTING_TAG],
        summary:
          "List alternative sustainable marine and aviation fuels catalog",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_req: FastifyRequest, reply: FastifyReply) => {
      const fuels = legacyService.getFuelsCatalog();
      return reply.send({ success: true, fuels });
    },
  );

  // 2. GET /api/carbon-insetting/tokens - Live SQLite Insetting Tokens
  fastify.get<{
    Querystring: { status?: string; fuelType?: string };
  }>(
    "/tokens",
    {
      schema: {
        tags: [...CARBON_INSETTING_TAG],
        summary:
          "List persisted Scope 3 Book-and-Claim carbon insetting tokens",
        querystring: openApiObject({
          status: { type: "string" },
          fuelType: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const dbTokens = await CarbonInsettingLedgerService.getTokens(req.query);

      const mappedTokens = dbTokens.map((t) => {
        const mappedFuelType = (
          t.fuelType === "E_METHANOL_RFNBO" ? "E_METHANOL" : t.fuelType
        ) as FuelType;
        const retirementStatus: MappedRetirementStatus =
          t.status === "AVAILABLE" ? "ACTIVE_AVAILABLE" : "ALLOCATED_RETIRED";

        return {
          ...t,
          tokenId: t.tokenReference,
          issueDate: t.createdAt || new Date().toISOString(),
          fuelType: mappedFuelType,
          fuelVolumeMT: t.totalVolumeMetricTonnes,
          energyContentMJ: t.totalEnergyMj || 0,
          bunkerLocation:
            t.bunkerLocationName || "Port de Barcelona - Muelle de la Energía",
          bdnReference: t.bdnReference || "BDN-2026-DEFAULT",
          sustainabilityCertificateNumber:
            t.isccCertificateNumber || "ISCC-EU-Cert",
          ghgAbatementTonsCO2e: Number(
            (
              t.totalVolumeMetricTonnes * (t.ghgAbatementTco2eqPerTonne || 3.41)
            ).toFixed(2),
          ),
          allocatedShipmentRef: "CANONICAL-FLEET-POOL",
          beneficiaryCompany: t.supplierCompanyName,
          transportMode: "MARITIME_OCEAN" as const,
          verificationStandard: "ISO 14083 / GLEC Framework v3.0" as const,
          digitalSignatureHash: t.digitalSealHash,
          qrCodeDigest: `ATLAS-INSET://TOKEN/${t.tokenReference}/${(t.digitalSealHash || "").slice(0, 16)}`,
          retirementStatus,
        };
      });

      return reply.send({
        success: true,
        count: dbTokens.length,
        tokens: mappedTokens,
        dbTokens,
      });
    },
  );

  // 3. GET /api/carbon-insetting/tokens/:id - Token detail with allocations
  fastify.get<{ Params: { id: string } }>(
    "/tokens/:id",
    {
      schema: {
        tags: [...CARBON_INSETTING_TAG],
        summary: "Retrieve carbon insetting token details and allocations",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
      const token = await CarbonInsettingLedgerService.getTokenById(
        req.params.id,
      );
      if (!token) {
        return reply
          .status(404)
          .send({ success: false, message: "Token not found" });
      }
      return reply.send({ success: true, token });
    },
  );

  // 4. POST /api/carbon-insetting/tokens/issue - Issue & Seal Book-and-Claim Token
  fastify.post<{ Body: IssueInsettingTokenBody }>(
    "/tokens/issue",
    {
      schema: {
        tags: [...CARBON_INSETTING_TAG],
        summary:
          "Issue and cryptographically seal a new Book-and-Claim carbon insetting token",
        body: openApiObject({
          fuelType: { type: "string" },
          fuelVolumeMT: { type: "number" },
          bunkerLocation: { type: "string" },
          bunkerPortLocode: { type: "string" },
          bdnReference: { type: "string" },
          sustainabilityCertificateNumber: { type: "string" },
          allocatedShipmentRef: { type: "string" },
          beneficiaryCompany: { type: "string" },
          transportMode: { type: "string" },
          certifiedGhgIntensityGco2eqPerMj: { type: "number" },
          unitPriceEurPerMj: { type: "number" },
        }),
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const b: IssueInsettingTokenBody = req.body ?? {};

      if (
        !b.fuelType ||
        !b.fuelVolumeMT ||
        !b.bunkerLocation ||
        !b.bdnReference
      ) {
        return reply.code(400).send({
          success: false,
          message:
            "Faltan parámetros requeridos para expedir el token de insetting.",
        });
      }

      const dto: IssueTokenDTO = {
        fuelType: b.fuelType,
        totalVolumeMetricTonnes: Number(b.fuelVolumeMT),
        bunkerLocationName: b.bunkerLocation,
        bunkerPortLocode: b.bunkerPortLocode || "ESBCN",
        bdnReference: b.bdnReference,
        isccCertificateNumber:
          b.sustainabilityCertificateNumber || "ISCC-EU-PENDING",
        supplierCompanyName:
          b.beneficiaryCompany || "Repsol Marine Decarb S.A.",
        certifiedGhgIntensityGco2eqPerMj: b.certifiedGhgIntensityGco2eqPerMj,
        unitPriceEurPerMj: b.unitPriceEurPerMj,
      };

      const token = await CarbonInsettingLedgerService.issueToken(dto);
      const mappedFuelType = (
        token.fuelType === "E_METHANOL_RFNBO" ? "E_METHANOL" : token.fuelType
      ) as FuelType;
      const resolvedTransportMode: TransportMode =
        b.transportMode || ("MARITIME_OCEAN" as TransportMode);

      return reply.code(201).send({
        success: true,
        message:
          "Token de Insetting emitido y sellado criptográficamente en SQLite.",
        token: {
          ...token,
          tokenId: token.tokenReference,
          issueDate: token.createdAt || new Date().toISOString(),
          fuelType: mappedFuelType,
          fuelVolumeMT: token.totalVolumeMetricTonnes,
          energyContentMJ: token.totalEnergyMj || 0,
          bunkerLocation:
            token.bunkerLocationName ||
            b.bunkerLocation ||
            "Port de Barcelona - Muelle de la Energía",
          bdnReference: token.bdnReference || b.bdnReference,
          sustainabilityCertificateNumber:
            token.isccCertificateNumber ||
            b.sustainabilityCertificateNumber ||
            "ISCC-EU",
          ghgAbatementTonsCO2e: Number(
            (
              token.totalVolumeMetricTonnes *
              (token.ghgAbatementTco2eqPerTonne || 3.41)
            ).toFixed(2),
          ),
          digitalSignatureHash: token.digitalSealHash,
          allocatedShipmentRef: b.allocatedShipmentRef || "CANONICAL-POOL",
          beneficiaryCompany: token.supplierCompanyName,
          transportMode: resolvedTransportMode,
          verificationStandard: "ISO 14083 / GLEC Framework v3.0" as const,
          qrCodeDigest: `ATLAS-INSET://TOKEN/${token.tokenReference}/${(token.digitalSealHash || "").slice(0, 16)}`,
          retirementStatus: "ACTIVE_AVAILABLE" as const,
        },
      });
    },
  );

  // 5. POST /api/carbon-insetting/tokens/allocate - Allocate Token to Shipment with SHA-256 Seal
  fastify.post<{ Body: AllocateInsettingTokenBody }>(
    "/tokens/allocate",
    {
      schema: {
        tags: [...CARBON_INSETTING_TAG],
        summary:
          "Allocate carbon insetting energy volume to a shipment with SHA-256 ledger chaining",
        body: openApiObject({
          tokenId: { type: "string" },
          shipmentId: { type: "string" },
          beneficiaryCompanyId: { type: "string" },
          beneficiaryName: { type: "string" },
          transportMode: { type: "string" },
          allocatedEnergyMj: { type: "number" },
          leadAuditorVerifier: { type: "string" },
        }),
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const b: AllocateInsettingTokenBody = req.body ?? {};

      if (!b.tokenId || !b.allocatedEnergyMj || !b.beneficiaryName) {
        return reply.code(400).send({
          success: false,
          message:
            "Parámetros requeridos: tokenId, allocatedEnergyMj, beneficiaryName.",
        });
      }

      try {
        const dto: AllocateTokenDTO = {
          tokenId: b.tokenId,
          shipmentId: b.shipmentId || "sh_demo_01",
          beneficiaryCompanyId: b.beneficiaryCompanyId,
          beneficiaryName: b.beneficiaryName,
          transportMode: b.transportMode || "MARITIME_OCEAN",
          allocatedEnergyMj: Number(b.allocatedEnergyMj),
          leadAuditorVerifier: b.leadAuditorVerifier,
        };

        const allocation =
          await CarbonInsettingLedgerService.allocateTokenToShipment(dto);

        return reply.code(201).send({
          success: true,
          message:
            "Asignación de insetting certificada y registrada en el bloque SHA-256.",
          allocation,
        });
      } catch (err: unknown) {
        return reply.code(400).send({
          success: false,
          message: getErrorMessage(
            err,
            "Error al procesar la asignación de insetting.",
          ),
        });
      }
    },
  );

  // 6. GET /api/carbon-insetting/allocations - List allocations
  fastify.get<{ Querystring: { shipmentId?: string } }>(
    "/allocations",
    {
      schema: {
        tags: [...CARBON_INSETTING_TAG],
        summary:
          "List carbon insetting allocations optionally filtered by shipment ID",
        querystring: openApiObject({
          shipmentId: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const allocations = await CarbonInsettingLedgerService.getAllocations(
        req.query.shipmentId,
      );
      return reply.send({
        success: true,
        count: allocations.length,
        allocations,
      });
    },
  );

  // 7. GET /api/carbon-insetting/allocations/verify - Cryptographic Blockchain Audit
  fastify.get(
    "/allocations/verify",
    {
      schema: {
        tags: [...CARBON_INSETTING_TAG],
        summary:
          "Verify cryptographic SHA-256 hash chain integrity of the carbon insetting ledger",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_req: FastifyRequest, reply: FastifyReply) => {
      const report = await CarbonInsettingLedgerService.verifyLedgerIntegrity();
      return reply.send({ success: true, report });
    },
  );

  // 8. GET /api/carbon-insetting/fueleu/vessels
  fastify.get(
    "/fueleu/vessels",
    {
      schema: {
        tags: [...CARBON_INSETTING_TAG],
        summary: "List eligible vessels for FuelEU Maritime compliance pooling",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_req: FastifyRequest, reply: FastifyReply) => {
      const vessels = legacyService.getPoolVessels();
      return reply.send({ success: true, count: vessels.length, vessels });
    },
  );

  // 9. POST /api/carbon-insetting/fueleu/pool
  fastify.post<{
    Body: {
      vessels?: PoolVesselInput[];
      reportingYear?: number;
    };
  }>(
    "/fueleu/pool",
    {
      schema: {
        tags: [...CARBON_INSETTING_TAG],
        summary: "Execute and seal a FuelEU Maritime fleet compliance pool",
        body: openApiObject({
          vessels: { type: "array", items: OPENAPI_FLEXIBLE_OBJECT_SCHEMA },
          reportingYear: { type: "number" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const pool = legacyService.executePooling(
        req.body?.vessels,
        req.body?.reportingYear || 2026,
      );
      return reply.send({
        success: true,
        message: "Pool de cumplimiento FuelEU Maritime ejecutado y sellado.",
        pool,
      });
    },
  );

  // 10. GET /api/carbon-insetting/fueleu/pools
  fastify.get(
    "/fueleu/pools",
    {
      schema: {
        tags: [...CARBON_INSETTING_TAG],
        summary: "Retrieve historical FuelEU Maritime compliance pools",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_req: FastifyRequest, reply: FastifyReply) => {
      const pools = legacyService.getPoolHistory();
      return reply.send({ success: true, count: pools.length, pools });
    },
  );
}
