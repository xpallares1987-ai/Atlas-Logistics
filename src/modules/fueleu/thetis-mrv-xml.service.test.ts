import { describe, it, expect } from "vitest";
import { ThetisMrvXmlService } from "./thetis-mrv-xml.service.js";

describe("ThetisMrvXmlService (EMSA THETIS-MRV / FuelEU XML)", () => {
  it("should generate a valid XML document with correct headers and emission metrics", () => {
    const xml = ThetisMrvXmlService.generateThetisVoyageXml({
      voyageReferenceNumber: "VOY-2026-MED-0101",
      vesselImoNumber: "9811012",
      vesselName: "Atlas Mediterranean",
      flagState: "ES",
      grossTonnageGt: 148500,
      departurePortLocode: "ESVLC",
      departurePortName: "Puerto de Valencia",
      arrivalPortLocode: "ITGOA",
      arrivalPortName: "Porto di Genova",
      geographicScope: "INTRA_EU_100",
      distanceNauticalMiles: 480.0,
      departureDate: "2026-08-01T08:00:00Z",
      arrivalDate: "2026-08-03T12:00:00Z",
      navigationHours: 52.0,
      berthHours: 24.0,
      fuelCode: "FOSSIL_VLSFO",
      fuelName: "Very Low Sulphur Fuel Oil",
      fuelConsumedTonnes: 85.0,
      opsElectricityConsumedKwh: 12500.0,
      totalEnergyConsumedMj: 3530000.0,
      calculatedGhgIntensityGco2eqPerMj: 90.35,
      co2EmissionsTonnes: 264.77,
      ch4EmissionsTonnes: 0.005,
      n2oEmissionsTonnes: 0.012,
      totalGhgEmissionsScopeTco2eq: 268.09,
      etsApplicableScopeEmissionsTco2eq: 268.09,
      carriedTeuCount: 4200,
      leadAuditorVerifier: "Jean-Paul Sartre (DNV Lead Auditor)",
    });

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<ThetisMaritimeReport");
    expect(xml).toContain("<ImoNumber>9811012</ImoNumber>");
    expect(xml).toContain("<VesselName>Atlas Mediterranean</VesselName>");
    expect(xml).toContain("<PortLocode>ESVLC</PortLocode>");
    expect(xml).toContain("<PortLocode>ITGOA</PortLocode>");
    expect(xml).toContain(
      "<AttainedGhgIntensityGco2eqPerMJ>90.3500</AttainedGhgIntensityGco2eqPerMJ>",
    );
    expect(xml).toContain(
      "<TotalGhgEmissionsScopeTco2eq>268.090</TotalGhgEmissionsScopeTco2eq>",
    );
  });
});
