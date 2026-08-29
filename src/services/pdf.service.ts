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

  static generateAirWaybill(data: {
    awbNumber: string;
    type?: string;
    airlinePrefix?: string;
    airlineName?: string;
    originAirport: string;
    destinationAirport: string;
    flightNumber?: string;
    flightDate?: Date | string;
    shipperData: any;
    consigneeData: any;
    issuingAgentData?: any;
    pieces: number;
    grossWeightKg: number;
    volumeCbm?: number;
    chargeableWeightKg: number;
    rateClass?: string;
    ratePerKg: number;
    freightCharge: number;
    otherCharges?: Array<{ code: string; name: string; amount: number }>;
    totalPrepaid?: number;
    totalCollect?: number;
    currency?: string;
    natureOfGoods: string;
    specialHandlingCodes?: string[];
    handlingInfo?: string;
    eAwbCertified?: boolean;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 30,
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header Title & Neutral AWB Bar
        doc.rect(30, 30, 535, 45).fillAndStroke("#0f172a", "#334155");
        doc.fillColor("#ffffff").fontSize(14).font("Helvetica-Bold");
        doc.text(`${data.airlineName || "IATA NEUTRAL"} AIR WAYBILL`, 40, 40);
        doc.fontSize(8).font("Helvetica");
        doc.text(
          "NOT NEGOTIABLE AIR WAYBILL (AIR CONSIGNMENT NOTE) - ISSUED ACCORDING TO IATA RESOLUTION 600a",
          40,
          58,
        );

        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .text(data.awbNumber || "075-84920153", 400, 42, {
            align: "right",
            width: 155,
          });

        let currentY = 80;

        // Box 1 & Box 2: Shipper and Consignee
        doc.fillColor("#000000").rect(30, currentY, 265, 75).stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(7)
          .text("1. SHIPPER'S NAME AND ADDRESS / EXPEDIDOR", 35, currentY + 5);
        doc
          .font("Helvetica")
          .fontSize(8)
          .text(
            data.shipperData?.name || "Atlas Freight Solutions SL",
            35,
            currentY + 16,
          );
        doc.text(
          data.shipperData?.address || "Centro de Carga Aérea, 28042 Madrid",
          35,
          currentY + 28,
        );
        doc.text(
          `Country: ${data.shipperData?.country || "ES"} | Tel: ${data.shipperData?.contact || "N/A"}`,
          35,
          currentY + 50,
        );

        // Box 3: Issuing Carrier's Agent
        doc.rect(295, currentY, 270, 75).stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(7)
          .text(
            "3. ISSUING CARRIER'S AGENT / AGENTE EMISOR",
            300,
            currentY + 5,
          );
        doc
          .font("Helvetica")
          .fontSize(8)
          .text(
            data.issuingAgentData?.name || "ATLAS AIR CARGO FORWARDING",
            300,
            currentY + 16,
          );
        doc.text(
          `City: ${data.issuingAgentData?.city || data.originAirport} | IATA Code: ${data.issuingAgentData?.iataCode || "78-4-7291/0014"}`,
          300,
          currentY + 28,
        );
        doc.text(
          `CASS Account: ${data.issuingAgentData?.cassAddress || "ES-CASS-8819"}`,
          300,
          currentY + 40,
        );
        doc
          .font("Helvetica-Bold")
          .text(
            `e-AWB Certified: ${data.eAwbCertified !== false ? "YES (IATA Res 672)" : "NO"}`,
            300,
            currentY + 55,
          );

        currentY += 80;

        // Box 2: Consignee
        doc.rect(30, currentY, 265, 65).stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(7)
          .text(
            "2. CONSIGNEE'S NAME AND ADDRESS / DESTINATARIO",
            35,
            currentY + 5,
          );
        doc
          .font("Helvetica")
          .fontSize(8)
          .text(
            data.consigneeData?.name || "Atlas Global Logistics USA Inc",
            35,
            currentY + 16,
          );
        doc.text(
          data.consigneeData?.address ||
            "JFK International Airport, Jamaica, NY",
          35,
          currentY + 28,
        );
        doc.text(
          `Country: ${data.consigneeData?.country || "US"} | Contact: ${data.consigneeData?.contact || "N/A"}`,
          35,
          currentY + 45,
        );

        // Box 5 & 6: Airport of Departure & Requested Routing
        doc.rect(295, currentY, 270, 65).stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(7)
          .text(
            "5. AIRPORT OF DEPARTURE & ROUTING / ORIGEN Y RUTA",
            300,
            currentY + 5,
          );
        doc
          .font("Helvetica")
          .fontSize(9)
          .text(
            `${data.originAirport}  ➔  ${data.destinationAirport}`,
            300,
            currentY + 18,
          );
        doc
          .fontSize(8)
          .text(
            `Flight/Date: ${data.flightNumber || "IB6251"} / ${data.flightDate ? new Date(data.flightDate).toLocaleDateString("es-ES") : "SCHEDULED"}`,
            300,
            currentY + 34,
          );
        doc.text(
          `Currency: ${data.currency || "EUR"} | CHGS Code: PP (Prepaid)`,
          300,
          currentY + 48,
        );

        currentY += 70;

        // Box 8: Handling Information & Special Handling Codes
        doc.rect(30, currentY, 535, 45).fillAndStroke("#f8fafc", "#94a3b8");
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7);
        doc.text(
          "8. HANDLING INFORMATION & SPECIAL HANDLING CODES (SHC) / INFORMACIÓN DE MANIPULACIÓN",
          35,
          currentY + 5,
        );
        doc.fillColor("#000000").font("Helvetica").fontSize(8);
        doc.text(
          data.handlingInfo || "GENERAL CARGO - HANDLE WITH CARE",
          35,
          currentY + 16,
          { width: 520 },
        );
        doc
          .font("Helvetica-Bold")
          .text(
            `Special Handling Codes: ${(data.specialHandlingCodes || ["GEN"]).join(" | ")}`,
            35,
            currentY + 30,
          );

        currentY += 52;

        // Box 9: Standard Rating Table (8 columns)
        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .text(
            "9. RATING & CHARGES CALCULATION / LIQUIDACIÓN DE FLETE AÉREO",
            30,
            currentY,
          );
        currentY += 12;

        // Table Header
        doc.rect(30, currentY, 535, 18).fillAndStroke("#e2e8f0", "#64748b");
        doc.fillColor("#0f172a").fontSize(7).font("Helvetica-Bold");
        doc.text("Pieces", 35, currentY + 5);
        doc.text("Gross Wt (kg)", 75, currentY + 5);
        doc.text("Class", 145, currentY + 5);
        doc.text("Vol (m³)", 180, currentY + 5);
        doc.text("Chrg Wt (kg)", 225, currentY + 5);
        doc.text("Rate / kg", 295, currentY + 5);
        doc.text("Total Freight", 360, currentY + 5);
        doc.text("Nature of Goods / DGR", 435, currentY + 5);

        currentY += 18;

        // Table Body Row
        doc.fillColor("#000000").rect(30, currentY, 535, 30).stroke();
        doc.fontSize(8).font("Helvetica");
        doc.text(String(data.pieces || 1), 35, currentY + 8);
        doc.text(Number(data.grossWeightKg || 0).toFixed(1), 75, currentY + 8);
        doc.text(data.rateClass || "Q", 145, currentY + 8);
        doc.text(Number(data.volumeCbm || 0).toFixed(3), 180, currentY + 8);
        doc.text(
          Number(data.chargeableWeightKg || 0).toFixed(1),
          225,
          currentY + 8,
        );
        doc.text(
          `${Number(data.ratePerKg || 0).toFixed(2)} ${data.currency || "EUR"}`,
          295,
          currentY + 8,
        );
        doc
          .font("Helvetica-Bold")
          .text(
            `${Number(data.freightCharge || 0).toFixed(2)} ${data.currency || "EUR"}`,
            360,
            currentY + 8,
          );
        doc
          .font("Helvetica")
          .fontSize(7)
          .text(data.natureOfGoods || "General Cargo", 435, currentY + 5, {
            width: 125,
          });

        currentY += 35;

        // Box 10: Other Charges Breakdown
        doc.rect(30, currentY, 265, 85).stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(7)
          .text(
            "10. OTHER CHARGES DUE CARRIER / OTROS RECARGOS IATA",
            35,
            currentY + 5,
          );

        let otherY = currentY + 16;
        const otherList = data.otherCharges || [];
        if (otherList.length === 0) {
          doc
            .font("Helvetica")
            .fontSize(7)
            .text("No additional surcharges", 35, otherY);
        } else {
          doc.font("Helvetica").fontSize(7);
          for (const oc of otherList.slice(0, 4)) {
            doc.text(`${oc.code} - ${oc.name || oc.code}:`, 35, otherY);
            doc.text(
              `${Number(oc.amount).toFixed(2)} ${data.currency || "EUR"}`,
              230,
              otherY,
              { align: "right", width: 60 },
            );
            otherY += 12;
          }
        }

        // Box 11: Prepaid / Collect Totals Summary
        doc.rect(295, currentY, 270, 85).fillAndStroke("#f1f5f9", "#cbd5e1");
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7);
        doc.text("11. TOTALS SUMMARY / RESUMEN TOTAL", 300, currentY + 5);

        const totalPrepaid = Number(data.totalPrepaid || 0);
        const totalCollect = Number(data.totalCollect || 0);
        const totalPayable =
          totalPrepaid > 0 ? totalPrepaid : data.freightCharge || 0;

        doc.font("Helvetica").fontSize(8).fillColor("#334155");
        doc.text("Weight Charge (Flete Base):", 300, currentY + 20);
        doc.text(
          `${Number(data.freightCharge || 0).toFixed(2)} ${data.currency || "EUR"}`,
          480,
          currentY + 20,
          { align: "right", width: 80 },
        );

        doc.text("Total Other Charges Due Carrier:", 300, currentY + 34);
        const sumOther = otherList.reduce(
          (acc, c) => acc + Number(c.amount || 0),
          0,
        );
        doc.text(
          `${sumOther.toFixed(2)} ${data.currency || "EUR"}`,
          480,
          currentY + 34,
          { align: "right", width: 80 },
        );

        doc
          .rect(295, currentY + 50, 270, 25)
          .fillAndStroke("#0284c7", "#0369a1");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10);
        doc.text("TOTAL PREPAID:", 305, currentY + 58);
        doc.text(
          `${totalPayable.toFixed(2)} ${data.currency || "EUR"}`,
          460,
          currentY + 58,
          { align: "right", width: 100 },
        );

        currentY += 92;

        // Box 12: Shipper Certification & Carrier Signature
        doc.fillColor("#000000").rect(30, currentY, 535, 55).stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(7)
          .text(
            "12. SHIPPER'S CERTIFICATION & ISSUING CARRIER SIGNATURE / CERTIFICACIÓN Y FIRMA",
            35,
            currentY + 5,
          );
        doc
          .font("Helvetica")
          .fontSize(6.5)
          .text(
            "Shipper certifies that the particulars on the face hereof are correct and that insofar as any part of the consignment contains dangerous goods, such part is properly described by name and is in proper condition for carriage by air according to the applicable Dangerous Goods Regulations.",
            35,
            currentY + 16,
            { width: 520 },
          );
        doc
          .font("Helvetica-Bold")
          .fontSize(7)
          .text(
            `Executed at: ${data.originAirport} | Date: ${new Date().toISOString().substring(0, 10)} | Signature of Issuing Carrier or Agent: ATLAS AIR CARGO ELECTRONIC CERTIFICATE`,
            35,
            currentY + 40,
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

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

  /**
   * Generates formal Notice of Claim & Carrier Protest Letter (Carta de Reserva al Porteador)
   */
  public static async generateCarrierProtestLetter(claim: {
    claimNumber: string;
    transportDocNumber: string;
    transportMode: string;
    governingConvention: string;
    incidentType: string;
    incidentDate: string | Date;
    noticeDate: string | Date;
    deliveryDate?: string | Date;
    claimantName: string;
    carrierName: string;
    packagesDamaged: number;
    damagedWeightKg: number;
    claimedAmount: number;
    claimedCurrency: string;
    statutoryLimitEur: number;
    incidentDescription: string;
    surveyorData?: any;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: "A4", margin: 36 });
        const buffers: Buffer[] = [];

        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header Background Banner
        doc.rect(36, 36, 523, 50).fill("#1e293b");
        doc
          .fillColor("#ffffff")
          .font("Helvetica-Bold")
          .fontSize(13)
          .text("ATLAS LOGISTICS LEGAL & CLAIMS DEPARTMENT", 48, 46);
        doc
          .fontSize(8)
          .font("Helvetica")
          .text("FORMAL NOTICE OF CARGO CLAIM & RESERVATION OF RIGHTS", 48, 62);
        doc
          .fontSize(8)
          .fillColor("#38bdf8")
          .text(
            `REF: ${claim.claimNumber} | ${claim.governingConvention}`,
            360,
            52,
            { align: "right" },
          );

        // Addressee / Carrier Box
        const carrierY = 96;
        doc.rect(36, carrierY, 523, 50).strokeColor("#cbd5e1").stroke();
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .text(
            "TO / DESTINATARIO (CARRIER / OPERADOR DE TRANSPORTE):",
            44,
            carrierY + 6,
          );
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor("#0284c7")
          .text(claim.carrierName, 44, carrierY + 20);
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#475569")
          .text(
            `Transport Document: ${claim.transportDocNumber} | Mode: ${claim.transportMode}`,
            44,
            carrierY + 34,
          );

        // Transport Particulars & Incident Grid
        const gridY = 154;
        doc.rect(36, gridY, 523, 85).strokeColor("#cbd5e1").stroke();
        doc.rect(36, gridY, 523, 16).fill("#f1f5f9");
        doc
          .fillColor("#1e293b")
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .text(
            "1. TRANSPORT PARTICULARS & DAMAGE SPECIFICATION",
            44,
            gridY + 4,
          );

        doc.font("Helvetica").fontSize(7.5).fillColor("#475569");
        doc.text(`Claimant / Cargador: ${claim.claimantName}`, 44, gridY + 24);
        doc.text(
          `Incident Date: ${new Date(claim.incidentDate).toISOString().substring(0, 10)}`,
          300,
          gridY + 24,
        );
        doc.text(
          `Delivery Date: ${claim.deliveryDate ? new Date(claim.deliveryDate).toISOString().substring(0, 10) : "N/A"}`,
          300,
          gridY + 38,
        );
        doc.text(
          `Damaged Packages: ${claim.packagesDamaged} units`,
          44,
          gridY + 38,
        );
        doc.text(
          `Damaged Gross Weight: ${claim.damagedWeightKg} kg`,
          44,
          gridY + 52,
        );
        doc.text(
          `Claimed Amount: ${claim.claimedAmount.toFixed(2)} ${claim.claimedCurrency}`,
          300,
          gridY + 52,
        );
        doc.text(
          `Governing Convention: ${claim.governingConvention} (Statutory Limit: ${claim.statutoryLimitEur.toFixed(2)} EUR)`,
          44,
          gridY + 66,
        );

        // Incident Description Box
        const descY = 247;
        doc.rect(36, descY, 523, 55).strokeColor("#cbd5e1").stroke();
        doc.rect(36, descY, 523, 16).fill("#f1f5f9");
        doc
          .fillColor("#1e293b")
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .text(
            "2. STATEMENT OF DAMAGE / DESCRIPCIÓN DEL SINIESTRO",
            44,
            descY + 4,
          );
        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor("#334155")
          .text(claim.incidentDescription, 44, descY + 22, { width: 505 });

        // Legal Notice & Reservation Clause
        const legalY = 310;
        doc
          .rect(36, legalY, 523, 90)
          .strokeColor("#dc2626")
          .lineWidth(1)
          .stroke();
        doc.rect(36, legalY, 523, 16).fill("#fef2f2");
        doc
          .fillColor("#991b1b")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(
            "3. FORMAL RESERVATION OF RIGHTS & LEGAL NOTICE (CARTA DE RESERVA FORMAL)",
            44,
            legalY + 4,
          );

        const legalText = `Por medio de la presente, ponemos en su conocimiento que las mercancías amparadas bajo el documento de transporte ${claim.transportDocNumber} fueron entregadas con graves daños / pérdidas consistentes en ${claim.incidentType}.
En cumplimiento estricto de los plazos de protesta establecidos en el Convenio aplicable (${claim.governingConvention}), formulamos formal y expresa RESERVA DE DERECHOS frente a su compañía como porteador contractual / efectivo, haciéndoles formalmente responsables de todos los daños, perjuicios, deméritos y gastos derivados.
Se les requiere para que procedan a la peritación conjunta de los daños y al inmediato abono de la cantidad reclamada de ${claim.claimedAmount.toFixed(2)} ${claim.claimedCurrency}.`;

        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#1e293b")
          .text(legalText, 44, legalY + 22, { width: 505, lineGap: 2 });

        // Signatures
        const signY = 410;
        doc.rect(36, signY, 523, 65).strokeColor("#cbd5e1").stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#0f172a")
          .text(
            "ISSUED ON BEHALF OF CLAIMANT & CARGO INTERESTS / EN NOMBRE DE LOS INTERESES DE LA CARGA:",
            44,
            signY + 6,
          );
        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#475569")
          .text(
            `Atlas Logistics Claims Department | Date of Issue: ${new Date(claim.noticeDate).toISOString().substring(0, 10)}`,
            44,
            signY + 20,
          );
        doc
          .font("Helvetica-Bold")
          .fontSize(7)
          .fillColor("#0284c7")
          .text(
            "Digital Legal Signature & Corporate Seal Certified",
            44,
            signY + 48,
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates official Subrogation Receipt & Assignment of Rights (Recibo de Finiquito y Subrogación de Derechos)
   */
  public static async generateSubrogationReceipt(claim: {
    claimNumber: string;
    transportDocNumber: string;
    claimantName: string;
    carrierName: string;
    claimedAmount: number;
    claimedCurrency: string;
    insurancePayoutAmount: number;
    incidentDate: string | Date;
    governingConvention: string;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: "A4", margin: 36 });
        const buffers: Buffer[] = [];

        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header Background Banner
        doc.rect(36, 36, 523, 50).fill("#064e3b");
        doc
          .fillColor("#ffffff")
          .font("Helvetica-Bold")
          .fontSize(13)
          .text("ATLAS LOGISTICS CARGO INSURANCE DIVISION", 48, 46);
        doc
          .fontSize(8)
          .font("Helvetica")
          .text(
            "SUBROGATION RECEIPT & ASSIGNMENT OF RIGHTS (RECIBO DE FINIQUITO Y SUBROGACIÓN)",
            48,
            62,
          );
        doc
          .fontSize(8)
          .fillColor("#6ee7b7")
          .text(`REF: ${claim.claimNumber}`, 360, 52, { align: "right" });

        // Amount Box
        const amountY = 96;
        doc.rect(36, amountY, 523, 40).fill("#ecfdf5");
        doc
          .strokeColor("#10b981")
          .lineWidth(1)
          .rect(36, amountY, 523, 40)
          .stroke();
        doc
          .fillColor("#065f46")
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .text(
            "INDEMNIFICATION SETTLEMENT AMOUNT (IMPORTE DE INDEMNIZACIÓN):",
            44,
            amountY + 6,
          );
        doc
          .font("Helvetica-Bold")
          .fontSize(14)
          .fillColor("#047857")
          .text(
            `${claim.insurancePayoutAmount.toFixed(2)} ${claim.claimedCurrency}`,
            44,
            amountY + 18,
          );

        // Subrogation Legal Terms
        const termsY = 146;
        doc.rect(36, termsY, 523, 200).strokeColor("#cbd5e1").stroke();
        doc.rect(36, termsY, 523, 16).fill("#f1f5f9");
        doc
          .fillColor("#1e293b")
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .text(
            "LEGAL SUBROGATION CLAUSE & ASSIGNMENT OF RECOVERY RIGHTS (ART. 43 LCS / CAU)",
            44,
            termsY + 4,
          );

        const subrogationText = `RECIBIMOS de ATLAS LOGISTICS y sus Aseguradores la suma de ${claim.insurancePayoutAmount.toFixed(2)} ${claim.claimedCurrency} en concepto de indemnización total y definitiva por las pérdidas y/o daños sufridos por las mercancías transportadas bajo el documento de transporte ${claim.transportDocNumber} con fecha de siniestro ${new Date(claim.incidentDate).toISOString().substring(0, 10)}.
En consideración a dicho pago, por la presente nos declaramos totalmente indemnizados y:
1. SUBROGAMOS a ATLAS LOGISTICS y a sus Aseguradores en todos nuestros derechos, acciones, privilegios y pretensiones contra el porteador (${claim.carrierName}), armador, fletador, transportista efectivo y cualesquiera otros terceros responsables del daño, de conformidad con el Art. 43 de la Ley de Contrato de Seguro y la legislación mercantil aplicable.
2. AUTORIZAMOS irrevocablemente a los Aseguradores a entablar todas las acciones judiciales o extrajudiciales de recobro en nuestro nombre o en el suyo propio, obligándonos a facilitar cuanta documentación, pruebas periciales y testimonios sean precisos para la efectividad del recobro.
3. GARANTIZAMOS que no hemos otorgado renuncia ni descargo de responsabilidad a favor de los causantes del daño ni realizado acto alguno que perjudique el derecho de subrogación.`;

        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor("#334155")
          .text(subrogationText, 44, termsY + 24, { width: 505, lineGap: 3 });

        // Signatures 2-Boxes
        const signY = 360;
        doc.rect(36, signY, 255, 75).strokeColor("#cbd5e1").stroke();
        doc.rect(298, signY, 261, 75).strokeColor("#cbd5e1").stroke();

        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#1e293b")
          .text("THE CLAIMANT / EL ASEGURADO (CEDENTE):", 42, signY + 6)
          .text("THE INSURER / EL ASEGURADOR (SUBROGADO):", 304, signY + 6);

        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#475569")
          .text(claim.claimantName, 42, signY + 20)
          .text("Atlas Cargo Underwriting / Claims Dept.", 304, signY + 20)
          .text("Firma y Sello / Authorized Signature & Stamp", 42, signY + 56)
          .text(
            "Firma y Sello / Authorized Signature & Stamp",
            304,
            signY + 56,
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

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

  /**
   * Generates an Official Pharma Cold Chain & GDP Release Certificate PDF (EN 12830).
   */
  static async generateGdpReleaseCertificate(
    shipment: any,
    readings: any[] = [],
    profile?: any,
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
        doc.rect(40, 40, 515, 60).fillAndStroke("#1e3a8a", "#1d4ed8");
        doc
          .font("Helvetica-Bold")
          .fontSize(13)
          .fillColor("#ffffff")
          .text(
            "PHARMA COLD CHAIN & GDP RELEASE CERTIFICATE / CERTIFICADO DE LIBERACIÓN GDP",
            55,
            53,
          );
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#93c5fd")
          .text(
            "Compliance with EU GDP Guidelines 2013/C 343/01, WHO TRS 961 & EN 12830 Data Logging",
            55,
            72,
          );

        let currentY = 115;

        // Shipment & Batch Box
        doc.rect(40, currentY, 515, 75).strokeColor("#cbd5e1").stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor("#1e293b")
          .text("DATOS DEL ENVÍO Y PRODUCTO FARMACÉUTICO:", 50, currentY + 8);

        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#334155")
          .text(`Nº Expedición: ${shipment.trackingNumber}`, 50, currentY + 22)
          .text(
            `Nº de Lote / Batch: ${shipment.batchNumber}`,
            50,
            currentY + 34,
          )
          .text(`Producto: ${shipment.productDescription}`, 50, currentY + 46, {
            width: 240,
          })
          .text(
            `Clasificación: ${shipment.pharmaClassification}`,
            50,
            currentY + 58,
          )
          .text(`Origen: ${shipment.originLocation}`, 310, currentY + 22)
          .text(`Destino: ${shipment.destinationLocation}`, 310, currentY + 34)
          .text(
            `Registrador EN 12830: ${shipment.loggerSerialNumber} (${shipment.loggerModel || "TempTale GEO"})`,
            310,
            currentY + 46,
          )
          .text(
            `Embalaje / Modo: ${shipment.packagingType}`,
            310,
            currentY + 58,
          );

        currentY += 90;

        // Thermal Evaluation Box (MKT & Excursions)
        const isCompliant =
          shipment.gdpReleaseVerdict === "RELEASED_FOR_DISTRIBUTION";
        const isQuarantine =
          shipment.gdpReleaseVerdict === "QUARANTINE_INVESTIGATION";
        const bannerBg = isCompliant
          ? "#ecfdf5"
          : isQuarantine
            ? "#fffbeb"
            : "#fef2f2";
        const bannerBorder = isCompliant
          ? "#10b981"
          : isQuarantine
            ? "#f59e0b"
            : "#ef4444";
        const bannerText = isCompliant
          ? "#064e3b"
          : isQuarantine
            ? "#78350f"
            : "#7f1d1d";

        doc.rect(40, currentY, 515, 65).fillAndStroke(bannerBg, bannerBorder);
        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor(bannerText)
          .text(
            "EVALUACIÓN CINÉTICA Y TÉRMICA (MKT ARRHENIUS):",
            50,
            currentY + 8,
          );

        const mktVal =
          shipment.mktCalculatedCelsius ?? shipment.setpointTempCelsius;
        const minTemp = profile?.minTempCelsius ?? mktVal - 3.0;
        const maxTemp = profile?.maxTempCelsius ?? mktVal + 3.0;

        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#1e293b")
          .text(
            `Rango Regulado: ${minTemp}°C a ${maxTemp}°C`,
            50,
            currentY + 24,
          )
          .text(
            `Temperatura Cinética Media (MKT): ${mktVal}°C`,
            50,
            currentY + 38,
          )
          .text(
            `Excursiones Térmicas: ${shipment.excursionDurationMinutes || 0} min`,
            50,
            currentY + 50,
          )
          .text(
            `Estado de Excursión: ${shipment.excursionStatus || "COMPLIANT"}`,
            310,
            currentY + 24,
          )
          .text(
            `Consigna Setpoint: ${shipment.setpointTempCelsius}°C`,
            310,
            currentY + 38,
          );

        if (shipment.currentDryIceWeightKg) {
          doc.text(
            `Hielo Seco Restante: ${shipment.currentDryIceWeightKg} kg`,
            310,
            currentY + 50,
          );
        }

        currentY += 80;

        // Telemetry Readings Table
        doc.rect(40, currentY, 515, 18).fillAndStroke("#f1f5f9", "#cbd5e1");
        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#0f172a")
          .text("Fecha / Hora (UTC)", 45, currentY + 5)
          .text("Sonda Sonda (°C)", 170, currentY + 5)
          .text("Ambiente (°C)", 260, currentY + 5)
          .text("Humedad (%)", 345, currentY + 5)
          .text("Alimentación", 425, currentY + 5)
          .text("Estado", 500, currentY + 5);

        currentY += 18;

        const tableReadings = readings.length > 0 ? readings : [];
        for (const rd of tableReadings.slice(0, 8)) {
          doc.rect(40, currentY, 515, 18).strokeColor("#e2e8f0").stroke();
          const inRange = !rd.isExcursion;

          doc
            .font("Helvetica")
            .fontSize(7)
            .fillColor("#334155")
            .text(
              rd.recordedAt
                ? rd.recordedAt.replace("T", " ").replace("Z", "")
                : "N/A",
              45,
              currentY + 5,
            )
            .font("Helvetica-Bold")
            .fillColor(inRange ? "#047857" : "#b91c1c")
            .text(`${rd.probeTemperatureCelsius}°C`, 170, currentY + 5)
            .font("Helvetica")
            .fillColor("#64748b")
            .text(
              `${rd.ambientTemperatureCelsius ?? "--"}°C`,
              260,
              currentY + 5,
            )
            .text(`${rd.relativeHumidityPct ?? "--"}%`, 345, currentY + 5)
            .text(rd.powerSupplyMode || "BATTERY", 425, currentY + 5)
            .font("Helvetica-Bold")
            .fillColor(inRange ? "#047857" : "#b91c1c")
            .text(inRange ? "OK" : "EXCURSION", 500, currentY + 5);

          currentY += 18;
        }

        currentY += 15;

        // GDP Verdict & Responsible Person Declaration
        doc.rect(40, currentY, 515, 75).fillAndStroke("#f8fafc", "#cbd5e1");
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor("#0f172a")
          .text(
            "DICTAMEN DE LIBERACIÓN FARMACÉUTICA GDP (BATCH RELEASE):",
            50,
            currentY + 8,
          );

        doc
          .font("Helvetica-Bold")
          .fontSize(9.5)
          .fillColor(bannerText)
          .text(
            `VEREDICTO OFICIAL: ${shipment.gdpReleaseVerdict}`,
            50,
            currentY + 22,
          );

        const verdictLegal =
          shipment.qualityAuditNotes ||
          "La Persona Responsable (RP) certifica que los datos térmicos han sido auditados conforme a las Buenas Prácticas de Distribución de Medicamentos (2013/C 343/01). El producto ha mantenido su perfil de estabilidad y se autoriza su comercialización y distribución.";

        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#334155")
          .text(verdictLegal, 50, currentY + 36, { width: 495, lineGap: 2.5 });

        currentY += 90;

        // Signatures
        doc.rect(40, currentY, 250, 60).strokeColor("#cbd5e1").stroke();
        doc.rect(305, currentY, 250, 60).strokeColor("#cbd5e1").stroke();

        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#1e293b")
          .text("PERSONA RESPONSABLE GDP (RP / QP)", 50, currentY + 8)
          .text("GARANTÍA DE CALIDAD / AUDITORÍA", 315, currentY + 8);

        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#475569")
          .text(
            shipment.responsiblePersonName ||
              "Dra. Elena Ruiz (Directora Técnica)",
            50,
            currentY + 22,
          )
          .text("Firma y Sello Oficial de Liberación", 50, currentY + 42)
          .text("Certificación EN 12830 / ISO 9001", 315, currentY + 42);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

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

  /**
   * Generates an Official International Consignment Note for Rail (CIM / COTIF Appendix B, UIC 992 format).
   */
  static async generateCimConsignmentNote(
    consignment: any,
    allocations: any[] = [],
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
        doc.rect(40, 40, 515, 60).fillAndStroke("#1e3a8a", "#1d4ed8");
        doc
          .font("Helvetica-Bold")
          .fontSize(12)
          .fillColor("#ffffff")
          .text(
            "CARTA DE PORTE INTERNACIONAL POR FERROCARRIL (CIM) / LETTRE DE VOITURE (CIM)",
            55,
            53,
          );
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#bfdbfe")
          .text(
            "Uniform Rules concerning the Contract of International Carriage of Goods by Rail (COTIF / CIM - UIC 992)",
            55,
            72,
          );

        let currentY = 115;

        // Box 1 & 2: Sender and Consignee
        doc.rect(40, currentY, 250, 75).strokeColor("#cbd5e1").stroke();
        doc.rect(305, currentY, 250, 75).strokeColor("#cbd5e1").stroke();

        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor("#0f172a")
          .text("1. REMITENTE / EXPÉDITEUR:", 48, currentY + 8)
          .text("2. DESTINATARIO / DESTINATAIRE:", 313, currentY + 8);

        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor("#334155")
          .text(consignment.senderName, 48, currentY + 22, { width: 235 })
          .text(consignment.senderAddress || "N/A", 48, currentY + 34, {
            width: 235,
          })
          .text(`NIF/VAT: ${consignment.senderVat || "N/A"}`, 48, currentY + 58)
          .text(consignment.consigneeName, 313, currentY + 22, { width: 235 })
          .text(consignment.consigneeAddress || "N/A", 313, currentY + 34, {
            width: 235,
          })
          .text(
            `NIF/VAT: ${consignment.consigneeVat || "N/A"}`,
            313,
            currentY + 58,
          );

        currentY += 85;

        // Box 3 & 4: Terminals, Gauge Transfer and Railway Undertaking
        doc.rect(40, currentY, 515, 60).strokeColor("#cbd5e1").stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor("#0f172a")
          .text(
            "DATOS DE TRANSPORTE FERROVIARIO Y CORREDOR:",
            48,
            currentY + 8,
          );

        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor("#334155")
          .text(
            `Nº Carta de Porte CIM: ${consignment.cimNumber}`,
            48,
            currentY + 22,
          )
          .text(
            `Terminal Origen: ${consignment.originTerminalName || consignment.originTerminalId}`,
            48,
            currentY + 34,
          )
          .text(
            `Terminal Destino: ${consignment.destinationTerminalName || consignment.destinationTerminalId}`,
            48,
            currentY + 46,
          )
          .text(
            `Empresa Ferroviaria (RU): ${consignment.railwayUndertakingRu}`,
            313,
            currentY + 22,
            { width: 235 },
          )
          .text(
            `Punto Transbordo de Ancho: ${consignment.gaugeTransferTerminalName || "Tracción Directa Estándar"}`,
            313,
            currentY + 34,
          )
          .text(
            `Estatuto Aduanero: ${consignment.customsStatus || "UNION_GOODS"} | Masa Bruta: ${consignment.totalGrossMassTonnes || 0} t`,
            313,
            currentY + 46,
          );

        currentY += 70;

        // Goods and UTI Table
        doc.rect(40, currentY, 515, 18).fillAndStroke("#f1f5f9", "#cbd5e1");
        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#0f172a")
          .text("Pos.", 45, currentY + 5)
          .text("Vagón Asignado", 75, currentY + 5)
          .text("Tipo UTI", 185, currentY + 5)
          .text("Matrícula / Contenedor", 265, currentY + 5)
          .text("Tara (t)", 375, currentY + 5)
          .text("Carga (t)", 420, currentY + 5)
          .text("Carga Eje (t)", 465, currentY + 5)
          .text("Precinto", 515, currentY + 5);

        currentY += 18;

        const items = allocations.length > 0 ? allocations : [];
        for (const alloc of items.slice(0, 8)) {
          doc.rect(40, currentY, 515, 18).strokeColor("#e2e8f0").stroke();

          doc
            .font("Helvetica-Bold")
            .fontSize(7)
            .fillColor("#0f172a")
            .text(`${alloc.positionInTrain || 1}`, 45, currentY + 5)
            .font("Helvetica")
            .fillColor("#334155")
            .text(
              alloc.wagonSeries || alloc.wagonId || "Sggmrss",
              75,
              currentY + 5,
              { width: 105, ellipsis: true },
            )
            .text(alloc.utiType || "CONTAINER_40", 185, currentY + 5)
            .font("Helvetica-Bold")
            .text(alloc.utiIdentification || "N/A", 265, currentY + 5)
            .font("Helvetica")
            .text(
              `${alloc.grossWagonMassTonnes ? (alloc.grossWagonMassTonnes - alloc.payloadMassTonnes).toFixed(1) : 28.5}`,
              375,
              currentY + 5,
            )
            .text(`${alloc.payloadMassTonnes || 0}`, 420, currentY + 5)
            .font("Helvetica-Bold")
            .fillColor("#1d4ed8")
            .text(`${alloc.calculatedAxleLoadTonnes || 9.2}`, 465, currentY + 5)
            .font("Helvetica")
            .fillColor("#64748b")
            .text(alloc.sealNumber || "OK", 515, currentY + 5);

          currentY += 18;
        }

        currentY += 15;

        // COTIF/CIM Liability and Legal Conditions Box
        doc.rect(40, currentY, 515, 65).fillAndStroke("#eff6ff", "#bfdbfe");
        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor("#1e3a8a")
          .text(
            "RESPONSABILIDAD LEGAL Y CONDICIONES UNIFORMES COTIF / CIM (APÉNDICE B):",
            48,
            currentY + 8,
          );

        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#1e293b")
          .text(
            "1. El transporte ferroviario se rige por las Reglas Uniformes CIM (COTIF 1999). Límite de indemnización por pérdida o avería fijado en 17 Derechos Especiales de Giro (DEG) por kilogramo de masa bruta (Art. 30 § 1).\n" +
              "2. En caso de daño no aparente, la reclamación formal debe formularse en un plazo de 7 días naturales a partir de la entrega (Art. 47 § 2).\n" +
              "3. El transportista ferroviario declara el cumplimiento de las normativas de interoperabilidad TAF-TSI y los gálibos autorizados del corredor.",
            48,
            currentY + 22,
            { width: 495, lineGap: 2 },
          );

        currentY += 80;

        // Signatures
        doc.rect(40, currentY, 250, 60).strokeColor("#cbd5e1").stroke();
        doc.rect(305, currentY, 250, 60).strokeColor("#cbd5e1").stroke();

        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#1e293b")
          .text("FIRMA Y SELLO DEL REMITENTE", 48, currentY + 8)
          .text("EMPRESA FERROVIARIA (RU) / MAQUINISTA", 313, currentY + 8);

        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#475569")
          .text(
            "Lugar y Fecha: " + new Date().toISOString().split("T")[0],
            48,
            currentY + 22,
          )
          .text(
            consignment.responsibleRailwayOfficer ||
              "Marc Vidal (Inspector de Tracción CIM)",
            313,
            currentY + 22,
          )
          .text("Conforme Reglas Uniformes CIM / UIC 992", 313, currentY + 42);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates an Official Train Composition & Brake Sheet PDF (Boletín de Composición de Tren y Frenado).
   */
  static async generateTrainBrakingSheet(
    train: any,
    allocations: any[] = [],
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
        doc.rect(40, 40, 515, 60).fillAndStroke("#0f172a", "#334155");
        doc
          .font("Helvetica-Bold")
          .fontSize(12)
          .fillColor("#ffffff")
          .text(
            "BOLETÍN OFICIAL DE COMPOSICIÓN DE TREN Y FRENADO / BRAKE SHEET",
            55,
            53,
          );
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#94a3b8")
          .text(
            "Safety & Technical Specification for Interoperability (TAF-TSI / ERA / UIC 544-1)",
            55,
            72,
          );

        let currentY = 115;

        // Train Identification & Parameters Box
        doc.rect(40, currentY, 515, 65).strokeColor("#cbd5e1").stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor("#0f172a")
          .text("DATOS DEL TREN Y OPERADOR DE TRACCIÓN:", 50, currentY + 8);

        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#334155")
          .text(
            `Nº de Tren / Surco: ${train.trainRunNumber}`,
            50,
            currentY + 22,
          )
          .text(`Locomotora: ${train.locomotiveSeries}`, 50, currentY + 34, {
            width: 240,
          })
          .text(
            `Operador Tracción: ${train.tractionOperator}`,
            50,
            currentY + 46,
            { width: 240 },
          )
          .text(
            `Maquinista Habilitado: ${train.driverName || "N/A"}`,
            310,
            currentY + 22,
          )
          .text(
            `Fecha y Hora de Salida: ${train.departureTimestamp?.replace("T", " ").replace("Z", "") || "Inmediata"}`,
            310,
            currentY + 34,
          )
          .text(
            `Estado del Convoy: ${train.status || "FORMED"}`,
            310,
            currentY + 46,
          );

        currentY += 75;

        // Safety Dynamics Banner (Length, Mass, Brake %)
        const isBrakeOk = train.isBrakeCompliant !== false;
        const bannerBg = isBrakeOk ? "#f0fdf4" : "#fef2f2";
        const bannerBorder = isBrakeOk ? "#16a34a" : "#dc2626";

        doc.rect(40, currentY, 515, 55).fillAndStroke(bannerBg, bannerBorder);
        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor(isBrakeOk ? "#15803d" : "#b91c1c")
          .text(
            "RESULTADOS DE LA VERIFICACIÓN DE FÍSICA Y FRENADO REGLAMENTARIO:",
            50,
            currentY + 8,
          );

        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#0f172a")
          .text(
            `Longitud Total: ${train.totalTrainLengthMeters || 0} m / ${train.maxAllowedLengthMeters || 750} m (TEN-T)`,
            50,
            currentY + 24,
          )
          .text(
            `Masa Bruta Total: ${train.totalGrossMassTonnes || 0} Toneladas`,
            50,
            currentY + 38,
          )
          .text(
            `Masa Frenada Total: ${train.totalBrakedMassTonnes || 0} Toneladas`,
            310,
            currentY + 24,
          )
          .text(
            `Porcentaje de Frenado: ${train.calculatedBrakePercentage || 0}% (Mínimo Surco: ${train.requiredBrakePercentage || 65}%)`,
            310,
            currentY + 38,
          );

        currentY += 68;

        // Consist Wagon Table
        doc.rect(40, currentY, 515, 18).fillAndStroke("#f1f5f9", "#cbd5e1");
        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#0f172a")
          .text("Pos.", 45, currentY + 5)
          .text("Matrícula Vagón UIC", 75, currentY + 5)
          .text("Serie / Tipo", 185, currentY + 5)
          .text("UTI Cargada", 290, currentY + 5)
          .text("Masa Bruta", 380, currentY + 5)
          .text("Carga Eje", 440, currentY + 5)
          .text("Conforme", 495, currentY + 5);

        currentY += 18;

        const tableAllocations = allocations.length > 0 ? allocations : [];
        for (const alloc of tableAllocations.slice(0, 10)) {
          doc.rect(40, currentY, 515, 18).strokeColor("#e2e8f0").stroke();

          doc
            .font("Helvetica-Bold")
            .fontSize(7)
            .fillColor("#0f172a")
            .text(`${alloc.positionInTrain || 1}`, 45, currentY + 5)
            .font("Helvetica")
            .fillColor("#334155")
            .text(alloc.wagonNumber || "33 80 4956 101-2", 75, currentY + 5)
            .text(alloc.wagonSeries || "Sggmrss 90'", 185, currentY + 5, {
              width: 100,
              ellipsis: true,
            })
            .text(alloc.utiIdentification || "MSCU9928192", 290, currentY + 5)
            .text(`${alloc.grossWagonMassTonnes || 55.0} t`, 380, currentY + 5)
            .font("Helvetica-Bold")
            .text(
              `${alloc.calculatedAxleLoadTonnes || 9.17} t/e`,
              440,
              currentY + 5,
            )
            .fillColor("#15803d")
            .text("APTO", 495, currentY + 5);

          currentY += 18;
        }

        currentY += 20;

        // Signatures
        doc.rect(40, currentY, 250, 60).strokeColor("#cbd5e1").stroke();
        doc.rect(305, currentY, 250, 60).strokeColor("#cbd5e1").stroke();

        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#1e293b")
          .text("JEFE DE MANIOBRAS / REVISOR DE TREN", 50, currentY + 8)
          .text("MAQUINISTA TITULAR (AUTORIZACIÓN SALIDA)", 315, currentY + 8);

        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#475569")
          .text("Prueba de frenado reglamentaria completada", 50, currentY + 22)
          .text("Firma y Hora de Entrega", 50, currentY + 42)
          .text(
            train.driverName || "Alejandro Gómez (Maquinista Habilitado ERTMS)",
            315,
            currentY + 22,
          )
          .text(
            "Conforme Adif / SNCF Réseau / ERA TAF-TSI",
            315,
            currentY + 42,
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

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

  /**
   * Generates Official FuelEU Maritime Compliance & EU ETS Settlement Certificate (PDF)
   */
  static generateFuelEuComplianceCertificatePdf(
    account: any,
    vessel: any,
    pool?: any,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];

        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header Background
        doc.rect(36, 36, 523, 60).fill("#0284c7");
        doc
          .fillColor("#ffffff")
          .font("Helvetica-Bold")
          .fontSize(14)
          .text("FUELEU MARITIME & EU ETS COMPLIANCE CERTIFICATE", 46, 48);
        doc
          .font("Helvetica")
          .fontSize(8)
          .text(
            "CERTIFICADO OFICIAL DE CUMPLIMIENTO REGULATORIO Y DESCARBONIZACIÓN MARÍTIMA",
            46,
            68,
          );
        doc.text(
          "Regulation (EU) 2023/1805 & Directive (EU) 2023/959 — Verification Document",
          46,
          80,
        );

        // Metadata box
        const metaY = 104;
        doc.rect(36, metaY, 523, 62).strokeColor("#cbd5e1").stroke();
        doc.rect(36, metaY, 523, 16).fill("#f1f5f9");
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(
            "1. VESSEL IDENTIFICATION & STATUTORY REGISTRATION",
            44,
            metaY + 4,
          );

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(`Vessel Name: ${vessel.vesselName}`, 44, metaY + 22);
        doc.text(`IMO Number: ${vessel.imoNumber}`, 220, metaY + 22);
        doc.text(`Flag State: ${vessel.flagState}`, 380, metaY + 22);

        doc.text(
          `Gross Tonnage: ${vessel.grossTonnageGt.toLocaleString()} GT`,
          44,
          metaY + 36,
        );
        doc.text(`Engine Type: ${vessel.mainEngineType}`, 220, metaY + 36);
        doc.text(
          `Operating Line: ${vessel.operatingShippingLine}`,
          380,
          metaY + 36,
        );

        doc.text(
          `Classification Society: ${vessel.classificationSociety}`,
          44,
          metaY + 50,
        );
        doc.text(
          `OPS Connection: ${vessel.hasOpsConnectionInstalled ? "EQUIPPED" : "NONE"}`,
          220,
          metaY + 50,
        );
        doc.text(`Reporting Year: ${account.reportingYear}`, 380, metaY + 50);

        // FuelEU Performance Box
        const perfY = 174;
        doc.rect(36, perfY, 523, 85).strokeColor("#cbd5e1").stroke();
        doc.rect(36, perfY, 523, 16).fill("#f1f5f9");
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(
            "2. FUELEU GREENHOUSE GAS (GHG) INTENSITY ACCOUNTING",
            44,
            perfY + 4,
          );

        doc.font("Helvetica").fontSize(8).fillColor("#334155");
        doc.text(
          `Regulatory Target (Art. 4(2)): ${account.targetGhgIntensityGco2eqPerMj.toFixed(4)} gCO2eq/MJ`,
          44,
          perfY + 24,
        );
        doc.text(
          `Actual Attained Intensity: ${account.actualAttainedGhgIntensityGco2eqPerMj.toFixed(4)} gCO2eq/MJ`,
          300,
          perfY + 24,
        );

        doc.text(
          `Total Energy Consumed: ${(account.totalAnnualEnergyMj / 1_000_000).toFixed(2)} GJ (${account.totalAnnualEnergyMj.toLocaleString()} MJ)`,
          44,
          perfY + 40,
        );
        doc.text(
          `Compliance Status: ${account.complianceStatus}`,
          300,
          perfY + 40,
        );

        const cbTonnes = (account.complianceBalanceGco2eq / 1_000_000).toFixed(
          2,
        );
        doc.text(
          `Compliance Balance (CB): ${cbTonnes} t CO2eq (${account.complianceBalanceGco2eq >= 0 ? "SURPLUS" : "DEFICIT"})`,
          44,
          perfY + 56,
        );
        doc.text(
          `FuelEU Penalty Calculated: ${account.calculatedFuelEuPenaltyEur.toLocaleString("es-ES", { minimumFractionDigits: 2 })} EUR`,
          300,
          perfY + 56,
        );

        doc.text(
          `Verifier Accreditation Ref: ${account.verifierAccreditationNumber}`,
          44,
          perfY + 70,
        );

        // Pooling Box (if present)
        const poolY = 267;
        doc.rect(36, poolY, 523, 58).strokeColor("#cbd5e1").stroke();
        doc.rect(36, poolY, 523, 16).fill("#f1f5f9");
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(
            "3. FLEET COMPLIANCE POOLING MECHANISM (ARTICLE 21)",
            44,
            poolY + 4,
          );

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        if (pool) {
          doc.text(`Pool Code: ${pool.poolCode}`, 44, poolY + 22);
          doc.text(`Pool Status: ${pool.status}`, 300, poolY + 22);
          doc.text(
            `Managing Operator: ${pool.managingOperatorName}`,
            44,
            poolY + 36,
          );
          doc.text(
            `Consolidated Net Balance: ${(pool.consolidatedNetComplianceBalanceGco2eq / 1_000_000).toFixed(2)} t CO2eq`,
            300,
            poolY + 36,
          );
          doc.text(
            `Surplus Reallocation Result: Compliant fleet pooling — residual individual penalty is 0.00 EUR.`,
            44,
            poolY + 48,
            { width: 505 },
          );
        } else {
          doc.text(
            "No fleet pool assigned. Individual compliance accounting applies.",
            44,
            poolY + 24,
          );
        }

        // Diligence and Certification Statement
        const certY = 333;
        doc.rect(36, certY, 523, 75).strokeColor("#0284c7").stroke();
        doc.rect(36, certY, 523, 16).fill("#e0f2fe");
        doc
          .fillColor("#0369a1")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(
            "4. ACCREDITED VERIFIER STATEMENT & EMSA CONFORMITY",
            44,
            certY + 4,
          );

        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          "We hereby certify that the GHG intensity of energy used on-board and the compliance balance reported for this vessel have been assessed and verified in accordance with Regulation (EU) 2023/1805 (FuelEU Maritime) and Directive 2003/87/EC as amended by Directive (EU) 2023/959 (EU ETS Maritime). Data has been submitted to the THETIS-MRV system.",
          44,
          certY + 22,
          { width: 505 },
        );

        // Signature Blocks
        const sigY = 416;
        doc.rect(36, sigY, 255, 60).strokeColor("#cbd5e1").stroke();
        doc.rect(304, sigY, 255, 60).strokeColor("#cbd5e1").stroke();

        doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#0f172a");
        doc.text("DOCUMENT OF COMPLIANCE (DOC) HOLDER", 44, sigY + 8);
        doc.text("ACCREDITED VERIFICATION BODY", 312, sigY + 8);

        doc.font("Helvetica").fontSize(7).fillColor("#64748b");
        doc.text(
          `Authorized Signatory: ${vessel.docHolderCompany}`,
          44,
          sigY + 42,
        );
        doc.text(
          `Lead Auditor / Verifier: ${account.verifierAccreditationNumber}`,
          312,
          sigY + 42,
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates Bunker Delivery Note & Voyage GHG Emissions Audit Sheet (PDF)
   */
  static generateBunkerDeliveryNoteAuditPdf(
    voyage: any,
    vessel: any,
    fuel: any,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];

        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header Background
        doc.rect(36, 36, 523, 60).fill("#0f766e");
        doc
          .fillColor("#ffffff")
          .font("Helvetica-Bold")
          .fontSize(14)
          .text("BUNKER DELIVERY & VOYAGE GHG EMISSIONS AUDIT", 46, 48);
        doc
          .font("Helvetica")
          .fontSize(8)
          .text(
            "DECLARACIÓN OFICIAL DE SUMINISTRO DE COMBUSTIBLE Y EMISIONES DE TRAVESÍA",
            46,
            68,
          );
        doc.text(
          `Voyage Reference: ${voyage.voyageReferenceNumber} — EMSA THETIS-MRV Form`,
          46,
          80,
        );

        // Voyage Details Box
        const voyY = 104;
        doc.rect(36, voyY, 523, 68).strokeColor("#cbd5e1").stroke();
        doc.rect(36, voyY, 523, 16).fill("#f1f5f9");
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text("1. VOYAGE ROUTE & OPERATIONAL PARAMETERS", 44, voyY + 4);

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(
          `Vessel: ${vessel.vesselName} (IMO: ${vessel.imoNumber})`,
          44,
          voyY + 22,
        );
        doc.text(`Scope: ${voyage.geographicScope}`, 300, voyY + 22);

        doc.text(
          `Departure: ${voyage.departurePortName} (${voyage.departurePortLocode})`,
          44,
          voyY + 36,
        );
        doc.text(
          `Arrival: ${voyage.arrivalPortName} (${voyage.arrivalPortLocode})`,
          300,
          voyY + 36,
        );

        doc.text(
          `Distance: ${voyage.distanceNauticalMiles} NM | Nav: ${voyage.navigationHours}h | Berth: ${voyage.berthHours}h`,
          44,
          voyY + 50,
        );
        doc.text(`Carried TEUs: ${voyage.carriedTeuCount}`, 300, voyY + 50);

        // Bunker Details Box
        const bnkY = 180;
        doc.rect(36, bnkY, 523, 76).strokeColor("#cbd5e1").stroke();
        doc.rect(36, bnkY, 523, 16).fill("#f1f5f9");
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text("2. FUEL CONSUMPTION & ENERGY RECONCILIATION", 44, bnkY + 4);

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(
          `Fuel Grade: ${fuel.fuelName} (${fuel.fuelCode})`,
          44,
          bnkY + 22,
        );
        doc.text(`Category: ${fuel.fuelCategory}`, 300, bnkY + 22);

        doc.text(
          `Fuel Consumed: ${voyage.fuelConsumedTonnes.toFixed(3)} Tonnes`,
          44,
          bnkY + 36,
        );
        doc.text(
          `OPS Electricity: ${voyage.opsElectricityConsumedKwh.toFixed(2)} kWh`,
          300,
          bnkY + 36,
        );

        doc.text(
          `Total Energy Consumed: ${(voyage.totalEnergyConsumedMj / 1_000_000).toFixed(2)} GJ (${voyage.totalEnergyConsumedMj.toLocaleString()} MJ)`,
          44,
          bnkY + 50,
        );
        doc.text(
          `Attained GHG Intensity: ${voyage.calculatedGhgIntensityGco2eqPerMj.toFixed(4)} gCO2eq/MJ`,
          300,
          bnkY + 50,
        );

        doc.text(
          `LCV: ${(fuel.lowerCalorificValueMjPerGram * 1000).toFixed(1)} MJ/kg | WtW Factor: ${fuel.totalWtwFactorGco2eqPerMj} gCO2eq/MJ`,
          44,
          bnkY + 64,
        );

        // GHG Emissions Accounting Box
        const emsY = 264;
        doc.rect(36, emsY, 523, 68).strokeColor("#cbd5e1").stroke();
        doc.rect(36, emsY, 523, 16).fill("#f1f5f9");
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(
            "3. GREENHOUSE GAS EMISSIONS ACCOUNTING (EU ETS & THETIS-MRV)",
            44,
            emsY + 4,
          );

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(
          `CO2 Emissions: ${voyage.co2EmissionsTonnes.toFixed(3)} t`,
          44,
          emsY + 22,
        );
        doc.text(
          `CH4 (Methane): ${voyage.ch4EmissionsTonnes.toFixed(4)} t (GWP 28)`,
          220,
          emsY + 22,
        );
        doc.text(
          `N2O: ${voyage.n2oEmissionsTonnes.toFixed(4)} t (GWP 265)`,
          380,
          emsY + 22,
        );

        doc.text(
          `Total Gross Emissions: ${voyage.totalGhgEmissionsScopeTco2eq.toFixed(3)} tCO2eq`,
          44,
          emsY + 38,
        );
        doc.text(
          `EU ETS Applicable Emissions: ${voyage.etsApplicableScopeEmissionsTco2eq.toFixed(3)} tCO2eq`,
          300,
          emsY + 38,
        );

        doc.text(
          `Lead Auditor / Verifier: ${voyage.leadAuditorVerifier}`,
          44,
          emsY + 52,
        );

        // Verification Sign-off Box
        const authY = 340;
        doc.rect(36, authY, 523, 50).strokeColor("#0f766e").stroke();
        doc.rect(36, authY, 523, 16).fill("#f0fdfa");
        doc
          .fillColor("#115e59")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text("4. MASTER & CHIEF ENGINEER VERIFICATION", 44, authY + 4);

        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          `Certified by Master and Chief Engineer of vessel ${vessel.vesselName}. Fuel quantities and operational figures match official engine room logs and Bunker Delivery Notes (BDN).`,
          44,
          authY + 24,
          { width: 505 },
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

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

  /**
   * Generates Official AEO Self-Assessment Audit Report PDF (CAE AEAT / DG TAXUD).
   */
  public static async generateAeoCaeAuditReportPdf(data: {
    audit: any;
    sections: any[];
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];

        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        const { audit, sections = [] } = data;

        // Header Banner
        doc.rect(36, 36, 523, 50).fill("#0f172a");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(13);
        doc.text("CUESTIONARIO DE AUTO-EVALUACIÓN OEA (CAE)", 48, 46);
        doc.font("Helvetica").fontSize(8).fillColor("#94a3b8");
        doc.text(
          "AUDITORÍA OFICIAL DE OPERADOR ECONÓMICO AUTORIZADO — REGLAMENTO (UE) 952/2013 (CAU ART. 39)",
          48,
          64,
        );
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#38bdf8");
        doc.text(`REF: ${audit.auditReference}`, 380, 46, {
          align: "right",
          width: 165,
        });
        doc.font("Helvetica").fontSize(7.5).fillColor("#cbd5e1");
        doc.text(`Fecha: ${audit.auditDate}`, 380, 62, {
          align: "right",
          width: 165,
        });

        let curY = 96;

        // Section 1: Executive Audit Summary & Scores
        doc.rect(36, curY, 523, 75).strokeColor("#cbd5e1").stroke();
        doc.rect(36, curY, 523, 16).fill("#f1f5f9");
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8);
        doc.text(
          "1. RESUMEN EJECUTIVO & PUNTUACIÓN DE PREPARACIÓN OEA",
          44,
          curY + 4,
        );

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(`Modalidad OEA: ${audit.aeoModality}`, 44, curY + 22);
        doc.text(`Estándar Objetivo: ${audit.targetStandard}`, 44, curY + 34);
        doc.text(`Auditor Principal: ${audit.leadAuditorName}`, 44, curY + 46);
        doc.text(
          `Próxima Reevaluación: ${audit.nextReviewDate}`,
          44,
          curY + 58,
        );

        doc.font("Helvetica-Bold").fontSize(9).fillColor("#0369a1");
        doc.text(
          `Puntuación Global: ${audit.overallReadinessScore}%`,
          310,
          curY + 22,
        );
        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(`Estado: ${audit.complianceStatus}`, 310, curY + 36);
        doc.text(
          `Nº Certificado: ${audit.aeoOfficialCertificateNumber || "En tramitación"}`,
          310,
          curY + 48,
        );

        curY += 85;

        // Section 2: CAE 6 Blocks Breakdown Table
        doc.rect(36, curY, 523, 16).fill("#1e293b");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5);
        doc.text("Bloque CAE (Criterio CAU Art. 39)", 44, curY + 4);
        doc.text("Preguntas", 290, curY + 4);
        doc.text("Conformes", 360, curY + 4);
        doc.text("Puntuación", 430, curY + 4);
        doc.text("Estado", 500, curY + 4);

        curY += 16;

        for (const sec of sections) {
          doc.rect(36, curY, 523, 18).strokeColor("#e2e8f0").stroke();
          doc.font("Helvetica").fontSize(7).fillColor("#0f172a");
          doc.text(sec.blockTitle, 44, curY + 4, { width: 240 });
          doc.text(String(sec.totalQuestions), 290, curY + 4);
          doc.text(
            `${sec.compliantCount} / ${sec.totalQuestions}`,
            360,
            curY + 4,
          );
          doc.font("Helvetica-Bold").fillColor("#0369a1");
          doc.text(`${sec.blockScorePercentage.toFixed(1)}%`, 430, curY + 4);

          const isOk = sec.blockStatus === "COMPLIANT";
          doc.fillColor(isOk ? "#15803d" : "#b91c1c");
          doc.text(isOk ? "CONFORME" : "DEFICIENTE", 500, curY + 4);
          curY += 18;
        }

        curY += 12;

        // Section 3: Findings & Action Plan
        doc.rect(36, curY, 523, 65).strokeColor("#cbd5e1").stroke();
        doc.rect(36, curY, 523, 16).fill("#f8fafc");
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8);
        doc.text("3. DICTAMEN DE AUDITORÍA & PLAN DE ACCIÓN", 44, curY + 4);

        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          audit.notes ||
            "El operador cumple con los estándares aduaneros, solvencia y seguridad. Pista de auditoría conforme para auditoría de la AEAT.",
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
   * Generates Official 7-Point Container/Vehicle Security Inspection Certificate PDF (C-TPAT / OEAS).
   */
  public static async generateSevenPointInspectionCertificatePdf(data: {
    inspection: any;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];

        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        const { inspection } = data;

        // Header Banner
        doc.rect(36, 36, 523, 50).fill("#0369a1");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(13);
        doc.text("ACTA DE INSPECCIÓN DE SEGURIDAD EN 7 PUNTOS", 48, 46);
        doc.font("Helvetica").fontSize(8).fillColor("#bae6fd");
        doc.text(
          "VERIFICACIÓN ESTRUCTURAL DE CONTENEDOR / REMOLQUE (C-TPAT & OEA-SEGURIDAD OEAS)",
          48,
          64,
        );
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff");
        doc.text(`REF: ${inspection.inspectionReference}`, 380, 46, {
          align: "right",
          width: 165,
        });

        let curY = 96;

        // Inspection Details
        doc.rect(36, curY, 523, 60).strokeColor("#cbd5e1").stroke();
        doc.rect(36, curY, 523, 16).fill("#f0f9ff");
        doc.fillColor("#0369a1").font("Helvetica-Bold").fontSize(8);
        doc.text("DATOS DE LA UNIDAD & INSPECTOR", 44, curY + 4);

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(
          `Identificador Unidad: ${inspection.equipmentIdentifier} (${inspection.equipmentType})`,
          44,
          curY + 22,
        );
        doc.text(
          `Inspector Acreditado: ${inspection.inspectorName}`,
          44,
          curY + 34,
        );
        doc.text(
          `Instalación / Muelle: ${inspection.facilityLocation}`,
          44,
          curY + 46,
        );

        doc.text(
          `Fecha Inspección: ${inspection.inspectionDate}`,
          310,
          curY + 22,
        );
        doc
          .font("Helvetica-Bold")
          .fillColor(inspection.overallPassed ? "#15803d" : "#b91c1c");
        doc.text(`Resultado: ${inspection.inspectionResult}`, 310, curY + 36);

        curY += 70;

        // 7 Points Checklist
        doc.rect(36, curY, 523, 16).fill("#1e293b");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5);
        doc.text(
          "Punto de Inspección Física (C-TPAT 7-Point Protocol)",
          44,
          curY + 4,
        );
        doc.text("Estado Verificado", 450, curY + 4);

        curY += 16;

        const points = [
          {
            name: "1. Pared Frontal / Mamparo (Front Wall / Bulkhead)",
            passed: inspection.p1FrontWallPassed,
          },
          {
            name: "2. Lateral Izquierdo (Left Side Panel)",
            passed: inspection.p2LeftSidePassed,
          },
          {
            name: "3. Lateral Derecho (Right Side Panel)",
            passed: inspection.p3RightSidePassed,
          },
          {
            name: "4. Suelo & Travesaños (Floor & Crossmembers)",
            passed: inspection.p4FloorPassed,
          },
          {
            name: "5. Techo & Estructura Superior (Roof / Ceiling Structure)",
            passed: inspection.p5RoofCeilingPassed,
          },
          {
            name: "6. Puertas, Bisagras & Cierres (Doors & Locking Bars)",
            passed: inspection.p6DoorsLocksPassed,
          },
          {
            name: "7. Tren de Rodaje & Chasis (Undercarriage / Chassis)",
            passed: inspection.p7UndercarriagePassed,
          },
        ];

        for (const pt of points) {
          doc.rect(36, curY, 523, 16).strokeColor("#e2e8f0").stroke();
          doc.font("Helvetica").fontSize(7).fillColor("#0f172a");
          doc.text(pt.name, 44, curY + 4);
          doc
            .font("Helvetica-Bold")
            .fillColor(pt.passed ? "#15803d" : "#b91c1c");
          doc.text(
            pt.passed ? "CONFORME / APTO" : "DEFECTO / RECHAZADO",
            450,
            curY + 4,
          );
          curY += 16;
        }

        curY += 10;

        // Additional Contraband & Agricultural Checks
        doc.rect(36, curY, 523, 40).strokeColor("#cbd5e1").stroke();
        doc.rect(36, curY, 523, 14).fill("#f8fafc");
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7.5);
        doc.text(
          "CONTROLES FITOSANITARIOS & MANIPULACIÓN (WDO CHECK)",
          44,
          curY + 3,
        );

        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          `Contaminación Agrícola / Plagas de Madera: ${inspection.hasAgriculturalContamination ? "DETECTADA (NO CONFORME)" : "NO DETECTADA (CLEAN)"}`,
          44,
          curY + 18,
        );
        doc.text(
          `Indicios de Manipulación Física / Doble Fondo: ${inspection.physicalTamperingDetected ? "DETECTADO (ALERTA SEGURIDAD)" : "NO DETECTADO (CLEAN)"}`,
          44,
          curY + 28,
        );

        curY += 50;

        // Sign-off
        doc.rect(36, curY, 523, 40).strokeColor("#0369a1").stroke();
        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          `Certifico bajo mi responsabilidad como Inspector Acreditado que la unidad ${inspection.equipmentIdentifier} ha sido examinada exhaustivamente en los 7 puntos reglamentarios. Acción tomada: ${inspection.actionTaken || "Aprobada para carga y precintado."}`,
          44,
          curY + 10,
          { width: 505 },
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates Official High-Security Seal (Class 'H') Certificate & Chain of Custody PDF (ISO 17712).
   */
  public static async generateIso17712SealCustodyCertificatePdf(data: {
    seal: any;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];

        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        const { seal } = data;

        // Header Banner
        doc.rect(36, 36, 523, 50).fill("#1e3a8a");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(13);
        doc.text("CERTIFICADO DE PRECINTO DE ALTA SEGURIDAD ISO 17712", 48, 46);
        doc.font("Helvetica").fontSize(8).fillColor("#93c5fd");
        doc.text(
          "REGISTRO DE CADENA DE CUSTODIA & INTEGRIDAD MECÁNICA (CLASE 'H' HIGH SECURITY)",
          48,
          64,
        );
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff");
        doc.text(`PRECINTO: ${seal.sealNumber}`, 380, 46, {
          align: "right",
          width: 165,
        });

        let curY = 96;

        // Seal Attributes
        doc.rect(36, curY, 523, 85).strokeColor("#cbd5e1").stroke();
        doc.rect(36, curY, 523, 16).fill("#f1f5f9");
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8);
        doc.text(
          "ESPECIFICACIONES TÉCNICAS DEL PRECINTO (NORMA ISO 17712)",
          44,
          curY + 4,
        );

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(`Número de Serie Precinto: ${seal.sealNumber}`, 44, curY + 22);
        doc.text(
          `Tipo de Precinto: ${seal.sealType.replace(/_/g, " ")}`,
          44,
          curY + 34,
        );
        doc.text(
          `Fabricante Homologado: ${seal.manufacturerName}`,
          44,
          curY + 46,
        );
        doc.text(
          `Certificado Ensayo ISO 17712: ${seal.iso17712TestCertificateRef || "Acreditado Clase H"}`,
          44,
          curY + 58,
        );

        doc.text(
          `Unidad Asociada: ${seal.associatedEquipmentIdentifier || "Sin asignar"}`,
          310,
          curY + 22,
        );
        doc.text(
          `Expedición / B/L: ${seal.associatedShipmentReference || "N/A"}`,
          310,
          curY + 34,
        );
        doc.text(`Estado Precinto: ${seal.sealStatus}`, 310, curY + 46);
        doc.text(
          `Verificado en Puerto: ${seal.verifiedAtPortOfEntry ? "SÍ - ÍNTEGRO" : "En Tránsito"}`,
          310,
          curY + 58,
        );

        curY += 95;

        // Chain of Custody Log
        doc.rect(36, curY, 523, 75).strokeColor("#cbd5e1").stroke();
        doc.rect(36, curY, 523, 16).fill("#f8fafc");
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8);
        doc.text(
          "TRAZABILIDAD DE COLOCACIÓN & VERIFICACIÓN EN DESTINO",
          44,
          curY + 4,
        );

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(
          `Fecha y Hora de Colocación: ${seal.affixedDate || "Pendiente"}`,
          44,
          curY + 24,
        );
        doc.text(
          `Operador que Coloca Precinto: ${seal.affixedBy || "Inspector de Muelle"}`,
          44,
          curY + 36,
        );
        doc.text(
          `Fecha Verificación Llegada: ${seal.verifiedIntactDate || "En tránsito marítimo"}`,
          44,
          curY + 48,
        );
        doc.text(
          `Verificador en Destino: ${seal.verifiedBy || "Aduana / Resguardo Fiscal"}`,
          44,
          curY + 60,
        );

        curY += 85;

        // Legal statement
        doc.rect(36, curY, 523, 40).strokeColor("#1e3a8a").stroke();
        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          "El presente precinto cumple con los ensayos de tracción, flexión y cizallamiento exigidos por la norma ISO 17712 Clase H. Cualquier evidencia de rotura o sustitución debe ser reportada inmediatamente a la autoridad aduanera competente.",
          44,
          curY + 10,
          { width: 505 },
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates Official Business Partner Security Risk Matrix PDF (ISO 28000).
   */
  public static async generateBusinessPartnerRiskMatrixPdf(data: {
    partners: any[];
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];

        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        const { partners = [] } = data;

        // Header Banner
        doc.rect(36, 36, 523, 50).fill("#115e59");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(13);
        doc.text(
          "MATRIZ DE HOMOLOGACIÓN & RIESGO DE SOCIOS (ISO 28000)",
          48,
          46,
        );
        doc.font("Helvetica").fontSize(8).fillColor("#99f6e4");
        doc.text(
          "EVALUACIÓN DE SEGURIDAD DE PROVEEDORES LOGÍSTICOS & CADENA DE CUSTODIA OEA",
          48,
          64,
        );
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff");
        doc.text(`Fecha: ${new Date().toISOString().split("T")[0]}`, 380, 46, {
          align: "right",
          width: 165,
        });

        let curY = 96;

        // Partners Table
        doc.rect(36, curY, 523, 16).fill("#1e293b");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5);
        doc.text("Socio Comercial", 44, curY + 4);
        doc.text("Tipo", 180, curY + 4);
        doc.text("Cert. OEA / C-TPAT", 260, curY + 4);
        doc.text("Score", 380, curY + 4);
        doc.text("Nivel de Riesgo", 430, curY + 4);
        doc.text("Estado", 500, curY + 4);

        curY += 16;

        for (const p of partners) {
          doc.rect(36, curY, 523, 18).strokeColor("#e2e8f0").stroke();
          doc.font("Helvetica").fontSize(7).fillColor("#0f172a");
          doc.text(p.partnerName, 44, curY + 4, { width: 130 });
          doc.text(p.partnerType.replace(/_/g, " "), 180, curY + 4, {
            width: 75,
          });
          doc.text(
            p.hasAeoCertification
              ? `OEA: ${p.aeoCertificateNumber || "Sí"}`
              : "No OEA",
            260,
            curY + 4,
            { width: 115 },
          );
          doc.font("Helvetica-Bold").fillColor("#0f766e");
          doc.text(
            `${p.securityQuestionnaireScore.toFixed(0)}%`,
            380,
            curY + 4,
          );

          const isLow = p.riskLevel === "LOW_RISK";
          doc.fillColor(
            isLow
              ? "#15803d"
              : p.riskLevel === "MEDIUM_RISK"
                ? "#b45309"
                : "#b91c1c",
          );
          doc.text(p.riskLevel, 430, curY + 4, { width: 65 });

          doc.fillColor(
            p.status === "APPROVED_PARTNER" ? "#15803d" : "#475569",
          );
          doc.text(p.status, 500, curY + 4);
          curY += 18;
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
