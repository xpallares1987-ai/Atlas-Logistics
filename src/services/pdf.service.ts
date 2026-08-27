import PDFDocument from "pdfkit";

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
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
}

export interface AgentSettlementData {
  statementNumber: string;
  agentName: string;
  periodStart: string;
  periodEnd: string;
  netBalance: number;
  currency: string;
  status: string;
}

export interface BookingConfirmationData {
  referenceNumber: string;
  customer: string;
  origin: string;
  destination: string;
  serviceType: string;
  equipment: string;
  vessel: string;
  voyage: string;
  issueDate?: string;
}

export interface CustomsData {
  declarationId: string;
  duaNumber?: string;
  shipmentId: string;
  type: string;
  status: string;
  channel?: string;
  originCountry?: string;
  destinationCountry?: string;
  eoriNumber?: string;
  consigneeName?: string;
  exporterName?: string;
  hsCode?: string;
  hsDescription?: string;
  customsValue?: number;
  dutiesAmount?: number;
  taxesAmount?: number;
  totalPayable?: number;
  riskScore?: number;
  riskFlags?: string | string[];
  aiRiskScore?: number;
  aiRiskFlag?: string;
  duaData?: any;
}

export class PDFService {
  /**
   * Generates a generic House Bill of Lading (HBL) PDF in memory.
   */
  static async generateHBL(data: HBLData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: "A4" });
        const buffers: Buffer[] = [];

        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
          resolve(Buffer.concat(buffers));
        });

        // Header
        doc.fontSize(20).text("HOUSE BILL OF LADING", { align: "center" });
        doc.moveDown();

        // Shipment Info Box
        doc.fontSize(10);
        doc.rect(50, doc.y, 500, 100).stroke();
        doc.text(
          `B/L Number: HBL-${data.shipmentId.substring(0, 8).toUpperCase()}`,
          60,
          doc.y + 10,
        );
        doc.text(
          `Issue Date: ${data.issueDate || new Date().toLocaleDateString()}`,
          60,
          doc.y + 15,
        );
        doc.moveDown(4);

        // Entities
        doc.fontSize(12).font("Helvetica-Bold").text("Shipper:");
        doc
          .font("Helvetica")
          .fontSize(10)
          .text(data.shipper || "N/A")
          .moveDown();

        doc.fontSize(12).font("Helvetica-Bold").text("Consignee:");
        doc
          .font("Helvetica")
          .fontSize(10)
          .text(data.consignee || "N/A")
          .moveDown();

        if (data.notifyParty) {
          doc.fontSize(12).font("Helvetica-Bold").text("Notify Party:");
          doc.font("Helvetica").fontSize(10).text(data.notifyParty).moveDown();
        }

        // Routing
        doc.rect(50, doc.y, 500, 60).stroke();
        doc.text(
          `Vessel / Voyage: ${data.vessel} / ${data.voyage}`,
          60,
          doc.y + 10,
        );
        doc.text(`Port of Loading: ${data.portOfLoading}`, 60, doc.y + 15);
        doc.text(`Port of Discharge: ${data.portOfDischarge}`, 60, doc.y + 15);
        doc.moveDown(3);

        // Cargo details
        doc
          .fontSize(12)
          .font("Helvetica-Bold")
          .text("Cargo Description:")
          .moveDown();

        data.commodities.forEach((cmd, idx) => {
          doc
            .font("Helvetica")
            .fontSize(10)
            .text(
              `${idx + 1}. ${cmd.description} - ${cmd.pieces} pcs | ${cmd.grossWeightKg} KG | ${cmd.volumeCbm} CBM`,
            );
        });
        doc.moveDown();

        // Container details
        doc.fontSize(12).font("Helvetica-Bold").text("Containers:").moveDown();
        data.containers.forEach((ctr, idx) => {
          doc
            .font("Helvetica")
            .fontSize(10)
            .text(
              `${idx + 1}. ${ctr.containerNumber} (${ctr.isoType}) - Seal: ${ctr.sealNumber || "N/A"}`,
            );
        });

        // Footer terms
        doc.moveDown(4);
        doc
          .fontSize(8)
          .text(
            "RECEIVED by the Carrier the goods as specified above in apparent good order and condition unless otherwise stated, to be transported to such place as agreed, authorized or permitted herein and subject to all the terms and conditions appearing on the front and reverse of this Bill of Lading.",
            { align: "justify" },
          );

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
        const doc = new PDFDocument({ margin: 50, size: "A4" });
        const buffers: Buffer[] = [];

        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
          resolve(Buffer.concat(buffers));
        });

        // Header
        doc.fontSize(22).text("INVOICE", 50, 50);
        doc.fontSize(12);
        doc.text(`Invoice Number: ${data.invoiceNumber}`, 50, 80);
        doc.text(`Date Issued: ${new Date().toLocaleDateString()}`, 50, 95);
        doc.text(
          `Due Date: ${new Date(data.dueDate).toLocaleDateString()}`,
          50,
          110,
        );

        doc.text(`Type: ${data.type}`, 400, 80);

        doc.moveDown(2);
        doc.font("Helvetica-Bold").text("Billed To:");
        doc.font("Helvetica").text(data.party || "Unknown Client");

        doc.moveDown(2);

        // Table Header
        const startY = doc.y + 10;
        doc.font("Helvetica-Bold");
        doc.text("Description", 50, startY);
        doc.text("Qty", 300, startY);
        doc.text("Unit Price", 380, startY);
        doc.text("Total", 480, startY);

        doc
          .moveTo(50, startY + 15)
          .lineTo(550, startY + 15)
          .stroke();

        doc.font("Helvetica");
        let currentY = startY + 25;

        data.items.forEach((item) => {
          doc.text(item.description, 50, currentY, { width: 240 });
          doc.text(item.quantity.toString(), 300, currentY);
          doc.text(item.unitPrice.toFixed(2), 380, currentY);
          doc.text(item.total.toFixed(2), 480, currentY);
          currentY += 20;
        });

        doc.moveTo(50, currentY).lineTo(550, currentY).stroke();

        currentY += 15;
        doc.font("Helvetica-Bold");
        doc.text(`Total Amount (${data.currency})`, 300, currentY);
        doc.text(
          `${new Intl.NumberFormat("en-US", { style: "currency", currency: data.currency }).format(data.amount)}`,
          480,
          currentY,
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates an Agent Settlement PDF in memory.
   */
  static async generateAgentSettlement(
    data: AgentSettlementData,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: "A4" });
        const buffers: Buffer[] = [];

        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header
        doc
          .fontSize(20)
          .text("AGENT SETTLEMENT STATEMENT", { align: "center" });
        doc.moveDown(2);

        // Details Box
        doc.fontSize(10);
        doc.rect(50, doc.y, 500, 140).stroke();
        doc.text(`Statement Number: ${data.statementNumber}`, 60, doc.y + 10);
        doc.text(`Agent Name: ${data.agentName}`, 60, doc.y + 15);
        doc.text(
          `Period: ${new Date(data.periodStart).toLocaleDateString()} to ${new Date(data.periodEnd).toLocaleDateString()}`,
          60,
          doc.y + 15,
        );
        doc.text(`Status: ${data.status}`, 60, doc.y + 15);

        doc.moveDown(4);

        // Financials
        doc
          .font("Helvetica-Bold")
          .fontSize(14)
          .text("Financial Summary", 60, doc.y);
        doc.moveDown(1);
        doc.font("Helvetica").fontSize(12);

        doc.text(
          `Net Balance: ${new Intl.NumberFormat("en-US", { style: "currency", currency: data.currency }).format(data.netBalance)}`,
          {
            align: "left",
          },
        );

        doc.moveDown(4);
        doc
          .fontSize(8)
          .fillColor("black")
          .text(
            "This statement is generated automatically by Atlas Logistics. If you have any questions, please contact accounting@atlaslogistics.com.",
            { align: "center" },
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates a Booking Confirmation PDF in memory.
   */
  static async generateBookingConfirmation(
    data: BookingConfirmationData,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: "A4" });
        const buffers: Buffer[] = [];

        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header
        doc.fontSize(20).text("BOOKING CONFIRMATION", { align: "center" });
        doc.moveDown(2);

        // Details Box
        doc.fontSize(10);
        doc.rect(50, doc.y, 500, 160).stroke();
        doc.text(`Reference Number: ${data.referenceNumber}`, 60, doc.y + 10);
        doc.text(
          `Issue Date: ${data.issueDate || new Date().toLocaleDateString()}`,
          60,
          doc.y + 15,
        );
        doc.text(`Customer: ${data.customer}`, 60, doc.y + 15);
        doc.moveDown(2);

        doc.font("Helvetica-Bold").text("Routing Details:");
        doc
          .font("Helvetica")
          .text(`Port of Loading (Origin): ${data.origin}`, 60, doc.y + 5);
        doc.text(
          `Port of Discharge (Destination): ${data.destination}`,
          60,
          doc.y + 15,
        );
        doc.text(
          `Vessel / Voyage: ${data.vessel} / ${data.voyage}`,
          60,
          doc.y + 15,
        );
        doc.moveDown(2);

        doc.font("Helvetica-Bold").text("Equipment / Service:");
        doc
          .font("Helvetica")
          .text(
            `Service Type: ${data.serviceType || "Unknown"}`,
            60,
            doc.y + 5,
          );
        doc.text(`Equipment Requirements: ${data.equipment}`, 60, doc.y + 15);

        doc.moveDown(5);
        doc
          .fontSize(8)
          .fillColor("black")
          .text(
            "This booking confirmation is subject to space and equipment availability. Please ensure cargo is delivered to the terminal before the designated cut-off time.",
            { align: "center" },
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates an official Single Administrative Document (DUA / SAD) PDF in memory.
   */
  static async generateCustomsDeclaration(data: CustomsData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: "A4" });
        const buffers: Buffer[] = [];

        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        const duaNum =
          data.duaNumber ||
          `26ES000811${data.declarationId.substring(0, 8).toUpperCase()}`;
        const issueDate = new Date().toLocaleDateString("es-ES");

        // Header Title
        doc
          .font("Helvetica-Bold")
          .fontSize(16)
          .text("DOCUMENTO UNICO ADMINISTRATIVO (DUA / SAD)", {
            align: "center",
          });
        doc
          .font("Helvetica")
          .fontSize(9)
          .text(
            "AGENCIA TRIBUTARIA - DEPARTAMENTO DE ADUANAS E IMPUESTOS ESPECIALES",
            { align: "center" },
          );
        doc.moveDown(1.5);

        // Header Metadata Box
        const startY = doc.y;
        doc.rect(40, startY, 515, 45).stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .text(`Numero DUA: ${duaNum}`, 50, startY + 8);
        doc
          .font("Helvetica")
          .text(`Fecha Registro: ${issueDate}`, 250, startY + 8);
        doc.text(
          `Aduana de Despacho: ES000811 - ADUANA MARITIMA BARCELONA`,
          50,
          startY + 24,
        );
        doc.text(
          `Regimen / Tipo: ${data.type || "IM4 - Importacion a libre practica"}`,
          350,
          startY + 24,
        );

        // Box 1, 2, 8, 14
        let currentY = startY + 55;
        doc.rect(40, currentY, 250, 65).stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .text("CASILLA 02 - Exportador / Expedidor:", 45, currentY + 6);
        doc
          .font("Helvetica")
          .text(
            data.exporterName || "Global Freight Logistics Ltd",
            45,
            currentY + 18,
          );
        doc.text("Pudong Logistics District, Shanghai (CN)", 45, currentY + 30);
        doc.text(
          `Pais Origen: ${data.originCountry || "CN"}`,
          45,
          currentY + 45,
        );

        doc.rect(295, currentY, 260, 65).stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .text("CASILLA 08 - Destinatario / Importador:", 300, currentY + 6);
        doc
          .font("Helvetica")
          .text(
            data.consigneeName || "Iberica Import Logistics SL",
            300,
            currentY + 18,
          );
        doc.text("Carrer del Port 45, Barcelona (ES)", 300, currentY + 30);
        doc.text(
          `EORI: ${data.eoriNumber || "ESB88492019"}`,
          300,
          currentY + 45,
        );

        currentY += 75;
        doc.rect(40, currentY, 515, 40).stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(
            "CASILLA 14 - Declarante / Representante Aduanero:",
            45,
            currentY + 6,
          );
        doc
          .font("Helvetica")
          .text(
            "Atlas Logistics Customs Brokerage SL (EORI: ESB88492019) - Representacion Directa",
            45,
            currentY + 18,
          );

        // Commodity & HS Code Box 31, 33, 34, 46
        currentY += 50;
        doc.rect(40, currentY, 515, 80).stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(
            "CASILLA 31 - Descripcion de la Mercancia y Bultos:",
            45,
            currentY + 6,
          );
        doc
          .font("Helvetica")
          .text(
            `Partida: ${data.hsDescription || "Static converters and power supply units"}`,
            45,
            currentY + 18,
          );
        doc.text(
          `Referencia B/L: BL-${data.shipmentId.substring(0, 8).toUpperCase()} | Bultos: 40 Pallets`,
          45,
          currentY + 30,
        );

        doc
          .font("Helvetica-Bold")
          .text(`CASILLA 33 (Codigo TARIC):`, 45, currentY + 50);
        doc
          .font("Helvetica")
          .text(data.hsCode || "8504.40.90.90", 170, currentY + 50);

        doc
          .font("Helvetica-Bold")
          .text(`CASILLA 46 (Valor Estadistico CIF):`, 300, currentY + 50);
        const customsVal = data.customsValue ?? 25000;
        doc
          .font("Helvetica")
          .text(
            `${customsVal.toLocaleString("es-ES", { minimumFractionDigits: 2 })} EUR`,
            450,
            currentY + 50,
          );

        // Box 47 - Tax Calculation Table
        currentY += 90;
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .text(
            "CASILLA 47 - Calculo de Tributos y Liquidacion:",
            40,
            currentY,
          );
        currentY += 15;

        // Table Header
        doc.rect(40, currentY, 515, 20).fillAndStroke("#f1f5f9", "#94a3b8");
        doc.fillColor("#0f172a").fontSize(8).font("Helvetica-Bold");
        doc.text("Codigo", 50, currentY + 6);
        doc.text("Concepto Tributario", 100, currentY + 6);
        doc.text("Base Imponible", 260, currentY + 6);
        doc.text("Tipo %", 370, currentY + 6);
        doc.text("Importe Liquidado", 450, currentY + 6);

        currentY += 20;
        const dutyAmt =
          data.dutiesAmount ?? Math.round(customsVal * 0.033 * 100) / 100;
        const vatAmt =
          data.taxesAmount ??
          Math.round((customsVal + dutyAmt) * 0.21 * 100) / 100;
        const totalPay =
          data.totalPayable ?? Math.round((dutyAmt + vatAmt) * 100) / 100;

        // Row 1: Duty
        doc.rect(40, currentY, 515, 20).stroke("#cbd5e1");
        doc.font("Helvetica").fontSize(8);
        doc.text("A00", 50, currentY + 6);
        doc.text("Derechos de Arancel (Import Duty)", 100, currentY + 6);
        doc.text(`${customsVal.toFixed(2)} EUR`, 260, currentY + 6);
        doc.text("3.3%", 370, currentY + 6);
        doc.text(`${dutyAmt.toFixed(2)} EUR`, 450, currentY + 6);

        // Row 2: VAT
        currentY += 20;
        doc.rect(40, currentY, 515, 20).stroke("#cbd5e1");
        doc.text("B00", 50, currentY + 6);
        doc.text("IVA a la Importacion (Import VAT)", 100, currentY + 6);
        doc.text(`${(customsVal + dutyAmt).toFixed(2)} EUR`, 260, currentY + 6);
        doc.text("21.0%", 370, currentY + 6);
        doc.text(`${vatAmt.toFixed(2)} EUR`, 450, currentY + 6);

        // Total Row
        currentY += 20;
        doc.rect(40, currentY, 515, 22).fillAndStroke("#e2e8f0", "#64748b");
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(9);
        doc.text("TOTAL A INGRESAR / LIQUIDACION TOTAL:", 100, currentY + 6);
        doc.text(`${totalPay.toFixed(2)} EUR`, 450, currentY + 6);

        // Channel Decision Box & Stamp
        currentY += 35;
        const channel = data.channel || data.status || "Green Channel";
        const isGreen = channel === "Green Channel" || channel === "Cleared";
        const isOrange = channel === "Orange Channel" || channel === "Pending";

        const stampBg = isGreen ? "#ecfdf5" : isOrange ? "#fffbeb" : "#fef2f2";
        const stampBorder = isGreen
          ? "#10b981"
          : isOrange
            ? "#f59e0b"
            : "#ef4444";
        const stampColor = isGreen
          ? "#047857"
          : isOrange
            ? "#b45309"
            : "#b91c1c";
        const channelLabel = isGreen
          ? "CANAL VERDE - LEVANTE AUTORIZADO"
          : isOrange
            ? "CANAL NARANJA - CONTROL DOCUMENTAL"
            : "CANAL ROJO - INSPECCION FISICA";

        doc.rect(40, currentY, 515, 55).fillAndStroke(stampBg, stampBorder);
        doc
          .fillColor(stampColor)
          .font("Helvetica-Bold")
          .fontSize(12)
          .text(channelLabel, 50, currentY + 12, { align: "center" });
        doc
          .fontSize(8)
          .font("Helvetica")
          .text(
            `Puntuacion de Riesgo Normativo: ${data.riskScore ?? data.aiRiskScore ?? 12}/100 | Verificacion de Reglas Deterministas`,
            50,
            currentY + 34,
            { align: "center" },
          );

        // Box 54 - Signature & Footer
        currentY += 65;
        doc.fillColor("#000000").rect(40, currentY, 515, 40).stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(
            "CASILLA 54 - Lugar, Fecha y Firma Electronica del Declarante:",
            45,
            currentY + 6,
          );
        doc
          .font("Helvetica")
          .text(
            `Barcelona, a ${issueDate} | Certificado Electronico FNMT: EORI-ESB88492019-ATLAS`,
            45,
            currentY + 20,
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
