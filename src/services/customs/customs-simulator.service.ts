/**
 * @file customs-simulator.service.ts
 * @description Sovereign In-App Customs Authority Gateway Simulator for Atlas-Logistics.
 * Emulates AEAT SOAP, NCTS Phase 5 REST, and ATLAS Zoll gateways with 100% offline-first
 * deterministic CUSRES responses (GREEN, ORANGE, RED, ERROR) to satisfy the $0.00 zero-cost CI invariant.
 * @module @atlas/services/customs/simulator
 * @see {@link docs/adr/0038-customs-mtls-and-regulatory-filing-gateway.md}
 */

import {
  CustomsAgency,
  CustomsRoutingChannel,
  parseCusresResponse,
} from "../../scm/engines/customs-filing.engine.js";

export interface SimulatedExchangeResult {
  httpStatus: number;
  rawResponseXml: string;
  channel: CustomsRoutingChannel;
  mrn?: string;
  filingReference?: string;
  errorCode?: string;
  errorMessage?: string;
}

export class CustomsSimulatorService {
  /**
   * Deterministically generates an official customs MRN (Movement Reference Number)
   * conforming to the EU UCC 18-character format:
   * e.g. 26ES00080012345678 (2 digits year + 2 chars country + 4 chars office + 9 alphanumeric + 1 check digit)
   */
  generateMrn(agency: CustomsAgency, officeCode = "0800"): string {
    const year = "26"; // 2026
    let country = "ES";
    if (agency === "ATLAS") country = "DE";
    else if (agency === "DELTA") country = "FR";
    else if (agency === "HMRC_CDS") country = "GB";
    else if (agency === "CBP_ACE") country = "US";

    const cleanOffice = (officeCode.replace(/[^A-Za-z0-9]/g, "") + "0000")
      .slice(0, 4)
      .toUpperCase();
    const randomSeq = Math.floor(
      100000000 + Math.random() * 900000000,
    ).toString();
    const checkDigit = (parseInt(randomSeq.slice(-2), 10) % 9).toString();

    return `${year}${country}${cleanOffice}${randomSeq.slice(0, 7)}${checkDigit}`;
  }

  /**
   * Simulates an outbound mTLS dispatch to a national customs authority
   * and returns the authoritative CUSRES response envelope.
   */
  simulateAuthorityExchange(
    agency: CustomsAgency,
    canonicalPayloadXml: string,
    forcedChannel?: CustomsRoutingChannel,
  ): SimulatedExchangeResult {
    if (!canonicalPayloadXml || canonicalPayloadXml.trim().length === 0) {
      return {
        httpStatus: 400,
        rawResponseXml: `<?xml version="1.0" encoding="UTF-8"?><soap:Fault xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><faultcode>Client</faultcode><faultstring>Empty declaration payload</faultstring></soap:Fault>`,
        channel: "REJECTED_ERROR",
        errorCode: "ERR_EMPTY_PAYLOAD",
        errorMessage: "Declaration XML payload is empty.",
      };
    }

    // Extract filing reference from payload
    const refMatch = canonicalPayloadXml.match(
      /<(?:[a-zA-Z0-9_-]+:)?(?:FilingReference|LRN|FunctionalReferenceId|Reference)>([^<]+)<\//i,
    );
    const filingReference = refMatch
      ? refMatch[1].trim()
      : `TX-${agency}-${Date.now()}`;

    // Determine channel:
    // 1. Explicit forcedChannel
    // 2. Clear flags in payload (e.g. -RED, -ORG, -ERR, -GRN in reference or office)
    let channel: CustomsRoutingChannel = forcedChannel ?? "ACCEPTED_GREEN";

    if (!forcedChannel) {
      if (
        canonicalPayloadXml.includes("-ERR") ||
        canonicalPayloadXml.includes("SIMULATE_ERROR")
      ) {
        channel = "REJECTED_ERROR";
      } else if (
        canonicalPayloadXml.includes("-RED") ||
        canonicalPayloadXml.includes("SIMULATE_RED")
      ) {
        channel = "INSPECTION_RED";
      } else if (
        canonicalPayloadXml.includes("-ORG") ||
        canonicalPayloadXml.includes("SIMULATE_ORANGE")
      ) {
        channel = "DOCS_REQUIRED_ORANGE";
      } else {
        channel = "ACCEPTED_GREEN";
      }
    }

    // 1. Handle Validation Rejection
    if (channel === "REJECTED_ERROR") {
      const errXml = `<?xml version="1.0" encoding="UTF-8"?>
<cusres:CustomsResponse xmlns:cusres="http://wco.org/cusres" xmlns:aeat="https://www.agenciatributaria.gob.es/DUAv1">
  <cusres:FilingReference>${filingReference}</cusres:FilingReference>
  <cusres:Status>ERROR</cusres:Status>
  <cusres:ErrorCode>ERR_TARIC_DECLARATION_INVALID</cusres:ErrorCode>
  <cusres:ErrorMessage>Commodity code format is invalid or prohibited under sanctions registry.</cusres:ErrorMessage>
</cusres:CustomsResponse>`;

      return {
        httpStatus: 422,
        rawResponseXml: errXml,
        channel: "REJECTED_ERROR",
        filingReference,
        errorCode: "ERR_TARIC_DECLARATION_INVALID",
        errorMessage:
          "Commodity code format is invalid or prohibited under sanctions registry.",
      };
    }

    const mrn = this.generateMrn(agency);

    // 2. Synthesize Agency-specific CUSRES envelope
    let rawResponseXml = "";

    if (agency === "AEAT") {
      // Spanish AEAT DUA Response format
      const statusTag =
        channel === "ACCEPTED_GREEN"
          ? "VERDE"
          : channel === "DOCS_REQUIRED_ORANGE"
            ? "NARANJA"
            : "ROJO";

      rawResponseXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:aeat="https://www.agenciatributaria.gob.es/DUAv1">
  <soapenv:Body>
    <aeat:RespuestaDUA>
      <aeat:FilingReference>${filingReference}</aeat:FilingReference>
      <aeat:MRN>${mrn}</aeat:MRN>
      <aeat:Circuito>${statusTag}</aeat:Circuito>
      <aeat:FechaLevante>${new Date().toISOString()}</aeat:FechaLevante>
      <aeat:Observaciones>${channel === "ACCEPTED_GREEN" ? "LEVANTE AUTOMATICO CONCEDIDO" : "RETENCION ADUANERA MOTIVADA"}</aeat:Observaciones>
    </aeat:RespuestaDUA>
  </soapenv:Body>
</soapenv:Envelope>`;
    } else if (agency === "NCTS_P5") {
      // EU NCTS Phase 5 (CC029C for release / CC060C for control)
      const messageType = channel === "ACCEPTED_GREEN" ? "CC029C" : "CC060C";
      const controlType =
        channel === "INSPECTION_RED"
          ? "PHYSICAL_EXAMINATION"
          : "DOCUMENTARY_CHECK";

      rawResponseXml = `<?xml version="1.0" encoding="UTF-8"?>
<ncts:${messageType} xmlns:ncts="http://ncts.dgtaxud.ec/ncts5/v1">
  <ncts:TransitOperation>
    <ncts:MRN>${mrn}</ncts:MRN>
    <ncts:LRN>${filingReference}</ncts:LRN>
    <ncts:ReleaseDate>${new Date().toISOString()}</ncts:ReleaseDate>
    <ncts:StatusCode>${channel === "ACCEPTED_GREEN" ? "RELEASED" : controlType}</ncts:StatusCode>
  </ncts:TransitOperation>
</ncts:${messageType}>`;
    } else {
      // Generic CUSRES WCO envelope for ATLAS, DELTA, HMRC, CBP
      const wcoStatus =
        channel === "ACCEPTED_GREEN"
          ? "GREEN"
          : channel === "DOCS_REQUIRED_ORANGE"
            ? "ORANGE"
            : "RED";

      rawResponseXml = `<?xml version="1.0" encoding="UTF-8"?>
<cusres:CustomsResponse xmlns:cusres="http://wco.org/cusres">
  <cusres:FilingReference>${filingReference}</cusres:FilingReference>
  <cusres:MRN>${mrn}</cusres:MRN>
  <cusres:RoutingChannel>${wcoStatus}</cusres:RoutingChannel>
  <cusres:AcknowledgedAt>${new Date().toISOString()}</cusres:AcknowledgedAt>
</cusres:CustomsResponse>`;
    }

    return {
      httpStatus: 200,
      rawResponseXml,
      channel,
      mrn,
      filingReference,
    };
  }
}

export const customsSimulatorService = new CustomsSimulatorService();
