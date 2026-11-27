/**
 * @file swift-message.service.ts
 * @description Domain service for generating and parsing SWIFT MT messages (MT700 Issue of Documentary Credit, MT734 Advice of Refusal, MT760 Demand Guarantee / Standby LC).
 * @module @atlas/api/modules/trade-finance/swift-message.service
 */

export interface SwiftMt700Input {
  instrumentReference: string;
  senderBic: string;
  receiverBic: string;
  issueDate: string; // YYYY-MM-DD
  expiryDate: string;
  expiryPlace: string;
  applicantName: string;
  beneficiaryName: string;
  currency: string;
  creditAmount: number;
  tolerancePercentage?: number;
  confirmationInstructions: "CONFIRM" | "MAY_ADD" | "WITHOUT";
  paymentTerms:
    "SIGHT" | "DEFERRED_PAYMENT" | "ACCEPTANCE_USANCE" | "NEGOTIATION";
  tenorDays?: number;
  portOfLoading: string;
  portOfDischarge: string;
  latestShipmentDate: string;
  goodsDescription: string;
  requiredDocumentsSummary?: string[];
  presentationPeriodDays?: number;
}

export interface SwiftMt734Input {
  instrumentReference: string;
  senderBic: string;
  receiverBic: string;
  currency: string;
  creditAmount: number;
  presentationDate: string;
  discrepancies: Array<{
    discrepancyRuleCode: string;
    articleReference: string;
    description: string;
  }>;
  disposalOfDocumentsInstruction?: string;
}

export interface SwiftMt760Input {
  instrumentReference: string;
  senderBic: string;
  receiverBic: string;
  issueDate: string; // YYYY-MM-DD
  expiryDate: string;
  expiryPlace?: string;
  applicantName: string;
  beneficiaryName: string;
  currency: string;
  guaranteeAmount: number;
  applicableRules: "URDG758" | "ISP98";
  purposeOfGuarantee:
    | "PERFORMANCE_BOND"
    | "ADVANCE_PAYMENT"
    | "BID_BOND"
    | "PAYMENT_GUARANTEE"
    | "FINANCIAL_GUARANTEE";
  underlyingContractReference?: string;
  guaranteeTerms: string;
}

export interface ParsedSwiftMtHeader {
  applicationId?: string;
  serviceId?: string;
  senderBic?: string;
  sessionNumber?: string;
  sequenceNumber?: string;
  messageType?: string;
  receiverBic?: string;
  messagePriority?: string;
}

export interface ParsedSwiftMt700 {
  messageType: "MT700";
  header: ParsedSwiftMtHeader;
  instrumentReference: string;
  sequenceTotal?: string;
  formOfCredit?: string;
  issueDate: string; // YYYY-MM-DD
  applicableRules: "UCP600" | "EUCP21" | "ISP98" | "URDG758";
  expiryDate: string; // YYYY-MM-DD
  expiryPlace: string;
  applicantName: string;
  beneficiaryName: string;
  currency: string;
  creditAmount: number;
  tolerancePercentage: number;
  availableWithBic?: string;
  paymentTerms:
    "SIGHT" | "DEFERRED_PAYMENT" | "ACCEPTANCE_USANCE" | "NEGOTIATION";
  tenorDays: number;
  partialShipmentsAllowed: boolean;
  transhipmentAllowed: boolean;
  portOfLoading: string;
  portOfDischarge: string;
  latestShipmentDate: string;
  goodsDescription: string;
  requiredDocumentsSummary: string[];
  additionalConditions: string[];
  confirmationInstructions: "CONFIRM" | "MAY_ADD" | "WITHOUT";
  rawFields: Record<string, string>;
}

export interface ParsedSwiftMt760 {
  messageType: "MT760";
  header: ParsedSwiftMtHeader;
  instrumentReference: string;
  sequenceTotal?: string;
  purposeOfGuarantee: string;
  formOfUndertaking?: string;
  applicableRules: "URDG758" | "ISP98";
  issueDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  applicantName: string;
  beneficiaryName: string;
  currency: string;
  guaranteeAmount: number;
  underlyingContractReference?: string;
  guaranteeTerms: string;
  rawFields: Record<string, string>;
}

export type ParsedSwiftMtResult = ParsedSwiftMt700 | ParsedSwiftMt760;

export class SwiftMessageService {
  /**
   * Generates a standard SWIFT MT700 message text (Issue of a Documentary Credit).
   */
  public static generateMt700(input: SwiftMt700Input): string {
    const formattedDate = input.issueDate.replace(/-/g, "").slice(2); // YYMMDD
    const formattedExpiry = input.expiryDate.replace(/-/g, "").slice(2);
    const formattedShip = input.latestShipmentDate.replace(/-/g, "").slice(2);
    const formattedAmount = input.creditAmount.toFixed(2).replace(".", ",");
    const tol = input.tolerancePercentage
      ? `0${input.tolerancePercentage}/0${input.tolerancePercentage}`
      : "05/05";

    const docs = input.requiredDocumentsSummary || [
      "1. SIGNED COMMERCIAL INVOICE IN 3 ORIGINALS",
      "2. FULL SET CLEAN ON BOARD OCEAN BILLS OF LADING CONSIGNED TO ORDER OF ISSUING BANK",
      "3. MARINE INSURANCE CERTIFICATE COVERING ALL RISKS FOR 110 PCT CIF INVOICE VALUE",
    ];

    const lines: string[] = [
      `{1:F01${input.senderBic.padEnd(12, "X")}0000000000}{2:I700${input.receiverBic.padEnd(12, "X")}N}{4:`,
      `:27:1/1`,
      `:40A:IRREVOCABLE`,
      `:20:${input.instrumentReference}`,
      `:31C:${formattedDate}`,
      `:40E:UCP LATEST VERSION`,
      `:31D:${formattedExpiry}${input.expiryPlace.toUpperCase()}`,
      `:50:${input.applicantName.toUpperCase()}`,
      `:59:${input.beneficiaryName.toUpperCase()}`,
      `:32B:${input.currency}${formattedAmount}`,
      `:39A:${tol}`,
      `:41A:${input.receiverBic} BY PAYMENT`,
      `:42C:${input.paymentTerms === "SIGHT" ? "AT SIGHT" : `AFTER ${input.tenorDays || 60} DAYS`}`,
      `:43P:NOT ALLOWED`,
      `:43T:NOT ALLOWED`,
      `:44E:${input.portOfLoading.toUpperCase()}`,
      `:44F:${input.portOfDischarge.toUpperCase()}`,
      `:44C:${formattedShip}`,
      `:45A:${input.goodsDescription.toUpperCase()}`,
      `:46A:${docs.join("\n")}`,
      `:47A:+ ALL DOCUMENTS MUST BE ISSUED IN ENGLISH`,
      `+ DOCUMENTS MUST BE PRESENTED WITHIN ${input.presentationPeriodDays || 21} DAYS AFTER SHIPMENT DATE`,
      `:49:${input.confirmationInstructions}`,
      `-}`,
    ];

    return lines.join("\n");
  }

  /**
   * Generates a standard SWIFT MT760 message text (Issue of a Demand Guarantee / Standby LC).
   */
  public static generateMt760(input: SwiftMt760Input): string {
    const formattedIssue = input.issueDate.replace(/-/g, "").slice(2);
    const formattedExpiry = input.expiryDate.replace(/-/g, "").slice(2);
    const formattedAmount = input.guaranteeAmount.toFixed(2).replace(".", ",");
    const ruleTag =
      input.applicableRules === "URDG758"
        ? "URDG LATEST VERSION"
        : "ISP LATEST VERSION";

    const lines: string[] = [
      `{1:F01${input.senderBic.padEnd(12, "X")}0000000000}{2:I760${input.receiverBic.padEnd(12, "X")}N}{4:`,
      `:27:1/1`,
      `:20:${input.instrumentReference}`,
      `:22A:ISSUE`,
      `:22D:${input.purposeOfGuarantee}`,
      `:23X:${ruleTag}`,
      `:30:${formattedIssue}`,
      `:31E:${formattedExpiry}`,
      `:32B:${input.currency}${formattedAmount}`,
      `:50:${input.applicantName.toUpperCase()}`,
      `:59:${input.beneficiaryName.toUpperCase()}`,
      input.underlyingContractReference
        ? `:23B:${input.underlyingContractReference}`
        : "",
      `:77U:${input.guaranteeTerms.toUpperCase()}`,
      `-}`,
    ].filter(Boolean);

    return lines.join("\n");
  }

  /**
   * Generates a standard SWIFT MT734 message text (Advice of Refusal).
   */
  public static generateMt734(input: SwiftMt734Input): string {
    const formattedPresDate = input.presentationDate.replace(/-/g, "").slice(2);
    const formattedAmount = input.creditAmount.toFixed(2).replace(".", ",");
    const disposal =
      input.disposalOfDocumentsInstruction ||
      "HOLDING DOCUMENTS AT YOUR DISPOSAL PENDING WAIVER INSTRUCTIONS FROM APPLICANT.";

    const discLines = input.discrepancies.map(
      (d, idx) =>
        `${idx + 1}. ${d.articleReference.toUpperCase()} - ${d.description.toUpperCase()}`,
    );

    const lines: string[] = [
      `{1:F01${input.senderBic.padEnd(12, "X")}0000000000}{2:I734${input.receiverBic.padEnd(12, "X")}N}{4:`,
      `:20:${input.instrumentReference}`,
      `:21:REFUSAL-NOTICE`,
      `:32A:${formattedPresDate}${input.currency}${formattedAmount}`,
      `:77J:DISCREPANCIES FOUND AS FOLLOWS:`,
      ...discLines,
      `:77B:${disposal}`,
      `-}`,
    ];

    return lines.join("\n");
  }

  /**
   * Parses raw SWIFT FIN text and routes to MT700 or MT760 parsers.
   */
  public static parseMtMessage(rawText: string): ParsedSwiftMtResult {
    if (!rawText || typeof rawText !== "string") {
      throw new Error("Raw SWIFT message cannot be empty");
    }

    const header = this.parseHeaders(rawText);
    const fields = this.extractFields(rawText);

    const messageType =
      header.messageType ||
      (fields["40A"] || fields["45A"] || fields["46A"]
        ? "MT700"
        : fields["22A"] || fields["77U"]
          ? "MT760"
          : "UNKNOWN");

    if (messageType === "MT700" || messageType === "700") {
      return this.parseMt700(header, fields);
    } else if (messageType === "MT760" || messageType === "760") {
      return this.parseMt760(header, fields);
    }

    throw new Error(
      `Unsupported or unrecognized SWIFT MT message type: ${messageType}`,
    );
  }

  // ============================================================================
  // INTERNAL PARSING HELPERS
  // ============================================================================

  private static parseHeaders(rawText: string): ParsedSwiftMtHeader {
    const header: ParsedSwiftMtHeader = {};

    // Block 1: {1:F01SENDERBIC0000000000}
    const block1Match = rawText.match(
      /\{1:([A-Z0-9]{3})([A-Z0-9]{8,12})([0-9]{4})([0-9]{6})\}/,
    );
    if (block1Match) {
      header.applicationId = block1Match[1];
      header.senderBic = block1Match[2].replace(/X+$/, "");
      header.sessionNumber = block1Match[3];
      header.sequenceNumber = block1Match[4];
    } else {
      const b1Simple = rawText.match(/\{1:[^}]*?([A-Z0-9]{8,12})/);
      if (b1Simple) header.senderBic = b1Simple[1].replace(/X+$/, "");
    }

    // Block 2: {2:I700RECEIVERBICN} or {2:O700...}
    const block2Match = rawText.match(
      /\{2:([IO])([0-9]{3})([A-Z0-9]{8,12})([A-Z0-9]?)\}/,
    );
    if (block2Match) {
      header.messageType = `MT${block2Match[2]}`;
      header.receiverBic = block2Match[3].replace(/X+$/, "");
      header.messagePriority = block2Match[4] || "N";
    }

    return header;
  }

  private static extractFields(rawText: string): Record<string, string> {
    const fields: Record<string, string> = {};

    // Isolate Block 4 if present: {4:...-}
    let content = rawText;
    const block4Match = rawText.match(/\{4:\s*([\s\S]*?)(?:-\}|\}$)/);
    if (block4Match) {
      content = block4Match[1];
    }

    const lines = content.split(/\r?\n/);
    let currentTag: string | null = null;
    let currentVal: string[] = [];

    for (const line of lines) {
      const tagMatch = line.match(/^:([0-9]{2}[A-Z]?):(.*)$/);
      if (tagMatch) {
        if (currentTag) {
          fields[currentTag] = currentVal.join("\n").trim();
        }
        currentTag = tagMatch[1];
        currentVal = [tagMatch[2]];
      } else if (currentTag) {
        currentVal.push(line);
      }
    }

    if (currentTag) {
      fields[currentTag] = currentVal.join("\n").trim();
    }

    return fields;
  }

  private static parseSwiftDate(dateStr: string): string {
    // Expected YYMMDD -> 20YY-MM-DD
    if (/^[0-9]{6}$/.test(dateStr)) {
      const year = `20${dateStr.slice(0, 2)}`;
      const month = dateStr.slice(2, 4);
      const day = dateStr.slice(4, 6);
      return `${year}-${month}-${day}`;
    }
    return dateStr;
  }

  private static parseAmount(amountStr: string): {
    currency: string;
    amount: number;
  } {
    // Example: EUR250000,00 or USD1500000.50
    const match = amountStr.match(/^([A-Z]{3})([0-9]+(?:[.,][0-9]{1,2})?)$/);
    if (match) {
      return {
        currency: match[1],
        amount: parseFloat(match[2].replace(",", ".")),
      };
    }
    return { currency: "EUR", amount: 0 };
  }

  private static parseMt700(
    header: ParsedSwiftMtHeader,
    fields: Record<string, string>,
  ): ParsedSwiftMt700 {
    const ref = fields["20"] || `LC-${Date.now()}`;
    const issueDateRaw = fields["31C"] || "";
    const issueDate =
      this.parseSwiftDate(issueDateRaw) ||
      new Date().toISOString().slice(0, 10);

    // :31D: Expiry Date + Place (e.g. 261015COUNTERS OF BENEFICIARY)
    let expiryDate = issueDate;
    let expiryPlace = "Counters of Beneficiary Bank";
    const field31D = fields["31D"] || "";
    if (field31D.length >= 6 && /^[0-9]{6}/.test(field31D)) {
      expiryDate = this.parseSwiftDate(field31D.slice(0, 6));
      if (field31D.length > 6) {
        expiryPlace = field31D.slice(6).trim();
      }
    }

    // :32B: Currency and Amount
    const amountParsed = this.parseAmount(fields["32B"] || "EUR0,00");

    // :39A: Tolerance (e.g. 05/05 or 10/10)
    let tolerance = 5.0;
    if (fields["39A"]) {
      const tolMatch = fields["39A"].match(/([0-9]{1,2})\/[0-9]{1,2}/);
      if (tolMatch) tolerance = parseFloat(tolMatch[1]);
    }

    // Applicable rules :40E:
    let rules: "UCP600" | "EUCP21" | "ISP98" | "URDG758" = "UCP600";
    const ruleField = (fields["40E"] || "").toUpperCase();
    if (ruleField.includes("EUCP")) rules = "EUCP21";
    else if (ruleField.includes("ISP")) rules = "ISP98";
    else if (ruleField.includes("URDG")) rules = "URDG758";

    // Payment terms :42C:
    const paymentClause = (fields["42C"] || "").toUpperCase();
    let paymentTerms:
      "SIGHT" | "DEFERRED_PAYMENT" | "ACCEPTANCE_USANCE" | "NEGOTIATION" =
      "SIGHT";
    let tenorDays = 0;
    if (paymentClause.includes("SIGHT")) {
      paymentTerms = "SIGHT";
    } else if (
      paymentClause.includes("AFTER") ||
      paymentClause.includes("DAYS")
    ) {
      paymentTerms = "ACCEPTANCE_USANCE";
      const tenorMatch = paymentClause.match(/([0-9]+)\s*DAYS/);
      if (tenorMatch) tenorDays = parseInt(tenorMatch[1], 10);
    }

    // Partial & Transhipment
    const partialShipmentsAllowed =
      (fields["43P"] || "").toUpperCase() === "ALLOWED";
    const transhipmentAllowed =
      (fields["43T"] || "").toUpperCase() === "ALLOWED";

    // Ports
    const portOfLoading = fields["44E"] || fields["44A"] || "ESBCN";
    const portOfDischarge = fields["44F"] || fields["44B"] || "SGSIN";

    // Latest shipment date :44C:
    const latestShipmentDate =
      this.parseSwiftDate(fields["44C"] || "") || expiryDate;

    // Goods :45A:
    const goodsDescription =
      fields["45A"] || "COMMERCIAL GOODS CIF CONSIGNMENT";

    // Documents :46A:
    const docs = fields["46A"]
      ? fields["46A"].split(/\r?\n/).filter(Boolean)
      : [];

    // Additional conditions :47A:
    const conds = fields["47A"]
      ? fields["47A"].split(/\r?\n/).filter(Boolean)
      : [];

    // Confirmation :49:
    let conf: "CONFIRM" | "MAY_ADD" | "WITHOUT" = "CONFIRM";
    const confField = (fields["49"] || "").toUpperCase();
    if (confField.includes("MAY")) conf = "MAY_ADD";
    else if (confField.includes("WITHOUT")) conf = "WITHOUT";

    return {
      messageType: "MT700",
      header,
      instrumentReference: ref,
      sequenceTotal: fields["27"],
      formOfCredit: fields["40A"],
      issueDate,
      applicableRules: rules,
      expiryDate,
      expiryPlace,
      applicantName: fields["50"] || "UNKNOWN APPLICANT",
      beneficiaryName: fields["59"] || "UNKNOWN BENEFICIARY",
      currency: amountParsed.currency,
      creditAmount: amountParsed.amount,
      tolerancePercentage: tolerance,
      availableWithBic: fields["41A"]
        ? fields["41A"].split(/\s+/)[0]
        : undefined,
      paymentTerms,
      tenorDays,
      partialShipmentsAllowed,
      transhipmentAllowed,
      portOfLoading,
      portOfDischarge,
      latestShipmentDate,
      goodsDescription,
      requiredDocumentsSummary: docs,
      additionalConditions: conds,
      confirmationInstructions: conf,
      rawFields: fields,
    };
  }

  private static parseMt760(
    header: ParsedSwiftMtHeader,
    fields: Record<string, string>,
  ): ParsedSwiftMt760 {
    const ref = fields["20"] || `GUA-${Date.now()}`;
    const issueDate =
      this.parseSwiftDate(fields["30"] || "") ||
      new Date().toISOString().slice(0, 10);
    const expiryDate = this.parseSwiftDate(fields["31E"] || "") || issueDate;
    const amountParsed = this.parseAmount(fields["32B"] || "EUR0,00");

    let rules: "URDG758" | "ISP98" = "URDG758";
    const ruleField = (fields["23X"] || "").toUpperCase();
    if (ruleField.includes("ISP")) rules = "ISP98";

    return {
      messageType: "MT760",
      header,
      instrumentReference: ref,
      sequenceTotal: fields["27"],
      purposeOfGuarantee: fields["22D"] || "PERFORMANCE_BOND",
      formOfUndertaking: fields["22A"] || "ISSUE",
      applicableRules: rules,
      issueDate,
      expiryDate,
      applicantName: fields["50"] || "UNKNOWN APPLICANT",
      beneficiaryName: fields["59"] || "UNKNOWN BENEFICIARY",
      currency: amountParsed.currency,
      guaranteeAmount: amountParsed.amount,
      underlyingContractReference: fields["23B"],
      guaranteeTerms:
        fields["77U"] ||
        fields["77C"] ||
        "DEMAND GUARANTEE PAYABLE UPON FIRST WRITTEN DEMAND",
      rawFields: fields,
    };
  }
}
