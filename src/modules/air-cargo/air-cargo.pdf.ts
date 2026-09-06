import PDFDocument from "pdfkit";

export class AirCargoPdfGenerator {
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
}
