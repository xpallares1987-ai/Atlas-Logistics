import PDFDocument from "pdfkit";

export class RoadFreightPdfGenerator {
  /**
   * Generates official Geneva 24-Box e-CMR Consignment Note (CMR Waybill)
   */
  public static async generateEcmrWaybill(c: {
    consignmentNumber: string;
    senderName: string;
    senderAddress: string;
    senderCountry: string;
    consigneeName: string;
    consigneeAddress: string;
    consigneeCountry: string;
    carrierName: string;
    carrierVat: string;
    tractorPlate: string;
    trailerPlate: string;
    driverName: string;
    originCity: string;
    destinationCity: string;
    pickupDate: string | Date;
    deliveryDate?: string | Date;
    totalPallets: number;
    totalGrossWeightKg: number;
    isAdrHazardous: boolean;
    adrTotalPoints: number;
    orangePlatesRequired: boolean;
    tunnelRestrictionCode?: string | null;
    goodsDescription: string;
    specialInstructions?: string | null;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: "A4", margin: 36 });
        const buffers: Buffer[] = [];

        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header Background Banner
        doc.rect(36, 36, 523, 44).fill("#0f172a");
        doc
          .fillColor("#ffffff")
          .font("Helvetica-Bold")
          .fontSize(11)
          .text(
            "INTERNATIONAL CONSIGNMENT NOTE / LETTRE DE VOITURE INTERNATIONALE",
            48,
            44,
          );
        doc
          .fontSize(7.5)
          .font("Helvetica")
          .text(
            "Subject to the Convention on the Contract for the International Carriage of Goods by Road (CMR)",
            48,
            58,
          );
        doc
          .fontSize(9)
          .fillColor("#38bdf8")
          .font("Helvetica-Bold")
          .text(`e-CMR: ${c.consignmentNumber}`, 380, 48, { align: "right" });

        // Row 1: Sender (Box 1) & Consignee (Box 2)
        const row1Y = 86;
        doc.rect(36, row1Y, 255, 70).strokeColor("#cbd5e1").stroke();
        doc.rect(298, row1Y, 261, 70).strokeColor("#cbd5e1").stroke();

        doc.rect(36, row1Y, 255, 14).fill("#f8fafc");
        doc.rect(298, row1Y, 261, 14).fill("#f8fafc");

        doc
          .font("Helvetica-Bold")
          .fontSize(6.5)
          .fillColor("#1e293b")
          .text(
            "1. SENDER / EXPÉDITEUR (Name, address, country)",
            42,
            row1Y + 3.5,
          )
          .text(
            "2. CONSIGNEE / DESTINATAIRE (Name, address, country)",
            304,
            row1Y + 3.5,
          );

        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#0f172a")
          .text(c.senderName, 42, row1Y + 18)
          .text(c.consigneeName, 304, row1Y + 18);

        doc
          .font("Helvetica")
          .fontSize(6.5)
          .fillColor("#475569")
          .text(c.senderAddress, 42, row1Y + 30, { width: 240 })
          .text(`Country: ${c.senderCountry}`, 42, row1Y + 54)
          .text(c.consigneeAddress, 304, row1Y + 30, { width: 245 })
          .text(`Country: ${c.consigneeCountry}`, 304, row1Y + 54);

        // Row 2: Delivery Place (Box 3) & Taking Over (Box 4)
        const row2Y = 160;
        doc.rect(36, row2Y, 255, 40).strokeColor("#cbd5e1").stroke();
        doc.rect(298, row2Y, 261, 40).strokeColor("#cbd5e1").stroke();

        doc
          .font("Helvetica-Bold")
          .fontSize(6.5)
          .fillColor("#1e293b")
          .text("3. PLACE OF DELIVERY / LIEU DE LIVRAISON", 42, row2Y + 4)
          .text(
            "4. PLACE AND DATE OF TAKING OVER / PRISE EN CHARGE",
            304,
            row2Y + 4,
          );

        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#334155")
          .text(c.destinationCity, 42, row2Y + 16)
          .text(
            `Delivery Date: ${c.deliveryDate ? new Date(c.deliveryDate).toISOString().substring(0, 10) : "TBD"}`,
            42,
            row2Y + 26,
          )
          .text(c.originCity, 304, row2Y + 16)
          .text(
            `Date: ${new Date(c.pickupDate).toISOString().substring(0, 10)}`,
            304,
            row2Y + 26,
          );

        // Row 3: Cargo Items & ADR Particulars (Boxes 6 - 12)
        const row3Y = 204;
        doc.rect(36, row3Y, 523, 110).strokeColor("#cbd5e1").stroke();
        doc.rect(36, row3Y, 523, 16).fill("#f1f5f9");
        doc
          .font("Helvetica-Bold")
          .fontSize(6.5)
          .fillColor("#1e293b")
          .text(
            "6-12. MARKS, NUMBER OF PACKAGES, DESCRIPTION OF GOODS, GROSS WEIGHT & ADR CLASS",
            42,
            row3Y + 4.5,
          );

        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor("#1e293b")
          .text(`Nature of Goods: ${c.goodsDescription}`, 44, row3Y + 24, {
            width: 505,
          })
          .text(
            `Total Pallets / Packages: ${c.totalPallets} Euro-pallets`,
            44,
            row3Y + 46,
          )
          .text(
            `Gross Weight: ${c.totalGrossWeightKg.toLocaleString()} kg`,
            300,
            row3Y + 46,
          );

        // ADR Badge Box
        const adrY = row3Y + 62;
        if (c.isAdrHazardous) {
          doc.rect(44, adrY, 505, 38).fill("#fff1f2");
          doc
            .strokeColor("#f43f5e")
            .lineWidth(0.8)
            .rect(44, adrY, 505, 38)
            .stroke();
          doc
            .font("Helvetica-Bold")
            .fontSize(7.5)
            .fillColor("#e11d48")
            .text(
              "ADR DANGEROUS GOODS / MARCHANDISES DANGEREUSES:",
              50,
              adrY + 4,
            );
          doc
            .font("Helvetica")
            .fontSize(6.5)
            .fillColor("#9f1239")
            .text(
              `Total ADR Points: ${c.adrTotalPoints.toFixed(0)} pts | Orange Plates: ${c.orangePlatesRequired ? "MANDATORY / EXIGÉES" : "EXEMPT (1.1.3.6)"}`,
              50,
              adrY + 16,
            )
            .text(
              `Tunnel Restriction: ${c.tunnelRestrictionCode || "None"} | Driver ADR Training: ${c.orangePlatesRequired ? "Required" : "Exempt"}`,
              50,
              adrY + 26,
            );
        } else {
          doc.rect(44, adrY, 505, 24).fill("#f8fafc");
          doc
            .strokeColor("#e2e8f0")
            .lineWidth(0.8)
            .rect(44, adrY, 505, 24)
            .stroke();
          doc
            .font("Helvetica")
            .fontSize(7)
            .fillColor("#64748b")
            .text(
              "NON-HAZARDOUS CARGO: Goods not subject to ADR regulations.",
              50,
              adrY + 8,
            );
        }

        // Row 4: Carrier Particulars & Vehicle Registration (Box 16)
        const row4Y = 320;
        doc.rect(36, row4Y, 523, 50).strokeColor("#cbd5e1").stroke();
        doc.rect(36, row4Y, 523, 14).fill("#f8fafc");
        doc
          .font("Helvetica-Bold")
          .fontSize(6.5)
          .fillColor("#1e293b")
          .text(
            "16. CARRIER / TRANSPORTEUR (Name, address, country, vehicle registration)",
            42,
            row4Y + 3.5,
          );

        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#0f172a")
          .text(c.carrierName, 44, row4Y + 18);
        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#475569")
          .text(
            `VAT: ${c.carrierVat} | Driver: ${c.driverName}`,
            44,
            row4Y + 30,
          )
          .text(
            `Tractor Plate (Tractora): ${c.tractorPlate} | Semi-Trailer: ${c.trailerPlate}`,
            300,
            row4Y + 30,
          );

        // Row 5: Sender Instructions & Reservations (Boxes 13 & 18)
        const row5Y = 374;
        doc.rect(36, row5Y, 523, 40).strokeColor("#cbd5e1").stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(6.5)
          .fillColor("#1e293b")
          .text(
            "13. SENDER'S INSTRUCTIONS / INSTRUCTIONS DE L'EXPÉDITEUR",
            42,
            row5Y + 4,
          );
        doc
          .font("Helvetica")
          .fontSize(6.5)
          .fillColor("#475569")
          .text(
            c.specialInstructions ||
              "Transport performed according to standard CMR conditions.",
            42,
            row5Y + 16,
            { width: 505 },
          );

        // Signatures 3-Boxes (Boxes 22, 23, 24)
        const signY = 418;
        const boxWidth = 169;
        doc.rect(36, signY, boxWidth, 70).strokeColor("#cbd5e1").stroke();
        doc.rect(213, signY, boxWidth, 70).strokeColor("#cbd5e1").stroke();
        doc.rect(390, signY, boxWidth, 70).strokeColor("#cbd5e1").stroke();

        doc
          .font("Helvetica-Bold")
          .fontSize(6.5)
          .fillColor("#1e293b")
          .text("22. SENDER SIGNATURE / TIMBRE", 42, signY + 6)
          .text("23. CARRIER SIGNATURE / TIMBRE", 219, signY + 6)
          .text("24. CONSIGNEE RECEIPT / TIMBRE", 396, signY + 6);

        doc
          .font("Helvetica")
          .fontSize(6)
          .fillColor("#64748b")
          .text("Date & Signature", 42, signY + 54)
          .text("Driver Signature & Stamp", 219, signY + 54)
          .text("Goods Received in Good Order", 396, signY + 54);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates official Spanish Carta de Porte Nacional (Ley 15/2009 & RDL 3/2022)
   */
  public static async generateCartaDePorte(c: {
    consignmentNumber: string;
    senderName: string;
    senderAddress: string;
    consigneeName: string;
    consigneeAddress: string;
    carrierName: string;
    carrierVat: string;
    tractorPlate: string;
    trailerPlate: string;
    driverName: string;
    driverLicense: string;
    originCity: string;
    destinationCity: string;
    pickupDate: string | Date;
    deliveryDate?: string | Date;
    totalPallets: number;
    totalGrossWeightKg: number;
    goodsDescription: string;
    specialInstructions?: string | null;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: "A4", margin: 36 });
        const buffers: Buffer[] = [];

        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header Background Banner
        doc.rect(36, 36, 523, 44).fill("#7c2d12");
        doc
          .fillColor("#ffffff")
          .font("Helvetica-Bold")
          .fontSize(12)
          .text("CARTA DE PORTE NACIONAL DE TRANSPORTE DE MERCANCÍAS", 48, 44);
        doc
          .fontSize(7.5)
          .font("Helvetica")
          .text(
            "Documento de control obligatorio conforme a la Ley 15/2009 y Orden FOM/2861/2012",
            48,
            58,
          );
        doc
          .fontSize(9)
          .fillColor("#fdba74")
          .font("Helvetica-Bold")
          .text(`Nº: ${c.consignmentNumber}`, 380, 48, { align: "right" });

        // Cargador Contractual / Expedidor / Destinatario
        const partiesY = 86;
        doc.rect(36, partiesY, 255, 65).strokeColor("#cbd5e1").stroke();
        doc.rect(298, partiesY, 261, 65).strokeColor("#cbd5e1").stroke();

        doc.rect(36, partiesY, 255, 14).fill("#fff7ed");
        doc.rect(298, partiesY, 261, 14).fill("#fff7ed");

        doc
          .font("Helvetica-Bold")
          .fontSize(6.5)
          .fillColor("#9a3412")
          .text("1. CARGADOR CONTRACTUAL / EXPEDIDOR", 42, partiesY + 3.5)
          .text("2. DESTINATARIO DE LAS MERCANCÍAS", 304, partiesY + 3.5);

        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#0f172a")
          .text(c.senderName, 42, partiesY + 18)
          .text(c.consigneeName, 304, partiesY + 18);

        doc
          .font("Helvetica")
          .fontSize(6.5)
          .fillColor("#475569")
          .text(c.senderAddress, 42, partiesY + 30, { width: 240 })
          .text(c.consigneeAddress, 304, partiesY + 30, { width: 245 });

        // Porteador Efectivo y Vehículo
        const vehY = 156;
        doc.rect(36, vehY, 523, 50).strokeColor("#cbd5e1").stroke();
        doc.rect(36, vehY, 523, 14).fill("#fff7ed");
        doc
          .font("Helvetica-Bold")
          .fontSize(6.5)
          .fillColor("#9a3412")
          .text(
            "3. PORTEADOR EFECTIVO, CONDUCTOR Y MATRÍCULAS DE VEHÍCULOS",
            42,
            vehY + 3.5,
          );

        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#0f172a")
          .text(c.carrierName, 44, vehY + 18);
        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#475569")
          .text(
            `NIF/CIF: ${c.carrierVat} | Conductor: ${c.driverName} (DNI/Permiso: ${c.driverLicense})`,
            44,
            vehY + 30,
          )
          .text(
            `Matrícula Cabeza Tractora: ${c.tractorPlate} | Semirremolque: ${c.trailerPlate}`,
            300,
            vehY + 30,
          );

        // Mercancía
        const cargoY = 212;
        doc.rect(36, cargoY, 523, 75).strokeColor("#cbd5e1").stroke();
        doc.rect(36, cargoY, 523, 14).fill("#f1f5f9");
        doc
          .font("Helvetica-Bold")
          .fontSize(6.5)
          .fillColor("#1e293b")
          .text(
            "4. IDENTIFICACIÓN Y NATURALEZA DE LAS MERCANCÍAS TRANSPORTADAS",
            42,
            cargoY + 3.5,
          );

        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor("#1e293b")
          .text(`Descripción: ${c.goodsDescription}`, 44, cargoY + 20, {
            width: 505,
          })
          .text(
            `Bultos / Pallets: ${c.totalPallets} Euro-pallets`,
            44,
            cargoY + 44,
          )
          .text(
            `Peso Bruto Total: ${c.totalGrossWeightKg.toLocaleString()} kg`,
            300,
            cargoY + 44,
          )
          .text(
            `Origen: ${c.originCity} | Destino: ${c.destinationCity}`,
            44,
            cargoY + 58,
          );

        // Cláusulas Legales RDL 3/2022
        const legalY = 294;
        doc
          .rect(36, legalY, 523, 100)
          .strokeColor("#b45309")
          .lineWidth(0.8)
          .stroke();
        doc.rect(36, legalY, 523, 14).fill("#fef3c7");
        doc
          .font("Helvetica-Bold")
          .fontSize(7)
          .fillColor("#92400e")
          .text(
            "5. DECLARACIONES LEGALES OBLIGATORIAS (LEY 15/2009 Y RDL 3/2022)",
            42,
            legalY + 3.5,
          );

        const rdlText = `A) PROHIBICIÓN DE CARGA Y DESCARGA: En aplicación del Art. 2 del RDL 3/2022 y la Disposición Adicional 13ª de la LOTT, el conductor NO participará en las labores de carga ni descarga de las mercancías, siendo estas por cuenta exclusiva del cargador / destinatario.
B) CLÁUSULA DE PARALIZACIONES: Cuando el vehículo haya de esperar más de una hora hasta que concluya su carga o descarga, el cargador o destinatario indemnizará al porteador por concepto de paralización conforme a la tarifa reglamentaria IPREM/hora (Ley 15/2009, Art. 22).
C) RESPONSABILIDAD: El contrato se rige por el límite estatutario de indemnización de la Ley 15/2009 (un tercio del IPREM por kg dañado o el Convenio CMR en caso de tramo internacional).`;

        doc
          .font("Helvetica")
          .fontSize(6.5)
          .fillColor("#1e293b")
          .text(rdlText, 42, legalY + 20, { width: 505, lineGap: 3 });

        // Signatures 3-Boxes
        const signY = 404;
        const boxWidth = 169;
        doc.rect(36, signY, boxWidth, 65).strokeColor("#cbd5e1").stroke();
        doc.rect(213, signY, boxWidth, 65).strokeColor("#cbd5e1").stroke();
        doc.rect(390, signY, boxWidth, 65).strokeColor("#cbd5e1").stroke();

        doc
          .font("Helvetica-Bold")
          .fontSize(6.5)
          .fillColor("#1e293b")
          .text("FIRMA DEL CARGADOR", 42, signY + 6)
          .text("FIRMA DEL PORTEADOR / CONDUCTOR", 219, signY + 6)
          .text("FIRMA DEL DESTINATARIO", 396, signY + 6);

        doc
          .font("Helvetica")
          .fontSize(6)
          .fillColor("#64748b")
          .text("Firma y Sello Origen", 42, signY + 50)
          .text("Conforme a la Carga", 219, signY + 50)
          .text("Recibido Conforme Destino", 396, signY + 50);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
