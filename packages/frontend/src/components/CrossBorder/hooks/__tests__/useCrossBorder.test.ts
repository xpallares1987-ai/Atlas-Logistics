/**
 * @file useCrossBorder.test.ts
 * @description Unit tests for Cross-Border USMCA relational declaration mapper and SAT Carta Porte 3.1 / USMCA RVC domain logic.
 * @module @atlas/frontend/components/CrossBorder/hooks/__tests__
 */

import { describe, it, expect } from "vitest";
import {
  USMCA_DEMO_PRESETS,
  calculateUsmcaRegionalValueContent,
  calculateImmexTariffOptimization,
} from "@atlas/shared";
import { mapDbDeclarationToStampingResult } from "../useCrossBorder";

describe("CrossBorder domain helpers", () => {
  it("maps SQLite cross-border declaration to CartaPorteStampingResult", () => {
    const dbDecl = {
      uuidFiscal: "8f1920a1-0000-4000-8000-112233445566",
      idCcp: "CCC-8f1920a1-0000-4000-8000-112233445566",
      qrCodeSatUrl: "https://verificacfdi.facturaelectronica.sat.gob.mx/test",
      xmlStamped: "<cfdi:Comprobante Version='4.0' />",
      cfdiFolio: "CP-2026-881",
      distanceKm: 1850,
      createdAt: "2026-11-12T10:00:00Z",
    };

    const mapped = mapDbDeclarationToStampingResult(dbDecl);
    expect(mapped.cfdiVersion).toBe("4.0");
    expect(mapped.cartaPorteVersion).toBe("3.1");
    expect(mapped.idCCP).toBe(dbDecl.idCcp);
    expect(mapped.totalFreightMxn).toBe(37000);
    expect(mapped.cadenaOriginal).toContain("CP-2026-881");
  });

  it("calculates USMCA Regional Value Content (RVC) and IMMEX savings", () => {
    const preset = USMCA_DEMO_PRESETS["laredo_automotive_immex"];
    const rvc = calculateUsmcaRegionalValueContent(preset.rvcInput as any);
    expect(rvc.rvcPercentage).toBeGreaterThan(0);

    const immex = calculateImmexTariffOptimization(preset.immexInput as any);
    expect(immex.dutySavingsUsd).toBeGreaterThanOrEqual(0);
    expect(immex.recommendedPedimentoType).toBeDefined();
  });
});
