import { describe, it, expect } from "vitest";
import { DgTransportDocumentService } from "./dg-transport-document.service.js";

describe("DgTransportDocumentService (IMO IMDG & ADR Transport Descriptions)", () => {
  it("should format a full standard dangerous goods description string", () => {
    const desc = DgTransportDocumentService.formatUnDescription({
      unNumber: "UN 1203",
      properShippingName: "GASOLINE",
      primaryHazardClass: "3",
      packingGroup: "PG_II",
      flashPointCelsius: -45,
      isMarinePollutant: true,
      packageCount: 4,
      packageTypeDescription: "Tambores de acero (1A1)",
      totalNetQuantity: 800,
      unitOfMeasure: "LITERS",
      totalGrossMassKg: 920,
    });

    expect(desc).toBe(
      "UN 1203, GASOLINE, 3, PG II, (-45 °C c.c.), MARINE POLLUTANT",
    );
  });

  it("should append technical chemical name for N.O.S. substances", () => {
    const desc = DgTransportDocumentService.formatUnDescription({
      unNumber: "UN 1993",
      properShippingName: "FLAMMABLE LIQUID, N.O.S.",
      technicalChemicalName: "Etanol e Isopropanol",
      primaryHazardClass: "3",
      subsidiaryHazardClasses: "6.1",
      packingGroup: "PG_III",
      flashPointCelsius: 24,
      isMarinePollutant: false,
      packageCount: 10,
      packageTypeDescription: "Cajas 4G",
      totalNetQuantity: 250,
      unitOfMeasure: "LITERS",
      totalGrossMassKg: 280,
    });

    expect(desc).toBe(
      "UN 1993, FLAMMABLE LIQUID, N.O.S. (ETANOL E ISOPROPANOL), 3 (6.1), PG III, (24 °C c.c.)",
    );
  });

  it("should compile shipment summary and certification statement", () => {
    const summary = DgTransportDocumentService.compileShipmentSummary([
      {
        unNumber: "UN 1203",
        properShippingName: "GASOLINE",
        primaryHazardClass: "3",
        packingGroup: "PG_II",
        flashPointCelsius: -45,
        isMarinePollutant: true,
        packageCount: 4,
        packageTypeDescription: "Tambores (1A1)",
        totalNetQuantity: 800,
        unitOfMeasure: "LITERS",
        totalGrossMassKg: 920,
      },
      {
        unNumber: "UN 3082",
        properShippingName:
          "ENVIRONMENTALLY HAZARDOUS SUBSTANCE, LIQUID, N.O.S.",
        technicalChemicalName: "Biocida",
        primaryHazardClass: "9",
        packingGroup: "PG_III",
        isMarinePollutant: true,
        packageCount: 2,
        packageTypeDescription: "IBCs (31HA1)",
        totalNetQuantity: 2000,
        unitOfMeasure: "LITERS",
        totalGrossMassKg: 2200,
      },
    ]);

    expect(summary.totalPackages).toBe(6);
    expect(summary.totalGrossMassKg).toBe(3120);
    expect(summary.totalNetQuantityKgOrL).toBe(2800);
    expect(summary.formattedDescriptions.length).toBe(2);
    expect(summary.certificationStatement).toContain(
      "IMO IMDG Code, IATA DGR, UNECE ADR",
    );
  });
});
