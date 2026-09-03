import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  carbonCalculations,
  carbonCertificates,
  carbonOffsetProjects,
} from "../../db/schema/index.js";
import { CarbonOffsetService } from "./carbon-offset.service.js";

const projectId = "test-carbon-offset-project";
const calculationId = "test-carbon-offset-calculation";
const fractionalCalculationId = "test-fractional-offset-calculation";
const existingCalculationId = "test-existing-certificate-calculation";
const existingCertificateId = "test-existing-certificate";
const duplicateCertificateNumber = "ATLAS-CARBON-TEST-DUPLICATE";

async function insertCalculation(id: string, totalTco2eWtw: number) {
  await db.insert(carbonCalculations).values({
    id,
    referenceCode: id,
    originCity: "Madrid",
    destinationCity: "Paris",
    totalWeightKg: 1000,
    totalDistanceKm: 100,
    totalTco2eWtw,
    totalTco2eTtw: totalTco2eWtw * 0.8,
    totalTco2eWtt: totalTco2eWtw * 0.2,
    carbonIntensityGco2ePerTkm: 10,
  });
}

describe("CarbonOffsetService", () => {
  beforeEach(async () => {
    await db
      .delete(carbonCertificates)
      .where(
        inArray(carbonCertificates.calculationId, [
          calculationId,
          fractionalCalculationId,
          existingCalculationId,
        ]),
      );
    await db
      .delete(carbonCalculations)
      .where(
        inArray(carbonCalculations.id, [
          calculationId,
          fractionalCalculationId,
          existingCalculationId,
        ]),
      );
    await db
      .delete(carbonOffsetProjects)
      .where(eq(carbonOffsetProjects.id, projectId));

    await db.insert(carbonOffsetProjects).values({
      id: projectId,
      name: "Test Offset Project",
      standard: "GOLD_STANDARD",
      category: "REFORESTATION",
      country: "ES",
      pricePerTco2eEur: 20,
      availableCreditsTco2e: 1,
      description: "Test project",
      active: true,
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await db
      .delete(carbonCertificates)
      .where(
        inArray(carbonCertificates.calculationId, [
          calculationId,
          fractionalCalculationId,
          existingCalculationId,
        ]),
      );
    await db
      .delete(carbonCalculations)
      .where(
        inArray(carbonCalculations.id, [
          calculationId,
          fractionalCalculationId,
          existingCalculationId,
        ]),
      );
    await db
      .delete(carbonOffsetProjects)
      .where(eq(carbonOffsetProjects.id, projectId));
  });

  it("generates collision-resistant certificate numbers", () => {
    const certificateNumber = CarbonOffsetService.generateCertificateNumber();

    expect(certificateNumber).toMatch(
      /^ATLAS-CARBON-\d{4}-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/,
    );
  });

  it("rejects insufficient inventory without updating the calculation", async () => {
    await insertCalculation(calculationId, 2);

    await expect(
      CarbonOffsetService.processOffset({
        calculationId,
        projectId,
        beneficiaryName: "Test Customer",
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        message: "Insufficient carbon credits available",
        statusCode: 409,
      }),
    );

    const project = await db
      .select()
      .from(carbonOffsetProjects)
      .where(eq(carbonOffsetProjects.id, projectId))
      .get();
    const calculation = await db
      .select()
      .from(carbonCalculations)
      .where(eq(carbonCalculations.id, calculationId))
      .get();

    expect(project?.availableCreditsTco2e).toBe(1);
    expect(calculation?.status).toBe("CALCULATED");
    expect(calculation?.certificateNumber).toBeNull();
  });

  it("rejects an inactive project without mutating offset state", async () => {
    await insertCalculation(calculationId, 0.4);
    await db
      .update(carbonOffsetProjects)
      .set({ active: false })
      .where(eq(carbonOffsetProjects.id, projectId));

    await expect(
      CarbonOffsetService.processOffset({
        calculationId,
        projectId,
        beneficiaryName: "Test Customer",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });

    const calculation = await db
      .select()
      .from(carbonCalculations)
      .where(eq(carbonCalculations.id, calculationId))
      .get();
    const certificates = await db
      .select()
      .from(carbonCertificates)
      .where(eq(carbonCertificates.calculationId, calculationId));
    expect(calculation?.status).toBe("CALCULATED");
    expect(certificates).toHaveLength(0);
  });

  it("commits the exact deduction, calculation state, and one certificate", async () => {
    await insertCalculation(calculationId, 0.4);

    const result = await CarbonOffsetService.processOffset({
      calculationId,
      projectId,
      beneficiaryName: "Test Customer",
    });

    const project = await db
      .select()
      .from(carbonOffsetProjects)
      .where(eq(carbonOffsetProjects.id, projectId))
      .get();
    const calculation = await db
      .select()
      .from(carbonCalculations)
      .where(eq(carbonCalculations.id, calculationId))
      .get();
    const certificates = await db
      .select()
      .from(carbonCertificates)
      .where(eq(carbonCertificates.calculationId, calculationId));

    expect(project?.availableCreditsTco2e).toBeCloseTo(0.6);
    expect(result.issuedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
    expect(calculation).toMatchObject({
      status: "OFFSET_COMPLETED",
      offsetProjectId: projectId,
      offsetCostEur: 8,
      certificateNumber: result.certificateNumber,
    });
    expect(certificates).toHaveLength(1);
    expect(certificates[0]).toMatchObject({
      id: result.certificateId,
      certificateNumber: result.certificateNumber,
      offsetTco2e: 0.4,
      amountPaidEur: 8,
      issuedAt: result.issuedAt,
    });
  });

  it("rounds sequential fractional deductions to inventory precision", async () => {
    await db
      .update(carbonOffsetProjects)
      .set({ availableCreditsTco2e: 0.3 })
      .where(eq(carbonOffsetProjects.id, projectId));
    await insertCalculation(calculationId, 0.1);
    await insertCalculation(fractionalCalculationId, 0.2);

    await CarbonOffsetService.processOffset({
      calculationId,
      projectId,
      beneficiaryName: "First Customer",
    });
    await CarbonOffsetService.processOffset({
      calculationId: fractionalCalculationId,
      projectId,
      beneficiaryName: "Second Customer",
    });

    const project = await db
      .select()
      .from(carbonOffsetProjects)
      .where(eq(carbonOffsetProjects.id, projectId))
      .get();

    expect(project?.availableCreditsTco2e).toBe(0);
  });

  it("rolls back inventory and calculation updates when certificate creation fails", async () => {
    await insertCalculation(calculationId, 0.5);
    await insertCalculation(existingCalculationId, 0.1);
    await db.insert(carbonCertificates).values({
      id: existingCertificateId,
      certificateNumber: duplicateCertificateNumber,
      calculationId: existingCalculationId,
      beneficiaryName: "Existing Customer",
      projectId,
      projectName: "Test Offset Project",
      projectStandard: "GOLD_STANDARD",
      offsetTco2e: 0.1,
      amountPaidEur: 2,
      qrValidationUrl: "https://example.test/existing",
    });
    vi.spyOn(CarbonOffsetService, "generateCertificateNumber").mockReturnValue(
      duplicateCertificateNumber,
    );

    await expect(
      CarbonOffsetService.processOffset({
        calculationId,
        projectId,
        beneficiaryName: "Test Customer",
      }),
    ).rejects.toThrow();

    const project = await db
      .select()
      .from(carbonOffsetProjects)
      .where(eq(carbonOffsetProjects.id, projectId))
      .get();
    const calculation = await db
      .select()
      .from(carbonCalculations)
      .where(eq(carbonCalculations.id, calculationId))
      .get();

    expect(project?.availableCreditsTco2e).toBe(1);
    expect(calculation?.status).toBe("CALCULATED");
    expect(calculation?.certificateNumber).toBeNull();
  });
});
