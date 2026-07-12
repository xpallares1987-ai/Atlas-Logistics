/**
 * csv-parser.ts
 * Parses CSV and Excel (.xlsx/.xls) files into raw row arrays.
 * Uses papaparse for CSV and xlsx for Excel.
 */

import Papa from "papaparse";
import type { ReportType } from "../types/dashboard";

export interface ParseResult {
  columns: string[];
  rows: Record<string, string>[];
  rowCount: number;
}

// ─── CSV parsing ──────────────────────────────────────────────────────────────

export function parseCsv(content: string): ParseResult {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (v) => v.trim(),
  });

  const rows = result.data;
  const columns = result.meta.fields ?? Object.keys(rows[0] ?? {});
  return { columns, rows, rowCount: rows.length };
}

// ─── Excel parsing ────────────────────────────────────────────────────────────

export async function parseExcel(buffer: ArrayBuffer): Promise<ParseResult> {
  const { read, utils } = await import("xlsx");
  const wb = read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw: unknown[][] = utils.sheet_to_json(ws, { header: 1, defval: "" });

  if (raw.length < 2) return { columns: [], rows: [], rowCount: 0 };

  const headers = (raw[0] as string[]).map((h) => String(h).trim());
  const rows: Record<string, string>[] = raw.slice(1).map((row) => {
    const r: Record<string, string> = {};
    headers.forEach((h, i) => {
      r[h] = String((row as unknown[])[i] ?? "").trim();
    });
    return r;
  });

  return { columns: headers, rows, rowCount: rows.length };
}

// ─── File dispatcher ─────────────────────────────────────────────────────────

export async function parseFile(file: File): Promise<ParseResult> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv" || ext === "txt") {
    const text = await file.text();
    return parseCsv(text);
  }

  if (ext === "xlsx" || ext === "xls" || ext === "ods") {
    const buffer = await file.arrayBuffer();
    return parseExcel(buffer);
  }

  throw new Error(`Unsupported file type: .${ext ?? "unknown"}`);
}

// ─── Auto-detect report type from column names ────────────────────────────────

const TYPE_SIGNALS: Record<ReportType, string[]> = {
  operational: [
    "etd",
    "eta",
    "ata",
    "carrier",
    "trade_lane",
    "mode",
    "weight",
    "volume",
  ],
  financial: [
    "invoice",
    "revenue",
    "cost",
    "profit",
    "paid",
    "due_date",
    "currency",
  ],
  exception: ["exception", "severity", "resolved", "exception_type"],
};

export function autoDetectReportType(columns: string[]): ReportType | null {
  const normalized = columns.map((c) =>
    c.toLowerCase().replace(/[\s\-]/g, "_"),
  );
  const scores: Record<ReportType, number> = {
    operational: 0,
    financial: 0,
    exception: 0,
  };

  for (const [type, signals] of Object.entries(TYPE_SIGNALS) as [
    ReportType,
    string[],
  ][]) {
    for (const signal of signals) {
      if (normalized.some((c) => c.includes(signal))) scores[type]++;
    }
  }

  const best = (Object.entries(scores) as [ReportType, number][]).sort(
    (a, b) => b[1] - a[1],
  )[0];
  return best[1] > 0 ? best[0] : null;
}
