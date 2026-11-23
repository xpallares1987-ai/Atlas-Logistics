/**
 * @file swift-iso20022-engine.test.ts
 * @description Comprehensive unit tests for SWIFT MT (MT103 / MT700) parsing,
 * and ISO 20022 XML generation (pain.001.001.09, pacs.008.001.08, tsmt.019.001.01, camt.053.001.08).
 */

import { describe, it, expect } from "vitest";
import {
  escapeXml,
  parseSwiftDate,
  parseSwiftMtMessage,
  parseSwiftMt103,
  parseSwiftMt700,
  translateMt103ToPain001Xml,
  translateMt103ToPacs008Xml,
  translateMt700ToTsmt019Xml,
  generateCamt053Xml,
  type BankStatementInput,
} from "../src/scm/engines/swift-iso20022.engine.js";

describe("SWIFT MT Parser & XML Sanitizer", () => {
  it("escapes XML special characters correctly", () => {
    const raw = "AT&T <Freight> 'Logistics' \"Corp\"";
    const escaped = escapeXml(raw);
    expect(escaped).toBe(
      "AT&amp;T &lt;Freight&gt; &apos;Logistics&apos; &quot;Corp&quot;",
    );
  });

  it("parses SWIFT YYMMDD date to ISO YYYY-MM-DD", () => {
    expect(parseSwiftDate("260324")).toBe("2026-03-24");
    expect(parseSwiftDate("991231")).toBe("1999-12-31");
  });

  it("extracts SWIFT MT header blocks and body tags", () => {
    const sampleMt = `{1:F01BBVAESMMXXXX0000000000}{2:I103BNPAFRPPXXXXN}{3:{108:MT103-TEST-01}}{4:
:20:TRF20260324001
:23B:CRED
:32A:260324EUR145000,50
:50K:/ES1234567890123456789012
GLOBAL LOGISTICS SPAIN S.L.
CALLE MARITIMA 42
VALENCIA
:59:/FR9876543210987654321098
MEDITERRANEAN CARGO SAS
MARSEILLE PORT
:71A:SHA
-}`;

    const parsed = parseSwiftMtMessage(sampleMt);
    expect(parsed.block1?.logicalTerminalAddress).toBe("BBVAESMMXXXX");
    expect(parsed.block2?.messageType).toBe("103");
    expect(parsed.block2?.destinationBic).toBe("BNPAFRPPXXXX");
    expect(parsed.bankingPriority).toBe("MT103-TEST-01");
    expect(parsed.tagMap.get("20")?.[0]).toBe("TRF20260324001");
    expect(parsed.tagMap.get("71A")?.[0]).toBe("SHA");
  });
});

describe("SWIFT MT103 to ISO 20022 Translation (pain.001 & pacs.008)", () => {
  const sampleMt103 = `{1:F01SANESMMXXXX0000000000}{2:I103DEUTDEDDXXXXN}{4:
:20:PAY-ATLAS-9912
:23B:CRED
:32A:260415EUR285000,00
:50K:/ES7621000418450200051332
ATLAS FORWARDING IBERIA S.A.
AVENIDA DEL PUERTO 100
VALENCIA, SPAIN
:52A:SANESMMX
:57A:DEUTDEDD
:59:/DE89370400440532013000
HAMBURG CONTAINER TERMINAL GMBH
ALTER SPEICHER 12
HAMBURG, GERMANY
:70:OCEAN FREIGHT SH-2026-9041
:71A:SHA
-}`;

  it("parses MT103 message content into structured domain entity", () => {
    const parsed = parseSwiftMt103(sampleMt103);

    expect(parsed.senderReference).toBe("PAY-ATLAS-9912");
    expect(parsed.bankOperationCode).toBe("CRED");
    expect(parsed.valueDate).toBe("2026-04-15");
    expect(parsed.currency).toBe("EUR");
    expect(parsed.instructedAmount).toBe(285000.0);
    expect(parsed.orderingCustomer.accountOrIban).toBe(
      "ES7621000418450200051332",
    );
    expect(parsed.orderingCustomer.name).toBe("ATLAS FORWARDING IBERIA S.A.");
    expect(parsed.beneficiaryCustomer.accountOrIban).toBe(
      "DE89370400440532013000",
    );
    expect(parsed.beneficiaryCustomer.name).toBe(
      "HAMBURG CONTAINER TERMINAL GMBH",
    );
    expect(parsed.remittanceInformation).toBe("OCEAN FREIGHT SH-2026-9041");
    expect(parsed.chargeDetails).toBe("SHA");
  });

  it("generates compliant ISO 20022 pain.001.001.09 XML document", () => {
    const parsed = parseSwiftMt103(sampleMt103);
    const xml = translateMt103ToPain001Xml(parsed, "MSG-2026-001");

    expect(xml).toContain(
      'xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09"',
    );
    expect(xml).toContain("<MsgId>MSG-2026-001</MsgId>");
    expect(xml).toContain("<Nm>ATLAS FORWARDING IBERIA S.A.</Nm>");
    expect(xml).toContain('<InstdAmt Ccy="EUR">285000.00</InstdAmt>');
    expect(xml).toContain("<ChrgBr>SHAR</ChrgBr>");
    expect(xml).toContain("<IBAN>ES7621000418450200051332</IBAN>");
    expect(xml).toContain("<IBAN>DE89370400440532013000</IBAN>");
    expect(xml).toContain("<Ustrd>OCEAN FREIGHT SH-2026-9041</Ustrd>");
  });

  it("generates compliant ISO 20022 pacs.008.001.08 XML document", () => {
    const parsed = parseSwiftMt103(sampleMt103);
    const xml = translateMt103ToPacs008Xml(parsed, "PACS-2026-001");

    expect(xml).toContain(
      'xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"',
    );
    expect(xml).toContain("<FIToFICstmrCdtTrf>");
    expect(xml).toContain(
      '<IntrBkSttlmAmt Ccy="EUR">285000.00</IntrBkSttlmAmt>',
    );
    expect(xml).toContain("<IntrBkSttlmDt>2026-04-15</IntrBkSttlmDt>");
    expect(xml).toContain("<BICFI>SANESMMX</BICFI>");
    expect(xml).toContain("<BICFI>DEUTDEDD</BICFI>");
  });
});

describe("SWIFT MT700 to ISO 20022 Trade Services (tsmt.019.001.01)", () => {
  const sampleMt700 = `{1:F01HSBCGB2LXXXX0000000000}{2:I700BCOCESMMXXXXN}{4:
:20:LC-2026-8801
:27:1/1
:40A:IRREVOCABLE
:31C:260210
:31D:260810VALENCIA, SPAIN
:50:SHANGHAI AUTOMOTIVE CORP
100 CENTURY AVENUE
SHANGHAI, CHINA
:59:VALENCIA MOTORS MANUFACTURING S.L.
POLIGONO INDUSTRIAL 4
VALENCIA, SPAIN
:32B:USD750000,00
:39A:05/05
:41A:HSBCGB2L
BY PAYMENT
:43P:ALLOWED
:43T:PROHIBITED
:44E:PORT OF SHANGHAI
:44F:PORT OF VALENCIA
:44C:260715
:45A:300 VEHICLE EV POWERTRAINS AND BATTERY INVERTERS
:46A:1. SIGNED COMMERCIAL INVOICE IN 3 ORIGINALS
2. FULL SET CLEAN ON BOARD OCEAN BILLS OF LADING
3. PACKING LIST AND WEIGHT CERTIFICATE
:47A:ALL DOCUMENTS MUST QUOTE LC NUMBER LC-2026-8801
-}`;

  it("parses MT700 Documentary Credit into structured domain entity", () => {
    const lc = parseSwiftMt700(sampleMt700);

    expect(lc.documentaryCreditNumber).toBe("LC-2026-8801");
    expect(lc.formOfCredit).toBe("IRREVOCABLE");
    expect(lc.issueDate).toBe("2026-02-10");
    expect(lc.expiryDate).toBe("2026-08-10");
    expect(lc.expiryPlace).toBe("VALENCIA, SPAIN");
    expect(lc.currency).toBe("USD");
    expect(lc.creditAmount).toBe(750000.0);
    expect(lc.partialShipmentsAllowed).toBe(true);
    expect(lc.transhipmentAllowed).toBe(false);
    expect(lc.portOfLoading).toBe("PORT OF SHANGHAI");
    expect(lc.portOfDischarge).toBe("PORT OF VALENCIA");
    expect(lc.latestShipmentDate).toBe("2026-07-15");
    expect(lc.documentsRequired.length).toBe(3);
    expect(lc.additionalConditions?.length).toBe(1);
  });

  it("translates MT700 into compliant ISO 20022 tsmt.019.001.01 baseline XML", () => {
    const lc = parseSwiftMt700(sampleMt700);
    const xml = translateMt700ToTsmt019Xml(lc, "SUB-2026-LC01");

    expect(xml).toContain(
      'xmlns="urn:iso:std:iso:20022:tech:xsd:tsmt.019.001.01"',
    );
    expect(xml).toContain("<DocCdtId>LC-2026-8801</DocCdtId>");
    expect(xml).toContain('<Amt Ccy="USD">750000.00</Amt>');
    expect(xml).toContain("<PartlShipmnt>true</PartlShipmnt>");
    expect(xml).toContain("<TrnsShipmnt>false</TrnsShipmnt>");
    expect(xml).toContain("<PlcOfRct>PORT OF SHANGHAI</PlcOfRct>");
    expect(xml).toContain("<PlcOfDlvry>PORT OF VALENCIA</PlcOfDlvry>");
    expect(xml).toContain("<LatstShipmntDt>2026-07-15</LatstShipmntDt>");
    expect(xml).toContain(
      "<DocDesc>1. SIGNED COMMERCIAL INVOICE IN 3 ORIGINALS</DocDesc>",
    );
  });
});

describe("ISO 20022 camt.053.001.08 Bank-to-Customer Statement Generator", () => {
  it("generates valid End-of-Day Bank Statement with balances and entries", () => {
    const statementInput: BankStatementInput = {
      statementId: "STMT-2026-089",
      electronicSequenceNumber: 42,
      creationDateTime: "2026-03-24T18:00:00Z",
      accountIban: "ES7621000418450200051332",
      accountCurrency: "EUR",
      accountServicerBic: "BBVAESMMXXX",
      openingBalance: {
        amount: 1500000.0,
        currency: "EUR",
        date: "2026-03-24",
      },
      closingBalance: {
        amount: 1215000.0,
        currency: "EUR",
        date: "2026-03-24",
      },
      entries: [
        {
          entryReference: "TX-2026-001",
          creditDebitIndicator: "DBIT",
          amount: 285000.0,
          currency: "EUR",
          bookingDate: "2026-03-24",
          remittanceInfo: "SETTLEMENT OCEAN FREIGHT SH-2026-9041",
        },
      ],
    };

    const xml = generateCamt053Xml(statementInput);

    expect(xml).toContain(
      'xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.08"',
    );
    expect(xml).toContain("<MsgId>STMT-STMT-2026-089</MsgId>");
    expect(xml).toContain("<ElctrncSeqNb>42</ElctrncSeqNb>");
    expect(xml).toContain("<IBAN>ES7621000418450200051332</IBAN>");
    expect(xml).toContain("<Cd>OPBD</Cd>");
    expect(xml).toContain('<Amt Ccy="EUR">1500000.00</Amt>');
    expect(xml).toContain("<Cd>CLBD</Cd>");
    expect(xml).toContain('<Amt Ccy="EUR">1215000.00</Amt>');
    expect(xml).toContain("<CdtDbtInd>DBIT</CdtDbtInd>");
    expect(xml).toContain('<Amt Ccy="EUR">285000.00</Amt>');
  });
});
