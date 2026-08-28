import { describe, it, expect } from "vitest";
import { CustomsStockLedgerService } from "./customs-stock-ledger.service.js";

describe("CustomsStockLedgerService", () => {
  it("should validate labeling and marking as authorized usual handling under Art 220 UCC", () => {
    const result = CustomsStockLedgerService.validateUsualHandling({
      handlingTypeCode: "LABELING_MARKING",
      goodsDescription: "Microprocesadores para automoción",
    });

    expect(result.isAuthorizedUnderArt220).toBe(true);
    expect(result.isSubstantialTransformation).toBe(false);
    expect(result.requiresInwardProcessingAuthorization).toBe(false);
    expect(result.legalCategory).toContain("Anexo 71-03");
  });

  it("should validate repacking and sorting as authorized", () => {
    const result = CustomsStockLedgerService.validateUsualHandling({
      handlingTypeCode: "REPACKING_SORTING",
      goodsDescription: "Bobinas de aluminio",
    });

    expect(result.isAuthorizedUnderArt220).toBe(true);
    expect(result.isSubstantialTransformation).toBe(false);
  });

  it("should reject manufacturing transformation in standard bonded warehouse", () => {
    const result = CustomsStockLedgerService.validateUsualHandling({
      handlingTypeCode: "ALTERATION_MANUFACTURING",
      goodsDescription: "Materia prima textil",
    });

    expect(result.isAuthorizedUnderArt220).toBe(false);
    expect(result.isSubstantialTransformation).toBe(true);
    expect(result.requiresInwardProcessingAuthorization).toBe(true);
    expect(result.notes).toContain("Perfeccionamiento Activo");
  });

  it("should calculate balance deltas on stock ledger entry creation", () => {
    const entry = CustomsStockLedgerService.createStockLedgerEntry({
      entrySequentialNumber: 1005,
      lotNumber: "LOT-2026-DA-08101",
      facilityCode: "ES-DA-08001-ZAL",
      movementType: "PARTIAL_DISCHARGE",
      documentReference: "DVD-OUT-2026-00301",
      packagesDelta: -20,
      previousPackagesBalance: 120,
      grossMassDeltaKg: -400,
      previousGrossMassBalanceKg: 2400,
      releasedSuspendedDebtEur: 12250.0,
      movementTimestamp: "2026-08-12T16:00:00Z",
      authorizedOfficerOrAgent: "Carles Puigvert",
    });

    expect(entry.entrySequentialNumber).toBe(1005);
    expect(entry.packagesBalanceAfter).toBe(100);
    expect(entry.grossMassBalanceAfterKg).toBe(2000);
    expect(entry.releasedSuspendedDebtEur).toBe(12250.0);
    expect(entry.isAudited).toBe(true);
  });
});
