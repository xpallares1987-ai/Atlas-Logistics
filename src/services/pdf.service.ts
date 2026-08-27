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
}
