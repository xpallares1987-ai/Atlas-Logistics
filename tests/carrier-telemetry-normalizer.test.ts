/**
 * @file carrier-telemetry-normalizer.test.ts
 * @description Unit tests for the Pure Carrier Telemetry Normalization Engine.
 * Verifies multi-modal normalization, IMO checksums, trust rankings, and disruption detections.
 * @module @atlas/tests/carrier-telemetry-normalizer
 */

import { describe, it, expect } from "vitest";
import {
  normalizeCarrierTelemetry,
  validateImoChecksum,
  CARRIER_TRUST_RANK,
} from "../src/scm/engines/carrier-telemetry-normalizer.engine.js";

describe("Carrier Telemetry Normalizer Engine (Canonical Barrel)", () => {
  describe("validateImoChecksum", () => {
    it("validates valid 7-digit IMO numbers", () => {
      // IMO 9284714: (9*7 + 2*6 + 8*5 + 4*4 + 7*3 + 1*2) = 63+12+40+16+21+2 = 154 -> 154%10 = 4 (valid)
      expect(validateImoChecksum("9284714")).toBe(true);
      // IMO 9821034: (9*7 + 8*6 + 2*5 + 1*4 + 0*3 + 3*2) = 63+48+10+4+0+6 = 131 -> 131%10 = 1 != 4 (invalid)
      expect(validateImoChecksum("9821034")).toBe(false);
      // IMO 9241061: (9*7 + 2*6 + 4*5 + 1*4 + 0*3 + 6*2) = 63+12+20+4+0+12 = 111 -> 111%10 = 1 (valid)
      expect(validateImoChecksum("9241061")).toBe(true);
    });

    it("rejects non-numeric, malformed or empty IMO numbers", () => {
      expect(validateImoChecksum("")).toBe(false);
      expect(validateImoChecksum(null)).toBe(false);
      expect(validateImoChecksum("IMO123")).toBe(false);
      expect(validateImoChecksum("123456")).toBe(false);
    });
  });

  describe("CARRIER_TRUST_RANK", () => {
    it("enforces customs > carrier > ais > manual hierarchy", () => {
      expect(CARRIER_TRUST_RANK.TERMINAL_PORT_CUSTOMS).toBeGreaterThan(
        CARRIER_TRUST_RANK.CARRIER_DCSA_EDI,
      );
      expect(CARRIER_TRUST_RANK.CARRIER_DCSA_EDI).toBeGreaterThan(
        CARRIER_TRUST_RANK.IOT_AIS_TELEMETRY,
      );
      expect(CARRIER_TRUST_RANK.IOT_AIS_TELEMETRY).toBeGreaterThan(
        CARRIER_TRUST_RANK.MANUAL_OPERATOR,
      );
    });
  });

  describe("normalizeCarrierTelemetry - Ocean DCSA", () => {
    it("normalizes a DCSA 3.0 LOAD event into CONTAINER_LOADED", () => {
      const rawPayload = {
        eventType: "TRANSPORT",
        eventTypeCode: "LOAD",
        eventClassifierCode: "ACT",
        eventDateTime: "2026-11-22T14:30:00Z",
        carrierBookingReference: "BK-2026-67116",
        transportDocumentReference: "BL-991284",
        equipmentReference: "MSKU9284712",
        locationLocode: "ESVLC",
        vesselImoNumber: "9241061",
        vesselName: "MAERSK MC-KINNEY MOLLER",
        voyageNumber: "2601E",
      };

      const result = normalizeCarrierTelemetry(rawPayload);

      expect(result.transportMode).toBe("OCEAN");
      expect(result.sourceType).toBe("CARRIER_DCSA_EDI");
      expect(result.trustRank).toBe(3);
      expect(result.canonicalMilestoneCode).toBe("CONTAINER_LOADED");
      expect(result.macroPhase).toBe("INTERNATIONAL_TRANSIT");
      expect(result.carrierBookingReference).toBe("BK-2026-67116");
      expect(result.equipmentReference).toBe("MSKU9284712");
      expect(result.locationLocode).toBe("ESVLC");
      expect(result.autoResolvesExceptionCategory).toBe("ROLLOVER_RISK");
    });

    it("normalizes a DCSA RELE event into CUSTOMS_RELEASED", () => {
      const rawPayload = {
        eventType: "SHIPMENT",
        eventTypeCode: "RELE",
        eventClassifierCode: "ACT",
        eventDateTime: "2026-11-22T16:00:00Z",
        transportDocumentReference: "BL-991284",
        locationLocode: "ESBCN",
      };

      const result = normalizeCarrierTelemetry(rawPayload);

      expect(result.canonicalMilestoneCode).toBe("CUSTOMS_RELEASED");
      expect(result.macroPhase).toBe("FINAL_CUSTOMS");
      expect(result.autoResolvesExceptionCategory).toBe("CUSTOMS_HOLD");
    });
  });

  describe("normalizeCarrierTelemetry - Air IATA FSU", () => {
    it("normalizes an IATA FSU RCS event into CARGO_RECEIVED", () => {
      const rawPayload = {
        messageType: "FSU",
        statusCode: "RCS",
        awbNumber: "020-12345675",
        stationCode: "MAD",
        eventDateTime: "2026-11-22T10:00:00Z",
      };

      const result = normalizeCarrierTelemetry(rawPayload);

      expect(result.transportMode).toBe("AIR");
      expect(result.sourceType).toBe("CARRIER_AIR_FSU");
      expect(result.canonicalMilestoneCode).toBe("CARGO_RECEIVED");
      expect(result.airWaybillNumber).toBe("020-12345675");
      expect(result.locationLocode).toBe("ESMAD");
      expect(result.autoResolvesExceptionCategory).toBe("CRD_CUTOFF_BREACH");
    });
  });

  describe("normalizeCarrierTelemetry - Satellite AIS", () => {
    it("normalizes an AIS position ping with valid coordinates", () => {
      const rawPayload = {
        imoNumber: "9241061",
        vesselName: "MAERSK MC-KINNEY MOLLER",
        latitude: 39.4699,
        longitude: -0.3763,
        speedKnots: 14.5,
        destinationLocode: "ESVLC",
        navigationalStatus: "UNDERWAY",
        timestamp: "2026-11-22T15:00:00Z",
      };

      const result = normalizeCarrierTelemetry(rawPayload);

      expect(result.transportMode).toBe("OCEAN");
      expect(result.sourceType).toBe("IOT_AIS_TELEMETRY");
      expect(result.trustRank).toBe(2);
      expect(result.canonicalMilestoneCode).toBe("VESSEL_EN_ROUTE");
      expect(result.latitude).toBeCloseTo(39.4699);
      expect(result.longitude).toBeCloseTo(-0.3763);
      expect(result.speedKnots).toBe(14.5);
    });
  });
});
