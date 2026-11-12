/**
 * @file carbon-insetting.routes.ts
 * @description Fastify routes for Scope 3 Carbon Insetting (Book-and-Claim) & FuelEU Maritime Pooling.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { CarbonInsettingService } from "./carbon-insetting.service.js";
import {
  CarbonInsettingLedgerService,
  IssueTokenDTO,
  AllocateTokenDTO,
} from "./carbon-insetting-ledger.service.js";
import { FuelType, TransportMode, PoolVesselInput } from "@atlas/shared";

export default async function carbonInsettingRoutes(fastify: FastifyInstance) {
  const legacyService = new CarbonInsettingService();

  // 1. GET /api/carbon-insetting/fuels - Alternative Fuels Catalog
  fastify.get("/fuels", async (_req: FastifyRequest, reply: FastifyReply) => {
    const fuels = legacyService.getFuelsCatalog();
    return reply.send({ success: true, fuels });
  });

  // 2. GET /api/carbon-insetting/tokens - Live SQLite Insetting Tokens
  fastify.get(
    "/tokens",
    async (
      req: FastifyRequest<{
        Querystring: { status?: string; fuelType?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const dbTokens = await CarbonInsettingLedgerService.getTokens(req.query);

      // Return both live SQLite records and legacy mapped fields for complete compatibility
      const mappedTokens = dbTokens.map((t) => ({
        ...t,
        tokenId: t.tokenReference,
        issueDate: t.createdAt || new Date().toISOString(),
        fuelType: (t.fuelType === "E_METHANOL_RFNBO"
          ? "E_METHANOL"
          : t.fuelType) as any,
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
        retirementStatus: (t.status === "AVAILABLE"
          ? "ACTIVE_AVAILABLE"
          : "ALLOCATED_RETIRED") as any,
      }));

      return reply.send({
        success: true,
        count: dbTokens.length,
        tokens: mappedTokens,
        dbTokens,
      });
    },
  );

  // 3. GET /api/carbon-insetting/tokens/:id - Token detail with allocations
  fastify.get(
    "/tokens/:id",
    async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
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
  fastify.post(
    "/tokens/issue",
    async (
      req: FastifyRequest<{
        Body: {
          fuelType: FuelType;
          fuelVolumeMT: number;
          bunkerLocation: string;
          bunkerPortLocode?: string;
          bdnReference: string;
          sustainabilityCertificateNumber: string;
          allocatedShipmentRef?: string;
          beneficiaryCompany?: string;
          transportMode?: TransportMode;
          certifiedGhgIntensityGco2eqPerMj?: number;
          unitPriceEurPerMj?: number;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const b = req.body || ({} as any);

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

      return reply.code(201).send({
        success: true,
        message:
          "Token de Insetting emitido y sellado criptográficamente en SQLite.",
        token: {
          ...token,
          tokenId: token.tokenReference,
          issueDate: token.createdAt || new Date().toISOString(),
          fuelType: (token.fuelType === "E_METHANOL_RFNBO"
            ? "E_METHANOL"
            : token.fuelType) as any,
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
          transportMode: (b.transportMode || "MARITIME_OCEAN") as any,
          verificationStandard: "ISO 14083 / GLEC Framework v3.0" as const,
          qrCodeDigest: `ATLAS-INSET://TOKEN/${token.tokenReference}/${(token.digitalSealHash || "").slice(0, 16)}`,
          retirementStatus: "ACTIVE_AVAILABLE" as const,
        },
      });
    },
  );

  // 5. POST /api/carbon-insetting/tokens/allocate - Allocate Token to Shipment with Blockchain Seal
  fastify.post(
    "/tokens/allocate",
    async (
      req: FastifyRequest<{
        Body: {
          tokenId: string;
          shipmentId?: string;
          beneficiaryCompanyId?: string;
          beneficiaryName: string;
          transportMode?: string;
          allocatedEnergyMj: number;
          leadAuditorVerifier?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const b = req.body || ({} as any);

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
          transportMode: (b.transportMode as any) || "MARITIME_OCEAN",
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
      } catch (err: any) {
        return reply.code(400).send({
          success: false,
          message:
            err.message || "Error al procesar la asignación de insetting.",
        });
      }
    },
  );

  // 6. GET /api/carbon-insetting/allocations - List allocations
  fastify.get(
    "/allocations",
    async (
      req: FastifyRequest<{ Querystring: { shipmentId?: string } }>,
      reply: FastifyReply,
    ) => {
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
    async (_req: FastifyRequest, reply: FastifyReply) => {
      const report = await CarbonInsettingLedgerService.verifyLedgerIntegrity();
      return reply.send({ success: true, report });
    },
  );

  // 8. GET /api/carbon-insetting/fueleu/vessels
  fastify.get(
    "/fueleu/vessels",
    async (_req: FastifyRequest, reply: FastifyReply) => {
      const vessels = legacyService.getPoolVessels();
      return reply.send({ success: true, count: vessels.length, vessels });
    },
  );

  // 9. POST /api/carbon-insetting/fueleu/pool
  fastify.post(
    "/fueleu/pool",
    async (
      req: FastifyRequest<{
        Body: {
          vessels?: PoolVesselInput[];
          reportingYear?: number;
        };
      }>,
      reply: FastifyReply,
    ) => {
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
    async (_req: FastifyRequest, reply: FastifyReply) => {
      const pools = legacyService.getPoolHistory();
      return reply.send({ success: true, count: pools.length, pools });
    },
  );
}
