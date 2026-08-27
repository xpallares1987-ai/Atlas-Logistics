import { describe, it, expect } from "vitest";
import { AirwayBillService } from "./airwaybill.service.js";

describe("AirwayBillService - IATA Modulo 7 & Consolidation Engine", () => {
  it("should calculate correct IATA Modulo 7 checksums", () => {
    // 8492015 % 7 = 0
    expect(AirwayBillService.calculateIataChecksum("8492015")).toBe(0);
    // 4928172 % 7 = 4
    expect(AirwayBillService.calculateIataChecksum("4928172")).toBe(4);
    // 9182736 % 7 = 3
    expect(AirwayBillService.calculateIataChecksum("9182736")).toBe(3);
    // 1234567 % 7 = 5
    expect(AirwayBillService.calculateIataChecksum(1234567)).toBe(5);
  });

  it("should validate standard IATA MAWB numbers", () => {
    // 075-84920150 (8492015 % 7 = 0)
    const validMawb = AirwayBillService.validateMawbNumber("075-84920150");
    expect(validMawb.isValid).toBe(true);
    expect(validMawb.prefix).toBe("075");
    expect(validMawb.serial).toBe("8492015");
    expect(validMawb.checksum).toBe(0);
    expect(validMawb.airlineName).toBe("Iberia Cargo");
    expect(validMawb.error).toBeUndefined();

    // Invalid checksum (expected 0, provided 9)
    const invalidMawb = AirwayBillService.validateMawbNumber("075-84920159");
    expect(invalidMawb.isValid).toBe(false);
    expect(invalidMawb.expectedChecksum).toBe(0);
    expect(invalidMawb.error).toContain("Invalid IATA Modulo 7 checksum");
  });

  it("should format MAWB numbers with computed checksum", () => {
    // 4928172 % 7 = 4
    const formatted = AirwayBillService.formatMawbNumber("020", "4928172");
    expect(formatted).toBe("020-49281724");
  });

  it("should generate sequential MAWB blocks with valid checksums", () => {
    const block = AirwayBillService.generateMawbBlock("125", 1000000, 3);
    expect(block.length).toBe(3);
    // 1000000 % 7 = 1 -> 125-10000001
    expect(block[0]).toBe("125-10000001");
    // 1000001 % 7 = 2 -> 125-10000012
    expect(block[1]).toBe("125-10000012");
    // 1000002 % 7 = 3 -> 125-10000023
    expect(block[2]).toBe("125-10000023");
  });
});
