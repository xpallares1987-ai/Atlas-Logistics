/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import ExcelJS from "exceljs";

export async function downloadRateTemplate() {
  const wsData = [
    [
      "Mode",
      "Month",
      "Carrier",
      "Port of Loading",
      "Port of Discharge",
      "Ocean freight",
      "Ocean freight Currency",
      "BAF",
      "THC",
      "LSS",
      "FOB",
      "Dest Charges",
      "Others",
      "Transit Time",
      "Valid Until",
    ],
    [
      "FCL",
      "06/2026",
      "MAERSK",
      "Shanghai",
      "Barcelona",
      1500,
      "USD",
      100,
      200,
      50,
      150,
      300,
      0,
      35,
      "2026-12-31",
    ],
    [
      "AIR",
      "06/2026",
      "DHL",
      "Hong Kong",
      "Madrid",
      4.5,
      "USD",
      0,
      0,
      0,
      0,
      0,
      0,
      3,
      "2026-12-31",
    ],
  ];

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("DATOS");

  // Set column widths for better readability
  ws.columns = [
    { width: 10 },
    { width: 10 },
    { width: 15 },
    { width: 20 },
    { width: 20 },
    { width: 15 },
    { width: 22 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 15 },
    { width: 10 },
    { width: 15 },
    { width: 15 },
  ];

  wsData.forEach((row) => ws.addRow(row));

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "FreightSync_Rate_Template.xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
