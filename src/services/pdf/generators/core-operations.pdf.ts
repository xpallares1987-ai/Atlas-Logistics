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

export interface QuotePdfData {
  quoteNumber: string;
  customer?: string;
  origin?: string;
  destination?: string;
  carrier?: string;
  equipment?: string;
  buyRateTotal?: number;
  sellMargin?: number;
  sellRateTotal: number;
  currency?: string;
  validTo?: string;
  serviceLine?: string;
  transitDays?: number;
  issueDate?: string;
}

export class CoreOperationsPdfGenerator {
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
    invoices: InvoiceData[] = [],
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
   * Generates an LCL Container Consolidation Manifest PDF.
   */
  static async generateLclManifest(data: {
    containerId: string;
    specId?: string;
    route?: string;
    cargoItems: any[];
    totalWeight: number;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: "A4" });
        const buffers: Buffer[] = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header
        doc.rect(40, 40, 515, 50).fill("#1e293b");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(14);
        doc.text("LCL CONSOLIDATION CONTAINER MANIFEST", 50, 52);
        doc.font("Helvetica").fontSize(8).fillColor("#94a3b8");
        const cleanRoute = (data.route || "N/A").replace(/➔/g, "->");
        doc.text(
          `CONTAINER ID: ${data.containerId} | ROUTE: ${cleanRoute}`,
          50,
          70,
        );

        let curY = 105;
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(9);
        doc.text(`Container Spec: ${data.specId || "Standard 40HC"}`, 40, curY);
        doc.text(`Total Cargo Weight: ${data.totalWeight} kg`, 300, curY);
        doc.text(
          `Total Packages / Items: ${data.cargoItems?.length || 0}`,
          40,
          curY + 16,
        );

        curY += 40;
        doc.rect(40, curY, 515, 18).fill("#334155");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5);
        doc.text("Item / Label", 48, curY + 5);
        doc.text("Shipment ID", 180, curY + 5);
        doc.text("Dimensions (LxWxH cm)", 310, curY + 5);
        doc.text("Weight (kg)", 460, curY + 5);

        curY += 18;
        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        for (const item of data.cargoItems || []) {
          doc.rect(40, curY, 515, 18).strokeColor("#e2e8f0").stroke();
          doc.text(
            item.label || item.typeId || item.id?.substring(0, 8) || "Item",
            48,
            curY + 5,
          );
          doc.text(item.shipmentId || item.clientId || "N/A", 180, curY + 5);
          doc.text(
            `${item.length || item.depth || 120} x ${item.width || 80} x ${item.height || 100}`,
            310,
            curY + 5,
          );
          doc.text(`${item.weight || 0} kg`, 460, curY + 5);
          curY += 18;
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  static async generateQuote(data: QuotePdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: "A4" });
        const buffers: Buffer[] = [];

        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header Banner
        doc.rect(40, 40, 515, 60).fill("#0f172a");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(18);
        doc.text("ATLAS LOGISTICS ENTERPRISE", 55, 52);
        doc.fontSize(10).font("Helvetica").fillColor("#94a3b8");
        doc.text(
          "Global Multimodal Freight Quotation & Rate Agreement",
          55,
          74,
        );

        // Quote Meta Box
        const currY = 115;
        doc.rect(40, currY, 515, 80).strokeColor("#cbd5e1").stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10);
        doc.text(`QUOTE REF: ${data.quoteNumber}`, 55, currY + 12);
        doc.font("Helvetica").fontSize(9).fillColor("#475569");
        doc.text(
          `Issue Date: ${data.issueDate || new Date().toISOString().split("T")[0]}`,
          55,
          currY + 30,
        );
        doc.text(
          `Valid Until: ${data.validTo || "Subject to carrier GRI"}`,
          55,
          currY + 45,
        );
        doc.text("Status: OFFICIAL COMMERCIAL QUOTE", 55, currY + 60);

        doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a");
        doc.text("Customer / Account:", 320, currY + 12);
        doc.font("Helvetica").fontSize(9).fillColor("#475569");
        doc.text(data.customer || "Enterprise Shipper", 320, currY + 30);
        doc.text("Incoterm Rule: FOB / CIF Multimodal", 320, currY + 45);
        doc.text("Service Mode: Port-to-Port / CY-CY", 320, currY + 60);

        // Routing Details Header
        const routeY = 210;
        doc.rect(40, routeY, 515, 22).fill("#1e293b");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
        doc.text("ROUTING & CARRIER SPECIFICATIONS", 55, routeY + 6);

        const routeDetailY = routeY + 30;
        doc.rect(40, routeDetailY, 515, 75).strokeColor("#e2e8f0").stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8.5);
        doc.text("Port of Origin / Loading (POL):", 55, routeDetailY + 12);
        doc
          .font("Helvetica")
          .fillColor("#334155")
          .text(data.origin || "Not Specified", 55, routeDetailY + 25);

        doc
          .font("Helvetica-Bold")
          .fillColor("#0f172a")
          .text(
            "Port of Destination / Discharge (POD):",
            55,
            routeDetailY + 45,
          );
        doc
          .font("Helvetica")
          .fillColor("#334155")
          .text(data.destination || "Not Specified", 55, routeDetailY + 58);

        doc
          .font("Helvetica-Bold")
          .fillColor("#0f172a")
          .text("Ocean Carrier:", 320, routeDetailY + 12);
        doc
          .font("Helvetica")
          .fillColor("#334155")
          .text(data.carrier || "Primary Alliances", 320, routeDetailY + 25);

        doc
          .font("Helvetica-Bold")
          .fillColor("#0f172a")
          .text("Equipment & Transit:", 320, routeDetailY + 45);
        doc
          .font("Helvetica")
          .fillColor("#334155")
          .text(
            `${data.equipment || "40HC Container"} · Transit: ~${data.transitDays || 28} Days`,
            320,
            routeDetailY + 58,
          );

        // Financial Breakdown Table
        const finY = 330;
        doc.rect(40, finY, 515, 22).fill("#1e293b");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
        doc.text("RATE BREAKDOWN & CHARGES (PER CONTAINER)", 55, finY + 6);

        const curr = data.currency || "USD";
        let tableY = finY + 22;
        const lineItems = [
          {
            item: "Base Ocean Freight (BAS)",
            desc: "Standard Liner Service",
            amount:
              data.buyRateTotal != null
                ? (data.buyRateTotal * 0.75).toFixed(2)
                : "1,850.00",
          },
          {
            item: "Bunker & Surcharges (BAF/PSS/THC)",
            desc: "Fuel adjustment & port terminal handling",
            amount:
              data.buyRateTotal != null
                ? (data.buyRateTotal * 0.25).toFixed(2)
                : "600.00",
          },
          {
            item: "Commercial Handling & Management",
            desc: "Documentation, EDI & booking coordination",
            amount:
              data.sellMargin != null ? data.sellMargin.toFixed(2) : "250.00",
          },
        ];

        for (const li of lineItems) {
          doc.rect(40, tableY, 515, 22).strokeColor("#e2e8f0").stroke();
          doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8);
          doc.text(li.item, 55, tableY + 6);
          doc
            .font("Helvetica")
            .fillColor("#64748b")
            .fontSize(8)
            .text(li.desc, 230, tableY + 6);
          doc
            .font("Helvetica-Bold")
            .fillColor("#0f172a")
            .text(`${curr} ${li.amount}`, 440, tableY + 6, {
              align: "right",
              width: 100,
            });
          tableY += 22;
        }

        // Total Row
        doc.rect(40, tableY, 515, 30).fill("#f1f5f9");
        doc
          .rect(40, tableY, 515, 30)
          .strokeColor("#0284c7")
          .lineWidth(1.5)
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11);
        doc.text("TOTAL ALL-IN SELLING RATE:", 55, tableY + 9);
        doc.fillColor("#0284c7").font("Helvetica-Bold").fontSize(13);
        doc.text(
          `${curr} ${Number(data.sellRateTotal).toFixed(2)}`,
          400,
          tableY + 8,
          { align: "right", width: 140 },
        );

        // Terms & Conditions
        const termsY = tableY + 45;
        doc.lineWidth(1);
        doc.rect(40, termsY, 515, 110).strokeColor("#cbd5e1").stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8.5);
        doc.text("TERMS AND CONDITIONS:", 55, termsY + 10);
        doc.font("Helvetica").fontSize(7.5).fillColor("#64748b");
        doc.text(
          "1. All rates are subject to equipment and vessel space availability at time of booking confirmation.",
          55,
          termsY + 23,
        );
        doc.text(
          "2. Quotation is valid strictly until date stated above and subject to standard carrier GRIs / PSS adjustments.",
          55,
          termsY + 35,
        );
        doc.text(
          "3. Demurrage and detention free time: 7 calendar days standard at destination, unless negotiated otherwise.",
          55,
          termsY + 47,
        );
        doc.text(
          "4. Hazardous, DG, or refrigerated cargo requires special written approval prior to container release.",
          55,
          termsY + 59,
        );
        doc.text(
          "5. Atlas Logistics standard conditions of carriage apply to all bookings made under this quotation.",
          55,
          termsY + 71,
        );
        doc.text(
          "Digitally Approved by Atlas Logistics Dynamic Pricing Engine · SCM v1.0",
          55,
          termsY + 89,
          { align: "center", width: 485 },
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
