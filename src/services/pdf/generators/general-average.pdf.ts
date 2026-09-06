import PDFDocument from "pdfkit";

export class GeneralAveragePdfGenerator {
  /**
   * 1. Generates an Official Master's Declaration of General Average & Sea Protest PDF (YAR 2016).
   */
  public static async generateMasterGeneralAverageDeclarationPdf(
    gaCase: any,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header Banner
        doc.rect(36, 36, 523, 58).fill("#7f1d1d"); // Deep Maritime Crimson
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(13);
        doc.text(
          "DECLARACIÓN FORMAL DE AVERÍA GRUESA & PROTESTA DE MAR",
          44,
          48,
        );
        doc.font("Helvetica").fontSize(8.5).fillColor("#fecaca");
        doc.text(
          "MASTER'S DECLARATION OF GENERAL AVERAGE — YORK-ANTWERP RULES 2016",
          44,
          66,
        );
        doc.text(
          `EXPEDIENTE / REF: ${gaCase?.caseReference || "GA-2026-001"}`,
          360,
          48,
          {
            align: "right",
            width: 190,
          },
        );
        doc.text(
          `FECHA: ${new Date().toISOString().substring(0, 10)}`,
          360,
          66,
          { align: "right", width: 190 },
        );

        let curY = 104;

        // Vessel & Casualty Particulars Box
        doc
          .rect(36, curY, 523, 85)
          .fill("#f8fafc")
          .strokeColor("#cbd5e1")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8.5);
        doc.text(
          "DATOS DEL BUQUE, VIAJE Y SINIESTRO EXTRAORDINARIO",
          44,
          curY + 8,
        );

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(
          `Buque (Vessel): ${gaCase?.vesselName} (IMO: ${gaCase?.imoNumber} - Bandera: ${gaCase?.flagState})`,
          44,
          curY + 24,
        );
        doc.text(
          `Armador / Propietario: ${gaCase?.shipownerName}`,
          300,
          curY + 24,
        );
        doc.text(`Capitán al Mando: ${gaCase?.masterName}`, 44, curY + 38);
        doc.text(
          `Viaje: ${gaCase?.voyageOrigin} ➔ ${gaCase?.voyageDestination}`,
          300,
          curY + 38,
        );
        doc.text(
          `Fecha y Lugar Siniestro: ${gaCase?.casualtyDate} en ${gaCase?.casualtyLocation}`,
          44,
          curY + 52,
        );
        doc.text(
          `Puerto de Refugio: ${gaCase?.portOfRefuge} (Llegada: ${gaCase?.dateArrivalPortOfRefuge || "En curso"})`,
          300,
          curY + 52,
        );
        doc.text(
          `Régimen Jurídico: Reglas de York-Amberes (${gaCase?.governingRules || "YAR 2016"})`,
          44,
          curY + 66,
        );
        doc.text(
          `Contrato de Salvamento: ${gaCase?.salvageContractType?.replace(/_/g, " ") || "LOF 2024 / SCOPIC"} (${gaCase?.salvorName || "N/A"})`,
          300,
          curY + 66,
        );

        curY += 95;

        // Narrative & Legal Declaration
        doc
          .rect(36, curY, 523, 140)
          .fill("#ffffff")
          .strokeColor("#e2e8f0")
          .stroke();
        doc.fillColor("#7f1d1d").font("Helvetica-Bold").fontSize(8.5);
        doc.text(
          "RELATO CIRCUNSTANCIADO DEL SINIESTRO & PROTESTA DE MAR",
          44,
          curY + 8,
        );

        doc.font("Helvetica").fontSize(7.5).fillColor("#1e293b");
        doc.text(
          gaCase?.declarationNarrative ||
            "El Capitán al mando comparece y expone que, encontrándose el buque en navegación marítima con cargamento a bordo, sobrevino una situación de peligro común grave e inminente para la seguridad de la aventura marítima. En ejercicio de sus facultades legales y al amparo de las Reglas de York y Amberes 2016, el Capitán ordenó sacrificios y gastos extraordinarios intencionados y razonables con el único objeto de salvar el buque, el flete y la carga del peligro inminente.",
          44,
          curY + 24,
          { width: 505, lineGap: 3 },
        );

        curY += 150;

        // Average Adjusters Appointment Box
        doc
          .rect(36, curY, 523, 60)
          .fill("#fef2f2")
          .strokeColor("#fecaca")
          .stroke();
        doc.fillColor("#991b1b").font("Helvetica-Bold").fontSize(8.5);
        doc.text(
          "DESIGNACIÓN OFICIAL DE LIQUIDADORES DE AVERÍAS (AVERAGE ADJUSTERS)",
          44,
          curY + 8,
        );
        doc.font("Helvetica").fontSize(7.5).fillColor("#7f1d1d");
        doc.text(
          `Se ha designado formalmente a la firma independiente: ${gaCase?.averageAdjusterFirm || "Richards Hogg Lindley (RHL)"} ` +
            `(Liquidador Principal: ${gaCase?.leadAdjusterName || "Senior Average Adjuster"}) para proceder a la recopilación de garantías (Average Bonds / Guarantees) ` +
            `y a la liquidación pericial de la masa activa y pasiva contributoria bajo las Reglas de York-Amberes 2016.`,
          44,
          curY + 22,
          { width: 505, lineGap: 2.5 },
        );

        curY += 70;

        // Signatures
        doc.rect(36, curY, 255, 65).strokeColor("#cbd5e1").stroke();
        doc.rect(304, curY, 255, 65).strokeColor("#cbd5e1").stroke();

        doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#0f172a");
        doc.text("EL CAPITÁN DEL BUQUE", 44, curY + 8);
        doc.text("NOTARIO PÚBLICO / CÓNSUL MARÍTIMO", 312, curY + 8);

        doc.font("Helvetica").fontSize(7).fillColor("#64748b");
        doc.text(`Capt. ${gaCase?.masterName || "Master"}`, 44, curY + 45);
        doc.text("Doy fe y registro en el Libro de Protestas", 312, curY + 45);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 2. Generates an Official Lloyd's Average Bond Form (LAB 77 PDF).
   */
  public static async generateLloydsAverageBondPdf(
    security: any,
    gaCase: any,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header
        doc.rect(36, 36, 523, 50).fill("#1e293b");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(13);
        doc.text("LLOYD'S AVERAGE BOND (FORM LAB 77)", 44, 48);
        doc.font("Helvetica").fontSize(8).fillColor("#94a3b8");
        doc.text(
          "COMPROMISO VINCULANTE DE CONTRIBUCIÓN A LA AVERÍA GRUESA",
          44,
          65,
        );
        doc.text(
          `BOND REF: ${security?.securityReference || "SEC-001"}`,
          360,
          48,
          {
            align: "right",
            width: 190,
          },
        );

        let curY = 96;

        // Agreement Narrative
        doc
          .rect(36, curY, 523, 100)
          .fill("#f8fafc")
          .strokeColor("#cbd5e1")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8);
        doc.text(
          "ACUERDO DE COMPROMISO LEGAL Y ENTREGA DE MERCANCÍAS",
          44,
          curY + 8,
        );
        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(
          `EN VIRTUD DEL PRESENTE DOCUMENTO, los abajo firmantes, como propietarios o consignatarios del cargamento especificado a continuación, ` +
            `embarcado a bordo del buque "${gaCase?.vesselName}" en el viaje de ${gaCase?.voyageOrigin} a ${gaCase?.voyageDestination}, ` +
            `y respecto del cual se ha declarado Avería Gruesa tras el siniestro acaecido el ${gaCase?.casualtyDate}, ` +
            `A CAMBIO de que el armador autorice la entrega de la mercancía sin exigir previamente el pago inmediato de la cuota de contribución, ` +
            `SE COMPROMETEN FORMAL E IRREVOCABLEMENTE a pagar a los armadores o al Liquidador de Averías (${gaCase?.averageAdjusterFirm}) ` +
            `la proporción correspondiente que justamente sea fijada en la Liquidación General de Avería Gruesa bajo las Reglas de York-Amberes.`,
          44,
          curY + 22,
          { width: 505, lineGap: 2.5 },
        );

        curY += 110;

        // Consignee and Cargo Particulars
        doc
          .rect(36, curY, 523, 90)
          .fill("#ffffff")
          .strokeColor("#e2e8f0")
          .stroke();
        doc.fillColor("#1e293b").font("Helvetica-Bold").fontSize(8);
        doc.text(
          "DETALLE DEL CONSIGNATARIO Y DE LA CARGA COMPROMETIDA",
          44,
          curY + 8,
        );

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(
          `Receptor / Consignatario: ${security?.cargoConsigneeName} (NIF/VAT: ${security?.cargoConsigneeVat || "N/A"})`,
          44,
          curY + 24,
        );
        doc.text(
          `Importe Fianza Estimada: $${security?.securityAmountUsd?.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD`,
          320,
          curY + 24,
        );
        doc.text(
          `Aseguradora de la Carga: ${security?.insurerName || "Direct Cargo Owner"}`,
          44,
          curY + 38,
        );
        doc.text(
          `Póliza de Seguro: ${security?.insurerPolicyNumber || "N/A"}`,
          320,
          curY + 38,
        );
        doc.text(
          `Cuenta Fiduciaria / Depósito: ${security?.depositBankName || "Escrow Joint Account"}`,
          44,
          curY + 52,
        );
        doc.text(
          `Estado de Liberación Carga: ${security?.cargoReleaseAuthorized ? "AUTORIZADA / CARGO RELEASED" : "RETENCIÓN ACTIVA"}`,
          320,
          curY + 52,
        );
        doc.text(
          `Autorizado por: ${security?.releaseAuthorizedBy || gaCase?.leadAdjusterName || "Pending"}`,
          44,
          curY + 66,
        );

        curY += 102;

        // Signature & Undertaking
        doc.rect(36, curY, 255, 75).strokeColor("#cbd5e1").stroke();
        doc.rect(304, curY, 255, 75).strokeColor("#cbd5e1").stroke();

        doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#0f172a");
        doc.text("FIRMA DEL RECEPTOR / CONSIGNATARIO", 44, curY + 8);
        doc.text("ACEPTACIÓN DEL LIQUIDADOR DE AVERÍAS", 312, curY + 8);

        doc.font("Helvetica").fontSize(7).fillColor("#64748b");
        doc.text(
          "Firma legalmente vinculante bajo Lloyd's LAB 77",
          44,
          curY + 52,
        );
        doc.text(
          "Recepción conforme y autorización de levante",
          312,
          curY + 52,
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 3. Generates an Official Underwriter's Average Guarantee PDF.
   */
  public static async generateUnderwritersAverageGuaranteePdf(
    security: any,
    gaCase: any,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header
        doc.rect(36, 36, 523, 50).fill("#065f46"); // Emerald Green
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(13);
        doc.text("UNDERWRITER'S GENERAL AVERAGE GUARANTEE", 44, 48);
        doc.font("Helvetica").fontSize(8).fillColor("#a7f3d0");
        doc.text(
          "GARANTÍA DE ASEGURADOR DE TRANSPORTES — YORK-ANTWERP RULES",
          44,
          65,
        );
        doc.text(
          `GUARANTEE REF: ${security?.securityReference || "SEC-001"}`,
          360,
          48,
          {
            align: "right",
            width: 190,
          },
        );

        let curY = 96;

        // Underwriter's Guarantee Body
        doc
          .rect(36, curY, 523, 110)
          .fill("#f0fdf4")
          .strokeColor("#bbf7d0")
          .stroke();
        doc.fillColor("#065f46").font("Helvetica-Bold").fontSize(8.5);
        doc.text(
          "GARANTÍA FINANCIERA IRREVOCABLE A PRIMERA DEMANDA",
          44,
          curY + 8,
        );
        doc.font("Helvetica").fontSize(7.5).fillColor("#1e293b");
        doc.text(
          `LA ENTIDAD ASEGURADORA: ${security?.insurerName || "Underwriting Marine Syndicate"} ` +
            `(Póliza de Transporte Marítimo N° ${security?.insurerPolicyNumber || "POL-MAR-2026"}), ` +
            `en consideración a la entrega de la mercancía asegurada perteneciente a "${security?.cargoConsigneeName}" ` +
            `transportada a bordo del buque "${gaCase?.vesselName}" en el viaje de ${gaCase?.voyageOrigin} a ${gaCase?.voyageDestination}, ` +
            `POR EL PRESENTE GARANTIZA de forma irrevocable e incondicional a los armadores (${gaCase?.shipownerName}) ` +
            `y al Liquidador de Averías (${gaCase?.averageAdjusterFirm}) el pago de la contribución que legalmente corresponda satisfacer ` +
            `a dicha mercancía en concepto de Avería Gruesa y/o Salvamento marítimo con arreglo a las Reglas de York-Amberes.`,
          44,
          curY + 24,
          { width: 505, lineGap: 2.5 },
        );

        curY += 120;

        // Security Amount and Conditions Box
        doc
          .rect(36, curY, 523, 75)
          .fill("#ffffff")
          .strokeColor("#e2e8f0")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8);
        doc.text(
          "CONDICIONES DE LA FIANZA Y LÍMITES DE RESPONSABILIDAD",
          44,
          curY + 8,
        );

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(
          `Límite Máximo de Garantía: $${security?.securityAmountUsd?.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD`,
          44,
          curY + 24,
        );
        doc.text(
          `Vigencia: Hasta la emisión y liquidación final del Ajuste Pericial`,
          300,
          curY + 24,
        );
        doc.text(
          `Contacto Aseguradora: ${security?.insurerContactEmail || "marine.claims@insurer.com"}`,
          44,
          curY + 38,
        );
        doc.text(
          `Ley Aplicable y Jurisdicción: Derecho Marítimo Internacional / YAR 2016`,
          300,
          curY + 38,
        );
        doc.text(
          `Autorización de Levante: ${security?.cargoReleaseAuthorized ? "AUTORIZADA / RELEASE ISSUED" : "EN REVISIÓN"}`,
          44,
          curY + 52,
        );

        curY += 90;

        // Signatures
        doc.rect(36, curY, 255, 75).strokeColor("#cbd5e1").stroke();
        doc.rect(304, curY, 255, 75).strokeColor("#cbd5e1").stroke();

        doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#0f172a");
        doc.text("POR LA COMPAÑÍA ASEGURADORA", 44, curY + 8);
        doc.text("CONFORME DEL ARMADOR / AJUSTADOR", 312, curY + 8);

        doc.font("Helvetica").fontSize(7).fillColor("#64748b");
        doc.text("Firma y Sello de la Entidad Aseguradora", 44, curY + 52);
        doc.text("Aceptación de la Garantía de Asegurador", 312, curY + 52);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 4. Generates an Official General Average Adjustment Statement & Apportionment Sheet PDF.
   */
  public static async generateGeneralAverageAdjustmentStatementPdf(
    adjustment: any,
    gaCase: any,
    interests: any[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header
        doc.rect(36, 36, 523, 54).fill("#0f172a");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(13);
        doc.text(
          "GENERAL AVERAGE ADJUSTMENT STATEMENT & APPORTIONMENT",
          44,
          46,
        );
        doc.font("Helvetica").fontSize(8).fillColor("#94a3b8");
        doc.text(
          "CUADRO OFICIAL DE LIQUIDACIÓN Y AJUSTE GENERAL — YORK-ANTWERP RULES 2016",
          44,
          64,
        );
        doc.text(
          `ADJUSTMENT REF: ${adjustment?.adjustmentReference || "ADJ-2026-01"}`,
          340,
          46,
          {
            align: "right",
            width: 210,
          },
        );

        let curY = 98;

        // Executive Summary Box
        doc
          .rect(36, curY, 523, 75)
          .fill("#f8fafc")
          .strokeColor("#cbd5e1")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8);
        doc.text(
          "RESUMEN EJECUTIVO DEL AJUSTE & TASA FINAL DE CONTRIBUCIÓN",
          44,
          curY + 8,
        );

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(
          `Buque: ${gaCase?.vesselName} (IMO ${gaCase?.imoNumber})`,
          44,
          curY + 24,
        );
        doc.text(
          `Fecha Siniestro: ${gaCase?.casualtyDate} en ${gaCase?.casualtyLocation}`,
          300,
          curY + 24,
        );
        doc.text(
          `Total Masa Activa (Allowances): $${adjustment?.totalAllowancesUsd?.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD`,
          44,
          curY + 38,
        );
        doc.text(
          `Total Masa Pasiva (Contributory): $${adjustment?.totalContributoryValueUsd?.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD`,
          300,
          curY + 38,
        );
        doc.font("Helvetica-Bold").fillColor("#b91c1c");
        doc.text(
          `Tasa Final de Contribución: ${adjustment?.finalRateOfContributionPercentage?.toFixed(4)}%`,
          44,
          curY + 52,
        );
        doc.font("Helvetica").fillColor("#334155");
        doc.text(
          `Intereses CMI (${adjustment?.cmiInterestRatePercentage || 6}%): $${adjustment?.totalCmiInterestUsd?.toLocaleString("en-US")} USD`,
          300,
          curY + 52,
        );

        curY += 85;

        // Apportionment Matrix Table
        doc.rect(36, curY, 523, 16).fill("#334155");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7);
        doc.text("Interés Contribuyente", 44, curY + 4);
        doc.text("B/L / Contenedor", 170, curY + 4);
        doc.text("Valor Contributorio", 260, curY + 4);
        doc.text("Cuota Bruta", 350, curY + 4);
        doc.text("Made Good", 425, curY + 4);
        doc.text("Saldo Neto", 490, curY + 4);

        curY += 16;

        for (const item of interests || []) {
          doc.rect(36, curY, 523, 18).strokeColor("#e2e8f0").stroke();
          doc.font("Helvetica").fontSize(7).fillColor("#0f172a");
          doc.text(
            `${item.ownerOrReceiverName || item.interestCategory?.replace(/_/g, " ")}`,
            44,
            curY + 4,
            { width: 120 },
          );
          doc.text(
            `${item.blReference || item.containerNumber || "N/A"}`,
            170,
            curY + 4,
          );
          doc.text(
            `$${item.contributoryValueUsd?.toLocaleString("en-US")}`,
            260,
            curY + 4,
          );
          doc.text(
            `$${item.calculatedContributionUsd?.toLocaleString("en-US")}`,
            350,
            curY + 4,
          );
          doc.text(
            `$${item.madeGoodAllowanceUsd?.toLocaleString("en-US")}`,
            425,
            curY + 4,
          );

          const isDebtor = item.balanceType === "PAYABLE_DEBTOR";
          doc
            .font("Helvetica-Bold")
            .fillColor(isDebtor ? "#b91c1c" : "#047857");
          doc.text(
            `${isDebtor ? "+" : "-"}$${Math.abs(item.netFinancialBalanceUsd || 0)?.toLocaleString("en-US")}`,
            490,
            curY + 4,
          );
          curY += 18;
        }

        curY += 15;

        // Adjuster Certification Box
        doc
          .rect(36, curY, 523, 60)
          .fill("#f8fafc")
          .strokeColor("#cbd5e1")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7.5);
        doc.text(
          "DICTAMEN Y CERTIFICACIÓN DEL LIQUIDADOR DE AVERÍAS",
          44,
          curY + 8,
        );
        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          adjustment?.adjusterCertificationStatement ||
            "Certificamos que la presente liquidación general de avería gruesa ha sido practicada con estricta sujeción a las Reglas de York y Amberes 2016 y a las pólizas de fletamento aplicables.",
          44,
          curY + 22,
          { width: 505, lineGap: 2 },
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
