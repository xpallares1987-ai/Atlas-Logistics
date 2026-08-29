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
}
