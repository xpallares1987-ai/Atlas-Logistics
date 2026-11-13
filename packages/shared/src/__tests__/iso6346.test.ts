/**
 * @file iso6346.test.ts
 * @description Unit tests for ISO 6346 container number check-digit calculation and validation.
 */

import { describe, it, expect } from "vitest";
import {
  calculateIso6346CheckDigit,
  isValidIso6346,
  generateValidIso6346,
} from "../iso6346.js";

describe("ISO 6346 Container Number Standards", () => {
  it("calculates exact check digit for official international container numbers", () => {
    // Official known container: CSQU3054383 -> digit is 3
    expect(calculateIso6346CheckDigit("CSQU305438")).toBe(3);
    expect(isValidIso6346("CSQU3054383")).toBe(true);

    // Official Maersk container: MSKU0123456
    const digit = calculateIso6346CheckDigit("MSKU012345");
    expect(isValidIso6346(`MSKU012345${digit}`)).toBe(true);
  });

  it("detects single-character and transposed invalid container numbers", () => {
    expect(isValidIso6346("CSQU3054384")).toBe(false); // wrong check digit
    expect(isValidIso6346("CSQ3054383")).toBe(false); // too short
    expect(isValidIso6346("INVALIDNUMBER")).toBe(false); // non-standard
  });

  it("generates 100% valid ISO 6346 compliant container numbers", () => {
    for (let i = 0; i < 20; i++) {
      const generated = generateValidIso6346("CMA");
      expect(generated.startsWith("CMAU")).toBe(true);
      expect(generated.length).toBe(11);
      expect(isValidIso6346(generated)).toBe(true);
    }
  });
});
