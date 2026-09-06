import PDFDocument from "pdfkit";

/**
 * Cargo Insurance PDF Generator
 * Institute Cargo Clauses (ICC A/B/C 2009) / LMA / UCP 600 Art. 28 / Open Cover
 */
export class CargoInsurancePdfGenerator {
  /**
   * 1. Generates an Official UCP 600 Art. 28 Cargo Insurance Certificate PDF.
   */
  public static async generateCargoInsuranceCertificatePdf(
    certificate: any,
    openPolicy?: any,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header - Deep Royal Navy
        doc.rect(36, 36, 523, 52).fill("#0369a1");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(12.5);
        doc.text("CERTIFICATE OF CARGO INSURANCE (UCP 600 ART. 28)", 44, 46);
        doc.font("Helvetica").fontSize(8).fillColor("#e0f2fe");
        doc.text(
          "CERTIFICADO OFICIAL DE SEGURO DE TRANSPORTE DE MERCANCÍAS",
          44,
          63,
        );
        doc.text(
          `CERT N°: ${certificate?.certificateNumber || "INS-CERT-2026-001"}`,
          340,
          46,
          {
            align: "right",
            width: 210,
          },
        );
        doc.text(
          `PÓLIZA: ${openPolicy?.policyNumber || "OPEN-COVER-2026"}`,
          340,
          63,
          {
            align: "right",
            width: 210,
          },
        );

        let curY = 96;

        // Insurer, Policyholder & Consignee Box
        doc
          .rect(36, curY, 256, 75)
          .fill("#f8fafc")
          .strokeColor("#cbd5e1")
          .stroke();
        doc
          .rect(302, curY, 257, 75)
          .fill("#f8fafc")
          .strokeColor("#cbd5e1")
          .stroke();

        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7.5);
        doc.text("1. ASEGURADO / TOMADOR DEL SEGURO:", 42, curY + 6);
        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          `${certificate?.insuredPartyName || "Iberica Export Solutions SL"}`,
          42,
          curY + 18,
        );
        doc.text(
          `${certificate?.insuredPartyAddress || "Valencia, Spain"}`,
          42,
          curY + 28,
          { width: 245 },
        );
        doc.text(
          `Aseguradora: ${openPolicy?.insurerName || "Lloyd's Marine Syndicate & Zurich Global"}`,
          42,
          curY + 54,
        );

        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7.5);
        doc.text(
          "2. CONSIGNATARIO / A LA ORDEN DE (BENEFICIARIO):",
          308,
          curY + 6,
        );
        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          `${certificate?.consigneeOrToOrderName || "TO THE ORDER OF ISSUING BANK"}`,
          308,
          curY + 18,
          { width: 245 },
        );
        doc.text(
          `Pérdidas Pagaderas en: ${certificate?.claimPayableAtCity || "Madrid"} (${certificate?.commercialCurrency || "EUR"})`,
          308,
          curY + 54,
        );

        curY += 82;

        // Voyage & Transport Details
        doc
          .rect(36, curY, 523, 45)
          .fill("#ffffff")
          .strokeColor("#e2e8f0")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7.5);
        doc.text("3. DETALLES DEL TRANSPORTE Y TRAVESÍA", 44, curY + 6);

        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          `Modo: ${certificate?.transportMode?.replace(/_/g, " ") || "MARITIME"} | Porteador: ${certificate?.carrierName || "Carrier"}`,
          44,
          curY + 18,
        );
        doc.text(
          `Buque / Vuelo / Matrícula: ${certificate?.vesselOrFlightOrVehiclePlate || "MV Vessel"} (Viaje: ${certificate?.voyageNumber || "V.2608"})`,
          260,
          curY + 18,
        );
        doc.text(
          `Origen: ${certificate?.originPortOrCountry || "ESVLC"} ➔ Destino: ${certificate?.destinationPortOrCountry || "SGSIN"}`,
          44,
          curY + 30,
        );
        doc.text(
          `Fecha de Salida: ${certificate?.departureDate || new Date().toISOString().substring(0, 10)}`,
          360,
          curY + 30,
        );

        curY += 52;

        // Insured Value & Commodity Breakdown Box
        doc
          .rect(36, curY, 523, 60)
          .fill("#f0fdf4")
          .strokeColor("#bbf7d0")
          .stroke();
        doc.fillColor("#166534").font("Helvetica-Bold").fontSize(8);
        doc.text(
          "4. MERCANCÍA Y SUMA ASEGURADA (110% VALOR CIF / CIP CONFORME UCP 600)",
          44,
          curY + 6,
        );

        doc.font("Helvetica").fontSize(7).fillColor("#14532d");
        doc.text(
          `Descripción: ${certificate?.goodsDescription || "Cargamento general"}`,
          44,
          curY + 20,
        );
        doc.text(
          `Bultos / Peso Bruto: ${certificate?.packageCount || 1} bultos | ${certificate?.grossWeightKg?.toLocaleString("en-US")} kg`,
          340,
          curY + 20,
        );

        doc.text(
          `Factura Comercial: $${certificate?.commercialInvoiceValue?.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${certificate?.commercialCurrency}`,
          44,
          curY + 34,
        );
        doc.text(
          `Flete + Seguro: $${((certificate?.freightAmount || 0) + (certificate?.estimatedInsuranceAmount || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          200,
          curY + 34,
        );
        doc.text(
          `Recargo UCP 600: +${certificate?.markupPercentage || 10}%`,
          330,
          curY + 34,
        );

        doc.font("Helvetica-Bold").fontSize(8).fillColor("#047857");
        doc.text(
          `SUMA TOTAL ASEGURADA: $${certificate?.totalInsuredValue?.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${certificate?.commercialCurrency}`,
          44,
          curY + 46,
        );

        curY += 68;

        // Coverage Clauses & Deductible Box
        doc
          .rect(36, curY, 523, 62)
          .fill("#ffffff")
          .strokeColor("#cbd5e1")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7.5);
        doc.text(
          "5. CONDICIONES DE COBERTURA & CLÁUSULAS DEL INSTITUTO DE LONDRES (LMA/IUA)",
          44,
          curY + 6,
        );

        doc.font("Helvetica").fontSize(6.5).fillColor("#334155");
        doc.text(
          `• Cobertura Principal: ${certificate?.coverageClause?.replace(/_/g, " ") || "INSTITUTE CARGO CLAUSES (A) ALL RISKS 2009"}`,
          44,
          curY + 18,
        );
        doc.text(
          `• Cláusulas Adicionales: ${certificate?.hasWarStrikesCover ? "Institute War Clauses (Cargo) & Institute Strikes Clauses (Cargo)" : "Excluidas"}`,
          44,
          curY + 28,
        );
        doc.text(
          "• Exclusiones Especiales: Institute Cyber Attack Exclusion Clause (CL. 380) & Sanction Limitation Clause (JC 2010/014).",
          44,
          curY + 38,
        );
        doc.font("Helvetica-Bold").fillColor("#b91c1c");
        doc.text(
          `• Franquicia Deducible: $${certificate?.deductibleAmount?.toLocaleString("en-US", { minimumFractionDigits: 2 })} por siniestro cubierto.`,
          44,
          curY + 48,
        );

        curY += 70;

        // Claims Survey Agent Box
        doc
          .rect(36, curY, 523, 44)
          .fill("#fff7ed")
          .strokeColor("#fed7aa")
          .stroke();
        doc.fillColor("#9a3412").font("Helvetica-Bold").fontSize(7.5);
        doc.text(
          "6. COMISARIO DE AVERÍAS EN DESTINO / EN CASO DE SINIESTRO CONTACTAR A:",
          44,
          curY + 6,
        );
        doc.font("Helvetica").fontSize(7).fillColor("#7c2d12");
        doc.text(
          certificate?.claimSurveyAgentNameAddress ||
            "Lloyd's Agency / SGS Surveyors Ltd, Port of Destination",
          44,
          curY + 18,
          { width: 505 },
        );
        doc.text(
          "Aviso inmediato dentro de los 3 días hábiles siguientes a la descarga.",
          44,
          curY + 30,
        );

        curY += 50;

        // Signatures & Legal Endorsement
        doc.rect(36, curY, 523, 56).strokeColor("#cbd5e1").stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7);
        doc.text(
          "CERTIFICACIÓN DE SUSCRIPCIÓN & FIRMA AUTORIZADA",
          44,
          curY + 6,
        );
        doc.font("Helvetica").fontSize(6.5).fillColor("#475569");
        doc.text(
          "El presente certificado representa fielmente la cobertura contratada bajo la póliza marco mencionada y otorga al tenedor legítimo los derechos de reclamación e indemnización conforme al Artículo 28 de las Reglas y Usos Uniformes UCP 600.",
          44,
          curY + 18,
          { width: 505, lineGap: 1.5 },
        );

        doc.text(
          `Fecha de Emisión: ${certificate?.issueDate || new Date().toISOString().substring(0, 10)}`,
          44,
          curY + 42,
        );
        doc.text(
          "Firma y Sello de la Entidad Aseguradora / Suscriptor",
          340,
          curY + 42,
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 2. Generates an Open Cover Policy Schedule PDF.
   */
  public static async generateOpenCoverPolicySchedulePdf(
    openPolicy: any,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header
        doc.rect(36, 36, 523, 50).fill("#1e293b");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(12);
        doc.text("MARINE OPEN COVER POLICY SCHEDULE", 44, 46);
        doc.font("Helvetica").fontSize(8).fillColor("#94a3b8");
        doc.text(
          "CUADRO DE CONDICIONES DE PÓLIZA FLOTANTE DE SEGURO DE TRANSPORTE",
          44,
          63,
        );
        doc.text(
          `PÓLIZA N°: ${openPolicy?.policyNumber || "POL-2026"}`,
          340,
          46,
          {
            align: "right",
            width: 210,
          },
        );

        let curY = 96;

        // Policy Terms
        doc
          .rect(36, curY, 523, 75)
          .fill("#f8fafc")
          .strokeColor("#cbd5e1")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8);
        doc.text("DATOS GENERALES DE SUSCRIPCIÓN Y TOMADOR", 44, curY + 6);
        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(
          `Tomador: ${openPolicy?.policyHolderName || "Atlas Logistics Forwarding SL"} (NIF: ${openPolicy?.policyHolderTaxId || "B-99201452"})`,
          44,
          curY + 20,
        );
        doc.text(
          `Aseguradora: ${openPolicy?.insurerName || "Zurich Marine Syndicate"} | Corredor: ${openPolicy?.brokerName || "Aon Marine"}`,
          44,
          curY + 34,
        );
        doc.text(
          `Vigencia: Desde ${openPolicy?.startDate || "2026-01-01"} hasta ${openPolicy?.endDate || "2026-12-31"}`,
          44,
          curY + 48,
        );
        doc.text(
          `Moneda de Cuenta: ${openPolicy?.currency || "EUR"}`,
          340,
          curY + 48,
        );

        curY += 85;

        // Limits & Financials
        doc
          .rect(36, curY, 523, 75)
          .fill("#ffffff")
          .strokeColor("#e2e8f0")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8);
        doc.text(
          "LÍMITES ECONÓMICOS & TASAS ACTUARIALES ACORDADAS",
          44,
          curY + 6,
        );
        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(
          `Límite Máximo por Embarque / Buque: $${openPolicy?.conveyanceLimitAmount?.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${openPolicy?.currency}`,
          44,
          curY + 22,
        );
        doc.text(
          `Facturación Anual Estimada: $${openPolicy?.annualEstimatedTurnover?.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${openPolicy?.currency}`,
          44,
          curY + 36,
        );
        doc.text(
          `Tasa Base ICC (A): ${openPolicy?.baseRatePercentage || 0.2}% | Tasa Guerra/Huelga: ${openPolicy?.warStrikeRatePercentage || 0.04}%`,
          44,
          curY + 50,
        );
        doc.text(
          `Prima Mínima por Expedición: $${openPolicy?.minPremiumPerShipment || 50.0} ${openPolicy?.currency}`,
          300,
          curY + 50,
        );

        curY += 85;

        // Policy Clauses Text
        doc
          .rect(36, curY, 523, 110)
          .fill("#f8fafc")
          .strokeColor("#cbd5e1")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7.5);
        doc.text(
          "CLÁUSULAS CONTRACTUALES & MECANISMO DE DECLARACIÓN (BORDEREAU)",
          44,
          curY + 6,
        );
        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          openPolicy?.termsAndConditionsText ||
            "La presente póliza ampara todos los envíos de exportación e importación declarados periódicamente mediante bordereau mensual. " +
              "Se aplican las Institute Cargo Clauses (A) 1/1/09, Institute War Clauses y Cláusula de Ciberataque CL 380. Franquicia general de 500 EUR por siniestro.",
          44,
          curY + 22,
          { width: 505, lineGap: 2.5 },
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 3. Generates a Monthly Insurance Declaration Bordereau PDF.
   */
  public static async generateInsuranceBordereauPdf(
    bordereau: any,
    openPolicy: any,
    lines: any[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header
        doc.rect(36, 36, 523, 50).fill("#0284c7");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(12);
        doc.text("MONTHLY CARGO INSURANCE BORDEREAU", 44, 46);
        doc.font("Helvetica").fontSize(8).fillColor("#e0f2fe");
        doc.text(
          "RELACIÓN MENSUAL DE EXPEDICIONES DECLARADAS Y LIQUIDACIÓN DE PRIMAS",
          44,
          63,
        );
        doc.text(
          `REF: ${bordereau?.bordereauReference || "BDX-2026-08"}`,
          340,
          46,
          {
            align: "right",
            width: 210,
          },
        );
        doc.text(
          `PERIODO: ${bordereau?.periodMonthYear || "2026-08"}`,
          340,
          63,
          {
            align: "right",
            width: 210,
          },
        );

        let curY = 96;

        // Summary Box
        doc
          .rect(36, curY, 523, 48)
          .fill("#f8fafc")
          .strokeColor("#cbd5e1")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7.5);
        doc.text(
          `PÓLIZA MARCO: ${openPolicy?.policyNumber || "POL-2026"} (${openPolicy?.insurerName || "Insurer"})`,
          44,
          curY + 6,
        );
        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          `Expediciones Declaradas: ${bordereau?.declarationCount || lines.length}`,
          44,
          curY + 20,
        );
        doc.text(
          `Volumen Asegurado: $${bordereau?.totalInsuredTurnoverAmount?.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          170,
          curY + 20,
        );
        doc.text(
          `Prima Neta: $${bordereau?.totalNetPremiumAmount?.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          310,
          curY + 20,
        );
        doc.font("Helvetica-Bold").fillColor("#0369a1");
        doc.text(
          `TOTAL A PAGAR: $${bordereau?.totalGrossPremiumPayable?.toLocaleString("en-US", { minimumFractionDigits: 2 })} (Inc. IPS/Consorcio)`,
          44,
          curY + 34,
        );

        curY += 56;

        // Lines Table
        doc.rect(36, curY, 523, 16).fill("#334155");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(6.5);
        doc.text("Ref. Envío", 44, curY + 4);
        doc.text("Certificado", 140, curY + 4);
        doc.text("Destino", 240, curY + 4);
        doc.text("Suma Asegurada", 360, curY + 4);
        doc.text("Prima Neta", 470, curY + 4);

        curY += 16;

        for (const line of lines || []) {
          doc.rect(36, curY, 523, 20).strokeColor("#e2e8f0").stroke();
          doc.font("Helvetica").fontSize(6.5).fillColor("#0f172a");
          doc.text(line.shipmentReference, 44, curY + 5);
          doc.text(line.certificateId || "CERT-INS", 140, curY + 5);
          doc.text(line.destination || "DEST", 240, curY + 5);
          doc.text(
            `$${line.insuredValue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
            360,
            curY + 5,
          );
          doc.text(
            `$${line.netPremium?.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
            470,
            curY + 5,
          );
          curY += 20;
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 4. Generates an Insurance Claim Adjustment Statement PDF.
   */
  public static async generateInsuranceClaimAdjustmentPdf(
    claim: any,
    certificate: any,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header
        doc.rect(36, 36, 523, 50).fill("#991b1b");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(12);
        doc.text("CARGO INSURANCE CLAIM SETTLEMENT STATEMENT", 44, 46);
        doc.font("Helvetica").fontSize(8).fillColor("#fecaca");
        doc.text(
          "DICTAMEN PERICIAL DE LIQUIDACIÓN DE SINIESTRO Y AVERÍA PARTICULAR",
          44,
          63,
        );
        doc.text(`REF: ${claim?.claimReference || "CLM-INS-2026"}`, 340, 46, {
          align: "right",
          width: 210,
        });

        let curY = 96;

        // Casualty Particulars
        doc
          .rect(36, curY, 523, 60)
          .fill("#f8fafc")
          .strokeColor("#cbd5e1")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7.5);
        doc.text("DATOS DEL SINIESTRO Y CERTIFICADO DE SEGURO", 44, curY + 6);
        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          `Certificado de Seguro: ${certificate?.certificateNumber || "INS-CERT-2026"}`,
          44,
          curY + 20,
        );
        doc.text(
          `Asegurado: ${certificate?.insuredPartyName || "Asegurado"}`,
          250,
          curY + 20,
        );
        doc.text(
          `Causa / Tipo de Riesgo: ${claim?.perilType?.replace(/_/g, " ") || "WATER DAMAGE"}`,
          44,
          curY + 34,
        );
        doc.text(
          `Lugar y Fecha del Siniestro: ${claim?.casualtyLocation || "Puerto Destino"} (${claim?.casualtyDate || "2026-08"})`,
          250,
          curY + 34,
        );
        doc.text(
          `Informe Pericial: ${claim?.surveyReportReference || "SURVEY-2026-01"} por ${claim?.adjusterName || "Average Adjuster"}`,
          44,
          curY + 48,
        );

        curY += 70;

        // Assessment Table Box
        doc
          .rect(36, curY, 523, 100)
          .fill("#ffffff")
          .strokeColor("#e2e8f0")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8);
        doc.text(
          "CUADRO DE VALORACIÓN PERICIAL & DEDUCCIÓN DE FRANQUICIA",
          44,
          curY + 6,
        );

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(
          `1. Suma Total Asegurada: $${certificate?.totalInsuredValue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          44,
          curY + 22,
        );
        doc.text(
          `2. Valor Sano en Destino: $${claim?.soundMarketValueAtDestination?.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          44,
          curY + 36,
        );
        doc.text(
          `3. Valor Averiado / Salvamento: $${claim?.damagedSalvageValueAtDestination?.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          44,
          curY + 50,
        );
        doc.text(
          `4. Porcentaje de Depreciación Acreditado: ${claim?.depreciationPercentage}%`,
          44,
          curY + 64,
        );

        doc.text(
          `5. Evaluación Bruta del Daño: $${claim?.grossClaimAssessmentAmount?.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          300,
          curY + 22,
        );
        doc.font("Helvetica-Bold").fillColor("#b91c1c");
        doc.text(
          `6. Franquicia Deducible: -$${claim?.deductibleAppliedAmount?.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          300,
          curY + 36,
        );
        doc.fillColor("#166534");
        doc.text(
          `7. INDEMNIZACIÓN NETA A LIQUIDAR: $${claim?.netIndemnityPayableAmount?.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          300,
          curY + 50,
        );

        curY += 110;

        // Adjuster Certification
        doc
          .rect(36, curY, 523, 60)
          .fill("#f0fdf4")
          .strokeColor("#bbf7d0")
          .stroke();
        doc.fillColor("#166534").font("Helvetica-Bold").fontSize(7.5);
        doc.text(
          "DICTAMEN Y AUTORIZACIÓN DE PAGO DEL COMISARIO DE AVERÍAS",
          44,
          curY + 6,
        );
        doc.font("Helvetica").fontSize(7).fillColor("#14532d");
        doc.text(
          claim?.settlementNotes ||
            "Se autoriza la transferencia bancaria inmediata de la indemnización neta al beneficiario designado conforme a las condiciones de la póliza.",
          44,
          curY + 20,
          { width: 505, lineGap: 2 },
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
