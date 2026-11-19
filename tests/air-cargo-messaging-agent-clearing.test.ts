/**
 * @file air-cargo-messaging-agent-clearing.test.ts
 * @description Comprehensive test suite for Track E: IATA Air Cargo Messaging (FWB/FHL/FSU), CASS Billing Reconciliation, and Corresponding Agent Network Clearing & Netting.
 * @module @atlas/tests/air-cargo-messaging-agent-clearing
 * @see {@link docs/adr/0029-air-cargo-messaging-cass-and-agent-network-clearing.md}
 */

import { describe, it, expect, beforeAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { db } from "../src/db/index.js";
import {
  companies,
  addresses,
  shipments,
  iataAirports,
  airwayBills,
  cargoIqMilestones,
  airCargoMessages,
  agentClearingLedger,
  agentSettlements,
} from "../src/db/schema/index.js";
import {
  calculateIataAwbCheckDigit,
  validateIataAwbNumber,
  calculateAirChargeableWeight,
  buildCargoImpFwb,
  buildCargoImpFhl,
  buildCargoImpFsu,
  parseCargoImpFsu,
  reconcileCassBillingItem,
  calculateAgentProfitShare,
  calculateAgentPeriodNetting,
} from "@atlas/shared";
import { AirCargoMessagingService } from "../src/services/air-cargo/air-cargo-messaging.service.js";
import { AgentNetworkClearingService } from "../src/services/clearing/agent-network-clearing.service.js";
import airCargoClearingRoutes from "../src/routes/air-cargo/air-cargo-clearing.routes.js";
import { eq } from "drizzle-orm";

describe("Track E: IATA Air Cargo Messaging, CASS & Agent Network Clearing Suite", () => {
  let app: FastifyInstance;
  const messagingService = new AirCargoMessagingService();
  const clearingService = new AgentNetworkClearingService();

  const testAgentCompanyId = "comp-agent-network-01";
  const testAirlineCompanyId = "comp-airline-iberia-01";
  const testShipmentId = "sh-air-tracke-01";
  const testAwbNumber = "074-12345675"; // 1234567 % 7 = 5

  beforeAll(async () => {
    // 1. Seed Agent Company & Airline Company
    await db
      .insert(companies)
      .values({
        id: testAgentCompanyId,
        name: "Asia-Pacific Logistics Express Ltd (WCA Agent)",
        taxId: "HK-98217345",
      })
      .onConflictDoUpdate({
        target: companies.id,
        set: { name: "Asia-Pacific Logistics Express Ltd (WCA Agent)" },
      });

    await db
      .insert(companies)
      .values({
        id: testAirlineCompanyId,
        name: "Iberia Líneas Aéreas de España S.A.",
        taxId: "ESA28004414",
      })
      .onConflictDoUpdate({
        target: companies.id,
        set: { name: "Iberia Líneas Aéreas de España S.A." },
      });

    // 2. Seed Airports (MAD & JFK)
    for (const apt of [
      {
        code: "MAD",
        name: "Adolfo Suárez Madrid-Barajas",
        city: "Madrid",
        countryCode: "ES",
      },
      {
        code: "JFK",
        name: "John F. Kennedy International",
        city: "New York",
        countryCode: "US",
      },
    ]) {
      await db
        .insert(iataAirports)
        .values(apt)
        .onConflictDoUpdate({
          target: iataAirports.code,
          set: { name: apt.name },
        });
    }

    // 3. Seed Shipment
    await db
      .insert(shipments)
      .values({
        id: testShipmentId,
        trackingNumber: "EXP-AIR-2026-991",
        status: "IN_TRANSIT",
        companyId: testAgentCompanyId,
        weight: 250,
      })
      .onConflictDoUpdate({
        target: shipments.id,
        set: { status: "IN_TRANSIT" },
      });

    // 4. Seed AirwayBill & Cargo iQ Milestone
    await db
      .insert(airwayBills)
      .values({
        id: "awb_tracke_01",
        type: "MAWB",
        awbNumber: testAwbNumber,
        airlinePrefix: "074",
        airlineName: "Iberia",
        originAirport: "MAD",
        destinationAirport: "JFK",
        pieces: 1,
        grossWeightKg: 250.0,
        chargeableWeightKg: 250.0,
        ratePerKg: 4.5,
        status: "BOOKED",
      })
      .onConflictDoUpdate({
        target: airwayBills.awbNumber,
        set: { status: "BOOKED" },
      });

    await db
      .insert(cargoIqMilestones)
      .values({
        id: "ciq_tracke_01",
        awbNumber: testAwbNumber,
        milestoneCode: "DEP",
        milestoneName: "Departed on scheduled flight",
        scheduledTime: new Date("2026-05-25T10:00:00Z"),
        slaDeadline: new Date("2026-05-25T11:00:00Z"),
        locationAirportCode: "MAD",
        slaStatus: "ON_TIME",
      })
      .onConflictDoUpdate({
        target: cargoIqMilestones.id,
        set: { slaStatus: "ON_TIME" },
      });

    // 5. Setup Fastify application
    app = Fastify();
    await app.register(airCargoClearingRoutes, { prefix: "/api/air" });
    await app.ready();
  });

  // ==========================================================================
  // SECTION 1: DOMAIN ALGORITHMS & MATHEMATICAL VALIDATION
  // ==========================================================================

  describe("1. IATA Air Waybill (AWB) Check-Digit Math (Resolution 600a)", () => {
    it("correctly calculates modulus-7 check digit", () => {
      // 1234567 % 7 = 5
      expect(calculateIataAwbCheckDigit("1234567")).toBe(5);
      // 9876543 % 7 = 5
      expect(calculateIataAwbCheckDigit("9876543")).toBe(5);
      // 0000007 % 7 = 0
      expect(calculateIataAwbCheckDigit("0000007")).toBe(0);
    });

    it("validates 8-digit and 11-digit IATA AWB numbers", () => {
      const v1 = validateIataAwbNumber("074-12345675");
      expect(v1.isValid).toBe(true);
      expect(v1.prefix).toBe("074");
      expect(v1.serial7).toBe("1234567");
      expect(v1.checkDigit).toBe(5);

      const v2 = validateIataAwbNumber("12345675");
      expect(v2.isValid).toBe(true);
      expect(v2.checkDigit).toBe(5);
    });

    it("rejects checksum mismatches and malformed AWBs", () => {
      const invalidChecksum = validateIataAwbNumber("074-12345676");
      expect(invalidChecksum.isValid).toBe(false);
      expect(invalidChecksum.error).toContain("Modulus-7 checksum mismatch");

      const malformed = validateIataAwbNumber("123");
      expect(malformed.isValid).toBe(false);
      expect(malformed.error).toContain("Invalid AWB length");
    });
  });

  describe("2. IATA Air Freight Chargeable Weight (TACT 1:6000)", () => {
    it("selects gross weight when physical mass exceeds volumetric threshold", () => {
      // 500 kg, 1.5 CBM -> Volumetric = 1.5 * 166.6667 = 250 kg -> Chargeable = 500 kg
      const result = calculateAirChargeableWeight(500.0, 1.5);
      expect(result.grossWeightKg).toBe(500.0);
      expect(result.volumetricWeightKg).toBe(250.0);
      expect(result.chargeableWeightKg).toBe(500.0);
      expect(result.billedBasis).toBe("GROSS_WEIGHT");
    });

    it("selects volumetric weight when cubic volume exceeds physical density", () => {
      // 100 kg, 2.0 CBM -> Volumetric = 2.0 * 166.6667 = 333.3 kg -> Chargeable = 333.3 kg
      const result = calculateAirChargeableWeight(100.0, 2.0);
      expect(result.grossWeightKg).toBe(100.0);
      expect(result.volumetricWeightKg).toBe(333.3);
      expect(result.chargeableWeightKg).toBe(333.3);
      expect(result.billedBasis).toBe("VOLUMETRIC_WEIGHT");
    });
  });

  describe("3. Cargo-IMP Teletype Generator & Parser (FWB, FHL, FSU)", () => {
    it("builds a compliant Cargo-IMP FWB v16 teletype payload", () => {
      const fwb = buildCargoImpFwb({
        airlinePrefix: "074",
        awbSerial7: "1234567",
        originAirport: "MAD",
        destinationAirport: "JFK",
        flightNumber: "IB6253",
        flightDayMonth: "25MAY",
        shipperName: "Iberian Tech Equipment SL",
        shipperAddress: "Parque Tecnologico 12",
        shipperCity: "Madrid",
        shipperCountry: "ES",
        consigneeName: "Manhattan Avionics Corp",
        consigneeAddress: "5th Ave 100",
        consigneeCity: "New York",
        consigneeCountry: "US",
        pieces: 1,
        grossWeightKg: 250.0,
        ratePerKg: 4.5,
        currency: "EUR",
        natureOfGoods: "Aircraft Components",
        specialHandlingCodes: ["ELI", "CAO"],
        fuelSurcharge: 45.0,
        securitySurcharge: 20.0,
      });

      expect(fwb).toContain("FWB/16");
      expect(fwb).toContain("074-12345675MADJFK/T1K250.0");
      expect(fwb).toContain("FLT/IB6253/25MAY");
      expect(fwb).toContain("RTG/MAD07JFK");
      expect(fwb).toContain("SHP");
      expect(fwb).toContain("CNE");
      expect(fwb).toContain("RTD/1/P1/K250.0/CQ/W250.0/R4.50/T1125.00");
      expect(fwb).toContain("OTH/P/MYC45.00/P/SCC20.00");
      expect(fwb).toContain("SPH/ELI/CAO");
    });

    it("builds a compliant Cargo-IMP FHL v4 consolidation message", () => {
      const fhl = buildCargoImpFhl({
        airlinePrefix: "074",
        mawbSerial7: "1234567",
        originAirport: "MAD",
        destinationAirport: "JFK",
        totalPieces: 2,
        totalGrossWeightKg: 250.0,
        items: [
          {
            hawbNumber: "HAWB-MAD-001",
            originAirport: "MAD",
            destinationAirport: "JFK",
            pieces: 1,
            grossWeightKg: 150.0,
            natureOfGoods: "Valves",
            shipperName: "Valve Tech SL",
            shipperCity: "Barcelona",
            shipperCountry: "ES",
            consigneeName: "US Motor Corp",
            consigneeCity: "Detroit",
            consigneeCountry: "US",
          },
          {
            hawbNumber: "HAWB-MAD-002",
            originAirport: "MAD",
            destinationAirport: "JFK",
            pieces: 1,
            grossWeightKg: 100.0,
            natureOfGoods: "Pistons",
            shipperName: "Piston Eng SA",
            shipperCity: "Zaragoza",
            shipperCountry: "ES",
            consigneeName: "Midwest Parts",
            consigneeCity: "Chicago",
            consigneeCountry: "US",
          },
        ],
      });

      expect(fhl).toContain("FHL/4");
      expect(fhl).toContain("MBI/074-12345675MADJFK/T2K250.0");
      expect(fhl).toContain("HBS/HAWB-MAD-001/MADJFK/1/K150.0/VALVES");
      expect(fhl).toContain("HBS/HAWB-MAD-002/MADJFK/1/K100.0/PISTONS");
    });

    it("builds and round-trip parses an inbound airline Cargo-IMP FSU tracking update", () => {
      const teletype = buildCargoImpFsu({
        airlinePrefix: "074",
        awbSerial7: "1234567",
        originAirport: "MAD",
        destinationAirport: "JFK",
        milestoneCode: "DEP",
        eventAirport: "MAD",
        eventDateUtc: "2026-05-25T08:30:00Z",
        pieces: 1,
        grossWeightKg: 250.0,
        flightNumber: "IB6253",
      });

      expect(teletype).toContain("FSU/16");
      expect(teletype).toContain("DEP/MAD/");

      const parsed = parseCargoImpFsu(teletype);
      expect(parsed.isValid).toBe(true);
      expect(parsed.awbNumber).toBe("074-12345675");
      expect(parsed.milestoneCode).toBe("DEP");
      expect(parsed.eventAirport).toBe("MAD");
      expect(parsed.pieces).toBe(1);
      expect(parsed.grossWeightKg).toBe(250.0);
      expect(parsed.flightNumber).toBe("IB6253");
    });
  });

  describe("4. CASS Billing 3-Way Match & Variance Resolution", () => {
    it("matches airline CASS statement lines within acceptable tolerance", () => {
      const result = reconcileCassBillingItem({
        awbNumber: "074-12345675",
        billedGrossWeightKg: 250.0,
        billedChargeableWeightKg: 250.0,
        billedFreightRate: 4.5,
        billedFreightAmount: 1125.0,
        billedFuelSurcharge: 45.0,
        billedSecuritySurcharge: 20.0,
        billedIataCommission: 56.25, // 5%
        billedNetAmount: 1133.75,
        expectedChargeableWeightKg: 250.0,
        expectedFreightRate: 4.5,
        expectedFreightAmount: 1125.0,
        expectedFuelSurcharge: 45.0,
        expectedSecuritySurcharge: 20.0,
        expectedIataCommission: 56.25,
        expectedNetAmount: 1133.75,
      });

      expect(result.isMatched).toBe(true);
      expect(result.varianceStatus).toBe("MATCHED");
      expect(result.amountVarianceEur).toBe(0.0);
      expect(result.discrepancyReasons.length).toBe(0);
    });

    it("flags variance when weight or rates deviate from internal accrual", () => {
      const result = reconcileCassBillingItem({
        awbNumber: "074-12345675",
        billedGrossWeightKg: 280.0, // +30 kg overweight billing
        billedChargeableWeightKg: 280.0,
        billedFreightRate: 5.0, // Rate jump
        billedFreightAmount: 1400.0,
        billedFuelSurcharge: 50.0,
        billedSecuritySurcharge: 20.0,
        billedIataCommission: 70.0,
        billedNetAmount: 1400.0,
        expectedChargeableWeightKg: 250.0,
        expectedFreightRate: 4.5,
        expectedFreightAmount: 1125.0,
        expectedFuelSurcharge: 45.0,
        expectedSecuritySurcharge: 20.0,
        expectedIataCommission: 56.25,
        expectedNetAmount: 1133.75,
      });

      expect(result.isMatched).toBe(false);
      expect(result.varianceStatus).toBe("CRITICAL_VARIANCE");
      expect(result.amountVarianceEur).toBeGreaterThan(200.0);
      expect(
        result.discrepancyReasons.some((r) => r.includes("weight mismatch")),
      ).toBe(true);
      expect(
        result.discrepancyReasons.some((r) => r.includes("rate mismatch")),
      ).toBe(true);
    });
  });

  describe("5. Agent Network Clearing & Netting Engine", () => {
    it("dynamically splits verified Gross Profit (50/50)", () => {
      const split = calculateAgentProfitShare({
        shipmentId: testShipmentId,
        hblOrHawbNumber: "HBL-WCA-001",
        clientGrossRevenueEur: 5000.0,
        carrierFreightCostEur: 3200.0,
        originTerminalFeesEur: 250.0,
        destinationTerminalFeesEur: 150.0,
        splitPercentageAgent: 50.0,
      });

      expect(split.clientGrossRevenueEur).toBe(5000.0);
      expect(split.totalDirectCostsEur).toBe(3600.0);
      expect(split.verifiedGrossProfitEur).toBe(1400.0);
      expect(split.agentShareAmountEur).toBe(700.0);
      expect(split.originForwarderShareAmountEur).toBe(700.0);
      expect(split.isProfitable).toBe(true);
    });

    it("consolidates mutual DN/CN entries and computes net period settlement balance", () => {
      const entries = [
        {
          entryNumber: "DN-01",
          noteType: "DEBIT_NOTE" as const, // Origin owes Agent $1,200
          hblOrHawbNumber: "HBL-01",
          amount: 1200.0,
          currency: "USD",
          exchangeRateToTarget: 1.0,
          amountInTargetCurrency: 1200.0,
        },
        {
          entryNumber: "DN-02",
          noteType: "DEBIT_NOTE" as const, // Origin owes Agent $800
          hblOrHawbNumber: "HBL-02",
          amount: 800.0,
          currency: "USD",
          exchangeRateToTarget: 1.0,
          amountInTargetCurrency: 800.0,
        },
        {
          entryNumber: "CN-01",
          noteType: "CREDIT_NOTE" as const, // Agent owes Origin $3,500
          hblOrHawbNumber: "HBL-03",
          amount: 3500.0,
          currency: "USD",
          exchangeRateToTarget: 1.0,
          amountInTargetCurrency: 3500.0,
        },
      ];

      const netting = calculateAgentPeriodNetting(
        testAgentCompanyId,
        "USD",
        "2026-05-01",
        "2026-05-31",
        entries,
      );

      expect(netting.totalDebitNotesTarget).toBe(2000.0);
      expect(netting.totalCreditNotesTarget).toBe(3500.0);
      expect(netting.netSettlementBalanceTarget).toBe(1500.0); // Agent pays Origin $1,500
      expect(netting.settlementAction).toBe("COLLECT_FROM_AGENT");
    });
  });

  // ==========================================================================
  // SECTION 2: APPLICATION SERVICES & DATABASE INTEGRATION
  // ==========================================================================

  describe("6. AirCargoMessagingService & AgentNetworkClearingService Full Integration", () => {
    it("dispatches e-AWB FWB, receives FSU milestone, and updates Cargo iQ", async () => {
      // 1. Dispatch FWB
      const fwbResult = await messagingService.dispatchMasterFwb({
        airlinePrefix: "074",
        awbSerial7: "1234567",
        originAirport: "MAD",
        destinationAirport: "JFK",
        flightNumber: "IB6253",
        flightDayMonth: "25MAY",
        shipperName: "Iberian Tech Equipment SL",
        shipperAddress: "Parque Tecnologico 12",
        shipperCity: "Madrid",
        shipperCountry: "ES",
        consigneeName: "Manhattan Avionics Corp",
        consigneeAddress: "5th Ave 100",
        consigneeCity: "New York",
        consigneeCountry: "US",
        pieces: 1,
        grossWeightKg: 250.0,
        ratePerKg: 4.5,
        natureOfGoods: "Aircraft Components",
      });

      expect(fwbResult.messageId).toBeDefined();
      expect(fwbResult.awbNumber).toBe(testAwbNumber);
      expect(fwbResult.transmissionStatus).toBe("QUEUED");

      // Verify in DB
      const dbFwb = await db
        .select()
        .from(airCargoMessages)
        .where(eq(airCargoMessages.id, fwbResult.messageId))
        .limit(1);

      expect(dbFwb.length).toBe(1);
      expect(dbFwb[0].messageType).toBe("FWB");

      // 2. Ingest Airline FSU milestone (DEP)
      const fsuTeletype = buildCargoImpFsu({
        airlinePrefix: "074",
        awbSerial7: "1234567",
        originAirport: "MAD",
        destinationAirport: "JFK",
        milestoneCode: "DEP",
        eventAirport: "MAD",
        eventDateUtc: "2026-05-25T10:15:00Z",
        pieces: 1,
        grossWeightKg: 250.0,
        flightNumber: "IB6253",
      });

      const fsuResult =
        await messagingService.ingestAirlineStatusUpdateFsu(fsuTeletype);
      expect(fsuResult.milestoneCode).toBe("DEP");
      expect(fsuResult.status).toBe("PROCESSED");

      // Verify Cargo iQ updated
      const [milestone] = await db
        .select()
        .from(cargoIqMilestones)
        .where(eq(cargoIqMilestones.awbNumber, testAwbNumber));

      expect(milestone.slaStatus).toBe("ON_TIME");
      expect(milestone.actualTime).toBeDefined();
    });

    it("posts agent DN/CN, evaluates profit share, and performs bilateral period netting", async () => {
      // 1. Post Inbound Debit Note (Agent billing local handling fee)
      const dn = await clearingService.recordAgentNote({
        noteType: "DEBIT_NOTE",
        agentCompanyId: testAgentCompanyId,
        shipmentId: testShipmentId,
        hblOrHawbNumber: "HAWB-MAD-001",
        currency: "USD",
        amount: 350.0,
        exchangeRateToEur: 0.92,
        description: "Destination deconsolidation & customs handling fee",
      });

      expect(dn.entryNumber).toBeDefined();
      expect(dn.amountEur).toBe(322.0); // 350 * 0.92
      expect(dn.clearingStatus).toBe("OPEN");

      // 2. Post Profit Share Credit Note
      const profitSplitResult =
        await clearingService.calculateAndPostProfitShare(testAgentCompanyId, {
          shipmentId: testShipmentId,
          hblOrHawbNumber: "HAWB-MAD-001",
          clientGrossRevenueEur: 3000.0,
          carrierFreightCostEur: 1800.0,
          originTerminalFeesEur: 200.0,
          destinationTerminalFeesEur: 100.0,
          splitPercentageAgent: 50.0,
        });

      expect(profitSplitResult.profitSplit.verifiedGrossProfitEur).toBe(900.0);
      expect(profitSplitResult.clearingEntry.amount).toBe(450.0); // 50% of 900
      expect(profitSplitResult.clearingEntry.clearingStatus).toBe("OPEN");

      // 3. Execute Period Netting
      const nettingResult = await clearingService.executePeriodNetting(
        testAgentCompanyId,
        "USD",
        "2026-05-01",
        "2026-05-31",
      );

      expect(nettingResult.settlementId).toBeDefined();
      expect(nettingResult.statementNumber).toContain("STM-USD-");
      expect(nettingResult.settledEntriesCount).toBeGreaterThanOrEqual(2);

      // Verify entries in database transitioned to SETTLED_NETTED
      const [settledDn] = await db
        .select()
        .from(agentClearingLedger)
        .where(eq(agentClearingLedger.id, dn.id));

      expect(settledDn.clearingStatus).toBe("SETTLED_NETTED");
      expect(settledDn.settlementId).toBe(nettingResult.settlementId);
    });
  });

  // ==========================================================================
  // SECTION 3: FASTIFY HTTP API INTEGRATION TESTS
  // ==========================================================================

  describe("7. Fastify HTTP API Integration (/api/air)", () => {
    it("POST /messaging/fwb dispatches e-AWB FWB via HTTP API", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/air/messaging/fwb",
        payload: {
          airlinePrefix: "074",
          awbSerial7: "1234567",
          originAirport: "MAD",
          destinationAirport: "JFK",
          flightNumber: "IB6253",
          flightDayMonth: "25MAY",
          shipperName: "Iberian Tech Equipment SL",
          shipperAddress: "Parque Tecnologico 12",
          shipperCity: "Madrid",
          shipperCountry: "ES",
          consigneeName: "Manhattan Avionics Corp",
          consigneeAddress: "5th Ave 100",
          consigneeCity: "New York",
          consigneeCountry: "US",
          pieces: 1,
          grossWeightKg: 250.0,
          ratePerKg: 4.5,
          natureOfGoods: "Aircraft Components",
        },
      });

      expect(res.statusCode).toBe(201);
      const json = res.json();
      expect(json.messageId).toBeDefined();
      expect(json.awbNumber).toBe(testAwbNumber);
      expect(json.transmissionStatus).toBe("QUEUED");
    });

    it("POST /messaging/fsu ingests airline milestone tracking event via HTTP API", async () => {
      const teletype = buildCargoImpFsu({
        airlinePrefix: "074",
        awbSerial7: "1234567",
        originAirport: "MAD",
        destinationAirport: "JFK",
        milestoneCode: "ARR",
        eventAirport: "JFK",
        eventDateUtc: "2026-05-25T18:45:00Z",
        pieces: 1,
        grossWeightKg: 250.0,
        flightNumber: "IB6253",
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/air/messaging/fsu",
        payload: { teletypeRaw: teletype },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.milestoneCode).toBe("ARR");
      expect(json.status).toBe("PROCESSED");
    });

    it("GET /messaging/awb/:awbNumber returns full messaging history", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/air/messaging/awb/${testAwbNumber}`,
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.awbNumber).toBe(testAwbNumber);
      expect(json.messages.length).toBeGreaterThanOrEqual(1);
    });

    it("POST /clearing/agent-notes posts an agent Debit Note via HTTP API", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/air/clearing/agent-notes",
        payload: {
          noteType: "DEBIT_NOTE",
          agentCompanyId: testAgentCompanyId,
          shipmentId: testShipmentId,
          hblOrHawbNumber: "HAWB-MAD-002",
          currency: "EUR",
          amount: 220.0,
          description: "Pallet storage fee at transit hub",
        },
      });

      expect(res.statusCode).toBe(201);
      const json = res.json();
      expect(json.entryNumber).toBeDefined();
      expect(json.amount).toBe(220.0);
      expect(json.clearingStatus).toBe("OPEN");
    });

    it("GET /clearing/agents/:agentId/balance retrieves open balance", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/air/clearing/agents/${testAgentCompanyId}/balance`,
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.agentCompanyId).toBe(testAgentCompanyId);
      expect(json.openEntriesCount).toBeGreaterThanOrEqual(1);
      expect(json.totalDebitNotesEur).toBeGreaterThan(0);
    });
  });
});
