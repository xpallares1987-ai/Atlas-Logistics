import { describe, it, expect } from "vitest";
import {
  IncotermsMatrixService,
  IncotermCode,
} from "./incoterms-matrix.service.js";

describe("IncotermsMatrixService", () => {
  it("should retrieve all 11 official ICC Incoterms 2020 rules", () => {
    const rules = IncotermsMatrixService.getAllRules();
    expect(rules).toHaveLength(11);
    const codes = rules.map((r) => r.code);
    expect(codes).toContain("EXW");
    expect(codes).toContain("FCA");
    expect(codes).toContain("CPT");
    expect(codes).toContain("CIP");
    expect(codes).toContain("DAP");
    expect(codes).toContain("DPU");
    expect(codes).toContain("DDP");
    expect(codes).toContain("FAS");
    expect(codes).toContain("FOB");
    expect(codes).toContain("CFR");
    expect(codes).toContain("CIF");
  });

  it("should have 10-stage lifecycle allocation for every rule", () => {
    const rules = IncotermsMatrixService.getAllRules();
    for (const rule of rules) {
      expect(rule.stages).toHaveLength(11); // 11 stages (including export customs & origin terminal)
      expect(rule.riskTransferPoint).toBeDefined();
      expect(rule.costTransferPoint).toBeDefined();
    }
  });

  it("should correctly identify maritime-only vs multimodal rules", () => {
    expect(IncotermsMatrixService.getRule("FOB").transportCategory).toBe(
      "MARITIME_ONLY",
    );
    expect(IncotermsMatrixService.getRule("CIF").transportCategory).toBe(
      "MARITIME_ONLY",
    );
    expect(IncotermsMatrixService.getRule("FCA").transportCategory).toBe(
      "ANY_MODE",
    );
    expect(IncotermsMatrixService.getRule("CIP").transportCategory).toBe(
      "ANY_MODE",
    );
  });

  it("should warn when using FOB on Air transport and recommend FCA", () => {
    const validation = IncotermsMatrixService.validateModeCompatibility({
      incotermCode: "FOB",
      transportMode: "AIR",
    });
    expect(validation.isValid).toBe(false);
    expect(validation.isOptimal).toBe(false);
    expect(validation.recommendation).toBe("FCA");
    expect(validation.warnings[0]).toContain(
      "exclusiva de transporte marítimo",
    );
  });

  it("should flag sub-optimal containerized usage of FOB and recommend FCA", () => {
    const validation = IncotermsMatrixService.validateModeCompatibility({
      incotermCode: "FOB",
      transportMode: "OCEAN",
      isContainerized: true,
    });
    expect(validation.isValid).toBe(true);
    expect(validation.isOptimal).toBe(false);
    expect(validation.recommendation).toBe("FCA");
    expect(validation.warnings[0]).toContain(
      "Uso subóptimo de FOB en carga contenedorizada",
    );
  });

  it("should approve optimal multimodal usage of CIP", () => {
    const validation = IncotermsMatrixService.validateModeCompatibility({
      incotermCode: "CIP",
      transportMode: "MULTIMODAL",
      isContainerized: true,
    });
    expect(validation.isValid).toBe(true);
    expect(validation.isOptimal).toBe(true);
    expect(validation.warnings).toHaveLength(0);
  });

  it("should calculate mandatory Institute Cargo Clauses (A) insurance for CIP (110% value)", () => {
    const ins = IncotermsMatrixService.calculateInsuranceObligation({
      incotermCode: "CIP",
      goodsValue: 100000,
      freightCost: 5000,
      currency: "EUR",
    });
    expect(ins.isMandatory).toBe(true);
    expect(ins.clauseType).toBe("INSTITUTE_CARGO_CLAUSES_A");
    expect(ins.minimumInsuredValue).toBe(115500); // 105,000 * 1.1
    expect(ins.estimatedPremium).toBeGreaterThan(0);
  });

  it("should calculate mandatory Institute Cargo Clauses (C) insurance for CIF (110% value)", () => {
    const ins = IncotermsMatrixService.calculateInsuranceObligation({
      incotermCode: "CIF",
      goodsValue: 100000,
      freightCost: 5000,
      currency: "EUR",
    });
    expect(ins.isMandatory).toBe(true);
    expect(ins.clauseType).toBe("INSTITUTE_CARGO_CLAUSES_C");
    expect(ins.minimumInsuredValue).toBe(115500);
  });

  it("should return no mandatory insurance for FCA, EXW, DAP, DDP", () => {
    const codes: IncotermCode[] = [
      "FCA",
      "EXW",
      "DAP",
      "DDP",
      "FOB",
      "CFR",
      "CPT",
      "DPU",
    ];
    for (const code of codes) {
      const ins = IncotermsMatrixService.calculateInsuranceObligation({
        incotermCode: code,
        goodsValue: 50000,
      });
      expect(ins.isMandatory).toBe(false);
      expect(ins.clauseType).toBe("NONE");
    }
  });

  it("should format and validate Named Place syntax", () => {
    const res1 = IncotermsMatrixService.validateNamedPlaceSyntax(
      "Frankfurt Airport, Germany",
      "CIP",
    );
    expect(res1.isValid).toBe(true);
    expect(res1.formattedString).toBe(
      "CIP Frankfurt Airport, Germany Incoterms® 2020",
    );

    const res2 = IncotermsMatrixService.validateNamedPlaceSyntax("", "FOB");
    expect(res2.isValid).toBe(false);
  });
});
