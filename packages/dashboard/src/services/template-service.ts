/**
 * template-service.ts
 * Generates downloadable Excel templates for each report type.
 * Uses the xlsx library to write XLSX files in the browser.
 */

import type { ReportType } from "../types/dashboard";
import { TEMPLATE_FIELDS } from "../types/dashboard";

const EXAMPLE_ROWS: Record<ReportType, Record<string, string>[]> = {
  operational: [
    {
      shipment_ref: "SHP-2025-001",
      carrier: "Maersk",
      trade_lane: "ESBCN-GBFXT",
      etd: "15/01/2025",
      eta: "28/01/2025",
      ata: "28/01/2025",
      status: "DELIVERED",
      mode: "SEA",
      weight_kg: "12500",
      volume_cbm: "45.5",
    },
    {
      shipment_ref: "SHP-2025-002",
      carrier: "DHL Express",
      trade_lane: "ESBCN-DEHAM",
      etd: "20/01/2025",
      eta: "22/01/2025",
      ata: "23/01/2025",
      status: "DELIVERED",
      mode: "AIR",
      weight_kg: "850",
      volume_cbm: "3.2",
    },
    {
      shipment_ref: "SHP-2025-003",
      carrier: "MSC",
      trade_lane: "ESVLC-CNSHA",
      etd: "25/01/2025",
      eta: "20/02/2025",
      ata: "",
      status: "IN TRANSIT",
      mode: "SEA",
      weight_kg: "24000",
      volume_cbm: "90.0",
    },
  ],
  financial: [
    {
      shipment_ref: "SHP-2025-001",
      invoice_number: "INV-20250115",
      invoice_date: "15/01/2025",
      due_date: "15/02/2025",
      revenue: "3500.00",
      cost: "2100.00",
      profit: "1400.00",
      currency: "EUR",
      paid: "YES",
    },
    {
      shipment_ref: "SHP-2025-002",
      invoice_number: "INV-20250120",
      invoice_date: "20/01/2025",
      due_date: "20/02/2025",
      revenue: "1200.00",
      cost: "800.00",
      profit: "400.00",
      currency: "EUR",
      paid: "NO",
    },
    {
      shipment_ref: "SHP-2025-003",
      invoice_number: "INV-20250125",
      invoice_date: "25/01/2025",
      due_date: "25/02/2025",
      revenue: "8500.00",
      cost: "5200.00",
      profit: "3300.00",
      currency: "USD",
      paid: "NO",
    },
  ],
  exception: [
    {
      shipment_ref: "SHP-2025-002",
      exception_type: "DELAY",
      detected_date: "23/01/2025",
      description: "Arrived 1 day late due to bad weather",
      severity: "LOW",
      resolved: "YES",
    },
    {
      shipment_ref: "SHP-2025-003",
      exception_type: "CUSTOMS_HOLD",
      detected_date: "22/02/2025",
      description: "Held at Shanghai customs for document review",
      severity: "HIGH",
      resolved: "NO",
    },
  ],
};

const TAB_COLORS: Record<ReportType, string> = {
  operational: "4472C4",
  financial: "70AD47",
  exception: "FF0000",
};

export async function downloadTemplate(type: ReportType): Promise<void> {
  const { default: ExcelJS } = await import("exceljs");

  const fields = TEMPLATE_FIELDS[type];
  const examples = EXAMPLE_ROWS[type];

  // Build header row + example rows
  const headers = fields.map((f) => f.label);
  const keys = fields.map((f) => f.key);
  const dataRows = examples.map((ex) => keys.map((k) => ex[k] ?? ""));

  const wb = new ExcelJS.Workbook();
  const sheetName = type.charAt(0).toUpperCase() + type.slice(1);
  const ws = wb.addWorksheet(sheetName, {
    properties: { tabColor: { argb: "FF" + TAB_COLORS[type] } },
  });

  // Column widths
  ws.columns = fields.map((f) => ({
    width: Math.max(f.label.length + 2, f.example.length + 2),
  }));

  // Header row with styling
  const headerRow = ws.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF" + TAB_COLORS[type] },
    };
    cell.alignment = { horizontal: "center" };
  });

  // Data rows
  dataRows.forEach((row) => ws.addRow(row));

  // Write and trigger download
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `shipment-dashboard-template-${type}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
