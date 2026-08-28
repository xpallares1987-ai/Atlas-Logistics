import { describe, it, expect } from "vitest";
import { CustomsWarehouseFinanceService } from "./customs-warehouse-finance.service.js";

describe("CustomsWarehouseFinanceService", () => {
  it("should calculate suspended tariff duty and import VAT correctly", () => {
    const result = CustomsWarehouseFinanceService.calculateSuspendedDebt({
      customsValueEur: 100000,
      tariffRatePercent: 7.5,
      importVatRatePercent: 21.0,
    });

    expect(result.customsValueEur).toBe(100000);
    expect(result.tariffRatePercent).toBe(7.5);
    expect(result.suspendedDutyAmountEur).toBe(7500); // 100,000 * 7.5%
    expect(result.taxableVatBaseEur).toBe(107500); // 100,000 + 7,500
    expect(result.suspendedVatAmountEur).toBe(22575); // 107,500 * 21%
    expect(result.totalSuspendedDebtEur).toBe(30075); // 7,500 + 22,575
  });

  it("should handle 0% duty goods (e.g. IT/semiconductors)", () => {
    const result = CustomsWarehouseFinanceService.calculateSuspendedDebt({
      customsValueEur: 350000,
      tariffRatePercent: 0.0,
      importVatRatePercent: 21.0,
    });

    expect(result.suspendedDutyAmountEur).toBe(0);
    expect(result.taxableVatBaseEur).toBe(350000);
    expect(result.suspendedVatAmountEur).toBe(73500);
    expect(result.totalSuspendedDebtEur).toBe(73500);
  });

  it("should compute comprehensive guarantee availability and utilization", () => {
    const result =
      CustomsWarehouseFinanceService.calculateGuaranteeAvailability({
        totalGuaranteeAmountEur: 1000000,
        activeLots: [
          { lotNumber: "LOT-1", totalSuspendedDebtEur: 200000 },
          { lotNumber: "LOT-2", totalSuspendedDebtEur: 350000 },
        ],
      });

    expect(result.totalGuaranteeAmountEur).toBe(1000000);
    expect(result.committedSuspendedDebtEur).toBe(550000);
    expect(result.availableCreditEur).toBe(450000);
    expect(result.utilizationRatePercent).toBe(55.0);
    expect(result.status).toBe("OPTIMAL");
    expect(result.isCreditDepleted).toBe(false);
  });

  it("should detect depleted bank guarantee status", () => {
    const result =
      CustomsWarehouseFinanceService.calculateGuaranteeAvailability({
        totalGuaranteeAmountEur: 500000,
        activeLots: [
          { lotNumber: "LOT-1", totalSuspendedDebtEur: 300000 },
          { lotNumber: "LOT-2", totalSuspendedDebtEur: 250000 },
        ],
      });

    expect(result.committedSuspendedDebtEur).toBe(550000);
    expect(result.availableCreditEur).toBe(0);
    expect(result.status).toBe("DEPLETED");
    expect(result.isCreditDepleted).toBe(true);
  });

  it("should calculate taxes on discharge to Free Circulation (4071)", () => {
    const settlement =
      CustomsWarehouseFinanceService.calculateDischargeSettlement({
        totalLotCustomsValueEur: 180000,
        totalLotDutyAmountEur: 13500,
        totalLotVatAmountEur: 40635,
        initialPackagesCount: 24,
        dischargedPackagesCount: 6, // 25% of total lot
        dischargeRegimeCode: "4071",
      });

    expect(settlement.dischargedPackagesRatio).toBe(0.25);
    expect(settlement.dischargedCustomsValueEur).toBe(45000);
    expect(settlement.settledDutyAmountEur).toBe(3375); // 25% of 13500
    expect(settlement.settledVatAmountEur).toBe(10158.75); // 25% of 40635
    expect(settlement.totalSettledTaxesEur).toBe(13533.75);
    expect(settlement.releasedGuaranteeCreditEur).toBe(13533.75);
  });

  it("should calculate complete tax exemption on Re-exportation (3171)", () => {
    const settlement =
      CustomsWarehouseFinanceService.calculateDischargeSettlement({
        totalLotCustomsValueEur: 180000,
        totalLotDutyAmountEur: 13500,
        totalLotVatAmountEur: 40635,
        initialPackagesCount: 24,
        dischargedPackagesCount: 12, // 50% of total lot
        dischargeRegimeCode: "3171",
      });

    expect(settlement.settledDutyAmountEur).toBe(0);
    expect(settlement.settledVatAmountEur).toBe(0);
    expect(settlement.totalSettledTaxesEur).toBe(0);
    expect(settlement.releasedGuaranteeCreditEur).toBe(27067.5); // 50% released from bank bond
    expect(settlement.taxExemptionRationale).toContain(
      "Exención plena de derechos",
    );
  });

  it("should evaluate ADT stay compliance within 90 days", () => {
    const evalResult = CustomsWarehouseFinanceService.evaluateAdtStayDeadline(
      "2026-08-01T00:00:00Z",
      "2026-08-20T00:00:00Z",
      90,
    );

    expect(evalResult.daysElapsed).toBe(19);
    expect(evalResult.daysRemaining).toBe(71);
    expect(evalResult.isExpired).toBe(false);
    expect(evalResult.complianceStatus).toBe("COMPLIANT");
  });

  it("should trigger infraction warning when ADT 90 days limit is exceeded", () => {
    const evalResult = CustomsWarehouseFinanceService.evaluateAdtStayDeadline(
      "2026-01-01T00:00:00Z",
      "2026-05-15T00:00:00Z",
      90,
    );

    expect(evalResult.daysElapsed).toBeGreaterThan(90);
    expect(evalResult.daysRemaining).toBeLessThan(0);
    expect(evalResult.isExpired).toBe(true);
    expect(evalResult.complianceStatus).toBe("EXPIRED_INFRACTION");
  });
});
