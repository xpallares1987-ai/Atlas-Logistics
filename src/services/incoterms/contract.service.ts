import { db } from "../../db/index.js";
import {
  commercialContracts,
  incotermRules,
} from "../../db/schema/incoterms.js";
import { eq, desc } from "drizzle-orm";
import {
  IncotermsMatrixService,
  IncotermCode,
} from "./incoterms-matrix.service.js";

export interface CreateContractDTO {
  title: string;
  sellerCompanyId?: string;
  buyerCompanyId?: string;
  sellerData: {
    name: string;
    taxId?: string;
    address: string;
    country: string;
    contact?: string;
  };
  buyerData: {
    name: string;
    taxId?: string;
    address: string;
    country: string;
    contact?: string;
  };
  forwarderData?: {
    name: string;
    eori?: string;
    iataCode?: string;
  };
  incotermCode: IncotermCode;
  namedPlace: string;
  transportMode: "OCEAN" | "AIR" | "ROAD" | "RAIL" | "MULTIMODAL";
  currency?: string;
  goodsValue: number;
  freightEstimatedCost?: number;
  insuranceEstimatedCost?: number;
  customsEstimatedDuty?: number;
  effectiveDate: Date;
  expiryDate?: Date;
  governingLaw?: string;
  disputeJurisdiction?: string;
}

export class CommercialContractService {
  /**
   * Generates sequential contract number: CTR-YYYY-INCO-XXXX
   */
  public static async generateContractNumber(
    incotermCode: IncotermCode,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const existing = await db
      .select()
      .from(commercialContracts)
      .orderBy(desc(commercialContracts.createdAt))
      .limit(1);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `CTR-${year}-${incotermCode}-${randomSuffix}`;
  }

  /**
   * Creates a new validated Commercial Freight Contract with initial milestone timeline
   */
  public static async createContract(data: CreateContractDTO) {
    // 1. Validate Mode & Named Place
    const modeValidation = IncotermsMatrixService.validateModeCompatibility({
      incotermCode: data.incotermCode,
      transportMode: data.transportMode,
    });

    const namedPlaceValidation =
      IncotermsMatrixService.validateNamedPlaceSyntax(
        data.namedPlace,
        data.incotermCode,
      );

    if (!namedPlaceValidation.isValid) {
      throw new Error(namedPlaceValidation.error || "Named Place is invalid");
    }

    const contractNumber = await this.generateContractNumber(data.incotermCode);
    const rule = IncotermsMatrixService.getRule(data.incotermCode);

    // Initial Contract Milestones
    const milestones = [
      {
        id: "M1",
        stage: "PACKAGING",
        name: "Embalaje y Preparación en Origen",
        status: "COMPLETED",
        date: new Date(),
        riskBearer: "SELLER",
      },
      {
        id: "M2",
        stage: "RISK_TRANSFER",
        name: `Punto de Transferencia de Riesgo (${rule.riskTransferPoint})`,
        status: "PENDING",
        date: new Date(Date.now() + 86400000 * 2),
        riskBearer: "BUYER",
      },
      {
        id: "M3",
        stage: "MAIN_TRANSIT",
        name: `Tránsito Principal Internacional (${data.transportMode})`,
        status: "PENDING",
        date: new Date(Date.now() + 86400000 * 5),
        riskBearer:
          rule.stages.find((s) => s.stage === "MAIN_CARRIAGE")?.riskBearer ||
          "BUYER",
      },
      {
        id: "M4",
        stage: "FINAL_DELIVERY",
        name: `Llegada a Destino Convenido (${namedPlaceValidation.formattedString})`,
        status: "PENDING",
        date: new Date(Date.now() + 86400000 * 8),
        riskBearer: "BUYER",
      },
    ];

    const contractId = `ctr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newContract = {
      id: contractId,
      contractNumber,
      title: data.title,
      sellerCompanyId: data.sellerCompanyId || null,
      buyerCompanyId: data.buyerCompanyId || null,
      sellerData: data.sellerData,
      buyerData: data.buyerData,
      forwarderData: data.forwarderData || {
        name: "Atlas Logistics Global Forwarding SL",
        eori: "ESB88492019",
      },
      incotermCode: data.incotermCode,
      namedPlace: namedPlaceValidation.formattedString,
      transportMode: data.transportMode,
      currency: data.currency || "EUR",
      goodsValue: data.goodsValue,
      freightEstimatedCost: data.freightEstimatedCost || 0,
      insuranceEstimatedCost: data.insuranceEstimatedCost || 0,
      customsEstimatedDuty: data.customsEstimatedDuty || 0,
      effectiveDate: data.effectiveDate,
      expiryDate: data.expiryDate || null,
      status: "ACTIVE",
      governingLaw:
        data.governingLaw ||
        "ICC Model Commercial Contract / Spanish Commercial Code",
      disputeJurisdiction:
        data.disputeJurisdiction ||
        "Cámara Oficial de Comercio e Industria de Madrid",
      milestonesData: milestones,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(commercialContracts).values(newContract);
    return {
      contract: newContract,
      modeValidation,
    };
  }

  /**
   * Retrieves all contracts with optional filters
   */
  public static async listContracts(filter?: {
    incoterm?: string;
    status?: string;
    search?: string;
  }) {
    const query = db
      .select()
      .from(commercialContracts)
      .orderBy(desc(commercialContracts.createdAt));
    const all = await query;

    return all.filter((c) => {
      if (
        filter?.incoterm &&
        filter.incoterm !== "ALL" &&
        c.incotermCode !== filter.incoterm
      ) {
        return false;
      }
      if (
        filter?.status &&
        filter.status !== "ALL" &&
        c.status !== filter.status
      ) {
        return false;
      }
      if (filter?.search) {
        const q = filter.search.toLowerCase();
        const num = (c.contractNumber || "").toLowerCase();
        const title = (c.title || "").toLowerCase();
        const place = (c.namedPlace || "").toLowerCase();
        const seller = (c.sellerData as any)?.name?.toLowerCase() || "";
        const buyer = (c.buyerData as any)?.name?.toLowerCase() || "";
        if (
          !num.includes(q) &&
          !title.includes(q) &&
          !place.includes(q) &&
          !seller.includes(q) &&
          !buyer.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Retrieves single contract by ID
   */
  public static async getContractById(id: string) {
    const res = await db
      .select()
      .from(commercialContracts)
      .where(eq(commercialContracts.id, id))
      .limit(1);

    if (res.length === 0) {
      return null;
    }
    return res[0];
  }
}
