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
    const legacyDuplicateLegId = "legacy-carbon-fixture-leg-1";
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
    await db.insert(carbonCalculationLegs).values({
      id: legacyDuplicateLegId,
      calculationId: "calc-sh-2026-0891",
      legOrder: 1,
      originName: "Legacy Fixture Origin",
      destinationName: "Legacy Fixture Destination",
      mode: "ROAD_DIESEL",
      distanceKm: 1,
      weightTonnes: 1,
      emissionFactorWtw: 1,
      emissionFactorTtw: 1,
      emissionFactorWtt: 1,
      legTco2eWtw: 1,
      legTco2eTtw: 1,
      legTco2eWtt: 1,
    });

    const fixtureLegsBefore = await db
      .select()
      .from(carbonCalculationLegs)
      .where(eq(carbonCalculationLegs.calculationId, "calc-sh-2026-0891"));
    const fixtureLegsUniqueCountBefore = new Set(
      fixtureLegsBefore.map((leg) => leg.legOrder),
    ).size;

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
    const fixtureLegOrderCounts = fixtureLegs.reduce(
      (counts, leg) => {
        counts.set(leg.legOrder, (counts.get(leg.legOrder) ?? 0) + 1);
        return counts;
      },
      new Map<number, number>(),
    );

    expect(preservedCertificate?.certificateNumber).toBe(
      "ATLAS-CARBON-PRESERVE-001",
    );
    expect(fixtureLegs).toHaveLength(fixtureLegsUniqueCountBefore);
    expect(fixtureLegs.find((leg) => leg.id === legacyDuplicateLegId)).toBeFalsy();
    expect([...fixtureLegOrderCounts.values()]).toEqual(
      expect.arrayContaining([1]),
    );
    expect([...fixtureLegOrderCounts.values()].every((count) => count === 1)).toBe(
      true,
    );
  });
});
