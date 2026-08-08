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
   * Generates an Agent Settlement PDF in memory.
   */
  static async generateAgentSettlement(data: AgentSettlementData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Header
        doc.fontSize(20).text('AGENT SETTLEMENT STATEMENT', { align: 'center' });
        doc.moveDown(2);

        // Details Box
        doc.fontSize(10);
        doc.rect(50, doc.y, 500, 140).stroke();
        doc.text(`Statement Number: ${data.statementNumber}`, 60, doc.y + 10);
        doc.text(`Agent Name: ${data.agentName}`, 60, doc.y + 15);
        doc.text(`Period: ${new Date(data.periodStart).toLocaleDateString()} to ${new Date(data.periodEnd).toLocaleDateString()}`, 60, doc.y + 15);
        doc.text(`Status: ${data.status}`, 60, doc.y + 15);
        
        doc.moveDown(4);

        // Financials
        doc.font('Helvetica-Bold').fontSize(14).text('Financial Summary', 60, doc.y);
        doc.moveDown(1);
        doc.font('Helvetica').fontSize(12);
        
        doc.text(`Net Balance: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(data.netBalance)}`, {
          align: 'left'
        });

        doc.moveDown(4);
        doc.fontSize(8).fillColor('black').text('This statement is generated automatically by Atlas Logistics. If you have any questions, please contact accounting@atlaslogistics.com.', { align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates a Booking Confirmation PDF in memory.
   */
  static async generateBookingConfirmation(data: BookingConfirmationData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Header
        doc.fontSize(20).text('BOOKING CONFIRMATION', { align: 'center' });
        doc.moveDown(2);

        // Details Box
        doc.fontSize(10);
        doc.rect(50, doc.y, 500, 160).stroke();
        doc.text(`Reference Number: ${data.referenceNumber}`, 60, doc.y + 10);
        doc.text(`Issue Date: ${data.issueDate || new Date().toLocaleDateString()}`, 60, doc.y + 15);
        doc.text(`Customer: ${data.customer}`, 60, doc.y + 15);
        doc.moveDown(2);
        
        doc.font('Helvetica-Bold').text('Routing Details:');
        doc.font('Helvetica').text(`Port of Loading (Origin): ${data.origin}`, 60, doc.y + 5);
        doc.text(`Port of Discharge (Destination): ${data.destination}`, 60, doc.y + 15);
        doc.text(`Vessel / Voyage: ${data.vessel} / ${data.voyage}`, 60, doc.y + 15);
        doc.moveDown(2);

        doc.font('Helvetica-Bold').text('Equipment / Service:');
        doc.font('Helvetica').text(`Service Type: ${data.serviceType || 'Unknown'}`, 60, doc.y + 5);
        doc.text(`Equipment Requirements: ${data.equipment}`, 60, doc.y + 15);

        doc.moveDown(5);
        doc.fontSize(8).fillColor('black').text('This booking confirmation is subject to space and equipment availability. Please ensure cargo is delivered to the terminal before the designated cut-off time.', { align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
