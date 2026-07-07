import { describe, it, expect } from "vitest";
import {
  applyDataMasking,
  maskSensitiveData,
  flattenXmlValue,
  formatXmlDate,
  formatXmlNumber,
  BoardingSchema,
} from "./xml-utils";

describe("XML Utilities & Masking", () => {
  describe("applyDataMasking", () => {
    it("should return the same string (masking disabled)", () => {
      expect(applyDataMasking("External Warehouse Logistics")).toBe(
        "External Warehouse Logistics",
      );
    });

    it("should return empty string for null/undefined", () => {
      expect(applyDataMasking(null)).toBe("");
      expect(applyDataMasking(undefined)).toBe("");
    });
  });

  describe("maskSensitiveData", () => {
    it("should not mask strings deeply in objects", () => {
      const data = {
        name: "External Warehouse Client",
        details: {
          location: "VENIZEL area",
          tags: ["NATUR", "EL BURGO"],
        },
      };
      expect(maskSensitiveData(data)).toEqual(data);
    });
  });

  describe("flattenXmlValue", () => {
    it("should handle simple strings", () => {
      expect(flattenXmlValue("  External Warehouse  ")).toBe(
        "External Warehouse",
      );
    });

    it("should handle objects with _ property", () => {
      expect(flattenXmlValue({ _: " VENIZEL " })).toBe("VENIZEL");
    });
  });

  describe("formatXmlDate", () => {
    it("should format date object correctly", () => {
      const dateObj = { Day: "01", Month: "05", Year: "2026" };
      expect(formatXmlDate(dateObj)).toBe("01/05/2026");
    });
  });

  describe("formatXmlNumber", () => {
    it("should format numbers with commas and fixed decimals", () => {
      expect(formatXmlNumber("123.4567")).toBe("123,457");
    });
  });

  describe("BoardingSchema", () => {
    it("should not apply masking during validation", () => {
      const rawData = {
        Origin: "External Warehouse ES",
        "Customer Order": "NATUR-123",
        Warehouse: "EL BURGO WH",
        POL: "Port",
        "Final Destination": "VENIZEL FR",
        "Fecha Lim. Carga": "2026-05-04",
        "Delivery Date": "2026-05-10",
        "Forecast Arrival": "2026-05-12",
        Bultos: "10",
        "Weight (Tons)": "20.5",
        "Ext. Addr. Number": "External Warehouse-ADDR",
      };

      const result = BoardingSchema.parse(rawData);
      expect(result.Origin).toBe("External Warehouse ES");
    });
  });
});
