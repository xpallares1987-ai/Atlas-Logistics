import PDFDocument from "pdfkit";

export class CustomsWarehousePdfGenerator {
  /**
   * Generates Official Customs Bonding / Discharge Document (Documento DVD / DUA 7100/7600 PDF)
   */
  static async generateCustomsBondingDocumentPdf(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 36,
          info: {
            Title: `DVD_${data.lotNumber || "CUSTOMS_BONDING"}`,
            Author: "Atlas Logistics Customs Warehouse Engine",
          },
        });

        const chunks: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));

        // Header
        doc.rect(36, 36, 523, 50).fillColor("#1e293b").fill();
        doc
          .font("Helvetica-Bold")
          .fontSize(13)
          .fillColor("#ffffff")
          .text("DOCUMENTO DE VINCULACIÓN A DEPÓSITO ADUANERO (DVD)", 48, 48)
          .fontSize(8.5)
          .fillColor("#94a3b8")
          .text(
            "CÓDIGO ADUANERO DE LA UNIÓN (CAU) — REGÍMENES 7100 / 7600 / DDA / ADT",
            48,
            66,
          );

        doc
          .fontSize(10)
          .fillColor("#38bdf8")
          .text(data.inclusionDvdNumber || "DVD-2026-7100-00412", 400, 48, {
            align: "right",
          })
          .fontSize(7.5)
          .fillColor("#cbd5e1")
          .text(
            `MRN: ${data.inclusionDuaMrn || "26ES00080100412891"}`,
            400,
            66,
            { align: "right" },
          );

        // General Info Box
        let currentY = 96;
        doc.rect(36, currentY, 523, 90).strokeColor("#cbd5e1").stroke();

        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor("#1e293b")
          .text("1. INSTALACIÓN AUTORIZADA & OPERADOR", 46, currentY + 8)
          .text("2. TITULAR DE LA MERCANCÍA / IMPORTADOR", 300, currentY + 8);

        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor("#334155")
          .text(
            `Instalación: ${data.facilityName || "Depósito Aduanero ZAL Port Barcelona"}`,
            46,
            currentY + 22,
          )
          .text(
            `Código Autorización: ${data.facilityAuthorizationRef || "ES-AET-2024-DA-4910"}`,
            46,
            currentY + 34,
          )
          .text(
            `Tipo Régimen: ${data.customsRegimeCode || "7100 (Depósito Aduanero)"}`,
            46,
            currentY + 46,
          )
          .text(
            `Ubicación / Rack: ${data.warehouseLocationRack || "RACK-E-14-02"}`,
            46,
            currentY + 58,
          )
          .text(
            `Empresa: ${data.ownerCompanyName || "IberMicro Electronics S.L."}`,
            300,
            currentY + 22,
          )
          .text(
            `NIF / EORI: ${data.ownerTaxIdEori || "ESB88491029"}`,
            300,
            currentY + 34,
          )
          .text(
            `País de Origen: ${data.originCountryCode || "TW (Taiwán)"}`,
            300,
            currentY + 46,
          )
          .text(
            `Fecha Inclusión: ${(data.inclusionDate || "").replace("T", " ").replace("Z", "")}`,
            300,
            currentY + 58,
          );

        // Goods Detail & TARIC
        currentY = 196;
        doc.rect(36, currentY, 523, 110).strokeColor("#cbd5e1").stroke();

        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor("#1e293b")
          .text(
            "3. DESCRIPCIÓN ARANCELARIA & PARÁMETROS FÍSICOS DE LA PARTIDA",
            46,
            currentY + 8,
          );

        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor("#334155")
          .text(
            `Código TARIC: ${data.taricCommodityCode || "8542319000"}`,
            46,
            currentY + 24,
          )
          .text(
            `Descripción Mercancía: ${data.goodsDescription || "Circuitos integrados monolíticos"}`,
            46,
            currentY + 38,
          )
          .text(
            `Bultos Iniciales: ${data.initialPackageCount || 120} | Bultos Actuales: ${data.currentPackageCount || 100}`,
            46,
            currentY + 52,
          )
          .text(
            `Masa Bruta: ${data.currentGrossMassKg || 2000} kg | Masa Neta: ${data.currentNetMassKg || 1750} kg`,
            46,
            currentY + 66,
          )
          .text(
            `Estado del Lote: ${data.status || "ACTIVE"}`,
            46,
            currentY + 80,
          );

        doc
          .font("Helvetica-Bold")
          .text(`Valor en Aduana Declarado:`, 300, currentY + 24)
          .font("Helvetica")
          .text(
            `${(data.customsValueEur || 350000).toLocaleString("es-ES", { minimumFractionDigits: 2 })} EUR`,
            430,
            currentY + 24,
          )
          .text(
            `Tipo Arancel TARIC: ${data.dutyTariffRatePercent || 0}%`,
            300,
            currentY + 38,
          )
          .text(
            `Tipo IVA Importación: ${data.importVatRatePercent || 21}%`,
            300,
            currentY + 52,
          )
          .text(
            `Agente Aduanas Resp.: ${data.responsibleCustomsAgent || "Carles Puigvert"}`,
            300,
            currentY + 66,
          );

        // Financial Debt Suspension Box
        currentY = 316;
        doc.rect(36, currentY, 523, 90).fillColor("#f8fafc").fill();
        doc.rect(36, currentY, 523, 90).strokeColor("#cbd5e1").stroke();

        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor("#0f172a")
          .text(
            "4. LIQUIDACIÓN DE DEUDA ADUANERA SUSPENDIDA & AVAL BANCARIO",
            46,
            currentY + 8,
          );

        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor("#334155")
          .text(
            `Aval de Referencia (GRN): ${data.guaranteeReferenceNumber || "GRN-2026-AEAT-00918"}`,
            46,
            currentY + 24,
          )
          .text(
            `Entidad Avalista: ${data.guarantorBank || "Banco Santander S.A."}`,
            46,
            currentY + 38,
          )
          .text(
            `Arancel Suspendido: ${(data.suspendedDutyAmountEur || 0).toLocaleString("es-ES", { minimumFractionDigits: 2 })} EUR`,
            46,
            currentY + 52,
          )
          .text(
            `IVA Suspendido: ${(data.suspendedVatAmountEur || 73500).toLocaleString("es-ES", { minimumFractionDigits: 2 })} EUR`,
            46,
            currentY + 66,
          );

        doc
          .rect(300, currentY + 20, 240, 56)
          .fillColor("#f1f5f9")
          .fill();
        doc
          .rect(300, currentY + 20, 240, 56)
          .strokeColor("#94a3b8")
          .stroke();

        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor("#1e293b")
          .text("TOTAL DEUDA ADUANERA SUSPENDIDA", 310, currentY + 28)
          .fontSize(12)
          .fillColor("#2563eb")
          .text(
            `${(data.totalSuspendedDebtEur || 73500).toLocaleString("es-ES", { minimumFractionDigits: 2 })} EUR`,
            310,
            currentY + 44,
          );

        // Signatures
        currentY = 420;
        doc.rect(36, currentY, 250, 70).strokeColor("#cbd5e1").stroke();
        doc.rect(309, currentY, 250, 70).strokeColor("#cbd5e1").stroke();

        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#1e293b")
          .text("POR EL TITULAR DEL DEPÓSITO ADUANERO", 46, currentY + 8)
          .text("POR EL AGENTE DE ADUANAS / DECLARANTE", 319, currentY + 8);

        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#64748b")
          .text(
            "Conforme recepción y registro contable en Libro Oficial",
            46,
            currentY + 24,
          )
          .text("Firma y Sello de la Instalación", 46, currentY + 50)
          .text(
            "Declaración bajo fe de veracidad tributaria (CAU)",
            319,
            currentY + 24,
          )
          .text(
            "Firma Electrónica / Representante Aduanero",
            319,
            currentY + 50,
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates Official Stock & Suspended Debt Certificate (Certificado de Existencias Aduaneras PDF)
   */
  static async generateCustomsStockCertificatePdf(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 36,
          info: {
            Title: "Certificado_Existencias_Aduaneras",
            Author: "Atlas Logistics Customs Warehouse Engine",
          },
        });

        const chunks: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));

        // Header
        doc.rect(36, 36, 523, 50).fillColor("#0f172a").fill();
        doc
          .font("Helvetica-Bold")
          .fontSize(12)
          .fillColor("#ffffff")
          .text(
            "CERTIFICADO OFICIAL DE EXISTENCIAS BAJO RÉGIMEN ADUANERO",
            48,
            48,
          )
          .fontSize(8)
          .fillColor("#94a3b8")
          .text(
            "AUDITORÍA DE CONTROL DE DEPÓSITO ADUANERO (DA), DDA & ADT — AEAT / CAU",
            48,
            66,
          );

        // Summary Bar
        let currentY = 96;
        doc.rect(36, currentY, 523, 40).fillColor("#f8fafc").fill();
        doc.rect(36, currentY, 523, 40).strokeColor("#cbd5e1").stroke();

        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#1e293b")
          .text(
            `FECHA DE EMISIÓN: ${new Date().toLocaleDateString("es-ES")}`,
            46,
            currentY + 8,
          )
          .text(
            `INSTALACIÓN AUDITADA: ${data.facilityName || "Todas las Instalaciones Autorizadas"}`,
            240,
            currentY + 8,
          )
          .text(
            `TOTAL PARTIDAS: ${(data.lots || []).length}`,
            450,
            currentY + 8,
          );

        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#475569")
          .text(
            `Deuda Suspendida Total: ${(data.totalSuspendedDebtEur || 216715.8).toLocaleString("es-ES", { minimumFractionDigits: 2 })} EUR`,
            46,
            currentY + 22,
          )
          .text(
            `Bultos en Custodia: ${data.totalPackages || 728} bultos`,
            240,
            currentY + 22,
          )
          .text(
            `Masa Total: ${(data.totalGrossMassKg || 62500).toLocaleString()} kg`,
            450,
            currentY + 22,
          );

        // Table Header
        currentY = 146;
        doc.rect(36, currentY, 523, 18).fillColor("#1e293b").fill();
        doc
          .font("Helvetica-Bold")
          .fontSize(7)
          .fillColor("#ffffff")
          .text("Nº LOTE", 42, currentY + 5)
          .text("RÉG.", 120, currentY + 5)
          .text("TARIC", 150, currentY + 5)
          .text("DESCRIPCIÓN", 210, currentY + 5)
          .text("BULTOS", 340, currentY + 5)
          .text("VALOR ADUANA", 390, currentY + 5)
          .text("DEUDA SUSP.", 470, currentY + 5);

        currentY += 18;

        const lotList = data.lots || [];
        for (const lot of lotList) {
          doc
            .rect(36, currentY, 523, 20)
            .fillColor(currentY % 40 === 0 ? "#f8fafc" : "#ffffff")
            .fill();
          doc.rect(36, currentY, 523, 20).strokeColor("#e2e8f0").stroke();

          doc
            .font("Helvetica-Bold")
            .fontSize(6.5)
            .fillColor("#0f172a")
            .text(lot.lotNumber || "LOT-2026-DA-08101", 42, currentY + 6)
            .font("Helvetica")
            .text(lot.customsRegimeCode || "7100", 120, currentY + 6)
            .text(lot.taricCommodityCode || "8542319000", 150, currentY + 6)
            .text(
              (lot.goodsDescription || "Mercancía general").substring(0, 26),
              210,
              currentY + 6,
            )
            .text(`${lot.currentPackageCount || 100}`, 340, currentY + 6)
            .text(
              `${(lot.customsValueEur || 0).toLocaleString("es-ES")} €`,
              390,
              currentY + 6,
            )
            .font("Helvetica-Bold")
            .fillColor("#2563eb")
            .text(
              `${(lot.totalSuspendedDebtEur || 0).toLocaleString("es-ES", { minimumFractionDigits: 2 })} €`,
              470,
              currentY + 6,
            );

          currentY += 20;
          if (currentY > 720) break;
        }

        currentY += 15;

        // Official Stamp Box
        doc.rect(36, currentY, 523, 60).strokeColor("#cbd5e1").stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#1e293b")
          .text(
            "DILIGENCIA DE CONTROL Y FE PÚBLICA ADUANERA",
            46,
            currentY + 8,
          );

        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#475569")
          .text(
            "Se expide el presente Certificado de Existencias a efectos de auditoría contable y cumplimiento del Código Aduanero de la Unión (CAU). Las partidas relacionadas se hallan formalmente vinculadas en el Libro Oficial de Registro de Existencias.",
            46,
            currentY + 22,
            { width: 500 },
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
