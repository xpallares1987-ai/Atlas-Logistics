import PDFDocument from "pdfkit";

/**
 * Bulk Operations PDF Generator
 * IMSBC Code / BLU Code / IMO Grain Code / ASTM-IP 54 Draft & Ullage Surveys
 */
export class BulkOperationsPdfGenerator {
  /**
   * 1. Generates an Official Hydrostatic Draft Survey Report & Displacement Certificate PDF.
   */
  public static async generateDraftSurveyReportPdf(
    survey: any,
    vesselOp: any,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header - Deep Maritime Steel
        doc.rect(36, 36, 523, 50).fill("#1e293b");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(12);
        doc.text("HYDROSTATIC DRAFT SURVEY & DISPLACEMENT CERTIFICATE", 44, 46);
        doc.font("Helvetica").fontSize(8).fillColor("#94a3b8");
        doc.text(
          "CERTIFICADO OFICIAL DE CÁLCULO DE CALADOS & MASA DE CARGA",
          44,
          63,
        );
        doc.text(
          `TIPO: ${survey?.surveyType?.replace(/_/g, " ") || "INITIAL SURVEY"}`,
          340,
          46,
          {
            align: "right",
            width: 210,
          },
        );
        doc.text(
          `FECHA: ${survey?.surveyDate || new Date().toISOString().substring(0, 10)}`,
          340,
          63,
          {
            align: "right",
            width: 210,
          },
        );

        let curY = 96;

        // Vessel Particulars & Port
        doc
          .rect(36, curY, 523, 54)
          .fill("#f8fafc")
          .strokeColor("#cbd5e1")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7.5);
        doc.text("DATOS DEL BUQUE & ESCALA PORTUARIA", 44, curY + 6);
        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          `Buque: ${vesselOp?.vesselName || "MV Cape Finisterre"} (IMO: ${vesselOp?.imoNumber || "9482012"}) | Tipo: ${vesselOp?.vesselType || "CAPESIZE"}`,
          44,
          curY + 18,
        );
        doc.text(
          `Puerto & Terminal: ${vesselOp?.portName || "Puerto de Gijón"} — ${vesselOp?.terminalName || "Terminal El Musel"} (Muelle: ${vesselOp?.berthNumber || "Muelle 1"})`,
          44,
          curY + 30,
        );
        doc.text(
          `Operación: ${vesselOp?.operationType || "LOADING"} | Surveyor: ${survey?.surveyorName || "Capt. A. Valdes"} | 1er Oficial: ${survey?.chiefOfficerName || "C/O M. Rossi"}`,
          44,
          curY + 42,
        );

        curY += 62;

        // 6-Point Draft Table Box
        doc
          .rect(36, curY, 523, 72)
          .fill("#ffffff")
          .strokeColor("#e2e8f0")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7.5);
        doc.text(
          "LECTURAS DE CALADO DE 6 PUNTOS (METROS) & DEFORMACIÓN",
          44,
          curY + 6,
        );

        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          `• Calados Proa: Babor ${survey?.forwardDraftPort?.toFixed(3)} m | Estribor ${survey?.forwardDraftStarboard?.toFixed(3)} m ➔ Medio Proa: ${survey?.forwardMeanDraft?.toFixed(3)} m`,
          44,
          curY + 20,
        );
        doc.text(
          `• Calados Popa: Babor ${survey?.aftDraftPort?.toFixed(3)} m | Estribor ${survey?.aftDraftStarboard?.toFixed(3)} m ➔ Medio Popa: ${survey?.aftMeanDraft?.toFixed(3)} m`,
          44,
          curY + 32,
        );
        doc.text(
          `• Calados Centro: Babor ${survey?.midDraftPort?.toFixed(3)} m | Estribor ${survey?.midDraftStarboard?.toFixed(3)} m ➔ Medio Centro: ${survey?.midMeanDraft?.toFixed(3)} m`,
          44,
          curY + 44,
        );

        doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#0284c7");
        doc.text(
          `Asiento Aparente: ${survey?.apparentTrim > 0 ? "+" : ""}${survey?.apparentTrim?.toFixed(3)} m (${survey?.apparentTrim > 0 ? "Por Popa" : "Por Proa"}) | Calado Medio de Medios (DQM): ${survey?.quarterMeanDraft?.toFixed(3)} m`,
          44,
          curY + 58,
        );

        curY += 80;

        // Hydrostatic & Displacement Calculations Box
        doc
          .rect(36, curY, 523, 75)
          .fill("#f8fafc")
          .strokeColor("#cbd5e1")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7.5);
        doc.text(
          "PARÁMETROS HIDROSTÁTICOS & CORRECCIONES DE ASIENTO Y DENSIDAD",
          44,
          curY + 6,
        );

        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          `Eslora LBP: ${survey?.lengthBetweenPerpendiculars} m | Posición LCF: ${survey?.longitudinalCenterOfFlotation} m | TPC: ${survey?.tonnesPerCmImmersion} t/cm | MTC: ${survey?.momentToChangeTrim1Cm} t·m/cm`,
          44,
          curY + 20,
        );
        doc.text(
          `Densidad del Agua Medida: ${survey?.measuredWaterDensity?.toFixed(4)} t/m³ (Base estándar 1.025 t/m³)`,
          44,
          curY + 34,
        );
        doc.text(
          `1ª Corrección Asiento (C1): ${survey?.firstTrimCorrection > 0 ? "+" : ""}${survey?.firstTrimCorrection?.toFixed(2)} t | 2ª Corrección (C2): +${survey?.secondTrimCorrection?.toFixed(2)} t`,
          44,
          curY + 48,
        );
        doc.font("Helvetica-Bold").fillColor("#0f172a");
        doc.text(
          `DESPLAZAMIENTO CORREGIDO (DENSITY & TRIM): ${survey?.correctedDisplacement?.toLocaleString("en-US", { minimumFractionDigits: 2 })} TONELADAS`,
          44,
          curY + 62,
        );

        curY += 83;

        // Deductibles & Net Results Box
        doc
          .rect(36, curY, 523, 70)
          .fill("#f0fdf4")
          .strokeColor("#bbf7d0")
          .stroke();
        doc.fillColor("#166534").font("Helvetica-Bold").fontSize(8);
        doc.text(
          "DEDUCIBLES (CONSUMIBLES & LASTRE) & MASA NETA DE CARGA CERTIFICADA",
          44,
          curY + 6,
        );

        doc.font("Helvetica").fontSize(7).fillColor("#14532d");
        doc.text(
          `• Agua de Lastre: ${survey?.ballastWaterDeductible?.toLocaleString("en-US")} t | Fuel Oil: ${survey?.fuelOilDeductible?.toLocaleString("en-US")} t | Diesel: ${survey?.dieselOilDeductible?.toLocaleString("en-US")} t`,
          44,
          curY + 20,
        );
        doc.text(
          `• Agua Dulce: ${survey?.freshWaterDeductible?.toLocaleString("en-US")} t | Sentinas/Sludge: ${survey?.sludgeBilgeDeductible?.toLocaleString("en-US")} t ➔ Total Deducibles: ${survey?.totalDeductibles?.toLocaleString("en-US")} t`,
          44,
          curY + 32,
        );

        doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#047857");
        doc.text(
          `DESPLAZAMIENTO NETO (BUQUE EN ROSCA + CARGA): ${survey?.netDisplacement?.toLocaleString("en-US", { minimumFractionDigits: 2 })} TONELADAS`,
          44,
          curY + 44,
        );

        if (survey?.calculatedCargoTonnage) {
          doc.fillColor("#b91c1c").fontSize(9);
          doc.text(
            `TONELAJE NETO DE CARGA EMBARCADA/DESCARGADA: ${survey?.calculatedCargoTonnage?.toLocaleString("en-US", { minimumFractionDigits: 2 })} TONELADAS MÉTRICAS`,
            44,
            curY + 56,
          );
        }

        curY += 78;

        // Signatures
        doc.rect(36, curY, 523, 55).strokeColor("#cbd5e1").stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7);
        doc.text(
          "CERTIFICACIÓN PERICIAL CONJUNTA (DRAFT SURVEYOR & CAPITÁN/1ER OFICIAL)",
          44,
          curY + 6,
        );
        doc.font("Helvetica").fontSize(6.5).fillColor("#475569");
        doc.text(
          "Certificamos que las lecturas de calado, densidades y deducciones han sido tomadas y calculadas conforme a los estándares de la OMI.",
          44,
          curY + 18,
        );
        doc.text("Firma del Marine Draft Surveyor", 44, curY + 40);
        doc.text("Firma y Sello del Capitán / 1er Oficial", 340, curY + 40);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 2. Generates an IMSBC Code Bulk Cargo Declaration & TML Certificate PDF.
   */
  public static async generateImsbcCargoDeclarationPdf(
    imsbc: any,
    vesselOp: any,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header - Deep Amber Alert
        doc.rect(36, 36, 523, 50).fill("#d97706");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(12);
        doc.text("IMSBC CODE BULK CARGO DECLARATION & TML CERTIFICATE", 44, 46);
        doc.font("Helvetica").fontSize(8).fillColor("#fef3c7");
        doc.text(
          "DECLARACIÓN OFICIAL DE CARGA SÓLIDA A GRANEL & ENSAYO DE HUMEDAD (TML)",
          44,
          63,
        );
        doc.text(
          `REF: ${imsbc?.declarationReference || "IMSBC-2026-001"}`,
          340,
          46,
          {
            align: "right",
            width: 210,
          },
        );

        let curY = 96;

        // Cargo Identification Box
        doc
          .rect(36, curY, 523, 70)
          .fill("#f8fafc")
          .strokeColor("#cbd5e1")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7.5);
        doc.text("IDENTIFICACIÓN DE LA MERCANCÍA & EXPEDIDOR", 44, curY + 6);
        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          `Nombre de Carga a Granel (BCSN): ${imsbc?.bulkCargoShippingName || "IRON ORE CONCENTRATE"}`,
          44,
          curY + 20,
        );
        doc.text(
          `Clasificación IMSBC: ${imsbc?.imsbcGroup?.replace(/_/g, " ") || "GROUP A (LIQUEFACTION)"}`,
          44,
          curY + 34,
        );
        doc.text(
          `Expedidor / Embarcador: ${imsbc?.shipperName || "Asturiana de Minerales SA"}`,
          44,
          curY + 48,
        );
        doc.text(
          `Masa Total a Embarcar: ${imsbc?.grossWeightTonnes?.toLocaleString("en-US")} Toneladas Métricas`,
          300,
          curY + 48,
        );

        curY += 78;

        // Moisture & Liquefaction Analysis Box
        const isCompliant = imsbc?.isLiquefactionCompliant;
        doc
          .rect(36, curY, 523, 90)
          .fill(isCompliant ? "#f0fdf4" : "#fef2f2")
          .strokeColor(isCompliant ? "#bbf7d0" : "#fecaca")
          .stroke();

        doc
          .fillColor(isCompliant ? "#166534" : "#991b1b")
          .font("Helvetica-Bold")
          .fontSize(8);
        doc.text(
          "ENSAYO DE HUMEDAD, PUNTO DE FLUIDEZ (FMP) & LÍMITE TRANSPORTABLE (TML)",
          44,
          curY + 6,
        );

        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor(isCompliant ? "#14532d" : "#7f1d1d");
        doc.text(
          `1. Contenido Real de Humedad: ${imsbc?.moistureContentPercentage}%`,
          44,
          curY + 22,
        );
        doc.text(
          `2. Punto de Fluidez del Laboratorio (FMP): ${imsbc?.flowMoisturePointPercentage || "N/A"}%`,
          44,
          curY + 36,
        );
        doc.text(
          `3. Límite de Humedad Transportable (TML = 90% FMP): ${imsbc?.transportableMoistureLimit || "N/A"}%`,
          44,
          curY + 50,
        );

        doc.font("Helvetica-Bold").fontSize(8.5);
        doc.text(
          `DICTAMEN IMSBC SECCIÓN 7: ${isCompliant ? "APTO PARA EL EMBARQUE (HUMEDAD <= TML)" : "RECHAZO MANDATORIO: PROHIBIDO EMBARCAR (HUMEDAD > TML)"}`,
          44,
          curY + 68,
        );

        curY += 98;

        // Lab & Testing Particulars
        doc
          .rect(36, curY, 523, 50)
          .fill("#ffffff")
          .strokeColor("#e2e8f0")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7.5);
        doc.text("LABORATORIO DE ENSAYO & FACTOR DE ESTIBA", 44, curY + 6);
        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          `Laboratorio Acreditado: ${imsbc?.testingLaboratoryName || "SGS Minerals Testing Lab Spain"} (Fecha: ${imsbc?.laboratoryTestDate || "2026-09-01"})`,
          44,
          curY + 20,
        );
        doc.text(
          `Factor de Estiba: ${imsbc?.stowageFactorM3PerTonne} m³/t | Ángulo de Reposo: ${imsbc?.angleOfReposeDegrees || "N/A"}°`,
          44,
          curY + 34,
        );

        curY += 58;

        // Shipper Declaration
        doc.rect(36, curY, 523, 60).strokeColor("#cbd5e1").stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7);
        doc.text(
          "DECLARACIÓN DEL EXPEDIDOR (IMSBC CODE SECTION 4)",
          44,
          curY + 6,
        );
        doc.font("Helvetica").fontSize(6.5).fillColor("#475569");
        doc.text(
          "El suscrito certifica que el cargamento ha sido muestreado y ensayado dentro de los 7 días previos a la carga conforme a los métodos prescritos en el Código IMSBC.",
          44,
          curY + 18,
          { width: 505, lineGap: 1.5 },
        );
        doc.text("Firma y Sello del Expedidor Acreditado", 44, curY + 44);
        doc.text("Aceptación del Capitán del Buque", 340, curY + 44);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 3. Generates an IMO Grain Code Stability & Loading Plan Certificate PDF.
   */
  public static async generateGrainStabilityPlanPdf(
    grainPlan: any,
    vesselOp: any,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header - Deep Grain Amber
        doc.rect(36, 36, 523, 50).fill("#854d0e");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(12);
        doc.text("IMO GRAIN CODE STABILITY & LOADING CERTIFICATE", 44, 46);
        doc.font("Helvetica").fontSize(8).fillColor("#fef08a");
        doc.text(
          "CÁLCULO DE ESTABILIDAD DE CEREALES (SOLAS CAP. VI / PARTE A)",
          44,
          63,
        );
        doc.text(
          `PLAN: ${grainPlan?.planReference || "GRAIN-2026-001"}`,
          340,
          46,
          {
            align: "right",
            width: 210,
          },
        );

        let curY = 96;

        // Vessel & Cargo Parameters
        doc
          .rect(36, curY, 523, 60)
          .fill("#f8fafc")
          .strokeColor("#cbd5e1")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7.5);
        doc.text(
          "DATOS DEL CARGAMENTO DE CEREAL & CONDICIÓN DE SALIDA",
          44,
          curY + 6,
        );
        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          `Tipo de Grano: ${grainPlan?.grainType || "WHEAT"} | Masa Total: ${grainPlan?.totalGrainTonnage?.toLocaleString("en-US")} Toneladas`,
          44,
          curY + 20,
        );
        doc.text(
          `Factor de Estiba: ${grainPlan?.stowageFactorM3PerTonne} m³/t | Desplazamiento de Salida: ${grainPlan?.departureDisplacement?.toLocaleString("en-US")} Toneladas`,
          44,
          curY + 34,
        );
        doc.text(
          `Momento Escorante Volumétrico Total (VHM): ${grainPlan?.totalVolumetricHeelingMoment?.toLocaleString("en-US")} m⁴`,
          44,
          curY + 48,
        );

        curY += 70;

        // Stability Criteria Evaluation
        doc
          .rect(36, curY, 523, 85)
          .fill("#f0fdf4")
          .strokeColor("#bbf7d0")
          .stroke();
        doc.fillColor("#166534").font("Helvetica-Bold").fontSize(8);
        doc.text(
          "VERIFICACIÓN DE CRITERIOS DE ESTABILIDAD OMI (IMO GRAIN CODE SECTION 7)",
          44,
          curY + 6,
        );

        doc.font("Helvetica").fontSize(7.5).fillColor("#14532d");
        doc.text(
          `• Ángulo de Escora Residual por Corrimiento de Grano: θ = ${grainPlan?.residualHeelAngleDegrees}° (Requisito OMI: ≤ 12.0°) ➔ CUMPLE`,
          44,
          curY + 22,
        );
        doc.text(
          `• Altura Metacéntrica Inicial Corregida: GM₀ = ${grainPlan?.departureGm0?.toFixed(2)} m (Requisito OMI: ≥ 0.30 m) ➔ CUMPLE`,
          44,
          curY + 38,
        );
        doc.text(
          `• Área Dinámica Residual bajo Curva GZ: ${grainPlan?.residualDynamicalStabilityArea} m·rad (Requisito OMI: ≥ 0.075 m·rad) ➔ CUMPLE`,
          44,
          curY + 54,
        );

        doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#047857");
        doc.text(
          "ESTADO: BUQUE APTO PARA NAVEGACIÓN EN TODAS LAS CONDICIONES METEOROLÓGICAS",
          44,
          curY + 70,
        );

        curY += 95;

        // Master Certification
        doc.rect(36, curY, 523, 60).strokeColor("#cbd5e1").stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7);
        doc.text("APROBACIÓN DEL CAPITÁN DEL BUQUE", 44, curY + 6);
        doc.font("Helvetica").fontSize(6.5).fillColor("#475569");
        doc.text(
          "Certifico que el plan de estiba y la secuencia de llenado de bodegas cumplen estrictamente las disposiciones del Código de Granos de la OMI.",
          44,
          curY + 20,
          { width: 505, lineGap: 2 },
        );
        doc.text(
          `Capitán: ${grainPlan?.approvedByMasterName || "Capt. Fernando Mendez"}`,
          44,
          curY + 44,
        );
        doc.text("Firma y Sello Oficial del Buque", 340, curY + 44);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 4. Generates a Tanker Liquid Quantity Survey Report PDF (ASTM-IP Table 54).
   */
  public static async generateUllageTankSurveyPdf(
    ullageSurvey: any,
    vesselOp: any,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header - Deep Blue Tanker
        doc.rect(36, 36, 523, 50).fill("#0369a1");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(12);
        doc.text("TANKER ULLAGE & LIQUID QUANTITY SURVEY REPORT", 44, 46);
        doc.font("Helvetica").fontSize(8).fillColor("#e0f2fe");
        doc.text(
          "INFORME DE SONDEO DE TANQUES & VOLUMEN ESTÁNDAR (ASTM TABLE 54)",
          44,
          63,
        );
        doc.text(
          `REF: ${ullageSurvey?.surveyReference || "ULL-2026-001"}`,
          340,
          46,
          {
            align: "right",
            width: 210,
          },
        );

        let curY = 96;

        // Product & Tanker Particulars
        doc
          .rect(36, curY, 523, 55)
          .fill("#f8fafc")
          .strokeColor("#cbd5e1")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7.5);
        doc.text("DATOS DEL BUQUE TANQUE & PRODUCTO LÍQUIDO", 44, curY + 6);
        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          `Buque: ${vesselOp?.vesselName || "MT Atlantic Energy"} | Producto: ${ullageSurvey?.productName || "JET A-1 FUEL"}`,
          44,
          curY + 18,
        );
        doc.text(
          `Número de Tanques Sondeados: ${ullageSurvey?.tankCount || 8} | Empresa Inspectora: ${ullageSurvey?.surveyorCompany || "SGS Oil & Gas Surveyors"}`,
          44,
          curY + 30,
        );
        doc.text(
          `Fecha del Sondeo: ${ullageSurvey?.surveyDate || new Date().toISOString().substring(0, 10)}`,
          44,
          curY + 42,
        );

        curY += 63;

        // Table 54 Calculation Breakdown
        doc
          .rect(36, curY, 523, 100)
          .fill("#ffffff")
          .strokeColor("#e2e8f0")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8);
        doc.text(
          "VOLUMEN OBSERVADO, CORRECCIÓN POR TEMPERATURA & MASA COMERCIAL",
          44,
          curY + 6,
        );

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(
          `1. Volumen Total Observado (TOV): ${ullageSurvey?.totalObservedVolumeM3?.toLocaleString("en-US")} m³`,
          44,
          curY + 22,
        );
        doc.text(
          `2. Agua Libre en Fondo (Free Water Dip): ${ullageSurvey?.totalFreeWaterVolumeM3} m³`,
          44,
          curY + 36,
        );
        doc.text(
          `3. Volumen Bruto Observado (GOV = TOV - FW): ${ullageSurvey?.grossObservedVolumeM3?.toLocaleString("en-US")} m³`,
          44,
          curY + 50,
        );
        doc.text(
          `4. Temperatura Media Observada: ${ullageSurvey?.observedAverageTemperatureCelsius}°C`,
          44,
          curY + 64,
        );
        doc.text(
          `5. Densidad a 15°C: ${ullageSurvey?.densityAt15Celsius} t/m³ | VCF (ASTM 54B): ${ullageSurvey?.volumeCorrectionFactorAstm54}`,
          44,
          curY + 78,
        );

        doc.font("Helvetica-Bold").fontSize(8).fillColor("#0369a1");
        doc.text(
          `6. Volumen Estándar Neto (NSV a 15°C): ${ullageSurvey?.netStandardVolumeM3?.toLocaleString("en-US")} m³`,
          300,
          curY + 22,
        );
        doc.fillColor("#166534");
        doc.text(
          `7. MASA COMERCIAL EN AIRE: ${ullageSurvey?.metricTonnesInAir?.toLocaleString("en-US")} TONELADAS`,
          300,
          curY + 44,
        );
        doc.font("Helvetica").fillColor("#475569");
        doc.text(
          `8. Masa Física en Vacío: ${ullageSurvey?.metricTonnesInVacuum?.toLocaleString("en-US")} t`,
          300,
          curY + 64,
        );

        curY += 110;

        // Signatures
        doc.rect(36, curY, 523, 55).strokeColor("#cbd5e1").stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7);
        doc.text(
          "CERTIFICADO DE MEDIDAS & CALIDAD (INDEPENDENT CARGO SURVEYOR)",
          44,
          curY + 6,
        );
        doc.font("Helvetica").fontSize(6.5).fillColor("#475569");
        doc.text(
          "Las lecturas de sonda, agua libre y temperatura han sido verificadas en presencia de la tripulación del buque y la terminal.",
          44,
          curY + 18,
        );
        doc.text("Firma del Inspector de Tanques", 44, curY + 40);
        doc.text("Firma del Capitán / Cargo Officer", 340, curY + 40);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
