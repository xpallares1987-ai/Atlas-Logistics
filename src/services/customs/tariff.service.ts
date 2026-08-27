import { db } from "../../db/index.js";
import { hsCodes } from "../../db/schema/operations.js";
import { eq, like, or } from "drizzle-orm";

export interface TariffCalculationInput {
  hsCode: string;
  fobValue: number;
  freightCost?: number;
  insuranceCost?: number;
  currency?: string;
  grossWeightKg?: number;
  originCountry: string;
  destinationCountry?: string;
  hasPreferentialOriginCert?: boolean; // EUR.1, ATR, etc.
}

export interface TaxLineItem {
  code: string; // A00 (Duty), B00 (VAT), 1EE (Excise)
  name: string;
  baseAmount: number;
  rateLabel: string;
  calculatedAmount: number;
}

export interface TariffCalculationResult {
  hsCode: string;
  hsDescription: string;
  chapter: string;
  isDualUse: boolean;
  originCountry: string;
  destinationCountry: string;
  customsValueCif: number;
  dutyRateApplied: number;
  dutyType: "AD_VALOREM" | "SPECIFIC" | "PREFERENTIAL_ZERO" | "MIXED";
  importDuty: number;
  vatBase: number;
  vatRateApplied: number;
  vatAmount: number;
  totalCustomsPayable: number;
  currency: string;
  taxBreakdown: TaxLineItem[];
}

export class TariffService {
  /**
   * Deterministic calculation of import duties and taxes under EU / Spanish customs regulations.
   */
  static async calculateCustomsDuties(
    input: TariffCalculationInput,
  ): Promise<TariffCalculationResult> {
    const currency = input.currency || "EUR";
    const dest = input.destinationCountry || "ES";
    const freight = input.freightCost || 0;
    const insurance = input.insuranceCost || 0;
    const grossWeightKg = input.grossWeightKg || 0;

    // 1. Customs Value CIF = FOB + Freight + Insurance
    const customsValueCif =
      Math.round((input.fobValue + freight + insurance) * 100) / 100;

    // 2. Resolve HS Code from DB
    const cleanCode = input.hsCode.replace(/[\.\s]/g, "");
    const hsRecords = await db
      .select()
      .from(hsCodes)
      .where(
        or(
          eq(hsCodes.code, input.hsCode),
          like(hsCodes.code, `${cleanCode.substring(0, 4)}%`),
        ),
      )
      .limit(1);

    const hsItem = hsRecords[0] || {
      id: "hs_default",
      code: input.hsCode,
      description: "General Commercial Merchandise",
      chapter: "General Tariff",
      adValoremDuty: 0.045, // 4.5% standard fallback
      specificDutyPerKg: 0,
      vatRate: 0.21,
      isDualUse: 0,
    };

    // 3. Determine Duty Rate
    let dutyRate = hsItem.adValoremDuty ?? 0.045;
    let dutyType: "AD_VALOREM" | "SPECIFIC" | "PREFERENTIAL_ZERO" | "MIXED" =
      "AD_VALOREM";
    let dutyAmount = 0;

    if (input.hasPreferentialOriginCert) {
      // Preferential trade agreement (EUR.1 / FTA) reduces third-country duty to 0%
      dutyRate = 0;
      dutyType = "PREFERENTIAL_ZERO";
      dutyAmount = 0;
    } else if ((hsItem.specificDutyPerKg ?? 0) > 0 && dutyRate > 0) {
      dutyType = "MIXED";
      const adValoremPart = customsValueCif * dutyRate;
      const specificPart = grossWeightKg * (hsItem.specificDutyPerKg ?? 0);
      dutyAmount = Math.round((adValoremPart + specificPart) * 100) / 100;
    } else if ((hsItem.specificDutyPerKg ?? 0) > 0) {
      dutyType = "SPECIFIC";
      dutyAmount =
        Math.round(grossWeightKg * (hsItem.specificDutyPerKg ?? 0) * 100) / 100;
    } else {
      dutyAmount = Math.round(customsValueCif * dutyRate * 100) / 100;
    }

    // 4. VAT Calculation (Base = CIF + Import Duty)
    const vatRate = hsItem.vatRate ?? 0.21;
    const vatBase = Math.round((customsValueCif + dutyAmount) * 100) / 100;
    const vatAmount = Math.round(vatBase * vatRate * 100) / 100;
    const totalCustomsPayable =
      Math.round((dutyAmount + vatAmount) * 100) / 100;

    // 5. Tax Breakdown for DUA Box 47
    const taxBreakdown: TaxLineItem[] = [
      {
        code: "A00",
        name: "Derechos de Arancel (Import Duty)",
        baseAmount: customsValueCif,
        rateLabel:
          dutyType === "PREFERENTIAL_ZERO"
            ? "0.0% (EUR.1 Preferencial)"
            : `${(dutyRate * 100).toFixed(1)}%`,
        calculatedAmount: dutyAmount,
      },
      {
        code: "B00",
        name: "IVA a la Importacion (Import VAT)",
        baseAmount: vatBase,
        rateLabel: `${(vatRate * 100).toFixed(1)}%`,
        calculatedAmount: vatAmount,
      },
    ];

    return {
      hsCode: hsItem.code,
      hsDescription: hsItem.description,
      chapter: hsItem.chapter || "General Tariff",
      isDualUse: Boolean(hsItem.isDualUse),
      originCountry: input.originCountry.toUpperCase(),
      destinationCountry: dest.toUpperCase(),
      customsValueCif,
      dutyRateApplied: dutyRate,
      dutyType,
      importDuty: dutyAmount,
      vatBase,
      vatRateApplied: vatRate,
      vatAmount,
      totalCustomsPayable,
      currency,
      taxBreakdown,
    };
  }

  /**
   * Search available TARIC / HS Codes in the local database.
   */
  static async searchHsCodes(query: string = "") {
    if (!query) {
      return db.select().from(hsCodes).limit(20);
    }
    const cleanQuery = query.replace(/[\.\s]/g, "");
    return db
      .select()
      .from(hsCodes)
      .where(
        or(
          like(hsCodes.code, `%${query}%`),
          like(hsCodes.code, `%${cleanQuery}%`),
          like(hsCodes.description, `%${query}%`),
          like(hsCodes.chapter, `%${query}%`),
        ),
      )
      .limit(20);
  }
}
