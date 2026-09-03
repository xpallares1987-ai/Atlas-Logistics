import { db } from "../../db/index.js";
import {
  carbonCalculations,
  carbonOffsetProjects,
  carbonCertificates,
} from "../../db/schema/carbon_emissions.js";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export interface OffsetPurchaseInput {
  calculationId: string;
  projectId: string;
  beneficiaryName: string;
}

export interface OffsetPurchaseResult {
  certificateId: string;
  certificateNumber: string;
  projectName: string;
  projectStandard: string;
  offsetTco2e: number;
  amountPaidEur: number;
  qrValidationUrl: string;
  issuedAt: string;
}

export class CarbonOffsetService {
  /**
   * Calculates total investment required to offset an amount of emissions
   */
  public static calculateCost(tco2e: number, pricePerTco2eEur: number): number {
    return Number((tco2e * pricePerTco2eEur).toFixed(2));
  }

  /**
   * Generates a standardized official certificate reference
   */
  public static generateCertificateNumber(): string {
    const year = new Date().getFullYear();
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    return `ATLAS-CARBON-${year}-${randomHex}`;
  }

  /**
   * Processes a carbon compensation purchase and generates an official certificate
   */
  public static async processOffset(
    input: OffsetPurchaseInput,
  ): Promise<OffsetPurchaseResult> {
    const calculation = await db
      .select()
      .from(carbonCalculations)
      .where(eq(carbonCalculations.id, input.calculationId))
      .get();

    if (!calculation) {
      throw new Error(`Carbon calculation ${input.calculationId} not found`);
    }

    const project = await db
      .select()
      .from(carbonOffsetProjects)
      .where(eq(carbonOffsetProjects.id, input.projectId))
      .get();

    if (!project) {
      throw new Error(`Offset project ${input.projectId} not found`);
    }

    const totalTco2e = calculation.totalTco2eWtw;
    const amountPaidEur = this.calculateCost(
      totalTco2e,
      project.pricePerTco2eEur,
    );
    const certificateNumber = this.generateCertificateNumber();
    const certificateId = uuidv4();
    const issuedAt = new Date().toISOString();
    const qrValidationUrl = `https://verify.atlas-logistics.io/carbon/${certificateNumber}`;

    // Update calculation record
    await db
      .update(carbonCalculations)
      .set({
        status: "OFFSET_COMPLETED",
        offsetProjectId: project.id,
        offsetCostEur: amountPaidEur,
        certificateNumber,
        updatedAt: issuedAt,
      })
      .where(eq(carbonCalculations.id, input.calculationId));

    // Deduct available credits
    if (project.availableCreditsTco2e >= totalTco2e) {
      await db
        .update(carbonOffsetProjects)
        .set({
          availableCreditsTco2e: Number(
            (project.availableCreditsTco2e - totalTco2e).toFixed(2),
          ),
        })
        .where(eq(carbonOffsetProjects.id, project.id));
    }

    // Insert Certificate record
    await db.insert(carbonCertificates).values({
      id: certificateId,
      certificateNumber,
      calculationId: calculation.id,
      beneficiaryName: input.beneficiaryName,
      projectId: project.id,
      projectName: project.name,
      projectStandard: project.standard,
      offsetTco2e: totalTco2e,
      amountPaidEur,
      qrValidationUrl,
      issuedAt,
    });

    return {
      certificateId,
      certificateNumber,
      projectName: project.name,
      projectStandard: project.standard,
      offsetTco2e: totalTco2e,
      amountPaidEur,
      qrValidationUrl,
      issuedAt,
    };
  }
}
