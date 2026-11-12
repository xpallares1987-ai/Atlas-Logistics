/**
 * @file settingsHelpers.ts
 * @description Pure domain helper functions for Settings validation, DDL formatting, and TOTP checks.
 * @module @atlas/frontend/components/Settings/hooks/settingsHelpers
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import type {
  DatabaseSchemaMap,
  NewColumnInput,
  NewTableInput,
} from "../../../types/settings.types";

/**
 * Validates new SQLite table creation parameters.
 */
export function validateNewTableInput(input: NewTableInput): {
  valid: boolean;
  error?: string;
} {
  if (!input.name || !input.name.trim()) {
    return { valid: false, error: "Table name is required" };
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(input.name.trim())) {
    return {
      valid: false,
      error: "Table name must be a valid alphanumeric identifier",
    };
  }
  if (!input.column1Name || !input.column1Name.trim()) {
    return { valid: false, error: "First column name is required" };
  }
  return { valid: true };
}

/**
 * Validates adding a new column to an existing table.
 */
export function validateNewColumnInput(input: NewColumnInput): {
  valid: boolean;
  error?: string;
} {
  if (!input.table || !input.table.trim()) {
    return { valid: false, error: "Target table must be selected" };
  }
  if (!input.name || !input.name.trim()) {
    return { valid: false, error: "Column name is required" };
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(input.name.trim())) {
    return {
      valid: false,
      error: "Column name must be a valid alphanumeric identifier",
    };
  }
  return { valid: true };
}

/**
 * Validates TOTP token format (strictly 6 numeric digits).
 */
export function validateTotpInput(token: string): boolean {
  return /^\d{6}$/.test(token.trim());
}

/**
 * Summarizes current SQLite database schema metrics.
 */
export function formatSchemaSummary(schema: DatabaseSchemaMap | null): {
  totalTables: number;
  totalColumns: number;
} {
  if (!schema) return { totalTables: 0, totalColumns: 0 };
  const tables = Object.keys(schema);
  const totalColumns = tables.reduce(
    (acc, tableName) => acc + (schema[tableName]?.length || 0),
    0,
  );
  return {
    totalTables: tables.length,
    totalColumns,
  };
}
