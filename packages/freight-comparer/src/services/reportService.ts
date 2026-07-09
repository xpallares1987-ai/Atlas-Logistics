/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { FreightRate } from "../types";

/**
 * Generates an Executive PDF Report for Freight Rates.
 */
export async function generateExecutiveReport(
  rates: FreightRate[],
  insights: string,
) {
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleString();

  // Header
  doc.setFontSize(22);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text("FREIGHT SYNC", 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Executive Rate Audit Report | Generated: ${timestamp}`, 14, 28);
  doc.line(14, 32, 196, 32);

  // AI Insights Section
  doc.setFontSize(14);
  doc.setTextColor(30);
  doc.text("Strategic AI Insights", 14, 45);

  doc.setFontSize(10);
  doc.setTextColor(60);
  const splitInsights = doc.splitTextToSize(insights, 180);
  doc.text(splitInsights, 14, 52);

  const insightsHeight = splitInsights.length * 5;
  let currentY = 55 + insightsHeight;

  // Table Section
  doc.setFontSize(14);
  doc.setTextColor(30);
  doc.text("Freight Rate Details", 14, currentY);
  currentY += 7;

  autoTable(doc, {
    startY: currentY,
    head: [["Carrier", "Origin", "Destination", "Valid To", "Total (USD)"]],
    body: rates.map((r) => [
      r.carrier,
      r.pol,
      r.pod,
      r.validUntil || "N/A",
      `$${r.total.toFixed(2)}`,
    ]),
    theme: "striped",
    headStyles: { fillColor: [79, 70, 229] },
    margin: { top: 10 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Control Tower Industrialization Phase 4 - Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.getHeight() - 10,
    );
  }

  doc.save(`Freight_Executive_Report_${Date.now()}.pdf`);
}
