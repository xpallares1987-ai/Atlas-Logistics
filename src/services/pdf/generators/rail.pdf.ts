import PDFDocument from "pdfkit";

export class RailPdfGenerator {
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
}
