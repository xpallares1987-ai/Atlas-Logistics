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

  it("should format a valid SWIFT MT760 Issue of Demand Guarantee message", () => {
    const mt760 = SwiftMessageService.generateMt760({
      instrumentReference: "BG-2026-TEST-01",
      senderBic: "BSCHESMMXXX",
      receiverBic: "DBSSSGSGXXX",
      issueDate: "2026-09-01",
      expiryDate: "2027-09-01",
      applicantName: "Atlas Industrial Construction SA",
      beneficiaryName: "Port Authority of Valencia",
      currency: "EUR",
      guaranteeAmount: 500000.0,
      applicableRules: "URDG758",
      purposeOfGuarantee: "PERFORMANCE_BOND",
      underlyingContractReference: "CON-2026-VLC-TERMINAL",
      guaranteeTerms:
        "IRREVOCABLE DEMAND GUARANTEE PAYABLE UPON FIRST DEMAND UNDER URDG 758",
    });

    expect(mt760).toContain("{2:I760DBSSSGSGXXXXN}");
    expect(mt760).toContain(":20:BG-2026-TEST-01");
    expect(mt760).toContain(":22A:ISSUE");
    expect(mt760).toContain(":22D:PERFORMANCE_BOND");
    expect(mt760).toContain(":23X:URDG LATEST VERSION");
    expect(mt760).toContain(":30:260901");
    expect(mt760).toContain(":31E:270901");
    expect(mt760).toContain(":32B:EUR500000,00");
    expect(mt760).toContain(":23B:CON-2026-VLC-TERMINAL");
  });

  it("should parse an incoming SWIFT MT700 message into structured domain data", () => {
    const rawMt700 = `{1:F01DBSSSGSGXXXX0000000000}{2:I700BSCHESMMXXXXN}{4:
:27:1/1
:40A:IRREVOCABLE
:20:LC-2026-INBOUND-99
:31C:260715
:40E:UCP LATEST VERSION
:31D:261115MADRID COUNTERS
:50:IBERIAN STEEL TRADING SL
:59:SINGAPORE METALS CORP
:32B:USD420000,50
:39A:10/10
:41A:BSCHESMMXXX BY PAYMENT
:42C:AT SIGHT
:43P:NOT ALLOWED
:43T:ALLOWED
:44E:ESVLC
:44F:SGSIN
:44C:261030
:45A:HOT ROLLED STEEL COILS GRADE A
:46A:1. SIGNED COMMERCIAL INVOICE IN 3 ORIGINALS
2. FULL SET CLEAN ON BOARD BILLS OF LADING
3. MILL TEST CERTIFICATE
:47A:+ CERTIFICATE OF ORIGIN ISSUED BY CHAMBER OF COMMERCE
:49:CONFIRM
-}`;

    const parsed = SwiftMessageService.parseMtMessage(rawMt700);

    expect(parsed.messageType).toBe("MT700");
    if (parsed.messageType === "MT700") {
      expect(parsed.instrumentReference).toBe("LC-2026-INBOUND-99");
      expect(parsed.issueDate).toBe("2026-07-15");
      expect(parsed.expiryDate).toBe("2026-11-15");
      expect(parsed.expiryPlace).toBe("MADRID COUNTERS");
      expect(parsed.applicantName).toBe("IBERIAN STEEL TRADING SL");
      expect(parsed.beneficiaryName).toBe("SINGAPORE METALS CORP");
      expect(parsed.currency).toBe("USD");
      expect(parsed.creditAmount).toBe(420000.5);
      expect(parsed.tolerancePercentage).toBe(10);
      expect(parsed.paymentTerms).toBe("SIGHT");
      expect(parsed.applicableRules).toBe("UCP600");
      expect(parsed.portOfLoading).toBe("ESVLC");
      expect(parsed.portOfDischarge).toBe("SGSIN");
      expect(parsed.latestShipmentDate).toBe("2026-10-30");
      expect(parsed.requiredDocumentsSummary.length).toBe(3);
      expect(parsed.confirmationInstructions).toBe("CONFIRM");
    }
  });

  it("should parse an incoming SWIFT MT760 demand guarantee into structured domain data", () => {
    const rawMt760 = `{1:F01BSCHESMMXXXX0000000000}{2:I760DBSSSGSGXXXXN}{4:
:27:1/1
:20:BG-2026-VLC-001
:22A:ISSUE
:22D:PERFORMANCE_BOND
:23X:URDG LATEST VERSION
:30:260801
:31E:270801
:32B:EUR350000,00
:50:IBERIAN INFRASTRUCTURES SL
:59:VALENCIA TERMINAL SERVICES
:23B:TENDER-2026-VLC-08
:77U:DEMAND GUARANTEE PAYABLE UPON FIRST PRESENTATION OF COMPLYING DEMAND
-}`;

    const parsed = SwiftMessageService.parseMtMessage(rawMt760);

    expect(parsed.messageType).toBe("MT760");
    if (parsed.messageType === "MT760") {
      expect(parsed.instrumentReference).toBe("BG-2026-VLC-001");
      expect(parsed.purposeOfGuarantee).toBe("PERFORMANCE_BOND");
      expect(parsed.applicableRules).toBe("URDG758");
      expect(parsed.issueDate).toBe("2026-08-01");
      expect(parsed.expiryDate).toBe("2027-08-01");
      expect(parsed.currency).toBe("EUR");
      expect(parsed.guaranteeAmount).toBe(350000.0);
      expect(parsed.applicantName).toBe("IBERIAN INFRASTRUCTURES SL");
      expect(parsed.beneficiaryName).toBe("VALENCIA TERMINAL SERVICES");
      expect(parsed.underlyingContractReference).toBe("TENDER-2026-VLC-08");
      expect(parsed.guaranteeTerms).toContain("DEMAND GUARANTEE PAYABLE");
    }
  });
});
