/**
 * @file useSecurityRisk.test.ts
 * @description Unit tests for Security, Risk & Resilience Center constants and shared cryptographic/risk helpers.
 * @module @atlas/frontend/components/SecurityRisk/hooks/__tests__
 */

import { describe, it, expect } from "vitest";
import {
  generateBase32Secret,
  generateTOTP,
  verifyTOTP,
  calculateShipmentRisk,
} from "@atlas/shared";
import {
  INITIAL_REGISTERED_KEYS,
  INITIAL_PEDIMENTO_PAYLOAD,
} from "../useSecurityRisk";

describe("SecurityRisk domain helpers", () => {
  it("exposes registered FIDO2 keys and valid JSON pedimento payload", () => {
    expect(INITIAL_REGISTERED_KEYS).toHaveLength(2);
    const parsed = JSON.parse(INITIAL_PEDIMENTO_PAYLOAD);
    expect(parsed.aduanaDespacho).toContain("480");
    expect(parsed.valorComercialUSD).toBe(142500);
  });

  it("generates and verifies RFC 6238 TOTP codes deterministically", () => {
    const secret = generateBase32Secret(16);
    const code = generateTOTP(secret);
    expect(code).toHaveLength(6);
    expect(verifyTOTP(secret, code)).toBe(true);
  });

  it("computes multimodal route risk score between 1 and 100", () => {
    const risk = calculateShipmentRisk({
      originPort: "CNSHA",
      destinationPort: "USLAX",
      type: "SEA",
      priority: "HIGH",
      status: "delayed",
      predictedDelayDays: 4,
    });
    expect(risk.score).toBeGreaterThanOrEqual(1);
    expect(risk.score).toBeLessThanOrEqual(100);
    expect(risk.mitigations.length).toBeGreaterThan(0);
  });
});
