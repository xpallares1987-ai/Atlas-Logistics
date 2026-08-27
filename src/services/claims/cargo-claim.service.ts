import { db } from "../../db/index.js";
import { cargoClaims } from "../../db/schema/claims.js";
import { eq, desc } from "drizzle-orm";
import {
  CarrierLiabilityService,
  TransportConvention,
} from "./carrier-liability.service.js";

export interface CreateClaimDTO {
  shipmentId?: string;
  transportDocNumber: string;
  transportMode: "OCEAN" | "AIR" | "ROAD" | "RAIL" | "MULTIMODAL";
  governingConvention: TransportConvention;
  incidentType:
    | "WATER_DAMAGE"
    | "TEMPERATURE_EXCURSION"
    | "CRUSH_COLLAPSE"
    | "PILFERAGE_THEFT"
    | "TOTAL_LOSS"
    | "DELAY";
  incidentDate: Date | string;
  noticeDate?: Date | string;
  deliveryDate?: Date | string;
  claimantName: string;
  carrierName: string;
  packagesDamaged: number;
  damagedWeightKg: number;
  claimedAmount: number;
  claimedCurrency?: string;
  insuranceInsuredValue?: number;
  insurancePolicyDeductible?: number;
  incidentDescription: string;
  surveyorData?: {
    surveyorName: string;
    reportNumber: string;
    inspectionDate?: Date | string;
    assessedDepreciationPct?: number;
    causeOfLoss?: string;
  };
}

export class CargoClaimService {
  /**
   * Generates sequential claim reference: CLM-YYYY-XXXX
   */
  public static async generateClaimNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const existing = await db
      .select()
      .from(cargoClaims)
      .orderBy(desc(cargoClaims.createdAt))
      .limit(1);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `CLM-${year}-${randomSuffix}`;
  }

  /**
   * Creates a new validated cargo claim with deterministic statutory SDR liability liquidation
   */
  public static async createClaim(data: CreateClaimDTO) {
    const claimNumber = await this.generateClaimNumber();

    // 1. Calculate statutory carrier liability
    const liability = CarrierLiabilityService.calculateStatutoryLiability({
      convention: data.governingConvention,
      transportMode: data.transportMode,
      damagedWeightKg: Number(data.damagedWeightKg),
      packagesCount: Number(data.packagesDamaged || 1),
      claimedAmount: Number(data.claimedAmount),
      incidentDate: data.incidentDate,
      noticeDate: data.noticeDate || new Date(),
      deliveryDate: data.deliveryDate,
    });

    // 2. Calculate Insurance Policy Payout
    const insuredVal = Number(data.insuranceInsuredValue || 0);
    const deductible = Number(data.insurancePolicyDeductible || 0);
    let policyPayout = 0;
    if (insuredVal > 0) {
      policyPayout = Math.max(
        0,
        Math.min(data.claimedAmount, insuredVal) - deductible,
      );
    }

    const claimId = `clm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newClaim = {
      id: claimId,
      claimNumber,
      shipmentId: data.shipmentId || null,
      transportDocNumber: data.transportDocNumber,
      transportMode: data.transportMode,
      governingConvention: data.governingConvention,
      incidentType: data.incidentType,
      incidentDate: new Date(data.incidentDate),
      noticeDate: data.noticeDate ? new Date(data.noticeDate) : new Date(),
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
      claimantName: data.claimantName,
      carrierName: data.carrierName,
      packagesDamaged: Number(data.packagesDamaged || 1),
      damagedWeightKg: Number(data.damagedWeightKg),
      claimedAmount: Number(data.claimedAmount),
      claimedCurrency: data.claimedCurrency || "EUR",
      statutorySdrRate: liability.statutorySdrRatePerKg,
      statutoryLimitEur: liability.totalStatutoryLimitEur,
      insuranceInsuredValue: insuredVal,
      insurancePolicyDeductible: deductible,
      insurancePayoutAmount: policyPayout,
      subrogationRecoveredAmount: 0,
      status: "OPEN",
      protestIssued: false,
      subrogationSigned: false,
      incidentDescription: data.incidentDescription,
      surveyorData: data.surveyorData || null,
      recoveryNotes: liability.legalRecommendation,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(cargoClaims).values(newClaim);
    return {
      claim: newClaim,
      liabilityCalculation: liability,
    };
  }

  /**
   * Lists claims with optional filters
   */
  public static async listClaims(filter?: {
    status?: string;
    convention?: string;
    search?: string;
  }) {
    const all = await db
      .select()
      .from(cargoClaims)
      .orderBy(desc(cargoClaims.createdAt));

    return all.filter((c) => {
      if (
        filter?.status &&
        filter.status !== "ALL" &&
        c.status !== filter.status
      ) {
        return false;
      }
      if (
        filter?.convention &&
        filter.convention !== "ALL" &&
        c.governingConvention !== filter.convention
      ) {
        return false;
      }
      if (filter?.search) {
        const q = filter.search.toLowerCase();
        const num = (c.claimNumber || "").toLowerCase();
        const doc = (c.transportDocNumber || "").toLowerCase();
        const claimant = (c.claimantName || "").toLowerCase();
        const carrier = (c.carrierName || "").toLowerCase();
        const descText = (c.incidentDescription || "").toLowerCase();
        if (
          !num.includes(q) &&
          !doc.includes(q) &&
          !claimant.includes(q) &&
          !carrier.includes(q) &&
          !descText.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Retrieves single claim by ID
   */
  public static async getClaimById(id: string) {
    const res = await db
      .select()
      .from(cargoClaims)
      .where(eq(cargoClaims.id, id))
      .limit(1);
    if (res.length === 0) return null;
    return res[0];
  }
}
