import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { FreightRate, TranslationSet } from "../types";
import { formatCurrency } from "./currencyService";

/**
 * Service to generate professional executive PDF reports for freight comparisons.
 */
export async function generateExecutiveReport(
  rates: FreightRate[], 
  t: TranslationSet,
  searchParams: { origin?: string; destination?: string }
) {
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleString();

  // Header
  doc.setFontSize(22);
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.text("Executive Freight Analysis Report", 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(`Generated: ${timestamp}`, 14, 28);
  doc.text(`Origin: ${searchParams.origin || 'All'} | Destination: ${searchParams.destination || 'All'}`, 14, 33);

  // Summary Metrics
  const avgRate = rates.reduce((acc, r) => acc + (r.total || 0), 0) / (rates.length || 1);
  const minRate = Math.min(...rates.map(r => r.total || 0));
  const maxRate = Math.max(...rates.map(r => r.total || 0));

  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text("Summary Metrics", 14, 45);

  autoTable(doc, {
    startY: 50,
    head: [['Metric', 'Value']],
    body: [
      ['Total Carriers Compared', rates.length.toString()],
      ['Average Total Cost', formatCurrency(avgRate, 'USD')],
      ['Minimum Cost (Market Best)', formatCurrency(minRate, 'USD')],
      ['Maximum Cost (Market Peak)', formatCurrency(maxRate, 'USD')],
    ],
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235] },
  });

  // Comparison Table
  const lastY = (doc as any).lastAutoTable?.finalY || 50;
  doc.text("Carrier Comparison Details", 14, lastY + 15);

  const tableData = rates.map(r => [
    r.carrier,
    formatCurrency(r.oceanFreight, 'USD'),
    formatCurrency(r.gastosFob, 'USD'),
    formatCurrency(r.gastosDestino, 'USD'),
    formatCurrency(r.total || 0, 'USD'),
    r.transitTime ? `${r.transitTime} days` : 'N/A'
  ]);

  autoTable(doc, {
    startY: lastY + 20,
    head: [['Carrier', 'Ocean Freight', 'FOB Charges', 'Dest. Charges', 'Total Cost', 'Transit Time']],
    body: tableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Control Tower - Confidential Industrial Report | Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`Freight_Report_${Date.now()}.pdf`);
}

/**
 * Generates an itemized customer-facing quotation for a specific rate.
 */
export async function generateCustomerQuote(rate: FreightRate, customerName: string = "Valued Customer") {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString();

  // Branding Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text("FREIGHT QUOTATION", 14, 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${date}`, 160, 20);
  doc.text(`Ref: QTE-${Math.floor(Math.random() * 100000)}`, 160, 26);

  // Customer & Route details
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Prepared For: ${customerName}`, 14, 55);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Route: ${rate.pol} to ${rate.pod}`, 14, 65);
  doc.text(`Carrier: ${rate.carrier}`, 14, 71);
  doc.text(`Transit Time: ${rate.transitTime ? `${rate.transitTime} Days` : 'Subject to confirmation'}`, 14, 77);
  doc.text(`Validity: ${rate.validUntil || 'Subject to confirmation'}`, 14, 83);

  // Itemized Costs Table
  const tableData = [
    ['Ocean Freight', formatCurrency(rate.oceanFreight, 'USD')],
    ['Origin / FOB Charges', formatCurrency(rate.gastosFob, 'USD')],
    ['Destination Charges', formatCurrency(rate.gastosDestino, 'USD')],
  ];

  if (rate.baf && rate.baf > 0) tableData.push(['BAF (Bunker Adjustment)', formatCurrency(rate.baf, 'USD')]);
  if (rate.thc && rate.thc > 0) tableData.push(['THC (Terminal Handling)', formatCurrency(rate.thc, 'USD')]);
  if (rate.lss && rate.lss > 0) tableData.push(['LSS (Low Sulfur)', formatCurrency(rate.lss, 'USD')]);
  if (rate.otrosRecargos && rate.otrosRecargos > 0) tableData.push(['Other Surcharges', formatCurrency(rate.otrosRecargos, 'USD')]);

  autoTable(doc, {
    startY: 95,
    head: [['Description', 'Amount']],
    body: tableData,
    foot: [['TOTAL EXCL. TAX', formatCurrency(rate.total, 'USD')]],
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] }, // indigo-600
    footStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 'auto', halign: 'right' }
    }
  });

  // Terms and Conditions
  const lastY = (doc as any).lastAutoTable?.finalY || 150;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("Terms and Conditions:", 14, lastY + 20);
  const terms = [
    "1. Quotation subject to space and equipment availability.",
    "2. Rates are exclusive of VAT and duties unless stated.",
    "3. Demurrage and detention as per carrier's standard tariff."
  ];
  doc.text(terms, 14, lastY + 26);

  doc.save(`Quote_${rate.carrier}_${rate.pol}_${rate.pod}.pdf`);
}
