import PDFDocument from 'pdfkit';

export interface HBLData {
  shipmentId: string;
  shipper: string;
  consignee: string;
  notifyParty?: string;
  portOfLoading: string;
  portOfDischarge: string;
  vessel: string;
  voyage: string;
  containers: any[];
  commodities: any[];
  issueDate?: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  type: string;
  party: string;
  dueDate: string;
  currency: string;
  amount: number;
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
}

export class PDFService {
  /**
   * Generates a generic House Bill of Lading (HBL) PDF in memory.
   */
  static async generateHBL(data: HBLData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          resolve(Buffer.concat(buffers));
        });

        // Header
        doc.fontSize(20).text('HOUSE BILL OF LADING', { align: 'center' });
        doc.moveDown();

        // Shipment Info Box
        doc.fontSize(10);
        doc.rect(50, doc.y, 500, 100).stroke();
        doc.text(`B/L Number: HBL-${data.shipmentId.substring(0, 8).toUpperCase()}`, 60, doc.y + 10);
        doc.text(`Issue Date: ${data.issueDate || new Date().toLocaleDateString()}`, 60, doc.y + 15);
        doc.moveDown(4);

        // Entities
        doc.fontSize(12).font('Helvetica-Bold').text('Shipper:');
        doc.font('Helvetica').fontSize(10).text(data.shipper || 'N/A').moveDown();
        
        doc.fontSize(12).font('Helvetica-Bold').text('Consignee:');
        doc.font('Helvetica').fontSize(10).text(data.consignee || 'N/A').moveDown();

        if (data.notifyParty) {
          doc.fontSize(12).font('Helvetica-Bold').text('Notify Party:');
          doc.font('Helvetica').fontSize(10).text(data.notifyParty).moveDown();
        }

        // Routing
        doc.rect(50, doc.y, 500, 60).stroke();
        doc.text(`Vessel / Voyage: ${data.vessel} / ${data.voyage}`, 60, doc.y + 10);
        doc.text(`Port of Loading: ${data.portOfLoading}`, 60, doc.y + 15);
        doc.text(`Port of Discharge: ${data.portOfDischarge}`, 60, doc.y + 15);
        doc.moveDown(3);

        // Cargo details
        doc.fontSize(12).font('Helvetica-Bold').text('Cargo Description:').moveDown();
        
        data.commodities.forEach((cmd, idx) => {
          doc.font('Helvetica').fontSize(10).text(
            `${idx + 1}. ${cmd.description} - ${cmd.pieces} pcs | ${cmd.grossWeightKg} KG | ${cmd.volumeCbm} CBM`
          );
        });
        doc.moveDown();

        // Container details
        doc.fontSize(12).font('Helvetica-Bold').text('Containers:').moveDown();
        data.containers.forEach((ctr, idx) => {
          doc.font('Helvetica').fontSize(10).text(
            `${idx + 1}. ${ctr.containerNumber} (${ctr.isoType}) - Seal: ${ctr.sealNumber || 'N/A'}`
          );
        });

        // Footer terms
        doc.moveDown(4);
        doc.fontSize(8).text('RECEIVED by the Carrier the goods as specified above in apparent good order and condition unless otherwise stated, to be transported to such place as agreed, authorized or permitted herein and subject to all the terms and conditions appearing on the front and reverse of this Bill of Lading.', { align: 'justify' });
        
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates a Commercial Invoice PDF in memory.
   */
  static async generateInvoice(data: InvoiceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          resolve(Buffer.concat(buffers));
        });

        // Header
        doc.fontSize(22).text("INVOICE", 50, 50);
        doc.fontSize(12);
        doc.text(`Invoice Number: ${data.invoiceNumber}`, 50, 80);
        doc.text(`Date Issued: ${new Date().toLocaleDateString()}`, 50, 95);
        doc.text(`Due Date: ${new Date(data.dueDate).toLocaleDateString()}`, 50, 110);
        
        doc.text(`Type: ${data.type}`, 400, 80);
        
        doc.moveDown(2);
        doc.font('Helvetica-Bold').text("Billed To:");
        doc.font('Helvetica').text(data.party || "Unknown Client");
        
        doc.moveDown(2);
        
        // Table Header
        const startY = doc.y + 10;
        doc.font('Helvetica-Bold');
        doc.text("Description", 50, startY);
        doc.text("Qty", 300, startY);
        doc.text("Unit Price", 380, startY);
        doc.text("Total", 480, startY);
        
        doc.moveTo(50, startY + 15).lineTo(550, startY + 15).stroke();
        
        doc.font('Helvetica');
        let currentY = startY + 25;
        
        data.items.forEach(item => {
          doc.text(item.description, 50, currentY, { width: 240 });
          doc.text(item.quantity.toString(), 300, currentY);
          doc.text(item.unitPrice.toFixed(2), 380, currentY);
          doc.text(item.total.toFixed(2), 480, currentY);
          currentY += 20;
        });
        
        doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
        
        currentY += 15;
        doc.font('Helvetica-Bold');
        doc.text(`Total Amount (${data.currency})`, 300, currentY);
        doc.text(`${new Intl.NumberFormat("en-US", { style: "currency", currency: data.currency }).format(data.amount)}`, 480, currentY);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates a Carrier Freight Dispute / Debit Note PDF (Nota de Cargo y Carta de Discrepancia).
   */
  static async generateCarrierDisputeLetter(
    invoice: any,
    disputedLines: any[],
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
        doc.rect(40, 40, 515, 60).fillAndStroke("#7f1d1d", "#991b1b");
        doc
          .font("Helvetica-Bold")
          .fontSize(14)
          .fillColor("#ffffff")
          .text(
            "CARRIER FREIGHT DISPUTE & DEBIT NOTE / NOTA DE CARGO Y DISCREPANCIA",
            55,
            55,
          );
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#fecaca")
          .text(
            "Formal Rejection of Unauthorized Freight Surcharges & Rate Discrepancies",
            55,
            75,
          );

        let currentY = 115;

        // Carrier & Forwarder Details
        doc.rect(40, currentY, 250, 80).strokeColor("#cbd5e1").stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor("#1e293b")
          .text("DATOS DEL PORTEADOR (CARRIER):", 50, currentY + 8);
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#334155")
          .text(
            `Nombre: ${invoice.carrierName || "Carrier A/S"}`,
            50,
            currentY + 22,
          )
          .text(`NIF / VAT: ${invoice.carrierVat || "N/A"}`, 50, currentY + 34)
          .text(
            `Factura Reclamada: ${invoice.invoiceNumber}`,
            50,
            currentY + 46,
          )
          .text(
            `Fecha Factura: ${invoice.invoiceDate || new Date().toISOString().split("T")[0]}`,
            50,
            currentY + 58,
          );

        doc.rect(305, currentY, 250, 80).strokeColor("#cbd5e1").stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor("#1e293b")
          .text("TRANSITARIO / EMISOR (FORWARDER):", 315, currentY + 8);
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#334155")
          .text(`Atlas Logistics Global Forwarding S.L.`, 315, currentY + 22)
          .text(`NIF: ESB99887766`, 315, currentY + 34)
          .text(
            `Expediente / Ref: DISP-${invoice.invoiceNumber}`,
            315,
            currentY + 46,
          )
          .text(
            `Fecha Emisión: ${new Date().toISOString().split("T")[0]}`,
            315,
            currentY + 58,
          );

        currentY += 95;

        // Disputed Lines Table Header
        doc.rect(40, currentY, 515, 20).fillAndStroke("#f8fafc", "#cbd5e1");
        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#0f172a")
          .text("Doc. Embarque", 45, currentY + 6)
          .text("Concepto / Recargo", 130, currentY + 6)
          .text("Facturado", 290, currentY + 6)
          .text("Pactado", 360, currentY + 6)
          .text("Discrepancia", 430, currentY + 6)
          .text("Moneda", 505, currentY + 6);

        currentY += 20;

        let totalDisputed = 0;
        const linesToRender =
          disputedLines.length > 0
            ? disputedLines
            : [
                {
                  documentNumber: "B/L MSK99482015",
                  chargeCode: "DEMURRAGE",
                  description: "Demurrage Puerto Valencia",
                  billedAmount: 1250.0,
                  expectedAmount: 750.0,
                  varianceAmount: 500.0,
                  disputeReason: "Huelga portuaria en terminal de Valencia.",
                },
              ];

        for (const line of linesToRender) {
          totalDisputed += line.varianceAmount || 0;
          doc.rect(40, currentY, 515, 28).strokeColor("#e2e8f0").stroke();
          doc
            .font("Helvetica-Bold")
            .fontSize(7.5)
            .fillColor("#0f172a")
            .text(line.documentNumber || "N/A", 45, currentY + 5)
            .font("Helvetica")
            .fontSize(7)
            .fillColor("#334155")
            .text(line.description || line.chargeCode, 130, currentY + 5, {
              width: 155,
            })
            .text(`${(line.billedAmount || 0).toFixed(2)}`, 290, currentY + 5)
            .text(`${(line.expectedAmount || 0).toFixed(2)}`, 360, currentY + 5)
            .font("Helvetica-Bold")
            .fillColor("#b91c1c")
            .text(
              `+${(line.varianceAmount || 0).toFixed(2)}`,
              430,
              currentY + 5,
            )
            .fillColor("#0f172a")
            .text(invoice.currency || "EUR", 505, currentY + 5);

          if (line.disputeReason) {
            doc
              .font("Helvetica-Oblique")
              .fontSize(6.5)
              .fillColor("#7f1d1d")
              .text(`Motivo: ${line.disputeReason}`, 130, currentY + 16, {
                width: 370,
              });
          }

          currentY += 28;
        }

        // Total Disputed Box
        currentY += 10;
        doc.rect(40, currentY, 515, 26).fillAndStroke("#fee2e2", "#f87171");
        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor("#7f1d1d")
          .text(
            "TOTAL DISCREPANCIA / IMPORTE ACREDITABLE (DEBIT NOTE):",
            55,
            currentY + 8,
          )
          .text(
            `${totalDisputed.toFixed(2)} ${invoice.currency || "EUR"}`,
            430,
            currentY + 8,
          );

        currentY += 40;

        // Legal Dispute Statement
        doc.rect(40, currentY, 515, 100).fillAndStroke("#f8fafc", "#cbd5e1");
        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor("#0f172a")
          .text("RECLAMACIÓN FORMAL Y PLAZO DE RESOLUCIÓN:", 50, currentY + 10);

        const disputeLegalText =
          "Por medio del presente documento, Atlas Logistics rechaza formalmente los importes desglosados en concepto de recargos indebidos o demoras no imputables al cargador/destinatario. De conformidad con las condiciones generales de contratación y cotizaciones aprobadas, solicitamos la emisión urgente de la correspondiente FACTURA RECTIFICATIVA / NOTA DE CRÉDITO (Credit Note) por el importe de la discrepancia. El importe neto conforme ha sido autorizado para pago en la fecha de vencimiento pactada.";

        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor("#334155")
          .text(disputeLegalText, 50, currentY + 25, {
            width: 495,
            lineGap: 3,
          });

        currentY += 115;

        // Signatures
        doc.rect(40, currentY, 250, 60).strokeColor("#cbd5e1").stroke();
        doc.rect(305, currentY, 250, 60).strokeColor("#cbd5e1").stroke();

        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#1e293b")
          .text(
            "POR ATLAS LOGISTICS (DPTO. TESORERÍA / TRÁFICO)",
            50,
            currentY + 8,
          )
          .text(
            "CONFORMIDAD POR EL PORTEADOR (CARRIER SIGN-OFF)",
            315,
            currentY + 8,
          );

        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#64748b")
          .text("Firma y Sello Autorizado", 50, currentY + 42)
          .text("Firma y Aceptación de Nota de Crédito", 315, currentY + 42);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates an Official Carrier Settlement Statement & Payment Approval PDF.
   */
  static async generateCarrierSettlementStatement(
    invoice: any,
    lines: any[],
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
        doc.rect(40, 40, 515, 60).fillAndStroke("#064e3b", "#047857");
        doc
          .font("Helvetica-Bold")
          .fontSize(14)
          .fillColor("#ffffff")
          .text(
            "CARRIER SETTLEMENT & PAYMENT APPROVAL / ESTADO DE LIQUIDACIÓN Y PAGO",
            55,
            55,
          );
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#a7f3d0")
          .text(
            "Official 3-Way Matched Statement for Ocean Freight, IATA CASS & Road Dispatch",
            55,
            75,
          );

        let currentY = 115;

        // Carrier & Settlement Particulars
        doc.rect(40, currentY, 515, 70).strokeColor("#cbd5e1").stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor("#1e293b")
          .text("DATOS DE LA LIQUIDACIÓN:", 50, currentY + 8);

        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#334155")
          .text(
            `Porteador / Aerolínea: ${invoice.carrierName}`,
            50,
            currentY + 22,
          )
          .text(
            `Nº Factura / CASS Ref: ${invoice.invoiceNumber}`,
            50,
            currentY + 34,
          )
          .text(
            `Modo de Transporte: ${invoice.mode || "MULTIMODAL"}`,
            50,
            currentY + 46,
          )
          .text(
            `Periodo: ${invoice.billingPeriod || "N/A"}`,
            310,
            currentY + 22,
          )
          .text(
            `Fecha Vencimiento: ${invoice.dueDate || "30 Días"}`,
            310,
            currentY + 34,
          )
          .text(
            `Estado: APROBADO PARA PAGO (3-Way Match OK)`,
            310,
            currentY + 46,
          );

        currentY += 85;

        // Matched Lines Table Header
        doc.rect(40, currentY, 515, 20).fillAndStroke("#f1f5f9", "#cbd5e1");
        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#0f172a")
          .text("Doc. Transporte", 45, currentY + 6)
          .text("Concepto Liquidado", 140, currentY + 6)
          .text("Cant.", 310, currentY + 6)
          .text("Tarifa", 360, currentY + 6)
          .text("Importe Neto", 430, currentY + 6)
          .text("Moneda", 505, currentY + 6);

        currentY += 20;

        let totalNetPayable = 0;
        const linesToRender = lines.length > 0 ? lines : [];

        for (const line of linesToRender) {
          totalNetPayable += line.billedAmount || 0;
          doc.rect(40, currentY, 515, 20).strokeColor("#e2e8f0").stroke();
          doc
            .font("Helvetica-Bold")
            .fontSize(7.5)
            .fillColor("#0f172a")
            .text(line.documentNumber || "N/A", 45, currentY + 6)
            .font("Helvetica")
            .fontSize(7)
            .fillColor("#334155")
            .text(line.description || line.chargeCode, 140, currentY + 6, {
              width: 165,
            })
            .text(`${line.billedQuantity || 1}`, 310, currentY + 6)
            .text(`${(line.billedRate || 0).toFixed(2)}`, 360, currentY + 6)
            .font("Helvetica-Bold")
            .fillColor("#047857")
            .text(`${(line.billedAmount || 0).toFixed(2)}`, 430, currentY + 6)
            .fillColor("#0f172a")
            .text(invoice.currency || "EUR", 505, currentY + 6);

          currentY += 20;
        }

        // Net Payable Summary Box
        currentY += 10;
        doc.rect(40, currentY, 515, 30).fillAndStroke("#ecfdf5", "#34d399");
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor("#064e3b")
          .text("TOTAL NETO A PAGAR / NET PAYABLE APPROVED:", 55, currentY + 10)
          .text(
            `${totalNetPayable.toFixed(2)} ${invoice.currency || "EUR"}`,
            430,
            currentY + 10,
          );

        currentY += 45;

        // Treasury Authorization
        doc.rect(40, currentY, 515, 60).fillAndStroke("#f8fafc", "#cbd5e1");
        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor("#0f172a")
          .text(
            "CERTIFICACIÓN Y ORDEN DE TRANSFERENCIA / SEPA / CASS:",
            50,
            currentY + 10,
          );

        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor("#334155")
          .text(
            "El Departamento de Tesorería de Atlas Logistics certifica que la presente liquidación ha superado el protocolo de casación 3-Way Match con cero discrepancias pendientes, autorizando el abono en cuenta bancaria en la fecha de vencimiento.",
            50,
            currentY + 24,
            { width: 495, lineGap: 3 },
          );

        currentY += 75;

        // Signatures
        doc.rect(40, currentY, 250, 60).strokeColor("#cbd5e1").stroke();
        doc.rect(305, currentY, 250, 60).strokeColor("#cbd5e1").stroke();

        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#1e293b")
          .text("CONTROL DE GESTIÓN & TRÁFICO", 50, currentY + 8)
          .text("DIRECTOR DE TESORERÍA / CFO", 315, currentY + 8);

        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#64748b")
          .text("Conforme Casación 3-Way Match", 50, currentY + 42)
          .text("Autorización Orden de Pago", 315, currentY + 42);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
