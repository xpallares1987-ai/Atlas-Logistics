import { describe, it, expect } from "vitest";
import {
  validateFmcInvoiceRequirements,
  calculateDaysBetween,
  calculateTieredDemurrageFee,
  calculateDemurrageAudit,
  generateDisputePack,
  DEMURRAGE_DISPUTE_PRESETS,
  CarrierInvoiceData,
  ClockSuspension,
} from "./demurrage-dispute.js";

describe("Demurrage & Detention Dispute Engine (@atlas/shared)", () => {
  describe("validateFmcInvoiceRequirements (46 CFR Part 541)", () => {
    it("should flag defective invoice when mandatory § 541.6 elements are missing", () => {
      const defectiveInvoice: CarrierInvoiceData = {
        invoiceNumber: "INV-TEST-001",
        invoiceDate: "2026-10-01",
        carrierName: "Ocean Carrier",
        carrierScac: "OCLU",
        billOfLading: "BOL12345",
        containerNumber: "MSKU1234567",
        chargeType: "DEMURRAGE",
        jurisdiction: "US_FMC_OSRA_2022",
        // missing pod, vesselVoyage, dischargeDate, availableDate, terminalHoursProvided, etc.
        invoicedAmount: 2500,
        currency: "USD",
      };

      const result = validateFmcInvoiceRequirements(defectiveInvoice);
      expect(result.isCompliant).toBe(false);
      expect(result.fullWaiverEligible).toBe(true);
      expect(result.complianceScore).toBeLessThan(50);
      expect(result.missingFields.length).toBeGreaterThan(0);
      expect(result.legalVerdict).toContain("INVOICE STATUTORILY DEFECTIVE");
    });

    it("should approve compliant invoice when all 13 statutory elements are provided", () => {
      const compliantInvoice: CarrierInvoiceData = {
        invoiceNumber: "INV-COMPLIANT-99",
        invoiceDate: "2026-10-01",
        carrierName: "Pacific Ocean Line",
        carrierScac: "POLU",
        billOfLading: "BOL998877",
        containerNumber: "TGHU5544332",
        chargeType: "DEMURRAGE",
        jurisdiction: "US_FMC_OSRA_2022",
        pod: "USLAX",
        vesselVoyage: "PACIFIC STAR / 102E",
        dischargeDate: "2026-09-10",
        availableDate: "2026-09-11",
        terminalHoursProvided: true,
        freeTimeStartDate: "2026-09-12",
        freeTimeEndDate: "2026-09-16",
        freeDaysGranted: 5,
        billedStartDate: "2026-09-17",
        billedEndDate: "2026-09-20",
        billedTotalDays: 4,
        billedDailyRate: 200,
        invoicedAmount: 800,
        currency: "USD",
        disputeContactEmail: "disputes@pacificline.com",
      };

      const result = validateFmcInvoiceRequirements(compliantInvoice);
      expect(result.isCompliant).toBe(true);
      expect(result.complianceScore).toBe(100);
      expect(result.missingFields).toHaveLength(0);
      expect(result.fullWaiverEligible).toBe(false);
      expect(result.legalVerdict).toContain("Invoice complies");
    });
  });

  describe("calculateDaysBetween and calculateTieredDemurrageFee", () => {
    it("should compute inclusive days between dates accurately", () => {
      const days = calculateDaysBetween("2026-10-01", "2026-10-05");
      expect(days).toBe(5); // Oct 1, 2, 3, 4, 5 = 5 days inclusive
    });

    it("should return 0 if end date precedes start date", () => {
      const days = calculateDaysBetween("2026-10-05", "2026-10-01");
      expect(days).toBe(0);
    });

    it("should calculate tiered demurrage fee across step rates", () => {
      const tiers = [
        { fromDay: 1, toDay: 3, dailyRate: 100, currency: "USD" }, // 3 days * 100 = 300
        { fromDay: 4, toDay: 6, dailyRate: 150, currency: "USD" }, // 3 days * 150 = 450
        { fromDay: 7, dailyRate: 250, currency: "USD" },           // remaining days * 250
      ];

      // 8 days: (3 * 100) + (3 * 150) + (2 * 250) = 300 + 450 + 500 = 1250
      const fee = calculateTieredDemurrageFee(8, tiers);
      expect(fee).toBe(1250);
    });
  });

  describe("calculateDemurrageAudit", () => {
    it("should grant 100% full waiver for FMC defective invoice in US jurisdiction", () => {
      const preset = DEMURRAGE_DISPUTE_PRESETS[0]; // us_west_coast_la_lb
      const audit = calculateDemurrageAudit({
        invoice: preset.invoice,
        suspensions: preset.suspensions,
        milestones: preset.milestones,
      });

      expect(audit.jurisdiction).toBe("US_FMC_OSRA_2022");
      expect(audit.auditStatus).toBe("FULL_WAIVER_JUSTIFIED");
      expect(audit.disputedWaiverAmount).toBe(3600);
      expect(audit.auditedLegalAmount).toBe(0);
      expect(audit.savingsPercentage).toBe(100);
      expect(audit.fmcCompliance.isCompliant).toBe(false);
      expect(audit.totalSuspendedDays).toBe(5);
    });

    it("should calculate partial waiver for Rotterdam European port case with strike suspension", () => {
      const preset = DEMURRAGE_DISPUTE_PRESETS[1]; // eu_rotterdam_ect
      const audit = calculateDemurrageAudit({
        invoice: preset.invoice,
        suspensions: preset.suspensions,
        milestones: preset.milestones,
      });

      expect(audit.jurisdiction).toBe("EU_PORT_STANDARD");
      expect(audit.grossCalendarDwellDays).toBeGreaterThan(0);
      expect(audit.totalSuspendedDays).toBe(4);
      expect(audit.disputedWaiverAmount).toBeGreaterThan(0);
      expect(audit.suspensionsApplied).toHaveLength(1);
    });

    it("should reconcile Spanish Puertos del Estado Can Tunis dwell with AEAT & rail pause", () => {
      const preset = DEMURRAGE_DISPUTE_PRESETS[2]; // es_barcelona_cantunis
      const audit = calculateDemurrageAudit({
        invoice: preset.invoice,
        suspensions: preset.suspensions,
        milestones: preset.milestones,
      });

      expect(audit.jurisdiction).toBe("ES_PUERTOS_ESTADO");
      expect(audit.totalSuspendedDays).toBe(4); // 3 customs + 1 rail
      expect(audit.auditedLegalBillableDays).toBeLessThan(audit.carrierBilledDays);
      expect(audit.disputedWaiverAmount).toBeGreaterThan(0);
      expect(audit.auditStatus).toBe("PARTIAL_REDUCTION_JUSTIFIED");
    });
  });

  describe("generateDisputePack", () => {
    it("should assemble a complete dispute pack dossier with legal citations and demand letter", () => {
      const preset = DEMURRAGE_DISPUTE_PRESETS[0];
      const audit = calculateDemurrageAudit({
        invoice: preset.invoice,
        suspensions: preset.suspensions,
        milestones: preset.milestones,
      });

      const pack = generateDisputePack({
        auditResult: audit,
        shipperOrConsignee: {
          companyName: "Atlas Logistics BCN",
          contactName: "Xavier Pallarès",
          email: "ops@atlaslogistics.es",
          accountReference: "ATL-BCN-012",
        },
      });

      expect(pack.dossierId).toContain("DSP-MSKU9284712");
      expect(pack.formalLetterSubject).toContain("FORMAL DISPUTE NOTICE");
      expect(pack.formalLetterBody).toContain("Maersk Line");
      expect(pack.formalLetterBody).toContain("46 CFR Part 541");
      expect(pack.formalLetterBody).toContain("APM Terminals Pier 400");
      expect(pack.evidenceAttachments).toContain("EDI_315_Milestone_Audit_MSKU9284712.json");
    });
  });
});
