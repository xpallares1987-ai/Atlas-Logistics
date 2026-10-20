import { describe, it, expect } from "vitest";
import {
  validateCutOffDeadlines,
  generateDCSABookingPayload,
  generateEDI301Transaction,
  generateEDI304ShippingInstruction,
  generateEquipmentReleaseOrder,
  OCEAN_BOOKING_PRESETS,
  CARRIER_METADATA,
} from "./ocean-booking.js";

describe("Ocean Booking Engine (@atlas/shared)", () => {
  describe("validateCutOffDeadlines", () => {
    it("should evaluate cut-offs as SAFE when deadlines are well in advance", () => {
      const now = new Date("2026-10-12T12:00:00Z");
      const cutOffs = {
        siCutOff: "2026-10-14T12:00:00Z",     // 48h
        vgmCutOff: "2026-10-15T12:00:00Z",    // 72h
        cargoCutOff: "2026-10-16T12:00:00Z",  // 96h
        customsCutOff: "2026-10-15T18:00:00Z",// 78h
        estimatedDeparture: "2026-10-17T00:00:00Z",
        estimatedArrival: "2026-10-30T00:00:00Z",
      };

      const evalResult = validateCutOffDeadlines(cutOffs, now.toISOString());
      expect(evalResult.overallStatus).toBe("SAFE");
      expect(evalResult.isSiExpired).toBe(false);
      expect(evalResult.siHoursRemaining).toBe(48);
    });

    it("should flag URGENT or CRITICAL when cut-off is approaching within thresholds", () => {
      const now = new Date("2026-10-12T12:00:00Z");
      const urgentCutOffs = {
        siCutOff: "2026-10-13T06:00:00Z",     // 18h -> URGENT
        vgmCutOff: "2026-10-13T18:00:00Z",    // 30h
        cargoCutOff: "2026-10-14T12:00:00Z",  // 48h
        customsCutOff: "2026-10-14T00:00:00Z",
        estimatedDeparture: "2026-10-15T00:00:00Z",
        estimatedArrival: "2026-10-25T00:00:00Z",
      };

      const evalResult = validateCutOffDeadlines(urgentCutOffs, now.toISOString());
      expect(evalResult.overallStatus).toBe("URGENT");
      expect(evalResult.siHoursRemaining).toBe(18);

      const criticalCutOffs = {
        ...urgentCutOffs,
        siCutOff: "2026-10-12T18:00:00Z", // 6h -> CRITICAL
      };
      const critResult = validateCutOffDeadlines(criticalCutOffs, now.toISOString());
      expect(critResult.overallStatus).toBe("CRITICAL");
    });

    it("should flag BREACHED when a cut-off deadline has elapsed", () => {
      const now = new Date("2026-10-12T12:00:00Z");
      const expiredCutOffs = {
        siCutOff: "2026-10-12T10:00:00Z",     // -2h -> Expired!
        vgmCutOff: "2026-10-13T12:00:00Z",
        cargoCutOff: "2026-10-14T12:00:00Z",
        customsCutOff: "2026-10-13T18:00:00Z",
        estimatedDeparture: "2026-10-15T00:00:00Z",
        estimatedArrival: "2026-10-25T00:00:00Z",
      };

      const evalResult = validateCutOffDeadlines(expiredCutOffs, now.toISOString());
      expect(evalResult.overallStatus).toBe("BREACHED");
      expect(evalResult.isSiExpired).toBe(true);
      expect(evalResult.siHoursRemaining).toBeLessThanOrEqual(0);
    });
  });

  describe("generateDCSABookingPayload", () => {
    it("should construct valid DCSA Booking API v2.0 payload", () => {
      const preset = OCEAN_BOOKING_PRESETS[0]; // Maersk CNSHA -> USLAX
      const payload = generateDCSABookingPayload(preset);

      expect(payload.receiptTypeAtOrigin).toBe("CY");
      expect(payload.carrierScac).toBe("MAEU");
      expect(payload.polPortCode).toBe("CNSHA");
      expect(payload.podPortCode).toBe("USLAX");
      expect(payload.vesselName).toBe("MAERSK MC-KINNEY MOLLER");
      expect(payload.voyageNumber).toBe("2608W");
      expect(payload.requestedEquipments[0].ISOEquipmentCode).toBe("40HC");
      expect(payload.requestedEquipments[0].units).toBe(1);
    });
  });

  describe("generateEDI301Transaction", () => {
    it("should generate compliant ANSI X12 EDI 301 envelope and segments", () => {
      const preset = OCEAN_BOOKING_PRESETS[1]; // CMA CGM SGSIN -> NLRTM
      const edi301 = generateEDI301Transaction(preset);

      expect(edi301).toContain("ST*301*0001");
      expect(edi301).toContain("B1*CMDU*");
      expect(edi301).toContain("Y3*CMA-77402911*CMDU*");
      expect(edi301).toContain("R4*R*UN*SGSIN");
      expect(edi301).toContain("R4*D*UN*NLRTM");
      expect(edi301).toContain("W09*CMA CGM JACQUES SAADE");
      expect(edi301).toContain("SE*");
      expect(edi301).toContain("GE*1*1");
      expect(edi301).toContain("IEA*1*000000001");
    });
  });

  describe("generateEDI304ShippingInstruction", () => {
    it("should format EDI 304 Shipping Instructions with container details and seals", () => {
      const preset = OCEAN_BOOKING_PRESETS[0];
      expect(preset.shippingInstructions).toBeDefined();

      const edi304 = generateEDI304ShippingInstruction(preset.shippingInstructions!);
      expect(edi304).toContain("ST*304*0001");
      expect(edi304).toContain("B2**MAEU*MSK-99201482**WAYBILL");
      expect(edi304).toContain("N1*SH*Atlas Global Electronics Ltd");
      expect(edi304).toContain("M7*SL-MAEU-884910");
      expect(edi304).toContain("W09*MSKU9284712*3880*K*24500");
      expect(edi304).toContain("L5*1*Smart Display Modules & Sensors");
      expect(edi304).toContain("SE*");
    });
  });

  describe("generateEquipmentReleaseOrder", () => {
    it("should issue an Empty Equipment Release Order with PIN and QR digest", () => {
      const preset = OCEAN_BOOKING_PRESETS[2]; // Hapag-Lloyd Can Tunis Book 012
      const release = generateEquipmentReleaseOrder(preset, {
        depotCode: "ESBCN-CANTUNIS",
        depotName: "Can Tunis Logistainer Intermodal",
        depotAddress: "Can Tunis Ferroviaria, Barcelona",
      });

      expect(release.releaseOrderNumber).toContain("REL-HLCU-");
      expect(release.carrier).toBe("HAPAG_LLOYD");
      expect(release.carrierScac).toBe("HLCU");
      expect(release.depotCode).toBe("ESBCN-CANTUNIS");
      expect(release.containerCount).toBe(2);
      expect(release.sealNumbersAllocated).toHaveLength(2);
      expect(release.pickupPin).toHaveLength(4);
      expect(release.status).toBe("ISSUED");
      expect(release.qrDigest).toContain("RELEASE:");
    });
  });

  describe("Carrier metadata and presets", () => {
    it("should have valid metadata for all major ocean carriers", () => {
      expect(CARRIER_METADATA.MAERSK.scac).toBe("MAEU");
      expect(CARRIER_METADATA.MSC.scac).toBe("MSCU");
      expect(CARRIER_METADATA.CMA_CGM.scac).toBe("CMDU");
      expect(CARRIER_METADATA.HAPAG_LLOYD.scac).toBe("HLCU");
      expect(CARRIER_METADATA.ONE.scac).toBe("ONEY");
      expect(CARRIER_METADATA.EVERGREEN.scac).toBe("EGLV");
    });

    it("should load 3 demonstration presets across Transpacific, Europe, and Spain Corredor Book TEST01", () => {
      expect(OCEAN_BOOKING_PRESETS).toHaveLength(3);
      const bcn = OCEAN_BOOKING_PRESETS.find((p) => p.originPort === "ESBCN");
      expect(bcn).toBeDefined();
      expect(bcn?.carrier).toBe("HAPAG_LLOYD");
      expect(bcn?.commodityDescription).toContain("Corridor Test 01 Can Tunis");
    });
  });
});
