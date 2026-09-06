import { describe, it, expect } from "vitest";
import { AirCargoComplianceService } from "./compliance.service.js";

describe("AirCargoComplianceService - IATA DGR & Strategic Cargo Screening", () => {
  it("should flag standalone Lithium Ion batteries as CAO and DGR", async () => {
    const result = await AirCargoComplianceService.screenCompliance({
      natureOfGoods: "Lithium ion battery cells for energy storage",
      unNumber: "UN3480",
      grossWeightKg: 80,
    });

    expect(result.isDgr).toBe(true);
    expect(result.dgrClass).toBe("Class 9");
    expect(result.aircraftRestriction).toBe("CARGO_AIRCRAFT_ONLY");
    expect(result.specialHandlingCodes).toContain("ELI");
    expect(result.specialHandlingCodes).toContain("CAO");
    expect(result.requiredDocuments).toContain(
      "DGD (Shipper's Declaration for Dangerous Goods)",
    );
    expect(result.handlingInstructions).toContain("CARGO AIRCRAFT ONLY.");
  });

  it("should permit Lithium Ion batteries contained in equipment under Section II without DGD", async () => {
    const result = await AirCargoComplianceService.screenCompliance({
      natureOfGoods: "Laptops containing lithium ion batteries",
      unNumber: "UN3481",
      grossWeightKg: 45,
      batteryConfig: "CONTAINED_IN_EQUIPMENT",
    });

    expect(result.aircraftRestriction).toBe("PASSENGER_AND_CARGO");
    expect(result.specialHandlingCodes).toContain("ELI");
    expect(result.specialHandlingCodes).not.toContain("CAO");
  });

  it("should auto-assign cold chain SHC codes (COL, PER) for pharmaceuticals", async () => {
    const result = await AirCargoComplianceService.screenCompliance({
      natureOfGoods: "Clinical trial vaccines in temp-controlled packaging",
      isTempControlled: true,
      tempRange: "+2C to +8C",
    });

    expect(result.specialHandlingCodes).toContain("COL");
    expect(result.specialHandlingCodes).toContain("PER");
    expect(result.requiredDocuments).toContain(
      "Time & Temperature Sensitive Label",
    );
    expect(result.handlingInstructions).toContain(
      "KEEP REFRIGERATED +2C TO +8C.",
    );
  });

  it("should flag dry ice (UN 1845) with ICE code", async () => {
    const result = await AirCargoComplianceService.screenCompliance({
      natureOfGoods: "Biological samples packed with dry ice",
      unNumber: "UN1845",
      hasDryIce: true,
      dryIceNetWeightKg: 10,
    });

    expect(result.isDgr).toBe(true);
    expect(result.specialHandlingCodes).toContain("ICE");
    expect(result.handlingInstructions).toContain(
      "CONTAINS DRY ICE UN 1845 (10 KG).",
    );
  });
});
