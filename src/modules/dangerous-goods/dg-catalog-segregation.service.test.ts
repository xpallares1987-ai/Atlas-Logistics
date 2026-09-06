import { describe, it, expect } from "vitest";
import { DgCatalogSegregationService } from "./dg-catalog-segregation.service.js";

describe("DgCatalogSegregationService (IMO IMDG Table 7.2.4)", () => {
  it("should look up catalog substances with all regulatory parameters", () => {
    const gasoline = DgCatalogSegregationService.getSubstance("UN 1203");
    expect(gasoline.properShippingName).toBe("GASOLINE");
    expect(gasoline.primaryClass).toBe("3");
    expect(gasoline.flashPointCelsius).toBe(-45);
    expect(gasoline.isMarinePollutant).toBe(true);
    expect(gasoline.emsFire).toBe("F-E");
  });

  it("should detect prohibited segregation between Class 3 and Class 8 (Gasoline vs Acid)", () => {
    const evalResult = DgCatalogSegregationService.evaluatePairSegregation(
      "3",
      "8",
    );
    expect(evalResult.code).toBe("X");
    expect(evalResult.severity).toBe("PROHIBITED");
  });

  it("should detect compatible classes (e.g. Class 3 and Class 9)", () => {
    const evalResult = DgCatalogSegregationService.evaluatePairSegregation(
      "3",
      "9",
    );
    expect(evalResult.code).toBe("0");
    expect(evalResult.severity).toBe("COMPATIBLE");
  });

  it("should audit container co-load and detect violation", () => {
    const audit = DgCatalogSegregationService.auditContainerSegregation({
      containerOrVehicleNumber: "MSKU-992014-1",
      items: [
        { id: "item_01", unNumber: "UN 1203", primaryClass: "3" },
        { id: "item_02", unNumber: "UN 1789", primaryClass: "8" },
        { id: "item_03", unNumber: "UN 3082", primaryClass: "9" },
      ],
    });

    expect(audit.totalItemsEvaluated).toBe(3);
    expect(audit.overallStatus).toBe("INCOMPATIBLE_VIOLATION");
    expect(audit.totalConflicts).toBeGreaterThanOrEqual(1);
    expect(audit.conflicts[0].segregationCode).toBe("X");
  });

  it("should approve compliant container without conflicts", () => {
    const audit = DgCatalogSegregationService.auditContainerSegregation({
      containerOrVehicleNumber: "TGHU-881920-5",
      items: [
        { id: "item_01", unNumber: "UN 1203", primaryClass: "3" },
        { id: "item_02", unNumber: "UN 1993", primaryClass: "3" },
        { id: "item_03", unNumber: "UN 3082", primaryClass: "9" },
      ],
    });

    expect(audit.overallStatus).toBe("COMPLIANT_SEGREGATED");
    expect(audit.totalConflicts).toBe(0);
  });
});
