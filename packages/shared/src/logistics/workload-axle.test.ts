import { describe, it, expect } from "vitest";
import {
  calculateOperativeScore,
  analyzeWorkloadPortfolio,
  generateRebalancingRecommendations,
  isExcludedOperative,
  DEFAULT_WORKLOAD_SETTINGS,
  calculateAxleLoadsAndHeatmap,
  auditChargeItem,
} from "../index.js";

describe("Workload & Portfolio Engine (@atlas/shared)", () => {
  it("should exclude managers and accounting from traffic score", () => {
    expect(isExcludedOperative("Operations Manager")).toBe(true);
    expect(isExcludedOperative("TEST02")).toBe(true);
    expect(isExcludedOperative("Blocked User")).toBe(true);
    expect(isExcludedOperative("TEST01 (Team Leader)")).toBe(false);

    const scored = calculateOperativeScore({
      operativeName: "Operations Manager",
      shipmentsCount: 50,
      totalTeus: 80,
      distinctBuyersCount: 10,
      complexIncotermsCount: 5,
      totalMetricTons: 1200,
    });

    expect(scored.isExcluded).toBe(true);
    expect(scored.totalPoints).toBe(0);
    expect(scored.saturationPercent).toBe(0);
  });

  it("should calculate weighted operational points and saturation for active operator", () => {
    const scored = calculateOperativeScore({
      operativeName: "TEST01 (Team Leader)",
      shipmentsCount: 40, // 40 * 1.0 = 40 pts
      totalTeus: 100, // 100 * 0.06 = 6 pts
      distinctBuyersCount: 12, // 12 * 1.5 = 18 pts
      complexIncotermsCount: 8, // 8 * 2.0 = 16 pts
      totalMetricTons: 2500, // (2500 / 100) * 0.05 = 1.25 pts
      primaryBuyers: [
        {
          buyerName: "Key Account Paper UK",
          shipmentsCount: 25,
          sharePercent: 62.5,
        },
        { buyerName: "Cartonage Lyon", shipmentsCount: 15, sharePercent: 37.5 },
      ],
    });

    expect(scored.isExcluded).toBe(false);
    expect(scored.totalPoints).toBeCloseTo(81.25, 1);
    expect(scored.saturationPercent).toBeCloseTo(81.3, 1);
    expect(scored.status).toBe("HIGH_WARNING");
    expect(scored.hasConcentrationRisk).toBe(true);
    expect(scored.topBuyer?.buyerName).toBe("Key Account Paper UK");
  });

  it("should generate portfolio summary and rebalancing recommendations", () => {
    const operatives = [
      {
        operativeName: "Operador Sobrecargado",
        shipmentsCount: 65,
        totalTeus: 180,
        distinctBuyersCount: 20,
        complexIncotermsCount: 15,
        totalMetricTons: 4000,
        primaryBuyers: [
          { buyerName: "Buyer Alfa", shipmentsCount: 40, sharePercent: 61.5 },
          { buyerName: "Buyer Beta", shipmentsCount: 25, sharePercent: 38.5 },
        ],
      },
      {
        operativeName: "Operador Disponible",
        shipmentsCount: 15,
        totalTeus: 30,
        distinctBuyersCount: 4,
        complexIncotermsCount: 2,
        totalMetricTons: 800,
        primaryBuyers: [
          { buyerName: "Buyer Gamma", shipmentsCount: 15, sharePercent: 100 },
        ],
      },
      {
        operativeName: "Operations Manager",
        shipmentsCount: 10,
        totalTeus: 20,
        distinctBuyersCount: 2,
        complexIncotermsCount: 0,
        totalMetricTons: 200,
      },
    ];

    const analysis = analyzeWorkloadPortfolio(operatives);
    expect(analysis.summary.totalOperatives).toBe(3);
    expect(analysis.summary.activeOperatives).toBe(2);
    expect(analysis.summary.excludedOperatives).toBe(1);
    expect(analysis.summary.overloadedCount).toBe(1);

    const rebalance = generateRebalancingRecommendations(operatives);
    expect(rebalance.length).toBeGreaterThan(0);
    expect(rebalance[0].sourceOperative).toBe("Operador Sobrecargado");
    expect(rebalance[0].targetOperative).toBe("Operador Disponible");
    expect(rebalance[0].buyerToTransfer).toBe("Buyer Beta");
  });
});

describe("Axle Load & Stress Heatmap Engine (@atlas/shared)", () => {
  it("should calculate 5-axle loads and detect legal baseline in Spain 44t", () => {
    const coils = [
      { coilId: "B-01", weightKg: 2500, xPositionM: 2.0, yPositionM: 0.8 },
      { coilId: "B-02", weightKg: 2500, xPositionM: 2.0, yPositionM: 1.55 },
      { coilId: "B-03", weightKg: 2500, xPositionM: 4.5, yPositionM: 0.8 },
      { coilId: "B-04", weightKg: 2500, xPositionM: 4.5, yPositionM: 1.55 },
      { coilId: "B-05", weightKg: 2500, xPositionM: 7.5, yPositionM: 0.8 },
      { coilId: "B-06", weightKg: 2500, xPositionM: 7.5, yPositionM: 1.55 },
      { coilId: "B-07", weightKg: 2500, xPositionM: 10.0, yPositionM: 0.8 },
      { coilId: "B-08", weightKg: 2500, xPositionM: 10.0, yPositionM: 1.55 },
    ]; // 20,000 kg total

    const result = calculateAxleLoadsAndHeatmap(coils, false);
    expect(result.totalNetPayloadKg).toBe(20000);
    expect(result.isFullyLegal).toBe(true);
    expect(result.axles.length).toBe(5);
    expect(result.heatmapGrid.length).toBe(10); // 10 segments
    expect(result.heatmapGrid[0].length).toBe(3); // 3 lanes
  });

  it("should flag infractions when payload exceeds Spain 26,500 kg limit", () => {
    const coils = [
      {
        coilId: "B-Heavy",
        weightKg: 28000,
        xPositionM: 6.016,
        yPositionM: 1.176,
      },
    ];

    const result = calculateAxleLoadsAndHeatmap(coils, false);
    expect(result.isFullyLegal).toBe(false);
    expect(
      result.infractions.some((inf) => inf.includes("excede el límite legal")),
    ).toBe(true);
  });
});

describe("Carrier Charge Audit & Discrepancies (@atlas/shared)", () => {
  it("should flag carrier overbilling when demurrage is charged during free time", () => {
    const finding = auditChargeItem({
      id: "CHG-01",
      shipmentRef: "EXP-BCN-2026-99",
      carrierCode: "MSC",
      carrierRawName: "Mediterranean Shipping Company",
      chargeCode: "DEMURRAGE",
      equipmentType: "40HC",
      quantityUnits: 3,
      unitRateBilledEur: 80,
      totalBilledEur: 240,
      freeDaysContracted: 7,
      actualDaysPortStay: 5,
    });

    expect(finding.type).toBe("FREE_TIME_DISPUTE");
    expect(finding.severity).toBe("CRITICAL");
    expect(finding.discrepancyEur).toBe(240);
  });

  it("should flag margin leakage when expense is not re-invoiced to client", () => {
    const finding = auditChargeItem({
      id: "CHG-02",
      shipmentRef: "EXP-BCN-2026-101",
      carrierCode: "MAERSK",
      carrierRawName: "Maersk Line",
      chargeCode: "THC",
      equipmentType: "40HC",
      quantityUnits: 1,
      unitRateBilledEur: 185,
      totalBilledEur: 185,
      reimbursedToClientEur: 100, // Client only invoiced 100 EUR -> 85 EUR margin leakage
    });

    expect(finding.type).toBe("MARGIN_LEAKAGE_UNBILLED");
    expect(finding.discrepancyEur).toBe(85);
  });
});
