export interface DocumentAuditInput {
  documentId?: string;
  documentType:
    | "COMMERCIAL_INVOICE"
    | "OCEAN_BILL_OF_LADING"
    | "AIR_WAYBILL"
    | "ROAD_CMR"
    | "RAIL_CIM"
    | "INSURANCE_CERTIFICATE"
    | "CERTIFICATE_OF_ORIGIN"
    | "PACKING_LIST"
    | "INSPECTION_CERTIFICATE"
    | "PHYTOSANITARY_CERTIFICATE";
  documentReferenceNumber: string;
  documentDate: string; // YYYY-MM-DD
  issuerName: string;
  shippedOnBoardDate?: string | null;
  cleanOnBoardStatus?: boolean;
  freightPaymentClause?: "PREPAID" | "COLLECT" | null;
  invoiceAmount?: number | null;
  invoiceCurrency?: string | null;
  goodsDescriptionExactMatch?: boolean;
  insuredAmount?: number | null;
  insuredPercentageOfCif?: number | null;
  originalCopiesRequired?: number;
  originalCopiesPresented?: number;
}

export interface CreditInstrumentAuditInput {
  instrumentReference: string;
  currency: string;
  creditAmount: number;
  tolerancePercentage: number; // e.g. 5.0
  issueDate: string;
  latestShipmentDate: string;
  expiryDate: string;
  presentationPeriodDays: number; // Default 21
  portOfLoading: string;
  portOfDischarge: string;
  goodsDescriptionSummary: string;
  presentationDate: string; // Date when documents are submitted to bank
}

export interface DiscrepancyItem {
  documentId?: string;
  discrepancyRuleCode: string;
  articleReference: string;
  severity: "CRITICAL_REFUSAL" | "MAJOR_DISCREPANCY" | "MINOR_WAIVABLE";
  description: string;
  suggestedRemedy: string;
}

export interface UcpAuditResult {
  isCompliant: boolean;
  complianceStatus: "COMPLIANT" | "DISCREPANT";
  criticalRefusalCount: number;
  majorDiscrepancyCount: number;
  minorWaivableCount: number;
  totalDiscrepanciesCount: number;
  discrepancies: DiscrepancyItem[];
  presentationDaysElapsed: number;
  maxAllowedPresentationDays: number;
  invoiceAmountWithinTolerance: boolean;
  insuranceCoverageCompliant: boolean;
  transportDocumentCleanOnBoard: boolean;
}

export class UcpDiscrepancyValidatorService {
  /**
   * Evaluates presented trade documents against UCP 600 & ISBP 745 rules.
   */
  public static auditPresentation(
    credit: CreditInstrumentAuditInput,
    documents: DocumentAuditInput[],
  ): UcpAuditResult {
    const discrepancies: DiscrepancyItem[] = [];

    // 1. Find primary transport document (B/L, AWB, CMR, CIM)
    const transportDoc = documents.find((d) =>
      ["OCEAN_BILL_OF_LADING", "AIR_WAYBILL", "ROAD_CMR", "RAIL_CIM"].includes(
        d.documentType,
      ),
    );

    // 2. Find commercial invoice
    const invoiceDoc = documents.find(
      (d) => d.documentType === "COMMERCIAL_INVOICE",
    );

    // 3. Find insurance document
    const insuranceDoc = documents.find(
      (d) => d.documentType === "INSURANCE_CERTIFICATE",
    );

    let presentationDaysElapsed = 0;
    const maxAllowedPresentationDays = credit.presentationPeriodDays || 21;
    let transportCleanOnBoard = true;
    let invoiceWithinTolerance = true;
    let insuranceCompliant = true;

    // --- RULE A: UCP 600 Art. 14(c) & 14(d) - Presentation Period & Expiry ---
    const presTime = new Date(credit.presentationDate).getTime();
    const expiryTime = new Date(credit.expiryDate).getTime();

    if (presTime > expiryTime) {
      discrepancies.push({
        documentId: transportDoc?.documentId,
        discrepancyRuleCode: "UCP600_ART_14_EXPIRED_CREDIT",
        articleReference: "UCP 600 Art. 14(a) / Art. 29",
        severity: "CRITICAL_REFUSAL",
        description: `Presentación posterior a la fecha de vencimiento del crédito: Fecha presentación (${credit.presentationDate}) > Fecha vencimiento (${credit.expiryDate}).`,
        suggestedRemedy:
          "Solicitar enmienda bancaria (MT707) ampliando la fecha de vencimiento o solicitar autorización expresa de pago al ordenante.",
      });
    }

    if (transportDoc) {
      const shipDateStr =
        transportDoc.shippedOnBoardDate || transportDoc.documentDate;
      const shipTime = new Date(shipDateStr).getTime();
      const latestShipTime = new Date(credit.latestShipmentDate).getTime();

      // Check Latest Shipment Date
      if (shipTime > latestShipTime) {
        discrepancies.push({
          documentId: transportDoc.documentId,
          discrepancyRuleCode: "UCP600_ART_14_LATE_SHIPMENT",
          articleReference: "UCP 600 Art. 14(a) / Art. 27",
          severity: "CRITICAL_REFUSAL",
          description: `Embarque fuera de plazo reglamentario: Fecha de embarque (${shipDateStr}) posterior a la fecha límite (${credit.latestShipmentDate}).`,
          suggestedRemedy:
            "Rechazo formal salvo que el banco emisor reciba instrucciones de aceptación del ordenante.",
        });
      }

      // Check 21-day presentation rule (Art. 14c)
      const diffMs = presTime - shipTime;
      presentationDaysElapsed = Math.max(
        0,
        Math.floor(diffMs / (1000 * 60 * 60 * 24)),
      );

      if (presentationDaysElapsed > maxAllowedPresentationDays) {
        discrepancies.push({
          documentId: transportDoc.documentId,
          discrepancyRuleCode: "UCP600_ART_14_LATE_PRESENTATION",
          articleReference: "UCP 600 Art. 14(c) & ISBP 745 Para A19",
          severity: "CRITICAL_REFUSAL",
          description: `Presentación tardía de documentos: Han transcurrido ${presentationDaysElapsed} días naturales desde la fecha de embarque (${shipDateStr}), superando el plazo límite de ${maxAllowedPresentationDays} días.`,
          suggestedRemedy:
            "Solicitar waiver formal de discrepancia al Ordenante (Applicant) a través del Banco Emisor.",
        });
      }

      // Check Clean on Board Status (Art. 20a, 27)
      if (transportDoc.cleanOnBoardStatus === false) {
        transportCleanOnBoard = false;
        discrepancies.push({
          documentId: transportDoc.documentId,
          discrepancyRuleCode: "UCP600_ART_27_CLAUSED_TRANSPORT_DOC",
          articleReference: "UCP 600 Art. 27 & ISBP 745 Para E16",
          severity: "CRITICAL_REFUSAL",
          description:
            "Documento de transporte con reservas o cláusulas de daño/deterioro ('Claused / Unclean B/L'). La UCP 600 exige un documento 'Clean on Board'.",
          suggestedRemedy:
            "Aportar nuevo conocimiento de embarque limpio sin cláusulas restrictivas o solicitar renuncia al ordenante.",
        });
      }
    }

    // --- RULE B: UCP 600 Art. 18 & Art. 30 - Commercial Invoice ---
    if (invoiceDoc) {
      // Currency match (Art. 18a(iii))
      if (
        invoiceDoc.invoiceCurrency &&
        invoiceDoc.invoiceCurrency !== credit.currency
      ) {
        invoiceWithinTolerance = false;
        discrepancies.push({
          documentId: invoiceDoc.documentId,
          discrepancyRuleCode: "UCP600_ART_18_CURRENCY_MISMATCH",
          articleReference: "UCP 600 Art. 18(a)(iii)",
          severity: "CRITICAL_REFUSAL",
          description: `Divisa de factura incorrecta: Emitida en ${invoiceDoc.invoiceCurrency} cuando el crédito está denominado en ${credit.currency}.`,
          suggestedRemedy:
            "Emitir factura corregida en la divisa oficial del crédito documentario.",
        });
      }

      // Amount tolerance check (Art. 30)
      if (typeof invoiceDoc.invoiceAmount === "number") {
        const tolFactor = 1 + (credit.tolerancePercentage || 5.0) / 100;
        const minTolFactor = 1 - (credit.tolerancePercentage || 5.0) / 100;
        const maxAllowedAmount = credit.creditAmount * tolFactor;
        const minAllowedAmount = credit.creditAmount * minTolFactor;

        if (invoiceDoc.invoiceAmount > maxAllowedAmount) {
          invoiceWithinTolerance = false;
          discrepancies.push({
            documentId: invoiceDoc.documentId,
            discrepancyRuleCode: "UCP600_ART_18_AMOUNT_EXCEEDED",
            articleReference: "UCP 600 Art. 18(b) / Art. 30(b)",
            severity: "MAJOR_DISCREPANCY",
            description: `Importe de factura (${invoiceDoc.invoiceAmount.toFixed(
              2,
            )} ${credit.currency}) supera el importe máximo autorizado con tolerancia (${maxAllowedAmount.toFixed(
              2,
            )} ${credit.currency}).`,
            suggestedRemedy:
              "Reducir el importe facturado al límite autorizado o tramitar una enmienda MT707 de aumento de crédito.",
          });
        } else if (invoiceDoc.invoiceAmount < minAllowedAmount) {
          invoiceWithinTolerance = false;
          discrepancies.push({
            documentId: invoiceDoc.documentId,
            discrepancyRuleCode: "UCP600_ART_30_UNDERDRAWING_TOLERANCE",
            articleReference: "UCP 600 Art. 30(b)",
            severity: "MINOR_WAIVABLE",
            description: `Importe facturado (${invoiceDoc.invoiceAmount.toFixed(
              2,
            )} ${credit.currency}) es inferior a la tolerancia mínima del crédito (${minAllowedAmount.toFixed(
              2,
            )} ${credit.currency}).`,
            suggestedRemedy:
              "Verificar si se permite disposición parcial o justificar reducción de cantidades embarcadas.",
          });
        }
      }

      // Goods description exact match (Art. 18c)
      if (invoiceDoc.goodsDescriptionExactMatch === false) {
        discrepancies.push({
          documentId: invoiceDoc.documentId,
          discrepancyRuleCode: "UCP600_ART_18_GOODS_DESCRIPTION_MISMATCH",
          articleReference: "UCP 600 Art. 18(c) & ISBP 745 Para C3",
          severity: "CRITICAL_REFUSAL",
          description:
            "La descripción de las mercancías en la factura comercial no se corresponde exactamente con la descripción estipulada en el crédito documentario.",
          suggestedRemedy:
            "Reexpedir factura comercial reproduciendo con total literalidad el texto del campo 45A del crédito.",
        });
      }
    }

    // --- RULE C: UCP 600 Art. 28 - Insurance Document ---
    if (insuranceDoc) {
      const cifInvoiceAmount = invoiceDoc?.invoiceAmount || credit.creditAmount;
      const minRequiredInsuredAmount = Number(
        (cifInvoiceAmount * 1.1).toFixed(2),
      ); // 110% CIF under Art. 28f(ii)

      if (
        typeof insuranceDoc.insuredAmount === "number" &&
        insuranceDoc.insuredAmount < minRequiredInsuredAmount - 0.01
      ) {
        insuranceCompliant = false;
        discrepancies.push({
          documentId: insuranceDoc.documentId,
          discrepancyRuleCode: "UCP600_ART_28_INSURANCE_UNDER_110_PCT",
          articleReference: "UCP 600 Art. 28(f)(ii) & ISBP 745 Para K7",
          severity: "MAJOR_DISCREPANCY",
          description: `Infraseguro de mercancías: Póliza suscrita por ${insuranceDoc.insuredAmount.toFixed(
            2,
          )} cuando el Art. 28(f)(ii) exige un mínimo del 110% del valor CIF (${minRequiredInsuredAmount.toFixed(
            2,
          )}).`,
          suggestedRemedy:
            "Aportar suplemento de endoso de la aseguradora cubriendo el 10% restante o solicitar waiver.",
        });
      }

      // Check effective date on or before shipment date (Art. 28e)
      if (transportDoc) {
        const shipDateStr =
          transportDoc.shippedOnBoardDate || transportDoc.documentDate;
        const insTime = new Date(insuranceDoc.documentDate).getTime();
        const shipTime = new Date(shipDateStr).getTime();

        if (insTime > shipTime) {
          insuranceCompliant = false;
          discrepancies.push({
            documentId: insuranceDoc.documentId,
            discrepancyRuleCode: "UCP600_ART_28_INSURANCE_POST_DATED",
            articleReference: "UCP 600 Art. 28(e) & ISBP 745 Para K10",
            severity: "CRITICAL_REFUSAL",
            description: `Fecha de emisión del seguro (${insuranceDoc.documentDate}) posterior a la fecha de embarque (${shipDateStr}). La cobertura debe ser efectiva a más tardar el día del embarque.`,
            suggestedRemedy:
              "Obtener certificado de la aseguradora certificando que la cobertura tuvo efecto antes o en la fecha de embarque.",
          });
        }
      }
    }

    // --- RULE D: Original Copies Check ---
    for (const doc of documents) {
      if (
        doc.originalCopiesRequired &&
        doc.originalCopiesPresented &&
        doc.originalCopiesPresented < doc.originalCopiesRequired
      ) {
        discrepancies.push({
          documentId: doc.documentId,
          discrepancyRuleCode: "UCP600_ART_17_MISSING_ORIGINAL_COPIES",
          articleReference: "UCP 600 Art. 17 & ISBP 745 Para A29",
          severity: "MAJOR_DISCREPANCY",
          description: `Faltan ejemplares originales de ${doc.documentType}: Se presentaron ${doc.originalCopiesPresented} originales de los ${doc.originalCopiesRequired} exigidos por el crédito.`,
          suggestedRemedy:
            "Aportar el juego completo de originales restantes exigidos en la carta de crédito.",
        });
      }
    }

    const criticalRefusalCount = discrepancies.filter(
      (d) => d.severity === "CRITICAL_REFUSAL",
    ).length;
    const majorDiscrepancyCount = discrepancies.filter(
      (d) => d.severity === "MAJOR_DISCREPANCY",
    ).length;
    const minorWaivableCount = discrepancies.filter(
      (d) => d.severity === "MINOR_WAIVABLE",
    ).length;
    const totalDiscrepanciesCount = discrepancies.length;
    const isCompliant = totalDiscrepanciesCount === 0;

    return {
      isCompliant,
      complianceStatus: isCompliant ? "COMPLIANT" : "DISCREPANT",
      criticalRefusalCount,
      majorDiscrepancyCount,
      minorWaivableCount,
      totalDiscrepanciesCount,
      discrepancies,
      presentationDaysElapsed,
      maxAllowedPresentationDays,
      invoiceAmountWithinTolerance: invoiceWithinTolerance,
      insuranceCoverageCompliant: insuranceCompliant,
      transportDocumentCleanOnBoard: transportCleanOnBoard,
    };
  }
}
