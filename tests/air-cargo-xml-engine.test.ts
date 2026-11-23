/**
 * @file air-cargo-xml-engine.test.ts
 * @description Unit tests for IATA Cargo-XML calculation engine, Modulo-7 check-digit validation, and FWB/FHL/FSU builders.
 */

import { describe, it, expect } from "vitest";
import {
  calculateAwbCheckDigit,
  validateIataAwbNumber,
  synthesizeFwbXml,
  synthesizeFhlXml,
  synthesizeFsuXml,
  parseIataCargoXml,
  type IataFwbPayload,
  type IataFhlPayload,
  type IataFsuPayload,
} from "../src/scm/engines/air-cargo-xml.engine.js";

describe("IATA Modulo-7 Check-Digit Algorithm (Resolution 600b)", () => {
  it("calculates correct check digit for 7-digit serial numbers", () => {
    // 1234567 % 7 = 5
    expect(calculateAwbCheckDigit("1234567")).toBe(5);
    // 9876543 % 7 = 5
    expect(calculateAwbCheckDigit("9876543")).toBe(5);
    // 0000007 % 7 = 0
    expect(calculateAwbCheckDigit("0000007")).toBe(0);
    // 7000000 % 7 = 0
    expect(calculateAwbCheckDigit("7000000")).toBe(0);
    // 1000005 % 7 = 6
    expect(calculateAwbCheckDigit("1000005")).toBe(6);
  });

  it("throws error if serial number is not exactly 7 digits", () => {
    expect(() => calculateAwbCheckDigit("123456")).toThrow(
      /exactly 7 numeric digits/,
    );
    expect(() => calculateAwbCheckDigit("12345678")).toThrow(
      /exactly 7 numeric digits/,
    );
  });

  it("validates valid AWB numbers across multiple airline formats", () => {
    // Lufthansa: 020-12345675
    const lh = validateIataAwbNumber("020-12345675");
    expect(lh.isValid).toBe(true);
    expect(lh.prefix).toBe("020");
    expect(lh.serial).toBe("1234567");
    expect(lh.checkDigit).toBe(5);
    expect(lh.formatted).toBe("020-12345675");

    // KLM: 074 98765435 (space formatted)
    const klm = validateIataAwbNumber("074 98765435");
    expect(klm.isValid).toBe(true);
    expect(klm.prefix).toBe("074");
    expect(klm.serial).toBe("9876543");
    expect(klm.checkDigit).toBe(5);
    expect(klm.formatted).toBe("074-98765435");

    // Emirates: 17600000070 (unformatted raw 11 digits)
    const ek = validateIataAwbNumber("17600000070");
    expect(ek.isValid).toBe(true);
    expect(ek.prefix).toBe("176");
    expect(ek.checkDigit).toBe(0);
    expect(ek.formatted).toBe("176-00000070");
  });

  it("rejects invalid AWB numbers with mismatched check digits", () => {
    // 1234567 % 7 is 5, but check digit is 6
    const invalid = validateIataAwbNumber("020-12345676");
    expect(invalid.isValid).toBe(false);
    expect(invalid.computedCheckDigit).toBe(5);
    expect(invalid.checkDigit).toBe(6);
    expect(invalid.error).toMatch(/Modulo-7 check-digit mismatch/);
  });

  it("rejects malformed AWB strings", () => {
    expect(validateIataAwbNumber("").isValid).toBe(false);
    expect(validateIataAwbNumber("ABC-12345675").isValid).toBe(false);
    expect(validateIataAwbNumber("020-12345").isValid).toBe(false);
  });
});

describe("IATA Cargo-XML Synthesis & Parsing", () => {
  const sampleFwb: IataFwbPayload = {
    awbNumber: "020-12345675",
    originAirport: "FRA",
    destinationAirport: "JFK",
    piecesCount: 12,
    grossWeightKg: 850.5,
    chargeableWeightKg: 900.0,
    volumeCbm: 5.4,
    natureOfGoods: "ELECTRONIC COMPONENTS",
    chargeCode: "PP",
    currencyCode: "EUR",
    shipper: {
      name: "Siemens AG",
      streetAddress: "Werner-von-Siemens-Strasse 1",
      cityName: "Munich",
      countryCode: "DE",
      postalCode: "80333",
    },
    consignee: {
      name: "General Electric Co",
      streetAddress: "1 River Rd",
      cityName: "Schenectady",
      countryCode: "US",
      postalCode: "12345",
    },
    flights: [
      {
        carrierCode: "LH",
        flightNumber: "400",
        departureDate: "2026-12-01",
        originAirport: "FRA",
        destinationAirport: "JFK",
      },
    ],
  };

  it("synthesizes valid FWB (Electronic Air Waybill) XML", () => {
    const xml = synthesizeFwbXml(sampleFwb);
    expect(xml).toContain('MessageType="FWB"');
    expect(xml).toContain("<AwbNumber>020-12345675</AwbNumber>");
    expect(xml).toContain("<OriginAirport>FRA</OriginAirport>");
    expect(xml).toContain("<DestinationAirport>JFK</DestinationAirport>");
    expect(xml).toContain("<PiecesCount>12</PiecesCount>");
    expect(xml).toContain("<GrossWeightKg>850.50</GrossWeightKg>");
    expect(xml).toContain("<ChargeableWeightKg>900.00</ChargeableWeightKg>");
    expect(xml).toContain("<VolumeCbm>5.400</VolumeCbm>");
    expect(xml).toContain("<Name>Siemens AG</Name>");
    expect(xml).toContain("<CarrierCode>LH</CarrierCode>");
  });

  it("throws error when attempting to synthesize FWB with invalid AWB", () => {
    const invalidFwb = { ...sampleFwb, awbNumber: "020-12345679" };
    expect(() => synthesizeFwbXml(invalidFwb)).toThrow(/Cannot synthesize FWB/);
  });

  it("synthesizes valid FHL (Consolidation House Manifest) XML", () => {
    const sampleFhl: IataFhlPayload = {
      masterAwbNumber: "020-12345675",
      originAirport: "FRA",
      destinationAirport: "JFK",
      totalPiecesCount: 20,
      totalGrossWeightKg: 1200.0,
      houses: [
        {
          hawbNumber: "H-FRA-001",
          piecesCount: 8,
          grossWeightKg: 500.0,
          natureOfGoods: "ROBOTIC SENSORS",
          shipper: sampleFwb.shipper,
          consignee: sampleFwb.consignee,
        },
        {
          hawbNumber: "H-FRA-002",
          piecesCount: 12,
          grossWeightKg: 700.0,
          natureOfGoods: "AUTOMOTIVE SPARES",
          shipper: sampleFwb.shipper,
          consignee: sampleFwb.consignee,
        },
      ],
    };

    const xml = synthesizeFhlXml(sampleFhl);
    expect(xml).toContain('MessageType="FHL"');
    expect(xml).toContain("<MasterAwbNumber>020-12345675</MasterAwbNumber>");
    expect(xml).toContain("<HawbNumber>H-FRA-001</HawbNumber>");
    expect(xml).toContain("<HawbNumber>H-FRA-002</HawbNumber>");
    expect(xml).toContain("<TotalPiecesCount>20</TotalPiecesCount>");
  });

  it("synthesizes valid FSU (Status Update) XML for RCS, DEP, ARR, DLV milestones", () => {
    const sampleFsu: IataFsuPayload = {
      awbNumber: "020-12345675",
      originAirport: "FRA",
      destinationAirport: "JFK",
      milestoneCode: "DEP",
      eventTimestamp: "2026-12-01T14:30:00Z",
      piecesCount: 12,
      grossWeightKg: 850.5,
      flight: {
        carrierCode: "LH",
        flightNumber: "400",
        departureDate: "2026-12-01",
        originAirport: "FRA",
        destinationAirport: "JFK",
      },
    };

    const xml = synthesizeFsuXml(sampleFsu);
    expect(xml).toContain('MessageType="FSU"');
    expect(xml).toContain("<MilestoneCode>DEP</MilestoneCode>");
    expect(xml).toContain(
      "<EventTimestamp>2026-12-01T14:30:00Z</EventTimestamp>",
    );
    expect(xml).toContain("<CarrierCode>LH</CarrierCode>");
  });

  it("parses inbound IATA Cargo-XML correctly", () => {
    const xml = synthesizeFwbXml(sampleFwb);
    const parsed = parseIataCargoXml(xml);

    expect(parsed.messageType).toBe("FWB");
    expect(parsed.awbNumber).toBe("020-12345675");
    expect(parsed.originAirport).toBe("FRA");
    expect(parsed.destinationAirport).toBe("JFK");
    expect(parsed.piecesCount).toBe(12);
    expect(parsed.grossWeightKg).toBe(850.5);
  });
});
