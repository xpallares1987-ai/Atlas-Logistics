/**
 * @file customs-gateway-engine.test.ts
 * @description Comprehensive unit test suite for Sovereign Customs Authority Engine.
 * Tests canonical XML synthesis for AEAT, ATLAS, DELTA, NCTS_P5, HMRC_CDS, CBP_ACE,
 * SHA-256 payload digests, C14N canonicalization, and multi-agency CUSRES response parsing.
 * @module @atlas/tests/customs-gateway-engine
 * @see {@link docs/adr/0038-customs-mtls-and-regulatory-filing-gateway.md}
 */

import { describe, it, expect } from "vitest";
import {
  canonicalizeXml,
  computePayloadSha256,
  synthesizeCustomsDeclaration,
  parseCusresResponse,
  type CustomsDeclarationInput,
} from "../src/scm/engines/customs-filing.engine.js";

describe("Customs Filing Engine - Canonical XML & Payload Synthesis", () => {
  const baseInput: CustomsDeclarationInput = {
    clearanceId: "clr-demo-01",
    clearanceNumber: "DUA-2026-ES0801-000412",
    agency: "AEAT",
    customsOfficeCode: "ES000801",
    importerEoriOrVat: "ESA08123456",
    declarantEoriOrVat: "ESB08654321",
    taricCode: "7208380000",
    goodsDescription: "Hot-rolled stainless steel coils in flat sheets",
    originCountryCode: "TR",
    grossMassKg: 25420.5,
    netMassKg: 24800.0,
    customsValueEur: 48500.0,
    dutyAmountEur: 1940.0,
    vatAmountEur: 10592.4,
    certificateThumbprint: "A1B2C3D4E5F60718293A4B5C6D7E8F90A1B2C3D4",
  };

  it("canonicalizes XML by trimming whitespace and normalizing line breaks", () => {
    const raw = `  <root>\r\n    <child>Value</child>\r\n  </root>  `;
    const canonical = canonicalizeXml(raw);
    expect(canonical).toBe("<root><child>Value</child></root>");
  });

  it("computes deterministic SHA-256 digests", () => {
    const hash1 = computePayloadSha256("<test>123</test>");
    const hash2 = computePayloadSha256("<test>123</test>");
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it("synthesizes valid AEAT SOAP 1.1 Envelope with DUA parameters and WS-Security token", () => {
    const result = synthesizeCustomsDeclaration(baseInput);

    expect(result.agency).toBe("AEAT");
    expect(result.protocol).toBe("SOAP_MTLS");
    expect(result.signatureAlgorithm).toBe("rsa-sha256");
    expect(result.filingReference).toMatch(/^TX-AEAT-\d+-000412$/);
    expect(result.rawPayload).toContain("<soapenv:Envelope");
    expect(result.rawPayload).toContain("<aeat:DUADeclaration>");
    expect(result.rawPayload).toContain(
      "<aeat:TaricCode>7208380000</aeat:TaricCode>",
    );
    expect(result.rawPayload).toContain(baseInput.certificateThumbprint);
    expect(result.canonicalPayloadSha256).toHaveLength(64);
  });

  it("synthesizes German ATLAS XML declaration with proper headers", () => {
    const atlasInput: CustomsDeclarationInput = {
      ...baseInput,
      agency: "ATLAS",
      customsOfficeCode: "DE004851",
    };
    const result = synthesizeCustomsDeclaration(atlasInput);

    expect(result.agency).toBe("ATLAS");
    expect(result.rawPayload).toContain("<atlas:ZollAnmeldung");
    expect(result.rawPayload).toContain(
      "<atlas:CommodityCode>7208380000</atlas:CommodityCode>",
    );
    expect(result.rawPayload).toContain("<atlas:SignerThumbprint>");
  });

  it("synthesizes French DELTA XML declaration with French customs elements", () => {
    const deltaInput: CustomsDeclarationInput = {
      ...baseInput,
      agency: "DELTA",
      customsOfficeCode: "FR002400",
    };
    const result = synthesizeCustomsDeclaration(deltaInput);

    expect(result.agency).toBe("DELTA");
    expect(result.rawPayload).toContain("<delta:DeclarationDouane");
    expect(result.rawPayload).toContain(
      "<delta:CodeNomenclature>7208380000</delta:CodeNomenclature>",
    );
  });

  it("synthesizes EU NCTS Phase 5 T1 transit declaration CC015C", () => {
    const nctsInput: CustomsDeclarationInput = {
      ...baseInput,
      agency: "NCTS_P5",
      guaranteeReference: "GRN-2026-EU-TRANSIT-8841",
    };
    const result = synthesizeCustomsDeclaration(nctsInput);

    expect(result.agency).toBe("NCTS_P5");
    expect(result.rawPayload).toContain("<ncts:CC015C");
    expect(result.rawPayload).toContain(
      "<ncts:DeclarationType>T1</ncts:DeclarationType>",
    );
    expect(result.rawPayload).toContain("GRN-2026-EU-TRANSIT-8841");
  });

  it("synthesizes UK HMRC CDS declaration with WCO MetaData structure and REST_MTLS protocol", () => {
    const hmrcInput: CustomsDeclarationInput = {
      ...baseInput,
      agency: "HMRC_CDS",
      customsOfficeCode: "GB000060",
    };
    const result = synthesizeCustomsDeclaration(hmrcInput);

    expect(result.agency).toBe("HMRC_CDS");
    expect(result.protocol).toBe("REST_MTLS");
    expect(result.rawPayload).toContain("WCO:DocumentMetaData-CDS:2");
    expect(result.rawPayload).toContain("<TypeCode>IMZ</TypeCode>");
  });

  it("synthesizes US CBP ACE Entry Summary declaration with CATAIR schema", () => {
    const cbpInput: CustomsDeclarationInput = {
      ...baseInput,
      agency: "CBP_ACE",
      customsOfficeCode: "US4601",
    };
    const result = synthesizeCustomsDeclaration(cbpInput);

    expect(result.agency).toBe("CBP_ACE");
    expect(result.protocol).toBe("REST_MTLS");
    expect(result.rawPayload).toContain("<ace:EntrySummary");
    expect(result.rawPayload).toContain("<ace:EntryType>01</ace:EntryType>");
  });
});

describe("Customs Filing Engine - Inbound CUSRES Response Parsing", () => {
  it("parses XML CUSRES message with ACCEPTED_GREEN (Levante / Immediate release)", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<cusres:CustomsResponse xmlns:cusres="http://wco.org/cusres">
  <cusres:FilingReference>TX-AEAT-1732389100000-000412</cusres:FilingReference>
  <cusres:MRN>26ES00080100412891</cusres:MRN>
  <cusres:RoutingChannel>GREEN</cusres:RoutingChannel>
</cusres:CustomsResponse>`;

    const parsed = parseCusresResponse(xml);
    expect(parsed.responseStatus).toBe("ACCEPTED_GREEN");
    expect(parsed.mrnAssigned).toBe("26ES00080100412891");
    expect(parsed.filingReference).toBe("TX-AEAT-1732389100000-000412");
    expect(parsed.rawResponseSha256).toHaveLength(64);
  });

  it("parses XML CUSRES message with DOCS_REQUIRED_ORANGE channel", () => {
    const xml = `<Response>
  <Reference>TX-ATLAS-2026-9901</Reference>
  <MovementReferenceNumber>26DE48510009988112</MovementReferenceNumber>
  <Circuit>ORANGE</Circuit>
</Response>`;

    const parsed = parseCusresResponse(xml);
    expect(parsed.responseStatus).toBe("DOCS_REQUIRED_ORANGE");
    expect(parsed.mrnAssigned).toBe("26DE48510009988112");
  });

  it("parses XML CUSRES message with INSPECTION_RED channel", () => {
    const xml = `<Response>
  <Reference>TX-DELTA-2026-1234</Reference>
  <MRN>26FR00240001122334</MRN>
  <Circuit>ROUGE</Circuit>
</Response>`;

    const parsed = parseCusresResponse(xml);
    expect(parsed.responseStatus).toBe("INSPECTION_RED");
    expect(parsed.mrnAssigned).toBe("26FR00240001122334");
  });

  it("parses XML CUSRES message with REJECTED_ERROR and error diagnostics", () => {
    const xml = `<Response>
  <Reference>TX-AEAT-2026-FAIL</Reference>
  <Status>ERROR</Status>
  <ErrorCode>ERR_TARIC_INVALID</ErrorCode>
  <ErrorMessage>Declared TARIC code 7208380000 is expired or invalid for import regime</ErrorMessage>
</Response>`;

    const parsed = parseCusresResponse(xml);
    expect(parsed.responseStatus).toBe("REJECTED_ERROR");
    expect(parsed.errorCode).toBe("ERR_TARIC_INVALID");
    expect(parsed.errorMessage).toContain("TARIC code");
  });

  it("parses JSON CUSRES payload directly", () => {
    const json = JSON.stringify({
      filingReference: "TX-HMRC-99120",
      mrnAssigned: "26GB00006000012345",
      responseStatus: "ACCEPTED_GREEN",
    });

    const parsed = parseCusresResponse(json);
    expect(parsed.responseStatus).toBe("ACCEPTED_GREEN");
    expect(parsed.mrnAssigned).toBe("26GB00006000012345");
  });
});
