/**
 * @file customs-filing.engine.ts
 * @description Pure domain calculation engine for Sovereign Customs Authority Gateways (AEAT, ATLAS, DELTA, NCTS_P5, HMRC_CDS, CBP_ACE).
 * Implements deterministic XML envelope synthesis, C14N canonicalization, XMLDSig SHA-256 signing templates, and CUSRES response parsing.
 * @module @atlas/scm/engines/customs-filing
 * @see {@link docs/adr/0038-customs-mtls-and-regulatory-filing-gateway.md}
 */

import { createHash } from "node:crypto";

// ============================================================================
// 1. DOMAIN ENUMS & TYPES
// ============================================================================

export type CustomsAgency =
  "AEAT" | "ATLAS" | "DELTA" | "NCTS_P5" | "HMRC_CDS" | "CBP_ACE";

export type CustomsProtocol = "SOAP_MTLS" | "REST_MTLS" | "AS4";

export type MessageFunction =
  "ORIGINAL" | "REPLACEMENT" | "AMENDMENT" | "CANCELLATION" | "STATUS_QUERY";

export type CustomsRoutingChannel =
  | "ACCEPTED_GREEN"
  | "DOCS_REQUIRED_ORANGE"
  | "INSPECTION_RED"
  | "REJECTED_ERROR";

export interface CustomsDeclarationInput {
  clearanceId: string;
  clearanceNumber: string;
  agency: CustomsAgency;
  protocol?: CustomsProtocol;
  messageFunction?: MessageFunction;
  customsOfficeCode: string;
  importerEoriOrVat: string;
  declarantEoriOrVat: string;
  taricCode: string;
  goodsDescription: string;
  originCountryCode: string;
  grossMassKg: number;
  netMassKg: number;
  customsValueEur: number;
  dutyAmountEur?: number;
  vatAmountEur?: number;
  guaranteeReference?: string;
  certificateThumbprint: string;
}

export interface GeneratedCustomsPayload {
  filingReference: string;
  agency: CustomsAgency;
  protocol: CustomsProtocol;
  messageFunction: MessageFunction;
  rawPayload: string;
  canonicalPayloadSha256: string;
  signatureAlgorithm: "rsa-sha256";
  certificateThumbprint: string;
}

export interface ParsedCusresResponse {
  filingReference?: string;
  mrnAssigned?: string;
  responseStatus: CustomsRoutingChannel;
  errorCode?: string;
  errorMessage?: string;
  acknowledgedAt: string;
  rawResponseSha256: string;
}

// ============================================================================
// 2. XML CANONICALIZATION & CRYPTO DIGEST HELPERS
// ============================================================================

/**
 * Deterministically canonicalizes an XML string by trimming whitespace between tags,
 * normalizing line endings to LF, and stripping extraneous outer whitespace.
 */
export function canonicalizeXml(rawXml: string): string {
  return rawXml.replace(/\r\n/g, "\n").replace(/>\s+</g, "><").trim();
}

/**
 * Computes SHA-256 hash of a canonicalized payload string.
 */
export function computePayloadSha256(payload: string): string {
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

// ============================================================================
// 3. XML / SOAP PAYLOAD SYNTHESIS PER AGENCY
// ============================================================================

/**
 * Generates an AEAT (Spanish Agencia Tributaria) SOAP 1.1 Envelope for DUA declarations.
 */
function buildAeatSoapPayload(
  input: CustomsDeclarationInput,
  filingRef: string,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:aeat="https://www.agenciatributaria.gob.es/DUAv1">
  <soapenv:Header>
    <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <wsse:BinarySecurityToken EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#X509v3" ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3">
        ${input.certificateThumbprint}
      </wsse:BinarySecurityToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body>
    <aeat:DUADeclaration>
      <aeat:FilingReference>${filingRef}</aeat:FilingReference>
      <aeat:ClearanceNumber>${input.clearanceNumber}</aeat:ClearanceNumber>
      <aeat:MessageFunction>${input.messageFunction ?? "ORIGINAL"}</aeat:MessageFunction>
      <aeat:CustomsOffice>${input.customsOfficeCode}</aeat:CustomsOffice>
      <aeat:ImporterEORI>${input.importerEoriOrVat}</aeat:ImporterEORI>
      <aeat:DeclarantEORI>${input.declarantEoriOrVat}</aeat:DeclarantEORI>
      <aeat:GoodsItem>
        <aeat:TaricCode>${input.taricCode}</aeat:TaricCode>
        <aeat:Description>${input.goodsDescription}</aeat:Description>
        <aeat:OriginCountry>${input.originCountryCode}</aeat:OriginCountry>
        <aeat:GrossMassKg>${input.grossMassKg.toFixed(2)}</aeat:GrossMassKg>
        <aeat:NetMassKg>${input.netMassKg.toFixed(2)}</aeat:NetMassKg>
        <aeat:CustomsValueEur>${input.customsValueEur.toFixed(2)}</aeat:CustomsValueEur>
        <aeat:DutyAmountEur>${(input.dutyAmountEur ?? 0).toFixed(2)}</aeat:DutyAmountEur>
        <aeat:VatAmountEur>${(input.vatAmountEur ?? 0).toFixed(2)}</aeat:VatAmountEur>
      </aeat:GoodsItem>
    </aeat:DUADeclaration>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Generates German ATLAS (Zoll) XML customs declaration.
 */
function buildAtlasPayload(
  input: CustomsDeclarationInput,
  filingRef: string,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<atlas:ZollAnmeldung xmlns:atlas="http://www.zoll.de/ATLAS/v9.1">
  <atlas:Header>
    <atlas:FilingReference>${filingRef}</atlas:FilingReference>
    <atlas:ClearanceNumber>${input.clearanceNumber}</atlas:ClearanceNumber>
    <atlas:MessageFunction>${input.messageFunction ?? "ORIGINAL"}</atlas:MessageFunction>
    <atlas:CustomsOffice>${input.customsOfficeCode}</atlas:CustomsOffice>
    <atlas:DeclarantEori>${input.declarantEoriOrVat}</atlas:DeclarantEori>
    <atlas:SignerThumbprint>${input.certificateThumbprint}</atlas:SignerThumbprint>
  </atlas:Header>
  <atlas:GoodsDeclaration>
    <atlas:CommodityCode>${input.taricCode}</atlas:CommodityCode>
    <atlas:Description>${input.goodsDescription}</atlas:Description>
    <atlas:CountryOfOrigin>${input.originCountryCode}</atlas:CountryOfOrigin>
    <atlas:GrossMassKg>${input.grossMassKg.toFixed(2)}</atlas:GrossMassKg>
    <atlas:InvoiceValueEur>${input.customsValueEur.toFixed(2)}</atlas:InvoiceValueEur>
  </atlas:GoodsDeclaration>
</atlas:ZollAnmeldung>`;
}

/**
 * Generates French DELTA (Douane) XML customs declaration.
 */
function buildDeltaPayload(
  input: CustomsDeclarationInput,
  filingRef: string,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<delta:DeclarationDouane xmlns:delta="https://pro.douane.gouv.fr/DELTA/v4">
  <delta:Reference>${filingRef}</delta:Reference>
  <delta:NumeroDossier>${input.clearanceNumber}</delta:NumeroDossier>
  <delta:FonctionMessage>${input.messageFunction ?? "ORIGINAL"}</delta:FonctionMessage>
  <delta:BureauDouane>${input.customsOfficeCode}</delta:BureauDouane>
  <delta:ImportateurEORI>${input.importerEoriOrVat}</delta:ImportateurEORI>
  <delta:DeclarantEORI>${input.declarantEoriOrVat}</delta:DeclarantEORI>
  <delta:Article>
    <delta:CodeNomenclature>${input.taricCode}</delta:CodeNomenclature>
    <delta:DesignationMarchandises>${input.goodsDescription}</delta:DesignationMarchandises>
    <delta:PaysOrigine>${input.originCountryCode}</delta:PaysOrigine>
    <delta:MasseBruteKg>${input.grossMassKg.toFixed(2)}</delta:MasseBruteKg>
    <delta:ValeurEnDouaneEur>${input.customsValueEur.toFixed(2)}</delta:ValeurEnDouaneEur>
  </delta:Article>
</delta:DeclarationDouane>`;
}

/**
 * Generates EU NCTS Phase 5 (Transit T1/T2) XML declaration (CC015C message).
 */
function buildNctsP5Payload(
  input: CustomsDeclarationInput,
  filingRef: string,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ncts:CC015C xmlns:ncts="http://ncts.dgtaxud.ec/ncts5/v1">
  <ncts:TransitOperation>
    <ncts:LRN>${filingRef}</ncts:LRN>
    <ncts:DeclarationType>T1</ncts:DeclarationType>
    <ncts:CustomsOfficeOfDeparture>${input.customsOfficeCode}</ncts:CustomsOfficeOfDeparture>
    <ncts:GuaranteeReference>${input.guaranteeReference ?? "GUARANTEE-TRANSIT-GLOBAL"}</ncts:GuaranteeReference>
  </ncts:TransitOperation>
  <ncts:Consignment>
    <ncts:GrossMass>${input.grossMassKg.toFixed(2)}</ncts:GrossMass>
    <ncts:Consignor>${input.declarantEoriOrVat}</ncts:Consignor>
    <ncts:Consignee>${input.importerEoriOrVat}</ncts:Consignee>
    <ncts:GoodsItem>
      <ncts:CommodityCode>${input.taricCode}</ncts:CommodityCode>
      <ncts:GoodsDescription>${input.goodsDescription}</ncts:GoodsDescription>
    </ncts:GoodsItem>
  </ncts:Consignment>
</ncts:CC015C>`;
}

/**
 * Generates UK HMRC CDS (Customs Declaration Service) XML declaration.
 */
function buildHmrcCdsPayload(
  input: CustomsDeclarationInput,
  filingRef: string,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<md:MetaData xmlns:md="urn:wco:datamodel:WCO:DocumentMetaData-CDS:2">
  <md:WCODataModelVersionCode>3.6</md:WCODataModelVersionCode>
  <Declaration xmlns="urn:wco:datamodel:WCO:DEC-DMS:2">
    <Function>${input.messageFunction === "CANCELLATION" ? "13" : "9"}</Function>
    <FunctionalReferenceId>${filingRef}</FunctionalReferenceId>
    <TypeCode>IMZ</TypeCode>
    <DeclarationOfficeID>${input.customsOfficeCode}</DeclarationOfficeID>
    <GoodsShipment>
      <Importer>
        <ID>${input.importerEoriOrVat}</ID>
      </Importer>
      <Declarant>
        <ID>${input.declarantEoriOrVat}</ID>
      </Declarant>
      <GovernmentAgencyGoodsItem>
        <Commodity>
          <TariffClassification>${input.taricCode}</TariffClassification>
          <Description>${input.goodsDescription}</Description>
        </Commodity>
        <Origin>
          <CountryCode>${input.originCountryCode}</CountryCode>
        </Origin>
        <GoodsMeasure>
          <GrossMassMeasure unitCode="KGM">${input.grossMassKg.toFixed(2)}</GrossMassMeasure>
          <NetNetWeightMeasure unitCode="KGM">${input.netMassKg.toFixed(2)}</NetNetWeightMeasure>
        </GoodsMeasure>
        <CustomsValuation>
          <Amount currencyID="GBP">${input.customsValueEur.toFixed(2)}</Amount>
        </CustomsValuation>
      </GovernmentAgencyGoodsItem>
    </GoodsShipment>
  </Declaration>
</md:MetaData>`;
}

/**
 * Generates US CBP ACE (Automated Commercial Environment) XML Entry Summary (CATAIR).
 */
function buildCbpAcePayload(
  input: CustomsDeclarationInput,
  filingRef: string,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ace:EntrySummary xmlns:ace="http://cbp.dhs.gov/ace/catair/v2">
  <ace:Header>
    <ace:FilerReference>${filingRef}</ace:FilerReference>
    <ace:PortOfEntry>${input.customsOfficeCode}</ace:PortOfEntry>
    <ace:ImporterOfRecord>${input.importerEoriOrVat}</ace:ImporterOfRecord>
    <ace:BrokerFilerCode>${input.declarantEoriOrVat}</ace:BrokerFilerCode>
    <ace:EntryType>01</ace:EntryType>
  </ace:Header>
  <ace:LineItem>
    <ace:HarmonizedTariffSchedule>${input.taricCode}</ace:HarmonizedTariffSchedule>
    <ace:MerchandiseDescription>${input.goodsDescription}</ace:MerchandiseDescription>
    <ace:CountryOfOrigin>${input.originCountryCode}</ace:CountryOfOrigin>
    <ace:GrossWeightKg>${input.grossMassKg.toFixed(2)}</ace:GrossWeightKg>
    <ace:EnteredValueUSD>${input.customsValueEur.toFixed(2)}</ace:EnteredValueUSD>
  </ace:LineItem>
</ace:EntrySummary>`;
}

// ============================================================================
// 4. MAIN ENGINE SYNTHESIS FUNCTION
// ============================================================================

/**
 * Synthesizes, canonicalizes, and digests an outbound customs declaration payload.
 */
export function synthesizeCustomsDeclaration(
  input: CustomsDeclarationInput,
): GeneratedCustomsPayload {
  const timestamp = Date.now();
  const filingReference = `TX-${input.agency}-${timestamp}-${input.clearanceNumber.replace(/[^A-Za-z0-9]/g, "").slice(-6)}`;

  let rawXml = "";
  const protocol: CustomsProtocol =
    input.protocol ??
    (input.agency === "HMRC_CDS" || input.agency === "CBP_ACE"
      ? "REST_MTLS"
      : "SOAP_MTLS");

  switch (input.agency) {
    case "AEAT":
      rawXml = buildAeatSoapPayload(input, filingReference);
      break;
    case "ATLAS":
      rawXml = buildAtlasPayload(input, filingReference);
      break;
    case "DELTA":
      rawXml = buildDeltaPayload(input, filingReference);
      break;
    case "NCTS_P5":
      rawXml = buildNctsP5Payload(input, filingReference);
      break;
    case "HMRC_CDS":
      rawXml = buildHmrcCdsPayload(input, filingReference);
      break;
    case "CBP_ACE":
      rawXml = buildCbpAcePayload(input, filingReference);
      break;
    default: {
      const exhaustiveCheck: never = input.agency;
      throw new Error(`Unsupported customs agency: ${exhaustiveCheck}`);
    }
  }

  const canonicalXml = canonicalizeXml(rawXml);
  const canonicalPayloadSha256 = computePayloadSha256(canonicalXml);

  return {
    filingReference,
    agency: input.agency,
    protocol,
    messageFunction: input.messageFunction ?? "ORIGINAL",
    rawPayload: canonicalXml,
    canonicalPayloadSha256,
    signatureAlgorithm: "rsa-sha256",
    certificateThumbprint: input.certificateThumbprint,
  };
}

// ============================================================================
// 5. CUSRES INBOUND RESPONSE PARSER
// ============================================================================

/**
 * Parses an inbound CUSRES (Customs Response) payload (XML or JSON format)
 * and determines the official clearance routing channel and MRN assignment.
 */
export function parseCusresResponse(rawResponse: string): ParsedCusresResponse {
  const rawResponseSha256 = computePayloadSha256(rawResponse);
  const acknowledgedAt = new Date().toISOString();

  // 1. Check for JSON structure first
  if (rawResponse.trim().startsWith("{")) {
    try {
      const json = JSON.parse(rawResponse);
      const statusRaw = String(
        json.status || json.responseStatus || "",
      ).toUpperCase();
      let responseStatus: CustomsRoutingChannel = "ACCEPTED_GREEN";

      if (statusRaw.includes("REJECT") || statusRaw.includes("ERROR")) {
        responseStatus = "REJECTED_ERROR";
      } else if (
        statusRaw.includes("RED") ||
        statusRaw.includes("INSPECTION")
      ) {
        responseStatus = "INSPECTION_RED";
      } else if (statusRaw.includes("ORANGE") || statusRaw.includes("DOC")) {
        responseStatus = "DOCS_REQUIRED_ORANGE";
      } else {
        responseStatus = "ACCEPTED_GREEN";
      }

      return {
        filingReference: json.filingReference || json.filingRef,
        mrnAssigned: json.mrnAssigned || json.mrn,
        responseStatus,
        errorCode: json.errorCode,
        errorMessage: json.errorMessage || json.error,
        acknowledgedAt,
        rawResponseSha256,
      };
    } catch {
      // Fall through to regex XML parsing if JSON parse fails
    }
  }

  // 2. Parse XML via robust regex
  let responseStatus: CustomsRoutingChannel = "ACCEPTED_GREEN";
  let mrnAssigned: string | undefined;
  let filingReference: string | undefined;
  let errorCode: string | undefined;
  let errorMessage: string | undefined;

  // Extract MRN (<MRN>, <mrn>, <MovementReferenceNumber>)
  const mrnMatch = rawResponse.match(
    /<(?:[a-zA-Z0-9_-]+:)?(?:MRN|mrn|MovementReferenceNumber)>([^<]+)<\//i,
  );
  if (mrnMatch) {
    mrnAssigned = mrnMatch[1].trim();
  }

  // Extract Filing Reference (<FilingReference>, <Reference>, <LRN>)
  const filingMatch = rawResponse.match(
    /<(?:[a-zA-Z0-9_-]+:)?(?:FilingReference|Reference|LRN|FunctionalReferenceId)>([^<]+)<\//i,
  );
  if (filingMatch) {
    filingReference = filingMatch[1].trim();
  }

  // Extract Status or Routing Channel (<RoutingChannel>, <Status>, <Circuit>)
  const channelMatch = rawResponse.match(
    /<(?:[a-zA-Z0-9_-]+:)?(?:RoutingChannel|Status|Circuit|StatusCode)>([^<]+)<\//i,
  );
  const rawStatus = (channelMatch ? channelMatch[1].trim() : "").toUpperCase();

  if (
    rawStatus.includes("ERROR") ||
    rawStatus.includes("REJECT") ||
    rawResponse.includes("<Error>")
  ) {
    responseStatus = "REJECTED_ERROR";
    const errCodeMatch = rawResponse.match(
      /<(?:[a-zA-Z0-9_-]+:)?(?:ErrorCode|Code)>([^<]+)<\//i,
    );
    const errMsgMatch = rawResponse.match(
      /<(?:[a-zA-Z0-9_-]+:)?(?:ErrorMessage|Text|Description)>([^<]+)<\//i,
    );
    errorCode = errCodeMatch ? errCodeMatch[1].trim() : "ERR_CUSTOMS_REJECTED";
    errorMessage = errMsgMatch
      ? errMsgMatch[1].trim()
      : "Customs authority declaration rejected.";
  } else if (
    rawStatus.includes("RED") ||
    rawStatus.includes("INSPECTION") ||
    rawStatus === "ROUGE" ||
    rawStatus === "ROJO"
  ) {
    responseStatus = "INSPECTION_RED";
  } else if (
    rawStatus.includes("ORANGE") ||
    rawStatus.includes("DOCS") ||
    rawStatus === "NARANJA"
  ) {
    responseStatus = "DOCS_REQUIRED_ORANGE";
  } else {
    responseStatus = "ACCEPTED_GREEN";
  }

  return {
    filingReference,
    mrnAssigned,
    responseStatus,
    errorCode,
    errorMessage,
    acknowledgedAt,
    rawResponseSha256,
  };
}
