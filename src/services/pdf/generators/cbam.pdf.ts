import PDFDocument from "pdfkit";

export class CbamPdfGenerator {
  /**
   * Generates an Official CBAM Embedded Emissions & Carbon Liability Declaration Certificate PDF (EU Reg. 2023/956).
   */
  static async generateCbamDeclarationCertificate(
    declaration: any,
    lines: any[] = [],
    company?: any,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 40,
        });

        const buffers: Buffer[] = [];
        doc.on("data", (buffer: Buffer) => buffers.push(buffer));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header
        doc.rect(40, 40, 515, 60).fillAndStroke("#065f46", "#047857");
        doc
          .font("Helvetica-Bold")
          .fontSize(12)
          .fillColor("#ffffff")
          .text(
            "EU CBAM EMBEDDED EMISSIONS & CARBON LIABILITY DECLARATION / CERTIFICADO CBAM",
            55,
            53,
          );
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#a7f3d0")
          .text(
            "Regulation (EU) 2023/956 & Implementing Regulation (EU) 2023/1773 - DG TAXUD Registry",
            55,
            72,
          );

        let currentY = 115;

        // Declarant & Importer Particulars Box
        doc.rect(40, currentY, 515, 75).strokeColor("#cbd5e1").stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor("#1e293b")
          .text(
            "DATOS DE LA DECLARACIÓN Y OPERADORES ADUANEROS:",
            50,
            currentY + 8,
          );

        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#334155")
          .text(
            `Nº Declaración: ${declaration.declarationNumber}`,
            50,
            currentY + 22,
          )
          .text(
            `Periodo Trimestral: ${declaration.reportingPeriod}`,
            50,
            currentY + 34,
          )
          .text(
            `Declarante / Representante: ${declaration.declarantName}`,
            50,
            currentY + 46,
            { width: 240 },
          )
          .text(
            `EORI Declarante: ${declaration.declarantVat}`,
            50,
            currentY + 58,
          )
          .text(
            `Importador / Titular: ${declaration.importerName}`,
            310,
            currentY + 22,
            { width: 240 },
          )
          .text(
            `EORI Importador: ${declaration.importerVat}`,
            310,
            currentY + 34,
          )
          .text(
            `Estado Registro: ${declaration.status || "VALIDATED"}`,
            310,
            currentY + 46,
          )
          .text(
            `Fecha Emisión: ${new Date().toISOString().split("T")[0]}`,
            310,
            currentY + 58,
          );

        currentY += 90;

        // Emissions & Financial Liability Box
        const isSubmitted = declaration.status === "SUBMITTED_REGISTRY";
        const bannerBg = isSubmitted ? "#ecfdf5" : "#f0fdf4";
        const bannerBorder = isSubmitted ? "#10b981" : "#059669";

        doc.rect(40, currentY, 515, 65).fillAndStroke(bannerBg, bannerBorder);
        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor("#064e3b")
          .text(
            "BALANCE DE EMISIONES INTEGRADAS Y LIQUIDACIÓN FINANCIERA EU ETS:",
            50,
            currentY + 8,
          );

        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#1e293b")
          .text(
            `Masa Neta Total: ${declaration.totalNetMassTonnes?.toLocaleString() || 0} Toneladas`,
            50,
            currentY + 24,
          )
          .text(
            `Emisiones Directas: ${declaration.totalDirectEmissionsTco2e?.toLocaleString() || 0} tCO2e`,
            50,
            currentY + 38,
          )
          .text(
            `Emisiones Indirectas: ${declaration.totalIndirectEmissionsTco2e?.toLocaleString() || 0} tCO2e`,
            50,
            currentY + 50,
          )
          .text(
            `Total Emisiones Integradas: ${declaration.totalEmbeddedEmissionsTco2e?.toLocaleString() || 0} tCO2e`,
            310,
            currentY + 24,
          )
          .text(
            `Precio Benchmark EU ETS: ${declaration.euEtsBenchmarkPriceEur || 85.5} € / tCO2e`,
            310,
            currentY + 38,
          )
          .text(
            `Deuda Neta Liquidable: ${(declaration.netCarbonLiabilityEur || 0).toLocaleString()} €`,
            310,
            currentY + 50,
          );

        currentY += 80;

        // Imported Goods Line Items Table
        doc.rect(40, currentY, 515, 18).fillAndStroke("#f1f5f9", "#cbd5e1");
        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#0f172a")
          .text("Código CN", 45, currentY + 5)
          .text("Descripción Mercancía", 115, currentY + 5)
          .text("Origen", 255, currentY + 5)
          .text("Masa (t)", 295, currentY + 5)
          .text("Emisiones (tCO2e)", 350, currentY + 5)
          .text("Crédito Origen", 435, currentY + 5)
          .text("Deuda Neta", 495, currentY + 5);

        currentY += 18;

        const tableLines = lines.length > 0 ? lines : [];
        for (const line of tableLines.slice(0, 8)) {
          doc.rect(40, currentY, 515, 18).strokeColor("#e2e8f0").stroke();

          doc
            .font("Helvetica-Bold")
            .fontSize(7)
            .fillColor("#0f172a")
            .text(line.duaBox33HsCode || "N/A", 45, currentY + 5)
            .font("Helvetica")
            .fillColor("#334155")
            .text(line.goodDescription || "CBAM Good", 115, currentY + 5, {
              width: 135,
              ellipsis: true,
            })
            .text(line.originCountry || "TR", 255, currentY + 5)
            .text(`${line.netWeightTonnes || 0}`, 295, currentY + 5)
            .font("Helvetica-Bold")
            .fillColor("#047857")
            .text(`${line.totalLineEmissionsTco2e || 0}`, 350, currentY + 5)
            .font("Helvetica")
            .fillColor("#64748b")
            .text(
              `${(line.effectiveForeignPricePaidEur || 0).toLocaleString()} €`,
              435,
              currentY + 5,
            )
            .font("Helvetica-Bold")
            .fillColor("#0f172a")
            .text(
              `${(line.lineNetLiabilityEur || 0).toLocaleString()} €`,
              495,
              currentY + 5,
            );

          currentY += 18;
        }

        currentY += 15;

        // Legal Declaration & Article 35 Certification
        doc.rect(40, currentY, 515, 70).fillAndStroke("#f8fafc", "#cbd5e1");
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor("#0f172a")
          .text(
            "DECLARACIÓN JURADA DE CONFORMIDAD Y CUMPLIMIENTO REGLAMENTO (UE) 2023/956:",
            50,
            currentY + 8,
          );

        const legalNotice =
          declaration.remarks ||
          "El Declarante Autorizado certifica que los datos de emisiones integradas directas e indirectas han sido calculados conforme a la metodología oficial del Anexo IV del Reglamento (UE) 2023/956 y los Reglamentos de Ejecución de la Comisión Europea. Las deducciones por precio de carbono en origen se respaldan con documentación probatoria.";

        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#334155")
          .text(legalNotice, 50, currentY + 22, { width: 495, lineGap: 2.5 });

        currentY += 85;

        // Signatures
        doc.rect(40, currentY, 250, 60).strokeColor("#cbd5e1").stroke();
        doc.rect(305, currentY, 250, 60).strokeColor("#cbd5e1").stroke();

        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#1e293b")
          .text("DECLARANTE AUTORIZADO CBAM / AGENTE", 50, currentY + 8)
          .text("REPRESENTANTE ADUANERO / AUDITORÍA", 315, currentY + 8);

        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#475569")
          .text(
            declaration.responsibleDeclarant ||
              "Carlos Vega (Responsable Técnico CBAM)",
            50,
            currentY + 22,
          )
          .text("Firma y Sello Oficial de Validación", 50, currentY + 42)
          .text(
            "Conforme Registro Transitorio UE / DG TAXUD",
            315,
            currentY + 42,
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
