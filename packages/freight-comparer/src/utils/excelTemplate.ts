/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';

export function downloadRateTemplate() {
  const wsData = [
    [
      "Mode", "Month", "Carrier", "Port of Loading", "Port of Discharge",
      "Ocean freight", "Ocean freight Currency", "BAF", "THC", "LSS",
      "FOB", "Dest Charges", "Others", "Transit Time", "Valid Until"
    ],
    [
      "FCL", "06/2026", "MAERSK", "Shanghai", "Barcelona",
      1500, "USD", 100, 200, 50,
      150, 300, 0, 35, "2026-12-31"
    ],
    [
      "AIR", "06/2026", "DHL", "Hong Kong", "Madrid",
      4.50, "USD", 0, 0, 0,
      0, 0, 0, 3, "2026-12-31"
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths for better readability
  ws['!cols'] = [
    { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 20 }, { wch: 20 },
    { wch: 15 }, { wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DATOS");

  XLSX.writeFile(wb, "FreightSync_Rate_Template.xlsx");
}
