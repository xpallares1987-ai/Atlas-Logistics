/**
 * @file customs-brokerage-cbam-compliance.test.ts
 * @description Comprehensive test suite for Customs Brokerage (DUA/MRN, 1:N grouping, zero-markup suplidos, T1 guarantees) and EU CBAM / GLEC Scope 3 compliance.
 * @module @atlas/tests/customs-brokerage-cbam-compliance
 * @see {@link docs/adr/0028-customs-brokerage-dua-mrn-disbursements-and-cbam-compliance.md}
 */

import { describe, it, expect, beforeAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { db } from "../src/db/index.js";
import {
  companies,
  addresses,
  shipments,
  customsGuarantees,
  customsClearances,
  customsClearanceShipments,
  customsDisbursements,
  cbamDeclarations,
  cbamDeclarationLines,
} from "../src/db/schema/index.js";
import {
  validateCustomsMrn,
  validateZeroMarkupDisbursement,
  prorateCustomsTaxesAcrossShipments,
  calculateT1GuaranteeRequiredDebt,
  classifyCbamCommodity,
  calculateCbamEmissions,
  generateCbamTransitionalXml,
  calculateGlecScope3Emissions,
} from "@atlas/shared";
import { CustomsClearanceService } from "../src/services/customs/customs-clearance.service.js";
import { CbamComplianceService } from "../src/services/cbam/cbam-compliance.service.js";
import customsBrokerageRoutes from "../src/routes/customs/customs-brokerage.routes.js";
import { eq } from "drizzle-orm";

describe("Customs Brokerage, DUA/MRN, Suplidos & CBAM Compliance Suite", () => {
  let app: FastifyInstance;
  const clearanceService = new CustomsClearanceService();
  const cbamService = new CbamComplianceService();

  const testImporterId = "comp-cbam-importer-01";
  const testBrokerAddressId = "addr-aeo-broker-01";
  const testGuaranteeId = "grn-aeat-transit-01";
  const testShipment1 = "sh-cbam-test-01";
  const testShipment2 = "sh-cbam-test-02";
  const testShipment3 = "sh-cbam-test-03";

  beforeAll(async () => {
    // 1. Seed Importer Company
    await db
      .insert(companies)
      .values({
        id: testImporterId,
        name: "Iberian Steel & Metals Import S.A.",
        taxId: "ESA99182736",
      })
      .onConflictDoUpdate({
        target: companies.id,
        set: { name: "Iberian Steel & Metals Import S.A." },
      });

    // 2. Seed Customs Broker Address (AEO licensed)
    await db
      .insert(addresses)
      .values({
        id: testBrokerAddressId,
        companyId: testImporterId,
        addressType: "CBA",
        companyName: "Agencia Aduanera Marítima & Brokers S.L.",
        street1: "Moll d'Adossat, Edifici Tir",
        zipCode: "08039",
        city: "Barcelona",
        country: "Spain",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: addresses.id,
        set: {
          companyName: "Agencia Aduanera Marítima & Brokers S.L.",
          updatedAt: new Date(),
        },
      });

    // 3. Seed Customs Guarantee for T1 Transit
    await db
      .insert(customsGuarantees)
      .values({
        id: testGuaranteeId,
        guaranteeReferenceNumber: "GRN-2026-AEAT-BCN-00192",
        customsOfficeCode: "ES000801",
        guarantorFinancialInstitution: "Banco Santander S.A.",
        totalGuaranteeAmountEur: 500000.0,
        committedSuspendedDebtEur: 50000.0,
        availableCreditEur: 450000.0,
        validFromDate: "2026-01-01",
        expiryDate: "2027-12-31",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: customsGuarantees.id,
        set: {
          availableCreditEur: 450000.0,
          committedSuspendedDebtEur: 50000.0,
        },
      });

    // 4. Seed Test Shipments for 1:N Grouping
    for (const [sId, sRef] of [
      [testShipment1, "HBL-BCN-2026-01"],
      [testShipment2, "HBL-BCN-2026-02"],
      [testShipment3, "HBL-BCN-2026-03"],
    ]) {
      await db
        .insert(shipments)
        .values({
          id: sId,
          trackingNumber: sRef,
          status: "IN_TRANSIT",
          companyId: testImporterId,
          weight: 10000,
        })
        .onConflictDoUpdate({
          target: shipments.id,
          set: { trackingNumber: sRef, status: "IN_TRANSIT" },
        });
    }

    // 5. Setup Fastify application
    app = Fastify();
    await app.register(customsBrokerageRoutes, {
      prefix: "/api/customs/brokerage",
    });
    await app.ready();
  });

  // ==========================================================================
  // SECTION 1: PURE DOMAIN MATH & VALIDATION TESTS
  // ==========================================================================

  describe("1. MRN (Movement Reference Number) Validation", () => {
    it("successfully validates and parses an official 18-character EU MRN", () => {
      const mrn = "26ES000801J0041289";
      const result = validateCustomsMrn(mrn);

      expect(result.isValid).toBe(true);
      expect(result.year).toBe(2026);
      expect(result.countryCode).toBe("ES");
      expect(result.customsOfficeCode).toBe("000801");
      expect(result.procedureCode).toBe("J");
      expect(result.sequence).toBe("0041289");
    });

    it("rejects invalid or malformed MRN strings", () => {
      expect(validateCustomsMrn("").isValid).toBe(false);
      expect(validateCustomsMrn("SHORT123").isValid).toBe(false);
      expect(validateCustomsMrn("26ES000801J0041289_EXTRA").isValid).toBe(
        false,
      );
      expect(validateCustomsMrn("26??000801J0041289").isValid).toBe(false);
    });
  });

  describe("2. Zero-Markup Disbursements (Suplidos) Enforcement", () => {
    it("validates zero-markup when AP incurred cost equals AR billed revenue", () => {
      const result = validateZeroMarkupDisbursement(1250.45, 1250.45);
      expect(result.isCompliant).toBe(true);
      expect(result.markupAmountEur).toBe(0.0);
    });

    it("rejects markup on disbursements and flags legal compliance error", () => {
      const result = validateZeroMarkupDisbursement(1000.0, 1150.0);
      expect(result.isCompliant).toBe(false);
      expect(result.markupAmountEur).toBe(150.0);
      expect(result.error).toContain("Zero-markup violation");
    });
  });

  describe("3. 1:N Shipment Tax Prorating", () => {
    it("prorates duty and VAT proportionally by net mass with zero cent leakage", () => {
      const allocations = [
        { shipmentId: "s1", netMassKg: 5000 }, // 50%
        { shipmentId: "s2", netMassKg: 3000 }, // 30%
        { shipmentId: "s3", netMassKg: 2000 }, // 20%
      ];
      const totalDuty = 1200.0;
      const totalVat = 2500.0;

      const results = prorateCustomsTaxesAcrossShipments(
        allocations,
        totalDuty,
        totalVat,
      );

      expect(results.length).toBe(3);
      expect(results[0].proratedDutyEur).toBe(600.0);
      expect(results[0].proratedVatEur).toBe(1250.0);
      expect(results[0].proratedTotalDisbursementEur).toBe(1850.0);

      expect(results[1].proratedDutyEur).toBe(360.0);
      expect(results[1].proratedVatEur).toBe(750.0);

      expect(results[2].proratedDutyEur).toBe(240.0);
      expect(results[2].proratedVatEur).toBe(500.0);

      // Verify exact cent parity
      const sumDuty = results.reduce((sum, r) => sum + r.proratedDutyEur, 0);
      const sumVat = results.reduce((sum, r) => sum + r.proratedVatEur, 0);
      expect(sumDuty).toBe(totalDuty);
      expect(sumVat).toBe(totalVat);
    });

    it("absorbs fractional cent rounding on the final line", () => {
      const allocations = [
        { shipmentId: "s1", netMassKg: 3333 },
        { shipmentId: "s2", netMassKg: 3333 },
        { shipmentId: "s3", netMassKg: 3334 },
      ];
      const totalDuty = 100.0;
      const totalVat = 210.0;

      const results = prorateCustomsTaxesAcrossShipments(
        allocations,
        totalDuty,
        totalVat,
      );

      const sumDuty = results.reduce((sum, r) => sum + r.proratedDutyEur, 0);
      const sumVat = results.reduce((sum, r) => sum + r.proratedVatEur, 0);
      expect(Math.round(sumDuty * 100) / 100).toBe(100.0);
      expect(Math.round(sumVat * 100) / 100).toBe(210.0);
    });
  });

  describe("4. T1 Transit Guarantee Potential Debt Math", () => {
    it("correctly estimates customs debt (duty + VAT on value+duty)", () => {
      const customsValue = 100000.0;
      const dutyRate = 6.5; // 6.5%
      const vatRate = 21.0; // 21%

      const assessment = calculateT1GuaranteeRequiredDebt(
        customsValue,
        dutyRate,
        vatRate,
      );

      expect(assessment.estimatedDutyEur).toBe(6500.0);
      expect(assessment.estimatedVatEur).toBe(22365.0); // 21% of 106,500
      expect(assessment.totalCommittedDebtEur).toBe(28865.0);
    });
  });

  describe("5. EU CBAM Classification & Embedded Emissions", () => {
    it("identifies iron and steel CN codes and returns default EU benchmarks", () => {
      const classification = classifyCbamCommodity("7208 38 00");
      expect(classification.isCovered).toBe(true);
      expect(classification.sector).toBe("IRON_STEEL");
      expect(classification.defaultDirectEmissionFactor).toBe(1.85);
      expect(classification.defaultIndirectEmissionFactor).toBe(0.35);
    });

    it("identifies unwrought aluminium CN code chapter 76", () => {
      const classification = classifyCbamCommodity("7601 10 00");
      expect(classification.isCovered).toBe(true);
      expect(classification.sector).toBe("ALUMINIUM");
      expect(classification.defaultDirectEmissionFactor).toBe(4.5);
    });

    it("calculates embedded emissions and carbon liability with foreign deduction", () => {
      const result = calculateCbamEmissions({
        cnCode: "72083800",
        netMassTonnes: 100.0,
        directEmissionFactor: 1.85,
        indirectEmissionFactor: 0.35,
        precursorTonnes: 0.0,
        euEtsBenchmarkPriceEur: 85.5,
        foreignCarbonPricePaidEur: 3000.0, // Art. 9 EU CBAM deduction
      });

      expect(result.directEmissionsTco2e).toBe(185.0);
      expect(result.indirectEmissionsTco2e).toBe(35.0);
      expect(result.totalEmbeddedEmissionsTco2e).toBe(220.0);
      expect(result.grossCarbonLiabilityEur).toBe(18810.0); // 220 * 85.50
      expect(result.foreignCarbonPricePaidEur).toBe(3000.0);
      expect(result.netCarbonLiabilityEur).toBe(15810.0); // 18810 - 3000
    });
  });

  describe("6. GLEC Framework v3 / ISO 14083 Scope 3 Engine", () => {
    it("calculates multimodal Scope 3 carbon footprint across sea, road, and rail", () => {
      const legs = [
        {
          legOrder: 1,
          origin: "Shanghai Port",
          destination: "Barcelona Port",
          mode: "OCEAN_CONTAINER" as const,
          distanceKm: 18500,
          cargoWeightTonnes: 20.0,
        },
        {
          legOrder: 2,
          origin: "Barcelona Port",
          destination: "Zaragoza Rail Terminal",
          mode: "RAIL_ELECTRIC" as const,
          distanceKm: 310,
          cargoWeightTonnes: 20.0,
        },
        {
          legOrder: 3,
          origin: "Zaragoza Rail Terminal",
          destination: "Customer Facility",
          mode: "ROAD_DIESEL" as const,
          distanceKm: 45,
          cargoWeightTonnes: 20.0,
        },
      ];

      const result = calculateGlecScope3Emissions(legs);

      expect(result.legs.length).toBe(3);
      expect(result.totalDistanceKm).toBe(18855);
      expect(result.totalTonneKm).toBe(377100);
      expect(result.totalTco2eWtw).toBeGreaterThan(4.5);
      expect(result.averageCarbonIntensityGco2ePerTkm).toBeGreaterThan(10);
    });
  });

  // ==========================================================================
  // SECTION 2: APPLICATION SERVICES & DATABASE INTEGRATION TESTS
  // ==========================================================================

  describe("7. CustomsClearanceService Full Lifecycle & T1 Guarantees", () => {
    it("creates an import clearance, reserves T1 guarantee, groups 1:N shipments, and releases Levante", async () => {
      const mrn = `26ES000801T${Date.now().toString().slice(-7)}`;

      // 1. Create T1 Bonded Clearance
      const clearance = await clearanceService.createClearance({
        mrn,
        procedureType: "TRANSIT_T1",
        customsOfficeCode: "ES000801",
        importerCompanyId: testImporterId,
        declarantAddressId: testBrokerAddressId,
        taricCode: "7208380000", // Hot-rolled steel (CBAM item)
        goodsDescription: "Hot-rolled steel coils in sheets",
        originCountryCode: "TR",
        grossMassKg: 25000,
        netMassKg: 24000,
        customsValueEur: 40000.0,
        dutyTariffRatePercent: 0.0, // TR-EU preferential
        importVatRatePercent: 21.0,
        t1GuaranteeId: testGuaranteeId,
      });

      expect(clearance.id).toBeDefined();
      expect(clearance.status).toBe("REGISTERED");
      expect(clearance.isCbamApplicable).toBe(true);
      expect(clearance.guaranteeCommittedEur).toBe(8400.0); // 21% of 40,000

      // Verify guarantee was debited in database
      const [guaranteeAfterReserve] = await db
        .select()
        .from(customsGuarantees)
        .where(eq(customsGuarantees.id, testGuaranteeId));

      expect(guaranteeAfterReserve.availableCreditEur).toBe(441600.0); // 450,000 - 8,400
      expect(guaranteeAfterReserve.committedSuspendedDebtEur).toBe(58400.0); // 50,000 + 8,400

      // 2. Allocate 1:N Shipments (Shipment 1 and Shipment 2)
      const allocationResult = await clearanceService.allocateShipments({
        clearanceId: clearance.id,
        allocations: [
          { shipmentId: testShipment1, netMassKg: 16000 }, // 66.67%
          { shipmentId: testShipment2, netMassKg: 8000 }, // 33.33%
        ],
      });

      expect(allocationResult.shipmentCount).toBe(2);
      expect(allocationResult.allocations[0].proratedVatEur).toBe(5600.0);
      expect(allocationResult.allocations[1].proratedVatEur).toBe(2800.0);
      expect(
        allocationResult.allocations[0].proratedVatEur +
          allocationResult.allocations[1].proratedVatEur,
      ).toBe(8400.0);

      // Verify zero-markup disbursements were inserted
      const disbursements = await db
        .select()
        .from(customsDisbursements)
        .where(eq(customsDisbursements.clearanceId, clearance.id));

      expect(disbursements.length).toBe(2); // 2 VAT disbursement lines
      expect(disbursements[0].incurredCostAmountEur).toBe(
        disbursements[0].billedRevenueAmountEur,
      );
      expect(disbursements[0].markupAmountEur).toBe(0.0);
      expect(disbursements[0].isZeroMarkupValidated).toBe(true);

      // 3. Assign inspection channel (GREEN)
      const routed = await clearanceService.updateRoutingChannel(
        clearance.id,
        "GREEN",
      );
      expect(routed.routingChannel).toBe("GREEN");
      expect(routed.status).toBe("ROUTED");

      // 4. Release Levante
      const released = await clearanceService.releaseLevante(clearance.id);
      expect(released.status).toBe("LEVANTE_RELEASED");
      expect(released.levanteReleasedAt).toBeDefined();

      // 5. Discharge T1 Transit at destination & restore guarantee
      const discharged = await clearanceService.dischargeT1Transit(
        clearance.id,
      );
      expect(discharged.status).toBe("DISCHARGED");
      expect(discharged.releasedGuaranteeAmountEur).toBe(8400.0);

      const [guaranteeAfterDischarge] = await db
        .select()
        .from(customsGuarantees)
        .where(eq(customsGuarantees.id, testGuaranteeId));

      expect(guaranteeAfterDischarge.availableCreditEur).toBe(450000.0); // Fully restored!
      expect(guaranteeAfterDischarge.committedSuspendedDebtEur).toBe(50000.0);
    });
  });

  describe("8. CbamComplianceService Declarations & XML Export", () => {
    it("creates a quarterly CBAM declaration with lines and exports valid transitional XML", async () => {
      const reportingPeriod = "2026-Q3";
      const declaration = await cbamService.createQuarterlyDeclaration({
        reportingPeriod,
        declarantVat: "ESA99182736",
        declarantName: "Agencia Aduanera Marítima & Brokers S.L.",
        importerVat: "ESA99182736",
        importerName: "Iberian Steel & Metals Import S.A.",
        responsibleDeclarant: "Jordi Puigdomenech (Col. 4912)",
        remarks: "Q3 2026 Regular import filing under EU Reg. 2023/956",
        items: [
          {
            shipmentId: testShipment1,
            duaNumber: "DUA-2026-ES0801-00412",
            duaBox33HsCode: "72083800",
            goodDescription: "Hot-rolled steel coils in sheets",
            originCountry: "TR",
            netWeightTonnes: 100.0,
            useDefaultFactors: true,
            directEmissionFactor: 1.85,
            indirectEmissionFactor: 0.35,
            foreignCarbonPricePerTco2e: 15.0, // €15/t paid in Türkiye
          },
          {
            shipmentId: testShipment2,
            duaNumber: "DUA-2026-ES0801-00413",
            duaBox33HsCode: "76011000",
            goodDescription: "Unwrought non-alloy aluminium ingots",
            originCountry: "IN",
            netWeightTonnes: 50.0,
            useDefaultFactors: true,
            directEmissionFactor: 4.5,
            indirectEmissionFactor: 7.2,
            foreignCarbonPricePerTco2e: 0.0,
          },
        ],
      });

      expect(declaration.id).toBeDefined();
      expect(declaration.reportingPeriod).toBe(reportingPeriod);
      expect(declaration.lines.length).toBe(2);
      expect(declaration.totalNetMassTonnes).toBe(150.0);
      expect(declaration.totalDirectEmissionsTco2e).toBe(185.0 + 225.0); // 410.0
      expect(declaration.totalIndirectEmissionsTco2e).toBe(35.0 + 360.0); // 395.0
      expect(declaration.totalEmbeddedEmissionsTco2e).toBe(805.0);

      // Verify XML export
      const xml = await cbamService.exportDeclarationXml(declaration.id);
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain(
        '<CBAMQuarterlyReport xmlns="urn:eu:taxud:cbam:v1">',
      );
      expect(xml).toContain("<DeclarationNumber>");
      expect(xml).toContain("<ReportingPeriod>2026-Q3</ReportingPeriod>");
      expect(xml).toContain("<CNCode>72083800</CNCode>");
      expect(xml).toContain("<CNCode>76011000</CNCode>");
      expect(xml).toContain(
        "<TotalEmbeddedEmissionsTco2e>805.0000</TotalEmbeddedEmissionsTco2e>",
      );
    });
  });

  // ==========================================================================
  // SECTION 3: FASTIFY HTTP API INTEGRATION TESTS
  // ==========================================================================

  describe("9. Fastify HTTP API Integration (/api/customs/brokerage)", () => {
    let createdClearanceId: string;
    let createdCbamDeclarationId: string;

    it("POST /clearances registers a new customs clearance with duty and VAT calculation", async () => {
      const mrn = `26ES000801J${Date.now().toString().slice(-7)}`;
      const res = await app.inject({
        method: "POST",
        url: "/api/customs/brokerage/clearances",
        payload: {
          mrn,
          procedureType: "IMPORT_4000",
          customsOfficeCode: "ES000801",
          importerCompanyId: testImporterId,
          declarantAddressId: testBrokerAddressId,
          taricCode: "7208380000",
          goodsDescription: "Hot-rolled steel coils",
          originCountryCode: "TR",
          grossMassKg: 15000,
          netMassKg: 14500,
          customsValueEur: 25000.0,
          dutyTariffRatePercent: 5.0,
          importVatRatePercent: 21.0,
        },
      });

      expect(res.statusCode).toBe(201);
      const json = res.json();
      expect(json.id).toBeDefined();
      expect(json.mrn).toBe(mrn);
      expect(json.assessedDutyAmountEur).toBe(1250.0); // 5% of 25,000
      expect(json.assessedVatAmountEur).toBe(5512.5); // 21% of 26,250
      expect(json.isCbamApplicable).toBe(true);
      expect(json.status).toBe("REGISTERED");

      createdClearanceId = json.id;
    });

    it("POST /clearances/:id/allocate-shipments groups 1:N shipments and generates zero-markup suplidos", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/customs/brokerage/clearances/${createdClearanceId}/allocate-shipments`,
        payload: {
          allocations: [
            { shipmentId: testShipment1, netMassKg: 8700 }, // 60%
            { shipmentId: testShipment2, netMassKg: 5800 }, // 40%
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.shipmentCount).toBe(2);
      expect(
        json.allocations[0].proratedDutyEur +
          json.allocations[1].proratedDutyEur,
      ).toBe(1250.0);
      expect(
        json.allocations[0].proratedVatEur + json.allocations[1].proratedVatEur,
      ).toBe(5512.5);
    });

    it("POST /clearances/:id/channel assigns inspection channel (GREEN)", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/customs/brokerage/clearances/${createdClearanceId}/channel`,
        payload: { channel: "GREEN" },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.routingChannel).toBe("GREEN");
      expect(json.status).toBe("ROUTED");
    });

    it("POST /clearances/:id/levante releases customs clearance", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/customs/brokerage/clearances/${createdClearanceId}/levante`,
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.status).toBe("LEVANTE_RELEASED");
      expect(json.levanteReleasedAt).toBeDefined();
    });

    it("POST /disbursements records a legal zero-markup suplido and rejects marked-up lines", async () => {
      // 1. Valid zero-markup
      const validRes = await app.inject({
        method: "POST",
        url: "/api/customs/brokerage/disbursements",
        payload: {
          clearanceId: createdClearanceId,
          shipmentId: testShipment1,
          disbursementType: "PORT_T3_TAX",
          officialVoucherNumber: "T3-PORT-BCN-2026-991",
          incurredCostAmountEur: 145.8,
          billedRevenueAmountEur: 145.8,
          apInvoiceReference: "AP-PORT-T3-001",
        },
      });

      expect(validRes.statusCode).toBe(201);
      const validJson = validRes.json();
      expect(validJson.markupAmountEur).toBe(0.0);
      expect(validJson.isZeroMarkupValidated).toBe(true);

      // 2. Prohibited markup
      const invalidRes = await app.inject({
        method: "POST",
        url: "/api/customs/brokerage/disbursements",
        payload: {
          clearanceId: createdClearanceId,
          shipmentId: testShipment1,
          disbursementType: "PORT_T3_TAX",
          officialVoucherNumber: "T3-PORT-BCN-2026-992",
          incurredCostAmountEur: 145.8,
          billedRevenueAmountEur: 200.0, // Illegal €54.20 markup
          apInvoiceReference: "AP-PORT-T3-002",
        },
      });

      expect(invalidRes.statusCode).toBe(400);
      expect(invalidRes.json().message).toContain("Zero-markup violation");
    });

    it("GET /clearances/:id returns full clearance details with shipments and disbursements", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/customs/brokerage/clearances/${createdClearanceId}`,
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.id).toBe(createdClearanceId);
      expect(json.shipments.length).toBe(2);
      expect(json.disbursements.length).toBeGreaterThanOrEqual(1);
    });

    it("POST /cbam/evaluate returns commodity classification and embedded emissions", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/customs/brokerage/cbam/evaluate",
        payload: {
          cnCode: "7208 38 00",
          netMassTonnes: 50.0,
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.classification.isCovered).toBe(true);
      expect(json.classification.sector).toBe("IRON_STEEL");
      expect(json.emissions.directEmissionsTco2e).toBe(92.5); // 50 * 1.85
      expect(json.emissions.indirectEmissionsTco2e).toBe(17.5); // 50 * 0.35
      expect(json.emissions.totalEmbeddedEmissionsTco2e).toBe(110.0);
    });

    it("POST /cbam/declarations creates quarterly declaration and GET /cbam/declarations/:id/xml exports transitional XML", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/customs/brokerage/cbam/declarations",
        payload: {
          reportingPeriod: "2026-Q4",
          declarantVat: "ESA99182736",
          declarantName: "Agencia Aduanera Marítima & Brokers S.L.",
          importerVat: "ESA99182736",
          importerName: "Iberian Steel & Metals Import S.A.",
          items: [
            {
              duaBox33HsCode: "72083800",
              goodDescription: "Steel Coils",
              originCountry: "TR",
              netWeightTonnes: 75.0,
            },
          ],
        },
      });

      expect(res.statusCode).toBe(201);
      const json = res.json();
      expect(json.id).toBeDefined();
      createdCbamDeclarationId = json.id;

      // Fetch XML
      const xmlRes = await app.inject({
        method: "GET",
        url: `/api/customs/brokerage/cbam/declarations/${createdCbamDeclarationId}/xml`,
      });

      expect(xmlRes.statusCode).toBe(200);
      expect(xmlRes.headers["content-type"]).toContain("application/xml");
      expect(xmlRes.body).toContain("<CBAMQuarterlyReport");
      expect(xmlRes.body).toContain("<CNCode>72083800</CNCode>");
    });
  });
});
