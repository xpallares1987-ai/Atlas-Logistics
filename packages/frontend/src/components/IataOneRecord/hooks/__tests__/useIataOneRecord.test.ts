/**
 * @file useIataOneRecord.test.ts
 * @description Unit tests for the useIataOneRecord domain hook and IATA DGR e-DGD validation.
 * @module @atlas/frontend/components/IataOneRecord/hooks/__tests__/useIataOneRecord.test
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import { describe, it, expect } from "vitest";
import { useIataOneRecord } from "../useIataOneRecord";
import {
  SEED_DANGEROUS_GOODS,
  validateDangerousGoodsDeclaration,
} from "@atlas/shared";

describe("useIataOneRecord hook & IATA DGR validation", () => {
  it("exports useIataOneRecord function", () => {
    expect(typeof useIataOneRecord).toBe("function");
  });

  it("validates seed dangerous goods declaration with cryptographic seal", () => {
    const result = validateDangerousGoodsDeclaration(SEED_DANGEROUS_GOODS[0]);
    expect(result).toHaveProperty("isCompliant");
    expect(result.validationSealHash).toBeTruthy();
  });
});
