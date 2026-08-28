import { describe, it, expect } from "vitest";
import { CbamXmlService } from "./cbam-xml.service.js";

describe("CbamXmlService (EU CBAM Transitional Registry XML)", () => {
  it("should generate valid XML structure with header, declarant and imported goods", () => {
    const declaration = {
      declarationNumber: "CBAM-2026-Q3-001",
      reportingPeriod: "2026-Q3",
      declarantVat: "ESA88992211",
      declarantName: "Atlas Logistics Forwarding SL",
      importerVat: "ESA11223344",
      importerName: "Iberian Industrial Metals SL",
      totalNetMassTonnes: 1000.0,
      totalDirectEmissionsTco2e: 1850.0,
      totalIndirectEmissionsTco2e: 420.0,
      totalEmbeddedEmissionsTco2e: 2270.0,
      euEtsBenchmarkPriceEur: 85.5,
      grossCarbonLiabilityEur: 194085.0,
      carbonPricePaidForeignEur: 0.0,
      netCarbonLiabilityEur: 194085.0,
    };

    const lines = [
      {
        duaBox33HsCode: "72083800",
        goodDescription: "Hot-rolled Steel Coils",
        originCountry: "TR",
        netWeightTonnes: 1000.0,
        duaNumber: "26ES00461110084920",
        directEmissionsTco2e: 1850.0,
        indirectEmissionsTco2e: 420.0,
        precursorEmissionsTco2e: 0.0,
        totalLineEmissionsTco2e: 2270.0,
        useDefaultFactors: false,
        foreignCarbonPricePerTco2e: 0.0,
        effectiveForeignPricePaidEur: 0.0,
      },
    ];

    const xml = CbamXmlService.generateTransitionalRegistryXml(
      declaration,
      lines,
    );

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<CBAMQuarterlyReport");
    expect(xml).toContain("<DeclarationId>CBAM-2026-Q3-001</DeclarationId>");
    expect(xml).toContain("<ReportingPeriod>2026-Q3</ReportingPeriod>");
    expect(xml).toContain("<EORINumber>ESA88992211</EORINumber>");
    expect(xml).toContain("<CommodityCode>72083800</CommodityCode>");
    expect(xml).toContain("<CountryOfOrigin>TR</CountryOfOrigin>");
    expect(xml).toContain(
      "<TotalEmbeddedEmissionsTco2e>2270.00</TotalEmbeddedEmissionsTco2e>",
    );
    expect(xml).toContain("</CBAMQuarterlyReport>");
  });
});
