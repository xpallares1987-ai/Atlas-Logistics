import { db } from "../../db/index.js";
import {
  carbonCalculations,
  carbonOffsetProjects,
  carbonCertificates,
} from "../../db/schema/index.js";
import { and, eq, gte, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { randomUUID } from "node:crypto";

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

export class CarbonOffsetDomainError extends Error {
  public constructor(
    message: string,
    public readonly statusCode: 404 | 409,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class CarbonOffsetNotFoundError extends CarbonOffsetDomainError {
  public constructor(message: string) {
    super(message, 404);
  }
}

export class CarbonOffsetConflictError extends CarbonOffsetDomainError {
  public constructor(message: string) {
    super(message, 409);
  }
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
    return `ATLAS-CARBON-${year}-${randomUUID().toUpperCase()}`;
  }

  /**
   * Processes a carbon compensation purchase and generates an official certificate
   */
  public static async processOffset(
    input: OffsetPurchaseInput,
  ): Promise<OffsetPurchaseResult> {
    return db.transaction(async (tx) => {
      const calculation = await tx
        .select()
        .from(carbonCalculations)
        .where(eq(carbonCalculations.id, input.calculationId))
        .get();

      if (!calculation) {
        throw new CarbonOffsetNotFoundError(
          `Carbon calculation ${input.calculationId} not found`,
        );
      }

      if (calculation.status === "OFFSET_COMPLETED") {
        throw new CarbonOffsetConflictError(
          "This calculation has already been offset",
        );
      }

      const project = await tx
        .select()
        .from(carbonOffsetProjects)
        .where(eq(carbonOffsetProjects.id, input.projectId))
        .get();

      if (!project) {
        throw new CarbonOffsetNotFoundError(
          `Offset project ${input.projectId} not found`,
        );
      }

      if (!project.active) {
        throw new CarbonOffsetConflictError(
          `Offset project ${input.projectId} is inactive`,
        );
      }

      const totalTco2e = calculation.totalTco2eWtw;
      const amountPaidEur = this.calculateCost(
        totalTco2e,
        project.pricePerTco2eEur,
      );
      const certificateNumber = this.generateCertificateNumber();
      const certificateId = uuidv4();
      const issuedAt = new Date()
        .toISOString()
        .replace("T", " ")
        .replace("Z", "");
      const qrValidationUrl = `https://verify.atlas-logistics.io/carbon/${certificateNumber}`;

      const deduction = await tx
        .update(carbonOffsetProjects)
        .set({
          availableCreditsTco2e: sql`${carbonOffsetProjects.availableCreditsTco2e} - ${totalTco2e}`,
        })
        .where(
          and(
            eq(carbonOffsetProjects.id, project.id),
            eq(carbonOffsetProjects.active, true),
            gte(carbonOffsetProjects.availableCreditsTco2e, totalTco2e),
          ),
        );

      if (deduction.rowsAffected !== 1) {
        throw new CarbonOffsetConflictError(
          "Insufficient carbon credits available",
        );
      }

      await tx
        .update(carbonCalculations)
        .set({
          status: "OFFSET_COMPLETED",
          offsetProjectId: project.id,
          offsetCostEur: amountPaidEur,
          certificateNumber,
          updatedAt: issuedAt,
        })
        .where(eq(carbonCalculations.id, input.calculationId));

      await tx.insert(carbonCertificates).values({
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
    });
  }
}
