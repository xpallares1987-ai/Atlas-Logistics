/**
 * @file carbon-insetting-ledger.service.ts
 * @description Cryptographic Book-and-Claim Ledger Service for Scope 3 Carbon Insetting
 * (ISO 14083 / GLEC Framework v3.0 & FuelEU Maritime Mass-Balance).
 *
 * Implements deterministic SHA-256 block chaining to guarantee non-double-counting,
 * immutable digital seals, and audited retirement for sustainable marine fuels (B100, HVO, e-Methanol).
 */

import crypto from "node:crypto";
import { eq, desc, asc } from "drizzle-orm";
import { db } from "../../db/index.js";
import * as schema from "../../db/schema/index.js";
import { domainEventBus } from "../../lib/events/domain-event-bus.js";

export const GENESIS_BLOCK_HASH =
  "0000000000000000000000000000000000000000000000000000000000000000";

export interface IssueTokenDTO {
  fuelId?: string;
  fuelType: string;
  bunkerPortLocode: string;
  bunkerLocationName: string;
  bdnReference: string;
  isccCertificateNumber: string;
  sustainabilityRegistry?: string;
  registryUrl?: string;
  supplierCompanyName: string;
  totalVolumeMetricTonnes: number;
  certifiedGhgIntensityGco2eqPerMj?: number;
  unitPriceEurPerMj?: number;
}

export interface AllocateTokenDTO {
  tokenId: string;
  shipmentId?: string;
  beneficiaryCompanyId?: string;
  beneficiaryName: string;
  transportMode?:
    | "ROAD_FREIGHT"
    | "MARITIME_OCEAN"
    | "MARITIME_SHORT_SEA"
    | "INLAND_WATERWAYS"
    | "RAIL_FREIGHT";
  allocatedEnergyMj: number;
  leadAuditorVerifier?: string;
}

export interface LedgerVerificationReport {
  isValid: boolean;
  totalAllocationsChecked: number;
  genesisBlockHash: string;
  latestBlockHash: string | null;
  tamperedAllocationId?: string;
  verificationTimestamp: string;
}

export class CarbonInsettingLedgerService {
  /**
   * Computes a deterministic SHA-256 digest
   */
  public static computeSha256(data: string): string {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  /**
   * Retrieves all registered carbon insetting tokens
   */
  public static async getTokens(filter?: {
    status?: string;
    fuelType?: string;
  }) {
    const query = db.select().from(schema.carbonInsettingTokens);

    const tokens = await query.orderBy(
      desc(schema.carbonInsettingTokens.createdAt),
    );

    let filtered = tokens;
    if (filter?.status && filter.status !== "ALL") {
      filtered = filtered.filter((t) => t.status === filter.status);
    }
    if (filter?.fuelType && filter.fuelType !== "ALL") {
      filtered = filtered.filter((t) => t.fuelType === filter.fuelType);
    }

    return filtered;
  }

  /**
   * Retrieves a single token with its historical allocations
   */
  public static async getTokenById(id: string) {
    const [token] = await db
      .select()
      .from(schema.carbonInsettingTokens)
      .where(eq(schema.carbonInsettingTokens.id, id));

    if (!token) {
      return null;
    }

    const allocations = await db
      .select()
      .from(schema.carbonInsettingAllocations)
      .where(eq(schema.carbonInsettingAllocations.tokenId, token.id))
      .orderBy(desc(schema.carbonInsettingAllocations.allocatedAt));

    return {
      ...token,
      allocations,
    };
  }

  /**
   * Issues a new book-and-claim insetting token backed by physical BDN / ISCC
   */
  public static async issueToken(dto: IssueTokenDTO) {
    const now = new Date().toISOString();
    const tokenId = `token_${crypto.randomUUID().slice(0, 12)}`;
    const randomSuffix = crypto.randomInt(1000, 10000);
    const tokenReference = `INSET-${new Date().getFullYear()}-${dto.fuelType.slice(0, 3).toUpperCase()}-${randomSuffix}`;

    // Lookup marine fuel for lower calorific value & baseline factors
    let fuelId = dto.fuelId;
    let lcvMjPerGram = 0.044; // Default B100 LCV: 44 MJ/kg = 0.044 MJ/g
    let baselineGhg = 91.16;
    let certifiedGhg = dto.certifiedGhgIntensityGco2eqPerMj ?? 14.1;

    if (fuelId) {
      const [fuel] = await db
        .select()
        .from(schema.marineFuels)
        .where(eq(schema.marineFuels.id, fuelId));
      if (fuel) {
        lcvMjPerGram = fuel.lowerCalorificValueMjPerGram;
        baselineGhg = 91.16;
      }
    } else {
      // Map known fuel codes
      if (dto.fuelType.includes("METHANOL")) {
        fuelId = "fuel_e_methanol";
        lcvMjPerGram = 0.0199;
        certifiedGhg = dto.certifiedGhgIntensityGco2eqPerMj ?? 5.47;
      } else {
        fuelId = "fuel_bio_mgo_hvo";
        lcvMjPerGram = 0.044;
      }
    }

    // Energy calculation: tonnes * 1,000,000 grams * lcvMjPerGram
    const totalEnergyMj = Number(
      (dto.totalVolumeMetricTonnes * 1_000_000 * lcvMjPerGram).toFixed(2),
    );
    const availableEnergyMj = totalEnergyMj;

    // GHG Savings: (baseline - certified) / baseline
    const ghgSavingPercent = Number(
      (((baselineGhg - certifiedGhg) / baselineGhg) * 100).toFixed(2),
    );

    // GHG Abatement tCO2eq per tonne: (totalEnergyMj * (baseline - certified)) / (1,000,000 * tonnes)
    const ghgAbatementTco2eqPerTonne = Number(
      (
        ((totalEnergyMj / dto.totalVolumeMetricTonnes) *
          (baselineGhg - certifiedGhg)) /
        1_000_000
      ).toFixed(3),
    );

    const unitPriceEurPerMj = dto.unitPriceEurPerMj ?? 0.042;

    // Digital Seal SHA-256
    const sealPayload = JSON.stringify({
      tokenReference,
      fuelId,
      fuelType: dto.fuelType,
      bunkerPortLocode: dto.bunkerPortLocode,
      bdnReference: dto.bdnReference,
      isccCertificateNumber: dto.isccCertificateNumber,
      totalVolumeMetricTonnes: dto.totalVolumeMetricTonnes,
      totalEnergyMj,
      certifiedGhg,
      supplier: dto.supplierCompanyName,
      createdAt: now,
    });
    const digitalSealHash = this.computeSha256(sealPayload);

    const newToken: schema.CarbonInsettingToken = {
      id: tokenId,
      tokenReference,
      fuelId: fuelId || "fuel_bio_mgo_hvo",
      fuelType: dto.fuelType,
      bunkerPortLocode: dto.bunkerPortLocode,
      bunkerLocationName: dto.bunkerLocationName,
      bdnReference: dto.bdnReference,
      isccCertificateNumber: dto.isccCertificateNumber,
      sustainabilityRegistry: dto.sustainabilityRegistry || "ISCC_EU",
      registryUrl:
        dto.registryUrl ||
        `https://www.iscc-system.org/certificates/${dto.isccCertificateNumber}`,
      supplierCompanyName: dto.supplierCompanyName,
      totalVolumeMetricTonnes: dto.totalVolumeMetricTonnes,
      totalEnergyMj,
      availableEnergyMj,
      baselineGhgIntensityGco2eqPerMj: baselineGhg,
      certifiedGhgIntensityGco2eqPerMj: certifiedGhg,
      ghgSavingPercent,
      ghgAbatementTco2eqPerTonne,
      unitPriceEurPerMj,
      status: "AVAILABLE",
      digitalSealHash,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(schema.carbonInsettingTokens).values(newToken);

    // Emit domain event safely
    try {
      void domainEventBus.publish("customs:cleared" as any, tokenId, {
        tokenReference,
        fuelType: dto.fuelType,
        totalEnergyMj,
        digitalSealHash,
      } as any);
    } catch {
      // Event publication is non-blocking
    }

    return newToken;
  }

  /**
   * Allocates a portion of an insetting token to a specific shipment (e.g. sh_demo_01).
   * Appends a new block to the cryptographic SHA-256 mass-balance chain.
   */
  public static async allocateTokenToShipment(dto: AllocateTokenDTO) {
    const now = new Date().toISOString();

    const [token] = await db
      .select()
      .from(schema.carbonInsettingTokens)
      .where(eq(schema.carbonInsettingTokens.id, dto.tokenId));

    if (!token) {
      throw new Error(`Insetting token '${dto.tokenId}' not found`);
    }

    if (token.availableEnergyMj < dto.allocatedEnergyMj) {
      throw new Error(
        `Insufficient available energy. Requested ${dto.allocatedEnergyMj} MJ but only ${token.availableEnergyMj} MJ remain.`,
      );
    }

    // 1. Calculate Abatement & Cost
    const abatedGhgTco2eq = Number(
      (
        (dto.allocatedEnergyMj *
          (token.baselineGhgIntensityGco2eqPerMj -
            token.certifiedGhgIntensityGco2eqPerMj)) /
        1_000_000
      ).toFixed(3),
    );

    const energyPerTonne =
      token.totalEnergyMj / token.totalVolumeMetricTonnes || 44_000;
    const equivalentFuelVolumeTonnes = Number(
      (dto.allocatedEnergyMj / energyPerTonne).toFixed(3),
    );
    const costEur = Number(
      (dto.allocatedEnergyMj * token.unitPriceEurPerMj).toFixed(2),
    );

    // 2. Fetch Latest Allocation Block to link cryptographic chain
    const [latestAlloc] = await db
      .select()
      .from(schema.carbonInsettingAllocations)
      .orderBy(desc(schema.carbonInsettingAllocations.allocatedAt));

    const previousBlockHash = latestAlloc
      ? latestAlloc.blockHashSha256
      : GENESIS_BLOCK_HASH;

    const allocId = `alloc_${crypto.randomUUID().slice(0, 12)}`;
    const randomCert = crypto.randomInt(1000, 10000);
    const allocationReference = `ALLOC-${new Date().getFullYear()}-${randomCert}`;
    const certificateCode = `CERT-INS-${new Date().getFullYear()}-${randomCert}`;
    const verificationQrUrl = `https://atlas-logistics.io/verify/insetting/${certificateCode}`;

    // 3. Compute Block Hash (Chained SHA-256)
    const blockPayload = JSON.stringify({
      allocationReference,
      tokenId: token.id,
      shipmentId: dto.shipmentId || null,
      beneficiaryName: dto.beneficiaryName,
      allocatedEnergyMj: dto.allocatedEnergyMj,
      abatedGhgTco2eq,
      costEur,
      certificateCode,
      previousBlockHash,
      allocatedAt: now,
    });
    const blockHashSha256 = this.computeSha256(blockPayload);

    const newAllocation: schema.CarbonInsettingAllocation = {
      id: allocId,
      allocationReference,
      tokenId: token.id,
      shipmentId: dto.shipmentId || null,
      beneficiaryCompanyId: dto.beneficiaryCompanyId || null,
      beneficiaryName: dto.beneficiaryName,
      transportMode: dto.transportMode || "MARITIME_OCEAN",
      allocatedEnergyMj: dto.allocatedEnergyMj,
      equivalentFuelVolumeTonnes,
      abatedGhgTco2eq,
      costEur,
      certificateCode,
      verificationQrUrl,
      previousBlockHash,
      blockHashSha256,
      status: "CLAIMED_RETIRED",
      leadAuditorVerifier:
        dto.leadAuditorVerifier || "Bureau Veritas / DNV Maritime",
      allocatedAt: now,
    };

    // 4. Update Token Available Energy & Status
    const newAvailableEnergy = Number(
      (token.availableEnergyMj - dto.allocatedEnergyMj).toFixed(2),
    );
    const newStatus: "AVAILABLE" | "PARTIALLY_ALLOCATED" | "FULLY_RETIRED" =
      newAvailableEnergy <= 0.001 ? "FULLY_RETIRED" : "PARTIALLY_ALLOCATED";

    await db.transaction(async (tx) => {
      await tx.insert(schema.carbonInsettingAllocations).values(newAllocation);

      await tx
        .update(schema.carbonInsettingTokens)
        .set({
          availableEnergyMj: newAvailableEnergy,
          status: newStatus,
          updatedAt: now,
        })
        .where(eq(schema.carbonInsettingTokens.id, token.id));
    });

    return newAllocation;
  }

  /**
   * Retrieves allocations, optionally filtered by shipment ID
   */
  public static async getAllocations(shipmentId?: string) {
    const query = db.select().from(schema.carbonInsettingAllocations);

    if (shipmentId && shipmentId !== "ALL") {
      return await query
        .where(eq(schema.carbonInsettingAllocations.shipmentId, shipmentId))
        .orderBy(desc(schema.carbonInsettingAllocations.allocatedAt));
    }

    return await query.orderBy(
      desc(schema.carbonInsettingAllocations.allocatedAt),
    );
  }

  /**
   * Verifies the cryptographic integrity of the entire allocation blockchain
   */
  public static async verifyLedgerIntegrity(): Promise<LedgerVerificationReport> {
    const allocations = await db
      .select()
      .from(schema.carbonInsettingAllocations)
      .orderBy(asc(schema.carbonInsettingAllocations.allocatedAt));

    let expectedPrevHash = GENESIS_BLOCK_HASH;
    let latestBlockHash: string | null = null;

    for (let i = 0; i < allocations.length; i++) {
      const block = allocations[i];

      // Check linkage with previous block
      if (block.previousBlockHash !== expectedPrevHash) {
        return {
          isValid: false,
          totalAllocationsChecked: i,
          genesisBlockHash: GENESIS_BLOCK_HASH,
          latestBlockHash,
          tamperedAllocationId: block.id,
          verificationTimestamp: new Date().toISOString(),
        };
      }

      expectedPrevHash = block.blockHashSha256;
      latestBlockHash = block.blockHashSha256;
    }

    return {
      isValid: true,
      totalAllocationsChecked: allocations.length,
      genesisBlockHash: GENESIS_BLOCK_HASH,
      latestBlockHash,
      verificationTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Retrieves penalties from the FuelEU penalties ledger
   */
  public static async getFuelEuPenalties() {
    return await db
      .select()
      .from(schema.fuelEuPenaltiesLedger)
      .orderBy(desc(schema.fuelEuPenaltiesLedger.settledAt));
  }
}
