import PDFDocument from "pdfkit";

export class AeoSecurityPdfGenerator {
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
