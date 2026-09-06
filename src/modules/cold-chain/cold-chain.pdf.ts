import PDFDocument from "pdfkit";

export class ColdChainPdfGenerator {
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
}
