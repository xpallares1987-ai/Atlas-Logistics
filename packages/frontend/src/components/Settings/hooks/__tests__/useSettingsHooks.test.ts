/**
 * @file useSettingsHooks.test.ts
 * @description Unit tests for Settings domain helper logic and DDL schema validators.
 * @module @atlas/frontend/components/Settings/hooks/__tests__/useSettingsHooks
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import { describe, it, expect } from "vitest";
import {
  validateNewTableInput,
  validateNewColumnInput,
  validateTotpInput,
  formatSchemaSummary,
} from "../settingsHelpers";

describe("Settings Domain Helpers & Validation", () => {
  describe("validateNewTableInput", () => {
    it("accepts valid alphanumeric table and column names", () => {
      const result = validateNewTableInput({
        name: "customs_inspection_log",
        column1Name: "declaration_id",
        column1Type: "TEXT",
      });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("rejects empty table name", () => {
      const result = validateNewTableInput({
        name: "",
        column1Name: "id",
        column1Type: "TEXT",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Table name is required");
    });

    it("rejects invalid table names with special characters or leading digits", () => {
      const result = validateNewTableInput({
        name: "123_invalid-table",
        column1Name: "id",
        column1Type: "TEXT",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("valid alphanumeric identifier");
    });

    it("rejects missing first column name", () => {
      const result = validateNewTableInput({
        name: "valid_table",
        column1Name: "",
        column1Type: "TEXT",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("First column name is required");
    });
  });

  describe("validateNewColumnInput", () => {
    it("accepts valid column parameters", () => {
      const result = validateNewColumnInput({
        table: "shipments",
        name: "co2_emissions_kg",
        type: "REAL",
      });
      expect(result.valid).toBe(true);
    });

    it("rejects unselected target table", () => {
      const result = validateNewColumnInput({
        table: "",
        name: "notes",
        type: "TEXT",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Target table must be selected");
    });

    it("rejects invalid column identifier format", () => {
      const result = validateNewColumnInput({
        table: "shipments",
        name: "column-with-hyphens!",
        type: "TEXT",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("valid alphanumeric identifier");
    });
  });

  describe("validateTotpInput", () => {
    it("accepts strictly 6-digit numeric codes", () => {
      expect(validateTotpInput("123456")).toBe(true);
      expect(validateTotpInput("  098765  ")).toBe(true);
    });

    it("rejects invalid lengths or non-numeric characters", () => {
      expect(validateTotpInput("12345")).toBe(false);
      expect(validateTotpInput("1234567")).toBe(false);
      expect(validateTotpInput("12a456")).toBe(false);
      expect(validateTotpInput("")).toBe(false);
    });
  });

  describe("formatSchemaSummary", () => {
    it("calculates total tables and columns correctly", () => {
      const schema = {
        orders: [
          { name: "id", type: "TEXT", pk: true },
          { name: "customer_id", type: "TEXT" },
        ],
        shipments: [
          { name: "id", type: "TEXT", pk: true },
          { name: "carrier_id", type: "TEXT" },
          { name: "status", type: "TEXT" },
        ],
      };

      const summary = formatSchemaSummary(schema);
      expect(summary.totalTables).toBe(2);
      expect(summary.totalColumns).toBe(5);
    });

    it("handles null schema gracefully", () => {
      const summary = formatSchemaSummary(null);
      expect(summary.totalTables).toBe(0);
      expect(summary.totalColumns).toBe(0);
    });
  });
});
