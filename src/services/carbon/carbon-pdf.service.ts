import PDFDocument from "pdfkit";

export interface CarbonCertificatePdfData {
  certificateNumber: string;
  beneficiaryName: string;
  issuedAt: string;
  referenceCode: string;
  originCity: string;
  destinationCity: string;
  totalWeightKg: number;
  totalDistanceKm: number;
  totalTco2eWtw: number;
  totalTco2eTtw: number;
  totalTco2eWtt: number;
  carbonIntensityGco2ePerTkm: number;
  projectName: string;
  projectStandard: string;
  projectCategory?: string;
  projectCountry?: string;
  amountPaidEur: number;
  qrValidationUrl: string;
  legs?: {
    legOrder: number;
    originName: string;
    destinationName: string;
    mode: string;
    distanceKm: number;
    legTco2eWtw: number;
  }[];
}

export class CarbonPdfService {
  /**
   * Generates a high-quality PDF Certificate for Scope 3 Carbon Neutrality
   */
  public static async generateCertificate(
    data: CarbonCertificatePdfData,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margins: { top: 40, bottom: 40, left: 45, right: 45 },
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", (err: Error) => reject(err));

        // Background Accent Header Banner
        doc.rect(0, 0, 595.28, 120).fillAndStroke("#064e3b", "#064e3b"); // Deep Emerald Green

        // Header Title
        doc
          .fillColor("#ffffff")
          .fontSize(22)
          .font("Helvetica-Bold")
          .text("ATLAS LOGISTICS — GLOBAL ESG", 45, 30);

        doc
          .fillColor("#a7f3d0")
          .fontSize(12)
          .font("Helvetica")
          .text(
            "CERTIFICADO OFICIAL DE COMPENSACIÓN DE CARBONO SCOPE 3",
            45,
            58,
          );

        doc
          .fillColor("#d1fae5")
          .fontSize(9)
          .text(
            "Conforme a los estándares ISO 14083 y GLEC Framework v3",
            45,
            75,
          );

        // Certificate Badge Box (Top Right)
        doc
          .roundedRect(380, 25, 170, 70, 6)
          .fillAndStroke("#047857", "#10b981");

        doc
          .fillColor("#ffffff")
          .fontSize(8)
          .font("Helvetica-Bold")
          .text("Nº CERTIFICADO:", 390, 35)
          .fontSize(10)
          .text(data.certificateNumber, 390, 48)
          .fontSize(8)
          .font("Helvetica")
          .text(
            `EMITIDO: ${new Date(data.issuedAt).toLocaleDateString("es-ES")}`,
            390,
            68,
          );

        // Section: Beneficiary and Scope
        let currentY = 145;
        doc
          .fillColor("#111827")
          .fontSize(13)
          .font("Helvetica-Bold")
          .text("1. DATOS DEL TITULAR Y EXPEDICIÓN", 45, currentY);

        doc
          .moveTo(45, currentY + 18)
          .lineTo(550, currentY + 18)
          .strokeColor("#e5e7eb")
          .stroke();

        currentY += 28;
        doc
          .fontSize(9)
          .font("Helvetica-Bold")
          .fillColor("#4b5563")
          .text("EMPRESA BENEFICIARIA:", 45, currentY)
          .font("Helvetica")
          .fillColor("#111827")
          .text(data.beneficiaryName, 185, currentY);

        currentY += 16;
        doc
          .fontSize(9)
          .font("Helvetica-Bold")
          .fillColor("#4b5563")
          .text("EXPEDICIÓN / REFERENCIA:", 45, currentY)
          .font("Helvetica")
          .fillColor("#111827")
          .text(data.referenceCode, 185, currentY);

        currentY += 16;
        doc
          .fontSize(9)
          .font("Helvetica-Bold")
          .fillColor("#4b5563")
          .text("TRAYECTO TOTAL:", 45, currentY)
          .font("Helvetica")
          .fillColor("#111827")
          .text(
            `${data.originCity} ➔ ${data.destinationCity} (${data.totalDistanceKm} km)`,
            185,
            currentY,
          );

        currentY += 16;
        doc
          .fontSize(9)
          .font("Helvetica-Bold")
          .fillColor("#4b5563")
          .text("PESO DE LA CARGA:", 45, currentY)
          .font("Helvetica")
          .fillColor("#111827")
          .text(
            `${data.totalWeightKg.toLocaleString()} kg (${(data.totalWeightKg / 1000).toFixed(2)} t)`,
            185,
            currentY,
          );

        // Section: Emissions Breakdown (WTW, TTW, WTT)
        currentY += 32;
        doc
          .fillColor("#111827")
          .fontSize(13)
          .font("Helvetica-Bold")
          .text("2. BALANCE DE EMISIONES AUDITADAS (ISO 14083)", 45, currentY);

        doc
          .moveTo(45, currentY + 18)
          .lineTo(550, currentY + 18)
          .strokeColor("#e5e7eb")
          .stroke();

        currentY += 28;

        // Metric Card 1: Total WTW
        doc
          .roundedRect(45, currentY, 155, 60, 6)
          .fillAndStroke("#ecfdf5", "#a7f3d0");
        doc
          .fillColor("#065f46")
          .fontSize(8)
          .font("Helvetica-Bold")
          .text("WELL-TO-WHEEL (TOTAL)", 55, currentY + 10)
          .fontSize(14)
          .text(`${data.totalTco2eWtw.toFixed(4)} tCO2e`, 55, currentY + 24)
          .fontSize(7)
          .font("Helvetica")
          .text("Ciclo de vida completo GEI", 55, currentY + 44);

        // Metric Card 2: Direct TTW
        doc
          .roundedRect(210, currentY, 155, 60, 6)
          .fillAndStroke("#f8fafc", "#e2e8f0");
        doc
          .fillColor("#334155")
          .fontSize(8)
          .font("Helvetica-Bold")
          .text("TANK-TO-WHEEL (DIRECTO)", 220, currentY + 10)
          .fontSize(14)
          .text(`${data.totalTco2eTtw.toFixed(4)} tCO2e`, 220, currentY + 24)
          .fontSize(7)
          .font("Helvetica")
          .text("Combustión operacional", 220, currentY + 44);

        // Metric Card 3: Indirect WTT
        doc
          .roundedRect(375, currentY, 175, 60, 6)
          .fillAndStroke("#f8fafc", "#e2e8f0");
        doc
          .fillColor("#334155")
          .fontSize(8)
          .font("Helvetica-Bold")
          .text("WELL-TO-TANK (INDIRECTO)", 385, currentY + 10)
          .fontSize(14)
          .text(`${data.totalTco2eWtt.toFixed(4)} tCO2e`, 385, currentY + 24)
          .fontSize(7)
          .font("Helvetica")
          .text("Extracción y refinado de energía", 385, currentY + 44);

        // Section: Certified Offset Project
        currentY += 80;
        doc
          .fillColor("#111827")
          .fontSize(13)
          .font("Helvetica-Bold")
          .text("3. PROYECTO DE COMPENSACIÓN ASIGNADO", 45, currentY);

        doc
          .moveTo(45, currentY + 18)
          .lineTo(550, currentY + 18)
          .strokeColor("#e5e7eb")
          .stroke();

        currentY += 28;
        doc
          .roundedRect(45, currentY, 505, 80, 6)
          .fillAndStroke("#f0fdf4", "#86efac");

        doc
          .fillColor("#166534")
          .fontSize(11)
          .font("Helvetica-Bold")
          .text(`PROYECTO: ${data.projectName}`, 60, currentY + 12)
          .fontSize(9)
          .font("Helvetica")
          .fillColor("#15803d")
          .text(
            `Estándar de Verificación: ${data.projectStandard.replace("_", " ")}`,
            60,
            currentY + 30,
          )
          .text(
            `Créditos Retirados: ${data.totalTco2eWtw.toFixed(4)} tCO2e (Neutralización 100% de la expedición)`,
            60,
            currentY + 46,
          )
          .text(
            `Inversión Verde: €${data.amountPaidEur.toFixed(2)} EUR`,
            60,
            currentY + 62,
          );

        // Footer & QR Validation Seal
        currentY += 105;
        doc
          .roundedRect(45, currentY, 505, 75, 6)
          .fillAndStroke("#1e293b", "#334155");

        doc
          .fillColor("#ffffff")
          .fontSize(10)
          .font("Helvetica-Bold")
          .text("VERIFICACIÓN DIGITAL Y REGISTRO ESG", 60, currentY + 12)
          .fontSize(8)
          .font("Helvetica")
          .fillColor("#94a3b8")
          .text(
            "Este certificado acredita que las emisiones indicadas han sido calculadas rigurosamente y canceladas en el registro oficial correspondiente.",
            60,
            currentY + 28,
            { width: 340 },
          )
          .text(
            `Enlace de Validación: ${data.qrValidationUrl}`,
            60,
            currentY + 52,
          );

        doc
          .roundedRect(425, currentY + 12, 110, 50, 4)
          .fillAndStroke("#0f172a", "#38bdf8");

        doc
          .fillColor("#38bdf8")
          .fontSize(8)
          .font("Helvetica-Bold")
          .text("SELLO VERIFICADO", 435, currentY + 22)
          .fontSize(7)
          .font("Helvetica")
          .fillColor("#e2e8f0")
          .text("ISO 14083 / GLEC", 435, currentY + 36)
          .text("Atlas Green Chain", 435, currentY + 48);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
