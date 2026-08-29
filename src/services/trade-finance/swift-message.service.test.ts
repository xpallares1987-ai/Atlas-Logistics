import { describe, it, expect } from "vitest";
import { SwiftMessageService } from "./swift-message.service.js";

describe("SwiftMessageService", () => {
  it("should format a valid SWIFT MT700 Issue of Documentary Credit message", () => {
    const mt700 = SwiftMessageService.generateMt700({
      instrumentReference: "LC-2026-TEST-77",
      senderBic: "DBSSSGSGXXX",
      receiverBic: "BSCHESMMXXX",
      issueDate: "2026-08-01",
      expiryDate: "2026-10-15",
      expiryPlace: "Counters of Santander",
      applicantName: "Importer Global SL",
      beneficiaryName: "Exporter Marine SA",
      currency: "EUR",
      creditAmount: 250000.0,
      confirmationInstructions: "CONFIRM",
      paymentTerms: "SIGHT",
      portOfLoading: "ESBCN",
      portOfDischarge: "SGSIN",
      latestShipmentDate: "2026-09-20",
      goodsDescription: "5000 BOXES WINE CIF SINGAPORE",
    });

    expect(mt700).toContain("{2:I700BSCHESMMXXXXN}");
    expect(mt700).toContain(":20:LC-2026-TEST-77");
    expect(mt700).toContain(":32B:EUR250000,00");
    expect(mt700).toContain(":40E:UCP LATEST VERSION");
    expect(mt700).toContain(":49:CONFIRM");
  });

  it("should format a valid SWIFT MT734 Advice of Refusal with listed discrepancies", () => {
    const mt734 = SwiftMessageService.generateMt734({
      instrumentReference: "LC-2026-TEST-77",
      senderBic: "BSCHESMMXXX",
      receiverBic: "DBSSSGSGXXX",
      currency: "EUR",
      creditAmount: 250000.0,
      presentationDate: "2026-08-30",
      discrepancies: [
        {
          discrepancyRuleCode: "UCP600_ART_14_LATE_PRESENTATION",
          articleReference: "UCP 600 Art. 14(c)",
          description: "Documents presented 24 days after shipment",
        },
      ],
    });

    expect(mt734).toContain("{2:I734DBSSSGSGXXXXN}");
    expect(mt734).toContain(":20:LC-2026-TEST-77");
    expect(mt734).toContain(":77J:DISCREPANCIES FOUND AS FOLLOWS:");
    expect(mt734).toContain(
      "UCP 600 ART. 14(C) - DOCUMENTS PRESENTED 24 DAYS AFTER SHIPMENT",
    );
    expect(mt734).toContain(":77B:HOLDING DOCUMENTS AT YOUR DISPOSAL");
  });
});
