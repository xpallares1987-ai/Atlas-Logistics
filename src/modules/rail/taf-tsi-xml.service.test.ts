import { describe, it, expect } from "vitest";
import { TafTsiXmlService } from "./taf-tsi-xml.service.js";

describe("TafTsiXmlService (ERA TAF-TSI Train Composition XML)", () => {
  it("should generate valid TAF-TSI XML structure with locomotive and wagon allocations", () => {
    const train = {
      trainRunNumber: "TR-89201",
      locomotiveSeries: "Stadler Eurodual 6000",
      locomotiveLengthMeters: 23.0,
      locomotiveWeightTonnes: 123.0,
      locomotiveBrakedWeightTonnes: 110.0,
      totalTrainLengthMeters: 554.7,
      totalGrossMassTonnes: 1180.0,
      totalBrakedMassTonnes: 890.0,
      calculatedBrakePercentage: 75.42,
      requiredBrakePercentage: 65.0,
      isLengthCompliant: true,
      isBrakeCompliant: true,
      tractionOperator: "Captrain España SA",
    };

    const allocations = [
      {
        positionInTrain: 1,
        wagonNumber: "33 80 4956 101-2",
        wagonSeries: "Sggmrss 90'",
        grossWagonMassTonnes: 55.0,
        calculatedAxleLoadTonnes: 9.17,
        utiType: "CONTAINER_40",
        utiIdentification: "MSCU9928192",
        payloadMassTonnes: 26.5,
        sealNumber: "ES-VAL-991823",
      },
    ];

    const xml = TafTsiXmlService.generateTrainCompositionMessage(
      train,
      allocations,
    );

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<TAFTSI_TrainCompositionMessage");
    expect(xml).toContain("<TrainRunNumber>TR-89201</TrainRunNumber>");
    expect(xml).toContain("<Series>Stadler Eurodual 6000</Series>");
    expect(xml).toContain("<TotalLengthMeters>554.7</TotalLengthMeters>");
    expect(xml).toContain(
      "<CalculatedBrakePercentage>75.42%</CalculatedBrakePercentage>",
    );
    expect(xml).toContain(
      "<WagonNumberReference>33 80 4956 101-2</WagonNumberReference>",
    );
    expect(xml).toContain("<UTIIdentifier>MSCU9928192</UTIIdentifier>");
  });
});
