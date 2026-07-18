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
}
