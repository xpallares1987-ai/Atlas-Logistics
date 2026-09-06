import PDFDocument from "pdfkit";

export class IncotermsPdfGenerator {
  /**
   * Generates official bilingual commercial freight & sales contract PDF with ICC Incoterms® 2020 clauses
   */
  public static async generateCommercialContract(data: {
    contractNumber: string;
    title: string;
    incotermCode: string;
    namedPlace: string;
    transportMode: string;
    currency: string;
    goodsValue: number;
    freightEstimatedCost: number;
    insuranceEstimatedCost: number;
    customsEstimatedDuty: number;
    effectiveDate: string | Date;
    expiryDate?: string | Date;
    governingLaw: string;
    disputeJurisdiction: string;
    sellerData: any;
    buyerData: any;
    forwarderData?: any;
    milestonesData?: any[];
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: "A4", margin: 36 });
        const buffers: Buffer[] = [];

        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header Background Banner
        doc.rect(36, 36, 523, 50).fill("#0f172a");
        doc
          .fillColor("#ffffff")
          .font("Helvetica-Bold")
          .fontSize(14)
          .text("ATLAS LOGISTICS ENTERPRISE", 48, 46);
        doc
          .fontSize(8.5)
          .font("Helvetica")
          .text(
            "INTERNATIONAL COMMERCIAL & FREIGHT FORWARDING CONTRACT",
            48,
            62,
          );
        doc
          .fontSize(8)
          .fillColor("#38bdf8")
          .text(`INCOTERMS® 2020 COMPLIANT | ${data.contractNumber}`, 360, 52, {
            align: "right",
          });

        // Contract Title & Metadata
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(11)
          .text(data.title, 36, 96);
        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor("#475569")
          .text(
            `Effective Date: ${new Date(data.effectiveDate).toISOString().substring(0, 10)} | Expiry: ${data.expiryDate ? new Date(data.expiryDate).toISOString().substring(0, 10) : "Open-ended"} | Currency: ${data.currency}`,
            36,
            110,
          );

        // Parties 2-Column Box
        const startY = 126;
        doc.rect(36, startY, 255, 95).strokeColor("#cbd5e1").stroke();
        doc.rect(298, startY, 261, 95).strokeColor("#cbd5e1").stroke();

        // Seller
        doc.rect(36, startY, 255, 16).fill("#f1f5f9");
        doc
          .fillColor("#1e293b")
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .text("1. SELLER / EXPORTADOR (PARTE VENDEDORA)", 42, startY + 4);
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor("#0f172a")
          .text(data.sellerData?.name || "N/A", 42, startY + 22);
        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor("#475569")
          .text(
            `Tax ID / NIF: ${data.sellerData?.taxId || "N/A"}`,
            42,
            startY + 36,
          )
          .text(
            `Address: ${data.sellerData?.address || "N/A"}`,
            42,
            startY + 48,
            { width: 240 },
          )
          .text(
            `Country: ${data.sellerData?.country || "ES"} | Contact: ${data.sellerData?.contact || "N/A"}`,
            42,
            startY + 74,
          );

        // Buyer
        doc.rect(298, startY, 261, 16).fill("#f1f5f9");
        doc
          .fillColor("#1e293b")
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .text("2. BUYER / IMPORTADOR (PARTE COMPRADORA)", 304, startY + 4);
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor("#0f172a")
          .text(data.buyerData?.name || "N/A", 304, startY + 22);
        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor("#475569")
          .text(
            `Tax ID / VAT: ${data.buyerData?.taxId || "N/A"}`,
            304,
            startY + 36,
          )
          .text(
            `Address: ${data.buyerData?.address || "N/A"}`,
            304,
            startY + 48,
            { width: 245 },
          )
          .text(
            `Country: ${data.buyerData?.country || "N/A"} | Contact: ${data.buyerData?.contact || "N/A"}`,
            304,
            startY + 74,
          );

        // Incoterm 2020 Core Terms Box
        const incoY = 228;
        doc
          .rect(36, incoY, 523, 58)
          .strokeColor("#0284c7")
          .lineWidth(1.2)
          .stroke();
        doc.rect(36, incoY, 523, 16).fill("#e0f2fe");
        doc
          .fillColor("#0369a1")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(
            "3. INCOTERMS® 2020 DELIVERY & RISK TRANSFER CLAUSE (CLÁUSULA DE ENTREGA)",
            42,
            incoY + 4,
          );

        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(10)
          .text(
            `Rule: ${data.incotermCode} (${data.namedPlace})`,
            42,
            incoY + 22,
          );
        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor("#334155")
          .text(
            `Transport Mode: ${data.transportMode} | Freight Forwarder: ${data.forwarderData?.name || "Atlas Logistics SL"}`,
            42,
            incoY + 36,
          )
          .text(
            `Jurisdiction: ${data.disputeJurisdiction} | Governing Law: ${data.governingLaw}`,
            42,
            incoY + 46,
          );

        // Commercial Financial Breakdown Table
        const finY = 293;
        doc.rect(36, finY, 523, 16).fill("#f8fafc");
        doc
          .strokeColor("#cbd5e1")
          .lineWidth(0.8)
          .rect(36, finY, 523, 54)
          .stroke();
        doc
          .fillColor("#1e293b")
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .text(
            "4. FINANCIAL SUMMARY & ESTIMATED LOGISTICS COSTS",
            42,
            finY + 4,
          );

        doc.font("Helvetica").fontSize(7.5).fillColor("#475569");
        doc.text("Valor Mercancía (Goods Value):", 42, finY + 22);
        doc.text("Flete Internacional Est. (Freight):", 180, finY + 22);
        doc.text("Seguro Est. (Insurance):", 320, finY + 22);
        doc.text("Arancel Est. (Customs Duty):", 440, finY + 22);

        doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0f172a");
        doc.text(
          `${data.goodsValue?.toFixed(2)} ${data.currency}`,
          42,
          finY + 34,
        );
        doc.text(
          `${data.freightEstimatedCost?.toFixed(2)} ${data.currency}`,
          180,
          finY + 34,
        );
        doc.text(
          `${data.insuranceEstimatedCost?.toFixed(2)} ${data.currency}`,
          320,
          finY + 34,
        );
        doc.text(
          `${data.customsEstimatedDuty?.toFixed(2)} ${data.currency}`,
          440,
          finY + 34,
        );

        // Incoterms 10-Stage Responsibility Matrix Table
        const tableY = 354;
        doc.rect(36, tableY, 523, 16).fill("#f1f5f9");
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .text(
            "5. INCOTERMS® 2020 10-STAGE COST & RISK ALLOCATION MATRIX",
            42,
            tableY + 4,
          );

        const stagesList = [
          {
            num: "1",
            name: "Embalaje y Verificación (Packaging)",
            cost: "Vendedor",
            risk: "Vendedor",
          },
          {
            num: "2",
            name: "Carga en Origen (Loading Origin)",
            cost: data.incotermCode === "EXW" ? "Comprador" : "Vendedor",
            risk: data.incotermCode === "EXW" ? "Comprador" : "Vendedor",
          },
          {
            num: "3",
            name: "Transporte Interior Origen (Pre-carriage)",
            cost: ["EXW"].includes(data.incotermCode)
              ? "Comprador"
              : "Vendedor",
            risk: ["EXW", "FCA"].includes(data.incotermCode)
              ? "Comprador"
              : "Vendedor",
          },
          {
            num: "4",
            name: "Despacho Exportación (Export Customs)",
            cost: data.incotermCode === "EXW" ? "Comprador" : "Vendedor",
            risk: data.incotermCode === "EXW" ? "Comprador" : "Vendedor",
          },
          {
            num: "5",
            name: "Manipulación Terminal Origen (OTHC)",
            cost: ["EXW", "FCA", "FAS"].includes(data.incotermCode)
              ? "Comprador"
              : "Vendedor",
            risk: ["EXW", "FCA", "FAS"].includes(data.incotermCode)
              ? "Comprador"
              : "Vendedor",
          },
          {
            num: "6",
            name: "Flete Internacional (Main Freight)",
            cost: ["EXW", "FCA", "FAS", "FOB"].includes(data.incotermCode)
              ? "Comprador"
              : "Vendedor",
            risk: [
              "EXW",
              "FCA",
              "FAS",
              "FOB",
              "CFR",
              "CIF",
              "CPT",
              "CIP",
            ].includes(data.incotermCode)
              ? "Comprador"
              : "Vendedor",
          },
          {
            num: "7",
            name: "Seguro de Transporte (Insurance)",
            cost: ["CIF", "CIP"].includes(data.incotermCode)
              ? "Vendedor (Obligatorio)"
              : "Comprador (Opcional)",
            risk: "Comprador",
          },
          {
            num: "8",
            name: "Manipulación Terminal Destino (DTHC)",
            cost: ["DAP", "DPU", "DDP"].includes(data.incotermCode)
              ? "Vendedor"
              : "Comprador",
            risk: ["DAP", "DPU", "DDP"].includes(data.incotermCode)
              ? "Vendedor"
              : "Comprador",
          },
          {
            num: "9",
            name: "Despacho de Importación y Aranceles",
            cost: data.incotermCode === "DDP" ? "Vendedor" : "Comprador",
            risk: data.incotermCode === "DDP" ? "Vendedor" : "Comprador",
          },
          {
            num: "10",
            name: "Descarga en Destino (Unloading)",
            cost: data.incotermCode === "DPU" ? "Vendedor" : "Comprador",
            risk: data.incotermCode === "DPU" ? "Vendedor" : "Comprador",
          },
        ];

        let currRowY = tableY + 16;
        for (const stage of stagesList) {
          doc.rect(36, currRowY, 523, 14).strokeColor("#e2e8f0").stroke();
          doc
            .font("Helvetica-Bold")
            .fontSize(6.5)
            .fillColor("#1e293b")
            .text(stage.num, 42, currRowY + 3.5);
          doc
            .font("Helvetica")
            .fontSize(6.5)
            .fillColor("#334155")
            .text(stage.name, 56, currRowY + 3.5);
          doc
            .font("Helvetica-Bold")
            .fontSize(6.5)
            .fillColor("#0284c7")
            .text(`Coste: ${stage.cost}`, 320, currRowY + 3.5);
          doc
            .font("Helvetica-Bold")
            .fontSize(6.5)
            .fillColor("#059669")
            .text(`Riesgo: ${stage.risk}`, 430, currRowY + 3.5);
          currRowY += 14;
        }

        // Legal Declaration & Signatures
        const signY = currRowY + 10;
        doc
          .font("Helvetica")
          .fontSize(6.5)
          .fillColor("#64748b")
          .text(
            "Las partes convienen expresamente que la interpretación de las obligaciones de entrega, costes, seguro y riesgos se rigen por las reglas oficiales Incoterms® 2020 de la Cámara de Comercio Internacional (ICC). Ambas partes aceptan la firma electrónica y digital.",
            36,
            signY,
            { width: 523 },
          );

        // Signatures 2-Boxes
        const boxY = signY + 26;
        doc.rect(36, boxY, 255, 60).strokeColor("#cbd5e1").stroke();
        doc.rect(298, boxY, 261, 60).strokeColor("#cbd5e1").stroke();

        doc
          .font("Helvetica-Bold")
          .fontSize(7)
          .fillColor("#1e293b")
          .text("FOR THE SELLER (POR LA PARTE VENDEDORA):", 42, boxY + 6)
          .text("FOR THE BUYER (POR LA PARTE COMPRADORA):", 304, boxY + 6);

        doc
          .font("Helvetica")
          .fontSize(6.5)
          .fillColor("#64748b")
          .text(
            "Firma Digital Certificada / Authorized Signature",
            42,
            boxY + 46,
          )
          .text(
            "Firma Digital Certificada / Authorized Signature",
            304,
            boxY + 46,
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
