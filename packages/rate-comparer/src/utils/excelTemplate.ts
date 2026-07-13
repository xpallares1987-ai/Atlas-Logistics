// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

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

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("DATOS");

  wsData.forEach(row => worksheet.addRow(row));

  // Set column widths for better readability
  worksheet.columns = [
    { width: 12 },
    { width: 12 },
    { width: 17 },
    { width: 22 },
    { width: 22 },
    { width: 17 },
    { width: 24 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 17 },
    { width: 12 },
    { width: 17 },
    { width: 17 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), "FreightSync_Rate_Template.xlsx");
}
