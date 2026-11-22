/**
 * @file carrier-telemetry.normalizer.test.ts
 * @description Unit tests for Multi-Modal Carrier Track & Trace Normalizer Engine (ADR 0034).
 */

import { describe, it, expect } from "vitest";
import {
  validateImoChecksum,
  normalizeDcsaEvent,
  normalizeAirFsuEvent,
  normalizeAisEvent,
  normalizeCarrierEvent,
  CARRIER_TRUST_RANK,
} from "./carrier-telemetry.normalizer.js";

describe("CarrierTelemetryNormalizer Engine (ADR 0034)", () => {
  describe("validateImoChecksum", () => {
    it("should validate legitimate 7-digit IMO numbers correctly", () => {
      // IMO 9313400 (Emma Maersk): 9*7 + 3*6 + 1*5 + 3*4 + 4*3 + 0*2 = 63 + 18 + 5 + 12 + 12 + 0 = 110 % 10 = 0 -> check digit 0
      expect(validateImoChecksum("9313400")).toBe(true);
      expect(validateImoChecksum(9313400)).toBe(true);
      // IMO 9241061: 9*7 + 2*6 + 4*5 + 1*4 + 0*3 + 6*2 = 63 + 12 + 20 + 4 + 0 + 12 = 111 % 10 = 1 -> check digit 1
      expect(validateImoChecksum("9241061")).toBe(true);
    });

    it("should reject corrupted or invalid IMO numbers", () => {
      expect(validateImoChecksum("9313401")).toBe(false);
      expect(validateImoChecksum("1234568")).toBe(false);
      expect(validateImoChecksum("")).toBe(false);
      expect(validateImoChecksum(undefined)).toBe(false);
      expect(validateImoChecksum("931340")).toBe(false); // only 6 digits
    });
  });

  describe("normalizeDcsaEvent", () => {
    it("should normalize GTIN (Gate In) and map to GATE_IN_ORIGIN with auto-resolution", () => {
      const raw = {
        eventId: "dcsa_test_01",
        eventType: "EQUIPMENT",
        eventClassifierCode: "ACT",
        eventDateTime: "2026-11-22T08:30:00.000Z",
        eventTypeCode: "GTIN",
        carrierBookingReference: "MSCU12345678",
        equipmentReference: "MSCU9821034",
        locationLocode: "ESVLC",
      };

      const normalized = normalizeDcsaEvent(raw);
      expect(normalized.eventId).toBe("dcsa_test_01");
      expect(normalized.transportMode).toBe("OCEAN");
      expect(normalized.sourceType).toBe("CARRIER_DCSA_EDI");
      expect(normalized.trustRank).toBe(CARRIER_TRUST_RANK.CARRIER_DCSA_EDI);
      expect(normalized.canonicalMilestoneCode).toBe("GATE_IN_ORIGIN");
      expect(normalized.macroPhase).toBe("ORIGIN_PRODUCTION");
      expect(normalized.autoResolvesExceptionCategory).toBe(
        "CRD_CUTOFF_BREACH",
      );
      expect(normalized.equipmentReference).toBe("MSCU9821034");
      expect(normalized.carrierBookingReference).toBe("MSCU12345678");
    });

    it("should normalize DEPA (Departure) and map to VESSEL_DEPARTED", () => {
      const raw = {
        eventTypeCode: "DEPA",
        vesselImoNumber: "9313400",
        vesselName: "EMMA MAERSK",
        voyageNumber: "2601W",
        locationLocode: "CNSHA",
      };

      const normalized = normalizeDcsaEvent(raw);
      expect(normalized.canonicalMilestoneCode).toBe("VESSEL_DEPARTED");
      expect(normalized.macroPhase).toBe("INTERNATIONAL_TRANSIT");
      expect(normalized.autoResolvesExceptionCategory).toBe("CARRIER_DELAY");
      expect(normalized.vesselImoNumber).toBe("9313400");
    });

    it("should normalize RELE (Customs Release) and auto-resolve CUSTOMS_HOLD", () => {
      const raw = {
        eventTypeCode: "RELE",
        locationLocode: "ESBCN",
      };

      const normalized = normalizeDcsaEvent(raw);
      expect(normalized.canonicalMilestoneCode).toBe("CUSTOMS_RELEASED");
      expect(normalized.macroPhase).toBe("FINAL_CUSTOMS");
      expect(normalized.autoResolvesExceptionCategory).toBe("CUSTOMS_HOLD");
    });
  });

  describe("normalizeAirFsuEvent", () => {
    it("should normalize RCS (Received from Shipper) and map to CARGO_RECEIVED", () => {
      const raw = {
        statusCode: "RCS",
        awbNumber: "020-12345675",
        stationCode: "FRA",
        pieces: 10,
        weightKg: 450.5,
      };

      const normalized = normalizeAirFsuEvent(raw);
      expect(normalized.transportMode).toBe("AIR");
      expect(normalized.sourceType).toBe("CARRIER_AIR_FSU");
      expect(normalized.trustRank).toBe(3);
      expect(normalized.canonicalMilestoneCode).toBe("CARGO_RECEIVED");
      expect(normalized.macroPhase).toBe("ORIGIN_PRODUCTION");
      expect(normalized.autoResolvesExceptionCategory).toBe(
        "CRD_CUTOFF_BREACH",
      );
      expect(normalized.airWaybillNumber).toBe("020-12345675");
    });

    it("should normalize DEP and ARR flight milestones", () => {
      const dep = normalizeAirFsuEvent({
        statusCode: "DEP",
        awbNumber: "020-12345675",
        flightNumber: "LH8220",
        stationCode: "FRA",
      });
      expect(dep.canonicalMilestoneCode).toBe("FLIGHT_DEPARTED");
      expect(dep.flightNumber).toBe("LH8220");
      expect(dep.autoResolvesExceptionCategory).toBe("CARRIER_DELAY");

      const arr = normalizeAirFsuEvent({
        statusCode: "ARR",
        awbNumber: "020-12345675",
        flightNumber: "LH8220",
        stationCode: "MAD",
      });
      expect(arr.canonicalMilestoneCode).toBe("FLIGHT_ARRIVED");
      expect(arr.autoResolvesExceptionCategory).toBe("TRANSSHIPMENT_DWELL");
    });

    it("should normalize DLV and map to DELIVERED_FINAL resolving ETA_RDD_BREACH", () => {
      const dlv = normalizeAirFsuEvent({
        statusCode: "DLV",
        awbNumber: "020-12345675",
      });
      expect(dlv.canonicalMilestoneCode).toBe("DELIVERED_FINAL");
      expect(dlv.macroPhase).toBe("FINAL_CUSTOMS");
      expect(dlv.autoResolvesExceptionCategory).toBe("ETA_RDD_BREACH");
    });
  });

  describe("normalizeAisEvent", () => {
    it("should normalize underway vessel coordinates and speed", () => {
      const raw = {
        imoNumber: "9313400",
        vesselName: "MAERSK MC-KINNEY MOLLER",
        latitude: 36.1408,
        longitude: -5.3536,
        speedKnots: 18.4,
        navigationalStatus: "UNDERWAY",
        destinationLocode: "ESVLC",
        eta: "2026-11-23T14:00:00Z",
      };

      const normalized = normalizeAisEvent(raw);
      expect(normalized.transportMode).toBe("OCEAN");
      expect(normalized.sourceType).toBe("IOT_AIS_TELEMETRY");
      expect(normalized.trustRank).toBe(2);
      expect(normalized.canonicalMilestoneCode).toBe("VESSEL_EN_ROUTE");
      expect(normalized.vesselImoNumber).toBe("9313400");
      expect(normalized.latitude).toBe(36.1408);
      expect(normalized.longitude).toBe(-5.3536);
      expect(normalized.speedKnots).toBe(18.4);
      expect(normalized.etaDestination).toBe("2026-11-23T14:00:00.000Z");
    });

    it("should detect berthed or moored vessel and resolve PORT_CONGESTION", () => {
      const raw = {
        imoNumber: "9313400",
        vesselName: "MAERSK MC-KINNEY MOLLER",
        latitude: 39.445,
        longitude: -0.315,
        speedKnots: 0.1,
        navigationalStatus: "BERTHED",
        destinationLocode: "ESVLC",
      };

      const normalized = normalizeAisEvent(raw);
      expect(normalized.canonicalMilestoneCode).toBe("VESSEL_BERTHED");
      expect(normalized.autoResolvesExceptionCategory).toBe("PORT_CONGESTION");
    });
  });

  describe("normalizeCarrierEvent (Polymorphic Auto-Detection)", () => {
    it("should auto-detect DCSA event from standard payload", () => {
      const ev = normalizeCarrierEvent({
        eventTypeCode: "LOAD",
        carrierBookingReference: "BKG_999",
      });
      expect(ev.sourceType).toBe("CARRIER_DCSA_EDI");
      expect(ev.canonicalMilestoneCode).toBe("CONTAINER_LOADED");
    });

    it("should auto-detect Air FSU event from AWB or status code", () => {
      const ev = normalizeCarrierEvent({
        awbNumber: "020-99999999",
        statusCode: "RCF",
      });
      expect(ev.sourceType).toBe("CARRIER_AIR_FSU");
      expect(ev.canonicalMilestoneCode).toBe("CARGO_UNLOADED");
    });

    it("should auto-detect AIS telemetry from coordinates and nav status", () => {
      const ev = normalizeCarrierEvent({
        mmsi: "219018589",
        latitude: 40.1,
        longitude: 3.2,
        speedKnots: 12.0,
        navigationalStatus: "UNDERWAY",
      });
      expect(ev.sourceType).toBe("IOT_AIS_TELEMETRY");
      expect(ev.canonicalMilestoneCode).toBe("VESSEL_EN_ROUTE");
    });
  });
});
