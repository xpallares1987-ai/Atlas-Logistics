import { describe, it, expect } from "vitest";
import { parseDatosJsRows, parseSemicolonCSV, parseNum } from "./rateParser";

describe("Rate Parser Surcharge Calculations", () => {
  describe("parseNum", () => {
    it("should handle comma as decimal separator", () => {
      expect(parseNum("1.234,56")).toBe(1234.56);
      expect(parseNum("1234,56")).toBe(1234.56);
    });

    it("should handle currency symbols and spaces", () => {
      expect(parseNum("$ 1,200.50")).toBe(1200.5);
      expect(parseNum("€ 950.00")).toBe(950.0);
      expect(parseNum("[1.500,00]")).toBe(1500);
    });

    it("should return 0 for invalid inputs", () => {
      expect(parseNum(null)).toBe(0);
      expect(parseNum(undefined)).toBe(0);
      expect(parseNum("abc")).toBe(0);
    });
  });

  describe("parseDatosJsRows", () => {
    it("should correctly convert EUR to USD and categorize all surcharges", () => {
      const rawData = [
        {
          oceanFreight: 1000,
          oceanFreightDivisa: "EUR",
          mes: "June",
          pol: "Barcelona",
          pod: "New York",
          carrier: "MSC",
          conceptos: {
            "BAF surcharge": { val: 100, divisa: "EUR" },
            "THC Origin": { val: 50, divisa: "USD" },
            "LSS Low Sulfur": { val: 30, divisa: "EUR" },
            "DOC:VGM": 15,
            "Other stuff": 25,
            "GASTOS EN DESTINO": 200, // Should be ignored as it is a meta key
          },
        },
      ];

      const result = parseDatosJsRows(rawData);

      expect(result).toHaveLength(1);
      const rate = result[0];

      // oceanFreight (EUR 1000 * 1.08 = 1080 USD)
      // BAF (EUR 100 * 1.08 = 108 USD)
      // THC (USD 50 = 50 USD) -> also counts as gastosFob
      // LSS (EUR 30 * 1.08 = 32.4 USD)
      // DOC:VGM (USD 15 = 15 USD) -> also counts as gastosFob
      // Otros (USD 25 = 25 USD)
      // Total = 1080 + 108 + 50 + 32.4 + 15 + 25 = 1310.4

      expect(rate.oceanFreight).toBe(1000);
      expect(rate.total).toBeCloseTo(1310.4, 1);
      expect(rate.baf).toBeCloseTo(108, 1);
      expect(rate.thc).toBeCloseTo(50, 1);
      expect(rate.lss).toBeCloseTo(32.4, 1);
      expect(rate.gastosFob).toBeCloseTo(50 + 15, 1); // THC + DOC:VGM
      expect(rate.otrosRecargos).toBeCloseTo(25, 1);
    });

    it("should split dual POL/POD correctly", () => {
      const rawData = [
        {
          pol: "BARCELONA/VALENCIA",
          pod: "ALGER(ARGEL)&SKIKDA&ANNABA",
          oceanFreight: 500,
          carrier: "CMA CGM",
        },
      ];

      const result = parseDatosJsRows(rawData);
      // 2 POLs * 3 PODs = 6 records
      expect(result).toHaveLength(6);
      expect(result.map((r) => r.pol)).toContain("Barcelona");
      expect(result.map((r) => r.pol)).toContain("Valencia");
      expect(result.map((r) => r.pod)).toContain("Alger (Argel)");
      expect(result.map((r) => r.pod)).toContain("Skikda");
      expect(result.map((r) => r.pod)).toContain("Annaba");
    });
  });

  describe("parseSemicolonCSV", () => {
    it("should parse complex semicolon CSV with multiple surcharges", () => {
      const csv = `Month;Port of Loading;Port of Discharge;Carrier;Ocean freight;Ocean freight Currency;CON:BAF;CON:BAF Currency;DOC:FOB;DOC:FOB Currency;CON:LSS;CON:LSS Currency
June;Barcelona;New York;MSC;1000;EUR;100;EUR;50;USD;30;EUR`;

      const result = parseSemicolonCSV(csv);
      expect(result).toHaveLength(1);
      const rate = result[0];

      // Total = 1000*1.08 + 100*1.08 + 50 + 30*1.08 = 1080 + 108 + 50 + 32.4 = 1270.4
      expect(rate.total).toBeCloseTo(1270.4, 1);
      expect(rate.baf).toBeCloseTo(108, 1);
      expect(rate.lss).toBeCloseTo(32.4, 1);
      expect(rate.gastosFob).toBeCloseTo(50, 1);
    });
  });
});
