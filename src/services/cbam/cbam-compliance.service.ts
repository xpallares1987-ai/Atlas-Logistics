/**
 * @file cbam-compliance.service.ts
 * @description Application service for EU Carbon Border Adjustment Mechanism (CBAM) embedded emissions, quarterly declarations, and Transitional XML export.
 * @module @atlas/services/cbam/cbam-compliance
 * @see {@link docs/adr/0028-customs-brokerage-dua-mrn-disbursements-and-cbam-compliance.md}
 */

import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  cbamDeclarations,
  cbamDeclarationLines,
  cbamGoodsCatalog,
  cbamInstallations,
} from "../../db/schema/index.js";
import {
  classifyCbamCommodity,
  calculateCbamEmissions,
  generateCbamTransitionalXml,
  type CbamCalculationInput,
} from "@atlas/shared";
import crypto from "node:crypto";

export interface CreateQuarterlyDeclarationDto {
  declarationNumber?: string;
  reportingPeriod: string; // e.g. "2026-Q3"
  declarantVat: string;
  declarantName: string;
  importerVat: string;
  importerName: string;
  responsibleDeclarant?: string;
  remarks?: string;
  items: Array<{
    shipmentId?: string;
    duaNumber?: string;
    duaBox33HsCode: string;
    goodDescription: string;
    originCountry: string;
    installationId?: string;
    netWeightTonnes: number;
    useDefaultFactors?: boolean;
    directEmissionFactor?: number;
    indirectEmissionFactor?: number;
    precursorEmissionsTco2e?: number;
    foreignCarbonPricePerTco2e?: number;
  }>;
}

export class CbamComplianceService {
  /**
   * Evaluates CBAM scope and calculates embedded emissions for an individual commodity item.
   */
  evaluateCommodity(input: CbamCalculationInput) {
    const classification = classifyCbamCommodity(input.cnCode);
    const emissions = calculateCbamEmissions(input);

    return {
      classification,
      emissions,
    };
  }

  /**
   * Generates and commits an official CBAM quarterly declaration with itemized lines.
   */
  async createQuarterlyDeclaration(dto: CreateQuarterlyDeclarationDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new Error("Cannot create CBAM declaration with zero items");
    }

    const declarationId = `cbam_dec_${crypto.randomUUID()}`;
    const declarationNumber =
      dto.declarationNumber ||
      `CBAM-${dto.reportingPeriod}-${Date.now().toString().slice(-4)}`;

    let totalGrossMass = 0;
    let totalNetMass = 0;
    let totalDirect = 0;
    let totalIndirect = 0;
    let totalEmbedded = 0;
    let totalGrossLiability = 0;
    let totalForeignPaid = 0;
    let totalNetLiability = 0;

    const lineInserts = [];

    for (let i = 0; i < dto.items.length; i++) {
      const item = dto.items[i];
      const massTonnes = item.netWeightTonnes;
      totalNetMass += massTonnes;
      totalGrossMass += massTonnes * 1.05; // Standard 5% packaging allowance if unspecified

      // Calculate emissions
      const calcResult = calculateCbamEmissions({
        cnCode: item.duaBox33HsCode,
        netMassTonnes: massTonnes,
        directEmissionFactor: item.directEmissionFactor,
        indirectEmissionFactor: item.indirectEmissionFactor,
        precursorEmissionFactor: 0.0,
        precursorTonnes: item.precursorEmissionsTco2e || 0.0,
        foreignCarbonPricePaidEur:
          (item.foreignCarbonPricePerTco2e || 0.0) * massTonnes,
      });

      totalDirect =
        Math.round((totalDirect + calcResult.directEmissionsTco2e) * 10000) /
        10000;
      totalIndirect =
        Math.round(
          (totalIndirect + calcResult.indirectEmissionsTco2e) * 10000,
        ) / 10000;
      totalEmbedded =
        Math.round(
          (totalEmbedded + calcResult.totalEmbeddedEmissionsTco2e) * 10000,
        ) / 10000;
      totalGrossLiability =
        Math.round(
          (totalGrossLiability + calcResult.grossCarbonLiabilityEur) * 100,
        ) / 100;
      totalForeignPaid =
        Math.round(
          (totalForeignPaid + calcResult.foreignCarbonPricePaidEur) * 100,
        ) / 100;
      totalNetLiability =
        Math.round(
          (totalNetLiability + calcResult.netCarbonLiabilityEur) * 100,
        ) / 100;

      const lineId = `cbam_line_${crypto.randomUUID()}`;
      lineInserts.push({
        id: lineId,
        declarationId,
        shipmentId: item.shipmentId || null,
        duaNumber: item.duaNumber || null,
        duaBox33HsCode: item.duaBox33HsCode,
        goodDescription: item.goodDescription,
        originCountry: item.originCountry.toUpperCase(),
        installationId: item.installationId || null,
        netWeightTonnes: massTonnes,
        useDefaultFactors: item.useDefaultFactors ?? true,
        directEmissionsTco2e: calcResult.directEmissionsTco2e,
        indirectEmissionsTco2e: calcResult.indirectEmissionsTco2e,
        precursorEmissionsTco2e: calcResult.precursorEmissionsTco2e,
        totalLineEmissionsTco2e: calcResult.totalEmbeddedEmissionsTco2e,
        foreignCarbonPricePerTco2e: item.foreignCarbonPricePerTco2e || 0.0,
        effectiveForeignPricePaidEur: calcResult.foreignCarbonPricePaidEur,
        lineGrossLiabilityEur: calcResult.grossCarbonLiabilityEur,
        lineNetLiabilityEur: calcResult.netCarbonLiabilityEur,
        createdAt: new Date().toISOString(),
      });
    }

    const newDeclaration = {
      id: declarationId,
      declarationNumber,
      reportingPeriod: dto.reportingPeriod,
      declarantVat: dto.declarantVat,
      declarantName: dto.declarantName,
      importerVat: dto.importerVat,
      importerName: dto.importerName,
      totalGrossMassTonnes: Math.round(totalGrossMass * 10000) / 10000,
      totalNetMassTonnes: Math.round(totalNetMass * 10000) / 10000,
      totalDirectEmissionsTco2e: totalDirect,
      totalIndirectEmissionsTco2e: totalIndirect,
      totalEmbeddedEmissionsTco2e: totalEmbedded,
      euEtsBenchmarkPriceEur: 85.5,
      grossCarbonLiabilityEur: totalGrossLiability,
      carbonPricePaidForeignEur: totalForeignPaid,
      netCarbonLiabilityEur: totalNetLiability,
      status: "VALIDATED" as const,
      responsibleDeclarant: dto.responsibleDeclarant || null,
      remarks: dto.remarks || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(cbamDeclarations).values(newDeclaration);
    for (const line of lineInserts) {
      await db.insert(cbamDeclarationLines).values(line);
    }

    return {
      ...newDeclaration,
      lines: lineInserts,
    };
  }

  /**
   * Generates the EU CBAM Transitional Registry XML export for a given declaration.
   */
  async exportDeclarationXml(declarationId: string): Promise<string> {
    const decList = await db
      .select()
      .from(cbamDeclarations)
      .where(eq(cbamDeclarations.id, declarationId))
      .limit(1);

    if (decList.length === 0) {
      throw new Error(`CBAM Declaration '${declarationId}' not found`);
    }

    const declaration = decList[0];
    const lines = await db
      .select()
      .from(cbamDeclarationLines)
      .where(eq(cbamDeclarationLines.declarationId, declarationId));

    const xml = generateCbamTransitionalXml({
      declarationNumber: declaration.declarationNumber,
      reportingPeriod: declaration.reportingPeriod,
      declarantVat: declaration.declarantVat,
      declarantName: declaration.declarantName,
      importerVat: declaration.importerVat,
      importerName: declaration.importerName,
      items: lines.map((l, index) => ({
        itemNumber: index + 1,
        cnCode: l.duaBox33HsCode,
        goodsDescription: l.goodDescription,
        originCountry: l.originCountry,
        netMassTonnes: l.netWeightTonnes,
        directEmissionsTco2e: l.directEmissionsTco2e,
        indirectEmissionsTco2e: l.indirectEmissionsTco2e,
        totalEmbeddedEmissionsTco2e: l.totalLineEmissionsTco2e,
        foreignCarbonPricePaidEur: l.effectiveForeignPricePaidEur || 0.0,
      })),
    });

    return xml;
  }

  /**
   * Retrieves a declaration with all its line items.
   */
  async getDeclarationById(declarationId: string) {
    const decList = await db
      .select()
      .from(cbamDeclarations)
      .where(eq(cbamDeclarations.id, declarationId))
      .limit(1);

    if (decList.length === 0) {
      return null;
    }

    const declaration = decList[0];
    const lines = await db
      .select()
      .from(cbamDeclarationLines)
      .where(eq(cbamDeclarationLines.declarationId, declarationId));

    return {
      ...declaration,
      lines,
    };
  }
}
