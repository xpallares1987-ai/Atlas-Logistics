import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "./index.js";
import {
  carbonCalculationLegs,
  carbonCalculations,
  carbonCertificates,
  carbonOffsetProjects,
} from "./schema/index.js";
import { seedCarbonModule } from "./seed-carbon.js";

const projectId = "test-preserved-carbon-project";
const calculationId = "test-preserved-carbon-calculation";
const certificateId = "test-preserved-carbon-certificate";

describe("seedCarbonModule", () => {
  afterEach(async () => {
    await db
      .delete(carbonCertificates)
      .where(eq(carbonCertificates.id, certificateId));
    await db
      .delete(carbonCalculations)
      .where(eq(carbonCalculations.id, calculationId));
    await db
      .delete(carbonOffsetProjects)
      .where(eq(carbonOffsetProjects.id, projectId));
  });

  it("is repeat-safe and preserves non-fixture carbon data", async () => {
    await db.insert(carbonOffsetProjects).values({
      id: projectId,
      name: "Preserved Project",
      standard: "GOLD_STANDARD",
      category: "REFORESTATION",
      country: "ES",
      pricePerTco2eEur: 10,
      availableCreditsTco2e: 50,
      description: "Must survive shared seed reruns",
    });
    await db.insert(carbonCalculations).values({
      id: calculationId,
      referenceCode: "PRESERVE-001",
      originCity: "Madrid",
      destinationCity: "Paris",
      totalWeightKg: 1000,
      totalDistanceKm: 100,
      totalTco2eWtw: 1,
      totalTco2eTtw: 0.8,
      totalTco2eWtt: 0.2,
      carbonIntensityGco2ePerTkm: 10,
    });
    await db.insert(carbonCertificates).values({
      id: certificateId,
      certificateNumber: "ATLAS-CARBON-PRESERVE-001",
      calculationId,
      beneficiaryName: "Preserved Customer",
      projectId,
      projectName: "Preserved Project",
      projectStandard: "GOLD_STANDARD",
      offsetTco2e: 1,
      amountPaidEur: 10,
      qrValidationUrl: "https://example.test/preserved",
    });

    const fixtureLegsBefore = await db
      .select()
      .from(carbonCalculationLegs)
      .where(eq(carbonCalculationLegs.calculationId, "calc-sh-2026-0891"));

    await seedCarbonModule();
    await seedCarbonModule();

    const preservedCertificate = await db
      .select()
      .from(carbonCertificates)
      .where(eq(carbonCertificates.id, certificateId))
      .get();
    const fixtureLegs = await db
      .select()
      .from(carbonCalculationLegs)
      .where(eq(carbonCalculationLegs.calculationId, "calc-sh-2026-0891"));

    expect(preservedCertificate?.certificateNumber).toBe(
      "ATLAS-CARBON-PRESERVE-001",
    );
    expect(fixtureLegs).toHaveLength(fixtureLegsBefore.length);
  });
});
