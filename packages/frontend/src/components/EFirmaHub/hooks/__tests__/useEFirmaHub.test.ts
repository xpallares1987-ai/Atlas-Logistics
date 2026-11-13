/**
 * @file useEFirmaHub.test.ts
 * @description Unit tests for the SAT e.firma Hub custom hook and canonical Cadena Original generation.
 * @module @atlas/frontend/components/EFirmaHub/hooks/__tests__
 * @see {@link docs/adr/0020-modular-file-size-guardrails.md}
 */

import { describe, it, expect } from "vitest";
import { useEFirmaHub } from "../useEFirmaHub";
import { generateCanonicalCadenaOriginal } from "@atlas/shared";

describe("EFirmaHub modular architecture & exports", () => {
  it("exports useEFirmaHub custom domain hook", () => {
    expect(typeof useEFirmaHub).toBe("function");
  });

  it("generates deterministic SAT Cadena Original with double-pipe delimiters", () => {
    const cadena = generateCanonicalCadenaOriginal({
      documentType: "PEDIMENTO_ADUANAL",
      documentId: "doc_dua_demo_01",
      rfcEmisor: "IGE260101XYZ",
      rfcReceptor: "ALH260202ABC",
      declaredAmountUsd: 145000,
      declaredAmountMxn: 2610000,
      rawContent: "Test payload",
    });
    expect(cadena.startsWith("||")).toBe(true);
    expect(cadena.endsWith("||")).toBe(true);
    expect(cadena).toContain("PEDIMENTO_ADUANAL");
  });
});
