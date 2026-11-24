/**
 * @file customs-simulator.test.ts
 * @description Unit tests for CustomsSimulatorService and CUSRES integration (ADR 0038 / ADR 0039).
 * Tests offline deterministic simulation of AEAT SOAP, NCTS Phase 5 REST, and routing channel parsing.
 */

import { describe, it, expect } from "vitest";
import { customsSimulatorService } from "../../src/services/customs/customs-simulator.service.js";
import {
  synthesizeCustomsDeclaration,
  parseCusresResponse,
} from "../../src/scm/engines/customs-filing.engine.js";

describe("CustomsSimulatorService (Offline In-App Gateway Simulator)", () => {
  const baseInput = {
    clearanceId: "clr_sim_test_01",
    clearanceNumber: "CLR-2026-9901",
    agency: "AEAT" as const,
    customsOfficeCode: "ES080001",
    importerEoriOrVat: "ESA12345678",
    declarantEoriOrVat: "ESB87654321",
    taricCode: "8471300000",
    goodsDescription: "High-performance processing servers",
    originCountryCode: "US",
    grossMassKg: 1540.5,
    netMassKg: 1420.0,
    customsValueEur: 85000.0,
    dutyAmountEur: 1700.0,
    vatAmountEur: 17850.0,
    certificateThumbprint: "7A9B3C4D5E6F708192A3B4C5D6E7F8091A2B3C4D",
  };

  it("simulates AEAT DUA Green Channel (Levante Concedido) with valid MRN", () => {
    const synthesized = synthesizeCustomsDeclaration(baseInput);
    const exchange = customsSimulatorService.simulateAuthorityExchange(
      "AEAT",
      synthesized.rawPayload,
      "ACCEPTED_GREEN",
    );

    expect(exchange.httpStatus).toBe(200);
    expect(exchange.channel).toBe("ACCEPTED_GREEN");
    expect(exchange.mrn).toMatch(/^26ES/);
    expect(exchange.rawResponseXml).toContain("Circuito>VERDE</aeat:Circuito>");

    const parsed = parseCusresResponse(exchange.rawResponseXml);
    expect(parsed.responseStatus).toBe("ACCEPTED_GREEN");
    expect(parsed.mrnAssigned).toBe(exchange.mrn);
  });

  it("simulates AEAT DUA Orange Channel (Documentary Review Required)", () => {
    const inputWithFlag = {
      ...baseInput,
      clearanceNumber: "CLR-2026-9901-ORG",
    };
    const synthesized = synthesizeCustomsDeclaration(inputWithFlag);
    const exchange = customsSimulatorService.simulateAuthorityExchange(
      "AEAT",
      synthesized.rawPayload,
    );

    expect(exchange.httpStatus).toBe(200);
    expect(exchange.channel).toBe("DOCS_REQUIRED_ORANGE");
    expect(exchange.rawResponseXml).toContain(
      "Circuito>NARANJA</aeat:Circuito>",
    );

    const parsed = parseCusresResponse(exchange.rawResponseXml);
    expect(parsed.responseStatus).toBe("DOCS_REQUIRED_ORANGE");
    expect(parsed.mrnAssigned).toBeDefined();
  });

  it("simulates AEAT DUA Red Channel (Physical Inspection at Port/Terminal)", () => {
    const inputWithFlag = {
      ...baseInput,
      clearanceNumber: "CLR-2026-9901-RED",
    };
    const synthesized = synthesizeCustomsDeclaration(inputWithFlag);
    const exchange = customsSimulatorService.simulateAuthorityExchange(
      "AEAT",
      synthesized.rawPayload,
    );

    expect(exchange.httpStatus).toBe(200);
    expect(exchange.channel).toBe("INSPECTION_RED");
    expect(exchange.rawResponseXml).toContain("Circuito>ROJO</aeat:Circuito>");

    const parsed = parseCusresResponse(exchange.rawResponseXml);
    expect(parsed.responseStatus).toBe("INSPECTION_RED");
    expect(parsed.mrnAssigned).toBeDefined();
  });

  it("simulates EU NCTS Phase 5 (Transit T1) Green Channel with CC029C", () => {
    const nctsInput = {
      ...baseInput,
      agency: "NCTS_P5" as const,
      guaranteeReference: "TC31-TRANSIT-GUARANTEE-999",
    };
    const synthesized = synthesizeCustomsDeclaration(nctsInput);
    const exchange = customsSimulatorService.simulateAuthorityExchange(
      "NCTS_P5",
      synthesized.rawPayload,
      "ACCEPTED_GREEN",
    );

    expect(exchange.httpStatus).toBe(200);
    expect(exchange.channel).toBe("ACCEPTED_GREEN");
    expect(exchange.rawResponseXml).toContain("<ncts:CC029C");
    expect(exchange.rawResponseXml).toContain("RELEASED");

    const parsed = parseCusresResponse(exchange.rawResponseXml);
    expect(parsed.responseStatus).toBe("ACCEPTED_GREEN");
    expect(parsed.mrnAssigned).toBe(exchange.mrn);
  });

  it("simulates declaration rejection (Error 422) on syntax or tariff violation", () => {
    const errInput = {
      ...baseInput,
      clearanceNumber: "CLR-2026-9901-ERR",
    };
    const synthesized = synthesizeCustomsDeclaration(errInput);
    const exchange = customsSimulatorService.simulateAuthorityExchange(
      "AEAT",
      synthesized.rawPayload,
    );

    expect(exchange.httpStatus).toBe(422);
    expect(exchange.channel).toBe("REJECTED_ERROR");
    expect(exchange.errorCode).toBe("ERR_TARIC_DECLARATION_INVALID");

    const parsed = parseCusresResponse(exchange.rawResponseXml);
    expect(parsed.responseStatus).toBe("REJECTED_ERROR");
    expect(parsed.errorCode).toBe("ERR_TARIC_DECLARATION_INVALID");
    expect(parsed.errorMessage).toBeDefined();
  });

  it("returns 400 when declaration payload is empty", () => {
    const exchange = customsSimulatorService.simulateAuthorityExchange(
      "AEAT",
      "",
    );
    expect(exchange.httpStatus).toBe(400);
    expect(exchange.channel).toBe("REJECTED_ERROR");
    expect(exchange.errorCode).toBe("ERR_EMPTY_PAYLOAD");
  });
});
