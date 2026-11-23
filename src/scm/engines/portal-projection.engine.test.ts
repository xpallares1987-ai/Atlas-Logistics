/**
 * @file portal-projection.engine.test.ts
 * @description Unit tests for Zero-Trust B2B Customer & Vendor Portal CQRS Projection Engine (ADR 0035).
 */

import { describe, it, expect } from "vitest";
import {
  maskLineItems,
  maskMilestones,
  maskExceptions,
  generateMagicToken,
  verifyMagicToken,
  hashToken,
  buildPortalPoProjection,
} from "./portal-projection.engine.js";

describe("PortalProjectionEngine (ADR 0035)", () => {
  describe("maskLineItems", () => {
    it("should strictly strip unit prices, currencies, and internal cost margins", () => {
      const raw = [
        {
          id: "item_01",
          skuCode: "SKU-SOLAR-PANEL",
          description: "High-efficiency monocrystalline solar module 450W",
          quantity: "500",
          allocatedQuantity: "250",
          remainingQuantity: "250",
          isFullyAllocated: false,
          uom: "PCS",
          hsCode: "8541.40",
          // Sensitive internal financial fields:
          originalUnitPrice: "128.50",
          originalCurrency: "USD",
          carrierBuyRate: "95.00",
          forwarderMarginPct: "26.0",
          internalNotes: "Confidential wholesale manufacturer agreement",
        },
      ];

      const masked = maskLineItems(raw);
      expect(masked).toHaveLength(1);
      const m = masked[0];
      expect(m.skuCode).toBe("SKU-SOLAR-PANEL");
      expect(m.quantity).toBe("500");
      expect(m.allocatedQuantity).toBe("250");
      expect(m.remainingQuantity).toBe("250");

      // Verify that sensitive fields are completely absent
      const obj = m as unknown as Record<string, unknown>;
      expect(obj.originalUnitPrice).toBeUndefined();
      expect(obj.originalCurrency).toBeUndefined();
      expect(obj.carrierBuyRate).toBeUndefined();
      expect(obj.forwarderMarginPct).toBeUndefined();
      expect(obj.internalNotes).toBeUndefined();
    });
  });

  describe("maskMilestones", () => {
    it("should normalize and preserve factory milestone status and notes", () => {
      const raw = [
        {
          milestoneCode: "QC_PASSED",
          milestoneCategory: "SUPPLIER_PRODUCTION",
          status: "ACTUAL",
          actualDate: "2026-11-20T10:00:00Z",
          delayHours: 0,
          notes: "AQL 1.5 certified inspection batch pass",
        },
      ];

      const masked = maskMilestones(raw);
      expect(masked).toHaveLength(1);
      expect(masked[0].milestoneCode).toBe("QC_PASSED");
      expect(masked[0].status).toBe("ACTUAL");
      expect(masked[0].actualTimestamp).toBe("2026-11-20T10:00:00Z");
      expect(masked[0].notes).toBe("AQL 1.5 certified inspection batch pass");
    });
  });

  describe("maskExceptions", () => {
    it("should strip internal financial liability amounts while keeping operational alerts", () => {
      const raw = [
        {
          id: "exc_01",
          exceptionCode: "EXC_CRD_AFTER_CUTOFF",
          exceptionCategory: "CRD_CUTOFF_BREACH",
          severity: "HIGH",
          status: "OPEN",
          title: "Cargo Ready Date Exceeds Cut-off",
          description: "Production delay puts ocean vessel cutoff at risk",
          delayEstimateHours: 48,
          // Sensitive financial damage calculations:
          financialRiskAmount: "12500.00",
          financialRiskCurrency: "USD",
          aiAnalysis: { potentialClaimLiability: "$12,500 penalties" },
        },
      ];

      const masked = maskExceptions(raw);
      expect(masked).toHaveLength(1);
      const m = masked[0];
      expect(m.exceptionCode).toBe("EXC_CRD_AFTER_CUTOFF");
      expect(m.severity).toBe("HIGH");
      expect(m.delayEstimateHours).toBe(48);

      const obj = m as unknown as Record<string, unknown>;
      expect(obj.financialRiskAmount).toBeUndefined();
      expect(obj.financialRiskCurrency).toBeUndefined();
      expect(obj.aiAnalysis).toBeUndefined();
    });
  });

  describe("Magic Access Token Lifecycle", () => {
    it("should generate and verify high-entropy tokens using constant-time hashing", () => {
      const tokenObj = generateMagicToken(
        "po_999",
        "COMP_SUPPLIER_01",
        "VENDOR",
        24,
      );
      expect(tokenObj.rawToken).toMatch(/^atk_vendor_[a-f0-9]{64}$/);
      expect(tokenObj.tokenHash).toHaveLength(64);
      expect(tokenObj.tokenHash).toBe(hashToken(tokenObj.rawToken));

      // Successful verification
      const isValid = verifyMagicToken(
        tokenObj.rawToken,
        tokenObj.tokenHash,
        tokenObj.expiresAt,
        false,
      );
      expect(isValid).toBe(true);

      // Tampered token rejection
      const tampered = `${tokenObj.rawToken}x`;
      expect(
        verifyMagicToken(
          tampered,
          tokenObj.tokenHash,
          tokenObj.expiresAt,
          false,
        ),
      ).toBe(false);

      // Expired token rejection
      const expiredAt = Math.floor(Date.now() / 1000) - 100;
      expect(
        verifyMagicToken(
          tokenObj.rawToken,
          tokenObj.tokenHash,
          expiredAt,
          false,
        ),
      ).toBe(false);

      // Revoked token rejection
      expect(
        verifyMagicToken(
          tokenObj.rawToken,
          tokenObj.tokenHash,
          tokenObj.expiresAt,
          true,
        ),
      ).toBe(false);
    });
  });

  describe("buildPortalPoProjection", () => {
    it("should compile a complete, sanitized CQRS projection row for a supplier", () => {
      const poHeader = {
        id: "po_12345",
        supplierId: "SUPPLIER_ACME_01",
        buyerId: "BUYER_GLOBAL_CORP",
        poNumber: "PO-2026-999",
        buyerName: "Global Imports Ltd",
        supplierName: "Acme Manufacturing Co",
        incoterm: "FOB",
        expectedCargoReadyDate: "2026-11-28",
        status: "ISSUED",
      };

      const lineItems = [
        {
          skuCode: "SKU-001",
          description: "Widget A",
          quantity: "1000",
          allocatedQuantity: "0",
          uom: "PCS",
          originalUnitPrice: "45.00",
        },
      ];

      const projection = buildPortalPoProjection(poHeader, lineItems, [], []);

      expect(projection.id).toBe("proj_po_po_12345");
      expect(projection.vendorCompanyId).toBe("SUPPLIER_ACME_01");
      expect(projection.buyerCompanyId).toBe("BUYER_GLOBAL_CORP");
      expect(projection.poNumber).toBe("PO-2026-999");
      expect(projection.supplierConfirmationStatus).toBe("PENDING");

      // Verify line items in projection are sanitized
      const lines = projection.lineItemsSummaryJson as Array<
        Record<string, unknown>
      >;
      expect(lines).toHaveLength(1);
      expect(lines[0].skuCode).toBe("SKU-001");
      expect(lines[0].originalUnitPrice).toBeUndefined();
    });
  });
});
