import PDFDocument from "pdfkit";

export class TradeFinancePdfGenerator {
  /**
   * Generates Official Trade Credit Presentation Dossier & Cover Letter PDF (UCP 600 / URC 522).
   */
  public static async generateTradeCreditPresentationDossierPdf(data: {
    instrument: any;
    documents: any[];
    discrepancies?: any[];
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];

        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        const { instrument, documents, discrepancies = [] } = data;

        // Header Banner
        doc.rect(36, 36, 523, 50).fill("#1e3a8a");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(14);
        doc.text("DOCUMENTARY CREDIT PRESENTATION DOSSIER", 48, 48);
        doc.font("Helvetica").fontSize(8).fillColor("#93c5fd");
        doc.text(
          "REMISIÓN DE DOCUMENTOS BANCARIOS BAJO UCP 600 / URC 522 DE LA CCI",
          48,
          66,
        );
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff");
        doc.text(`REF: ${instrument.instrumentReference}`, 380, 48, {
          align: "right",
          width: 165,
        });
        doc.font("Helvetica").fontSize(7.5).fillColor("#bfdbfe");
        doc.text(`Date: ${new Date().toISOString().split("T")[0]}`, 380, 64, {
          align: "right",
          width: 165,
        });

        let curY = 96;

        // Section 1: Financial & Banking Parties
        doc.rect(36, curY, 523, 75).strokeColor("#cbd5e1").stroke();
        doc.rect(36, curY, 523, 16).fill("#f1f5f9");
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8);
        doc.text("1. PARTES BANCARIAS & CONDICIONES DEL CRÉDITO", 44, curY + 4);

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(
          `Applicant (Ordenante): ${instrument.applicantName}`,
          44,
          curY + 22,
        );
        doc.text(
          `Beneficiary (Beneficiario): ${instrument.beneficiaryName}`,
          44,
          curY + 34,
        );
        doc.text(
          `Issuing Bank: ${instrument.issuingBankName} (${instrument.issuingBankBic})`,
          44,
          curY + 46,
        );
        doc.text(
          `Confirming Bank: ${instrument.confirmingBankName || "N/A"} (${instrument.confirmingBankBic || "N/A"})`,
          44,
          curY + 58,
        );

        doc.text(
          `Credit Amount: ${instrument.creditAmount.toLocaleString("es-ES", { minimumFractionDigits: 2 })} ${instrument.currency}`,
          310,
          curY + 22,
        );
        doc.text(
          `Tolerance: +/- ${instrument.tolerancePercentage}% (UCP 600 Art. 30)`,
          310,
          curY + 34,
        );
        doc.text(
          `Expiry Date: ${instrument.expiryDate} at ${instrument.expiryPlace}`,
          310,
          curY + 46,
        );
        doc.text(
          `Payment Terms: ${instrument.paymentTerms} (${instrument.tenorDays > 0 ? `${instrument.tenorDays} days` : "At Sight"})`,
          310,
          curY + 58,
        );

        curY += 85;

        // Section 2: Transport & Routing Details
        doc.rect(36, curY, 523, 45).strokeColor("#cbd5e1").stroke();
        doc.rect(36, curY, 523, 16).fill("#f1f5f9");
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8);
        doc.text("2. DATOS DE TRANSPORTE & EXPEDICIÓN", 44, curY + 4);

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(`Port of Loading: ${instrument.portOfLoading}`, 44, curY + 22);
        doc.text(
          `Port of Discharge: ${instrument.portOfDischarge}`,
          44,
          curY + 32,
        );
        doc.text(
          `Latest Shipment Date: ${instrument.latestShipmentDate}`,
          310,
          curY + 22,
        );
        doc.text(
          `Presentation Period: Max ${instrument.presentationPeriodDays} days after B/L date`,
          310,
          curY + 32,
        );

        curY += 55;

        // Section 3: Document Presentation Inventory Table
        doc.rect(36, curY, 523, 16).fill("#1e293b");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5);
        doc.text("Documento Presentado", 44, curY + 4);
        doc.text("Referencia", 180, curY + 4);
        doc.text("Fecha", 280, curY + 4);
        doc.text("Emisor", 350, curY + 4);
        doc.text("Originales", 450, curY + 4);
        doc.text("Estado", 500, curY + 4);

        curY += 16;

        for (const docItem of documents) {
          doc.rect(36, curY, 523, 18).strokeColor("#e2e8f0").stroke();
          doc.font("Helvetica").fontSize(7).fillColor("#0f172a");
          doc.text(docItem.documentType.replace(/_/g, " "), 44, curY + 4, {
            width: 130,
          });
          doc.text(docItem.documentReferenceNumber || "-", 180, curY + 4, {
            width: 95,
          });
          doc.text(docItem.documentDate || "-", 280, curY + 4);
          doc.text(docItem.issuerName || "-", 350, curY + 4, { width: 95 });
          doc.text(
            `${docItem.originalCopiesPresented || 1} / ${docItem.originalCopiesRequired || 1}`,
            450,
            curY + 4,
          );
          doc
            .font("Helvetica-Bold")
            .fillColor(
              docItem.complianceStatus === "COMPLIANT" ? "#15803d" : "#b91c1c",
            );
          doc.text(docItem.complianceStatus, 500, curY + 4);
          curY += 18;
        }

        curY += 10;

        // Section 4: Remittance & Settlement Instructions
        doc.rect(36, curY, 523, 50).strokeColor("#cbd5e1").stroke();
        doc.rect(36, curY, 523, 16).fill("#f8fafc");
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8);
        doc.text("4. INSTRUCCIONES DE PAGO & REMISIÓN BANCARIA", 44, curY + 4);

        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          `Rogamos proceder a la liquidación del crédito mediante abono en la cuenta IBAN del Beneficiario conforme a las condiciones de pago del crédito ${instrument.instrumentReference}. En caso de discrepancias, solicitamos remitir aviso inmediato conforme al Art. 16 de la UCP 600.`,
          44,
          curY + 22,
          { width: 505 },
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates Official UCP 600 / ISBP 745 Discrepancy & Compliance Audit Report PDF.
   */
  public static async generateUcpDiscrepancyAuditReportPdf(data: {
    instrument: any;
    discrepancies: any[];
    auditSummary?: any;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];

        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        const { instrument, discrepancies = [] } = data;

        // Header Banner
        doc.rect(36, 36, 523, 50).fill("#991b1b");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(14);
        doc.text("UCP 600 DISCREPANCY AUDIT & REFUSAL NOTICE", 48, 48);
        doc.font("Helvetica").fontSize(8).fillColor("#fecaca");
        doc.text(
          "INFORME OFICIAL DE DISCREPANCIAS DOCUMENTARIAS BAJO UCP 600 / ISBP 745",
          48,
          66,
        );
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff");
        doc.text(`REF: ${instrument.instrumentReference}`, 380, 48, {
          align: "right",
          width: 165,
        });

        let curY = 96;

        // Credit Overview
        doc.rect(36, curY, 523, 40).strokeColor("#cbd5e1").stroke();
        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(
          `Crédito: ${instrument.instrumentReference} (${instrument.instrumentType})`,
          44,
          curY + 6,
        );
        doc.text(
          `Importe: ${instrument.creditAmount.toLocaleString("es-ES")} ${instrument.currency}`,
          44,
          curY + 18,
        );
        doc.text(`Beneficiario: ${instrument.beneficiaryName}`, 280, curY + 6);
        doc.text(
          `Banco Emisor: ${instrument.issuingBankName} (${instrument.issuingBankBic})`,
          280,
          curY + 18,
        );

        curY += 50;

        // Section 1: Discrepancy Findings
        doc.rect(36, curY, 523, 16).fill("#7f1d1d");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8);
        doc.text(
          "DISCREPANCIAS DETECTADAS (UCP 600 / ISBP 745 FINDINGS)",
          44,
          curY + 4,
        );

        curY += 20;

        if (discrepancies.length === 0) {
          doc.rect(36, curY, 523, 30).strokeColor("#15803d").stroke();
          doc.fillColor("#15803d").font("Helvetica-Bold").fontSize(8);
          doc.text(
            "PRESENTACIÓN PLENAMENTE CONFORME - SIN DISCREPANCIAS",
            44,
            curY + 10,
          );
          curY += 40;
        } else {
          for (let i = 0; i < discrepancies.length; i++) {
            const disc = discrepancies[i];
            doc.rect(36, curY, 523, 50).strokeColor("#fca5a5").stroke();
            doc.rect(36, curY, 523, 14).fill("#fef2f2");

            doc.fillColor("#991b1b").font("Helvetica-Bold").fontSize(7.5);
            doc.text(
              `${i + 1}. [${disc.severity}] ${disc.articleReference}`,
              44,
              curY + 3,
            );

            doc.fillColor("#0f172a").font("Helvetica").fontSize(7);
            doc.text(`Descripción: ${disc.description}`, 44, curY + 18, {
              width: 505,
            });
            doc.fillColor("#475569").font("Helvetica-Oblique");
            doc.text(
              `Acción de Subsanación / Waiver: ${disc.suggestedRemedy}`,
              44,
              curY + 34,
              { width: 505 },
            );

            curY += 56;
          }
        }

        // Section 2: SWIFT MT734 Notice Clause
        doc.rect(36, curY, 523, 45).strokeColor("#cbd5e1").stroke();
        doc.rect(36, curY, 523, 16).fill("#f8fafc");
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8);
        doc.text(
          "CLÁUSULA DE RETENCIÓN DE DOCUMENTOS & SOLICITUD DE WAIVER",
          44,
          curY + 4,
        );

        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          "De conformidad con el Artículo 16 de la UCP 600, los documentos quedan retenidos a disposición del remitente hasta recibir instrucciones de renuncia (waiver) del ordenante o enmienda contractual.",
          44,
          curY + 22,
          { width: 505 },
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates Official Demand Guarantee Certificate PDF (URDG 758 / ISP98).
   */
  public static async generateDemandGuaranteeCertificatePdf(data: {
    instrument: any;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];

        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        const { instrument } = data;

        // Header Banner
        doc.rect(36, 36, 523, 50).fill("#0f766e");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(14);
        doc.text("DEMAND GUARANTEE / STANDBY LETTER OF CREDIT", 48, 48);
        doc.font("Helvetica").fontSize(8).fillColor("#ccfbf1");
        doc.text(
          "GARANTÍA BANCARIA A PRIMERA DEMANDA BAJO REGLAS URDG 758 / ISP98",
          48,
          66,
        );
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff");
        doc.text(`REF: ${instrument.instrumentReference}`, 380, 48, {
          align: "right",
          width: 165,
        });

        let curY = 96;

        // Guarantee Terms
        doc.rect(36, curY, 523, 85).strokeColor("#cbd5e1").stroke();
        doc.rect(36, curY, 523, 16).fill("#f0fdfa");
        doc.fillColor("#115e59").font("Helvetica-Bold").fontSize(8);
        doc.text("TÉRMINOS & CONDICIONES DE LA GARANTÍA", 44, curY + 4);

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(
          `Guarantor (Banco Garante): ${instrument.issuingBankName} (${instrument.issuingBankBic})`,
          44,
          curY + 22,
        );
        doc.text(
          `Principal (Ordenante): ${instrument.applicantName}`,
          44,
          curY + 34,
        );
        doc.text(
          `Beneficiary (Beneficiario): ${instrument.beneficiaryName} (${instrument.beneficiaryCountry})`,
          44,
          curY + 46,
        );
        doc.text(
          `Maximum Guaranteed Amount: ${instrument.creditAmount.toLocaleString("es-ES", { minimumFractionDigits: 2 })} ${instrument.currency}`,
          44,
          curY + 58,
        );
        doc.text(
          `Expiry Date: ${instrument.expiryDate} at ${instrument.expiryPlace}`,
          44,
          curY + 70,
        );

        curY += 95;

        // Undertaking Statement
        doc.rect(36, curY, 523, 95).strokeColor("#0f766e").stroke();
        doc.rect(36, curY, 523, 16).fill("#f0fdfa");
        doc.fillColor("#115e59").font("Helvetica-Bold").fontSize(8);
        doc.text(
          "DECLARACIÓN DE COMPROMISO IRREVOCABLE DEL GARANTE",
          44,
          curY + 4,
        );

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(
          `Por la presente, el Banco Garante se compromete de forma irrevocable e incondicional a pagar al Beneficiario cualquier suma hasta un límite máximo de ${instrument.creditAmount.toLocaleString("es-ES")} ${instrument.currency}, contra la primera presentación de un requerimiento escrito de pago emitido por el Beneficiario declarando que el Ordenante ha incumplido sus obligaciones contractuales en relación con:`,
          44,
          curY + 24,
          { width: 505 },
        );
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#0f172a");
        doc.text(`"${instrument.goodsDescriptionSummary}"`, 44, curY + 56, {
          width: 505,
        });
        doc.font("Helvetica").fontSize(7).fillColor("#475569");
        doc.text(
          `Esta garantía está sujeta a las Reglas Uniformes relativas a las Garantías a Primera Demanda (URDG 758 de la CCI).`,
          44,
          curY + 78,
          { width: 505 },
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
