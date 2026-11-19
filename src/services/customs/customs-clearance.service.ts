/**
 * @file customs-clearance.service.ts
 * @description Application service for Customs Brokerage (DUA/MRN), 1:N shipment grouping, zero-markup disbursements (suplidos), and T1 transit guarantees.
 * @module @atlas/services/customs/customs-clearance
 * @see {@link docs/adr/0028-customs-brokerage-dua-mrn-disbursements-and-cbam-compliance.md}
 */

import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  customsClearances,
  customsClearanceShipments,
  customsDisbursements,
  customsGuarantees,
  shipments,
} from "../../db/schema/index.js";
import {
  validateCustomsMrn,
  classifyCbamCommodity,
  prorateCustomsTaxesAcrossShipments,
  validateZeroMarkupDisbursement,
  calculateT1GuaranteeRequiredDebt,
  type ShipmentAllocationItem,
} from "@atlas/shared";
import crypto from "node:crypto";

export interface CreateClearanceDto {
  clearanceNumber?: string;
  mrn: string;
  procedureType: "IMPORT_4000" | "IMPORT_7100" | "EXPORT_1000" | "TRANSIT_T1";
  customsOfficeCode: string;
  importerCompanyId: string;
  declarantAddressId: string;
  taricCode: string;
  goodsDescription: string;
  originCountryCode: string;
  grossMassKg: number;
  netMassKg: number;
  customsValueEur: number;
  dutyTariffRatePercent?: number;
  importVatRatePercent?: number;
  t1GuaranteeId?: string;
  ocrStagingReference?: string;
  tenantId?: string;
}

export interface AllocateShipmentsDto {
  clearanceId: string;
  allocations: ShipmentAllocationItem[];
  apInvoiceReference?: string;
  officialVoucherNumber?: string;
}

export interface RecordDisbursementDto {
  clearanceId: string;
  shipmentId: string;
  disbursementType:
    | "IMPORT_DUTY"
    | "IMPORT_VAT"
    | "PORT_T3_TAX"
    | "HEALTH_SOIVRE_INSPECTION_FEE";
  officialVoucherNumber: string;
  incurredCostAmountEur: number;
  billedRevenueAmountEur: number;
  apInvoiceReference: string;
  arInvoiceId?: string;
  tenantId?: string;
}

export class CustomsClearanceService {
  /**
   * Registers a new customs declaration (DUA / MRN), calculates duties and taxes,
   * flags CBAM applicability, and reserves bonded transit guarantee limits if T1.
   */
  async createClearance(dto: CreateClearanceDto) {
    // 1. Validate MRN structure
    const mrnValidation = validateCustomsMrn(dto.mrn);
    if (!mrnValidation.isValid) {
      throw new Error(`Invalid Customs MRN: ${mrnValidation.error}`);
    }

    // 2. Classify CBAM applicability
    const cbamClassification = classifyCbamCommodity(dto.taricCode);
    const isCbamApplicable = cbamClassification.isCovered;

    // 3. Calculate assessed duties and taxes
    const dutyRate = dto.dutyTariffRatePercent ?? 0.0;
    const vatRate = dto.importVatRatePercent ?? 21.0;
    const customsValue = Math.max(0, dto.customsValueEur);

    const assessedDuty =
      Math.round(customsValue * (dutyRate / 100) * 100) / 100;
    const assessedVat =
      Math.round((customsValue + assessedDuty) * (vatRate / 100) * 100) / 100;
    const totalDisbursement =
      Math.round((assessedDuty + assessedVat) * 100) / 100;

    // 4. Handle T1 Bonded Transit Guarantee Reservation
    let guaranteeCommittedEur = 0.0;
    if (dto.procedureType === "TRANSIT_T1") {
      if (!dto.t1GuaranteeId) {
        throw new Error(
          "Bonded transit procedure TRANSIT_T1 requires a valid t1GuaranteeId",
        );
      }

      const debtAssessment = calculateT1GuaranteeRequiredDebt(
        customsValue,
        dutyRate,
        vatRate,
      );
      guaranteeCommittedEur = debtAssessment.totalCommittedDebtEur;

      const guaranteeRecords = await db
        .select()
        .from(customsGuarantees)
        .where(eq(customsGuarantees.id, dto.t1GuaranteeId))
        .limit(1);

      if (guaranteeRecords.length === 0) {
        throw new Error(
          `Customs Guarantee with id '${dto.t1GuaranteeId}' not found`,
        );
      }

      const guarantee = guaranteeRecords[0];
      if (guarantee.availableCreditEur < guaranteeCommittedEur) {
        throw new Error(
          `Insufficient customs guarantee credit on '${guarantee.guaranteeReferenceNumber}'. Required: €${guaranteeCommittedEur.toFixed(2)}, Available: €${guarantee.availableCreditEur.toFixed(2)}`,
        );
      }

      // Reserve guarantee balance
      const newCommittedDebt =
        Math.round(
          (guarantee.committedSuspendedDebtEur + guaranteeCommittedEur) * 100,
        ) / 100;
      const newAvailableCredit =
        Math.round(
          (guarantee.availableCreditEur - guaranteeCommittedEur) * 100,
        ) / 100;

      await db
        .update(customsGuarantees)
        .set({
          committedSuspendedDebtEur: newCommittedDebt,
          availableCreditEur: newAvailableCredit,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(customsGuarantees.id, dto.t1GuaranteeId));
    }

    const clearanceId = `clr_${crypto.randomUUID()}`;
    const clearanceNumber =
      dto.clearanceNumber ||
      `DUA-${new Date().getFullYear()}-${dto.customsOfficeCode}-${Date.now().toString().slice(-6)}`;

    const newClearance = {
      id: clearanceId,
      clearanceNumber,
      mrn: dto.mrn.trim().toUpperCase(),
      procedureType: dto.procedureType,
      customsOfficeCode: dto.customsOfficeCode,
      importerCompanyId: dto.importerCompanyId,
      declarantAddressId: dto.declarantAddressId,
      taricCode: dto.taricCode,
      goodsDescription: dto.goodsDescription,
      originCountryCode: dto.originCountryCode.toUpperCase(),
      grossMassKg: dto.grossMassKg,
      netMassKg: dto.netMassKg,
      customsValueEur: customsValue,
      dutyTariffRatePercent: dutyRate,
      assessedDutyAmountEur: assessedDuty,
      importVatRatePercent: vatRate,
      assessedVatAmountEur: assessedVat,
      totalDisbursementEur: totalDisbursement,
      routingChannel: "PENDING" as const,
      status: "REGISTERED" as const,
      t1GuaranteeId: dto.t1GuaranteeId || null,
      guaranteeCommittedEur,
      isCbamApplicable,
      ocrStagingReference: dto.ocrStagingReference || null,
      tenantId: dto.tenantId || "tenant-default",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(customsClearances).values(newClearance);
    return newClearance;
  }

  /**
   * Groups 1:N shipments under a single customs declaration and prorates taxes by net mass.
   * Enforces zero markup when recording corresponding disbursement entries (suplidos).
   */
  async allocateShipments(dto: AllocateShipmentsDto) {
    const clearanceList = await db
      .select()
      .from(customsClearances)
      .where(eq(customsClearances.id, dto.clearanceId))
      .limit(1);

    if (clearanceList.length === 0) {
      throw new Error(`Customs Clearance '${dto.clearanceId}' not found`);
    }

    const clearance = clearanceList[0];
    const allocations = prorateCustomsTaxesAcrossShipments(
      dto.allocations,
      clearance.assessedDutyAmountEur,
      clearance.assessedVatAmountEur,
    );

    const voucherNumber =
      dto.officialVoucherNumber || `031-${clearance.mrn.slice(0, 14)}`;
    const apInvoiceRef =
      dto.apInvoiceReference || `AP-AEAT-${clearance.clearanceNumber}`;

    const createdJunctions = [];
    const createdDisbursements = [];

    for (const alloc of allocations) {
      const junctionId = `cls_${crypto.randomUUID()}`;
      const junctionRecord = {
        id: junctionId,
        clearanceId: clearance.id,
        shipmentId: alloc.shipmentId,
        allocatedNetMassKg: alloc.allocatedNetMassKg,
        proratedDutyEur: alloc.proratedDutyEur,
        proratedVatEur: alloc.proratedVatEur,
        proratedDisbursementEur: alloc.proratedTotalDisbursementEur,
        allocatedAt: new Date().toISOString(),
      };

      await db.insert(customsClearanceShipments).values(junctionRecord);
      createdJunctions.push(junctionRecord);

      // Record DUTY disbursement (zero-markup)
      if (alloc.proratedDutyEur > 0) {
        const dutyDisbursement = {
          id: `dsb_${crypto.randomUUID()}`,
          clearanceId: clearance.id,
          shipmentId: alloc.shipmentId,
          disbursementType: "IMPORT_DUTY" as const,
          officialVoucherNumber: voucherNumber,
          incurredCostAmountEur: alloc.proratedDutyEur,
          billedRevenueAmountEur: alloc.proratedDutyEur, // 1:1 Zero Markup
          markupAmountEur: 0.0,
          isZeroMarkupValidated: true,
          apInvoiceReference: apInvoiceRef,
          tenantId: clearance.tenantId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await db.insert(customsDisbursements).values(dutyDisbursement);
        createdDisbursements.push(dutyDisbursement);
      }

      // Record VAT disbursement (zero-markup)
      if (alloc.proratedVatEur > 0) {
        const vatDisbursement = {
          id: `dsb_${crypto.randomUUID()}`,
          clearanceId: clearance.id,
          shipmentId: alloc.shipmentId,
          disbursementType: "IMPORT_VAT" as const,
          officialVoucherNumber: voucherNumber,
          incurredCostAmountEur: alloc.proratedVatEur,
          billedRevenueAmountEur: alloc.proratedVatEur, // 1:1 Zero Markup
          markupAmountEur: 0.0,
          isZeroMarkupValidated: true,
          apInvoiceReference: apInvoiceRef,
          tenantId: clearance.tenantId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await db.insert(customsDisbursements).values(vatDisbursement);
        createdDisbursements.push(vatDisbursement);
      }
    }

    return {
      clearanceId: clearance.id,
      shipmentCount: dto.allocations.length,
      allocations,
      createdDisbursements,
    };
  }

  /**
   * Updates customs routing channel (GREEN, ORANGE, RED) assigned by the Customs Authority.
   */
  async updateRoutingChannel(
    clearanceId: string,
    channel: "GREEN" | "ORANGE" | "RED",
  ) {
    const list = await db
      .select()
      .from(customsClearances)
      .where(eq(customsClearances.id, clearanceId))
      .limit(1);

    if (list.length === 0) {
      throw new Error(`Customs Clearance '${clearanceId}' not found`);
    }

    await db
      .update(customsClearances)
      .set({
        routingChannel: channel,
        status: "ROUTED",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(customsClearances.id, clearanceId));

    return { clearanceId, routingChannel: channel, status: "ROUTED" };
  }

  /**
   * Grants Customs Release (Levante Aduanero), clearing cargo for release and delivery.
   */
  async releaseLevante(clearanceId: string) {
    const list = await db
      .select()
      .from(customsClearances)
      .where(eq(customsClearances.id, clearanceId))
      .limit(1);

    if (list.length === 0) {
      throw new Error(`Customs Clearance '${clearanceId}' not found`);
    }

    const clearance = list[0];
    const now = new Date().toISOString();

    await db
      .update(customsClearances)
      .set({
        status: "LEVANTE_RELEASED",
        levanteReleasedAt: now,
        updatedAt: now,
      })
      .where(eq(customsClearances.id, clearanceId));

    return {
      clearanceId,
      status: "LEVANTE_RELEASED",
      levanteReleasedAt: now,
    };
  }

  /**
   * Formally discharges a T1 bonded transit declaration at the destination customs office,
   * releasing the consumed bank guarantee credit back to the active balance.
   */
  async dischargeT1Transit(clearanceId: string) {
    const list = await db
      .select()
      .from(customsClearances)
      .where(eq(customsClearances.id, clearanceId))
      .limit(1);

    if (list.length === 0) {
      throw new Error(`Customs Clearance '${clearanceId}' not found`);
    }

    const clearance = list[0];
    if (clearance.procedureType !== "TRANSIT_T1") {
      throw new Error(
        `Clearance '${clearance.clearanceNumber}' is not a T1 transit procedure (procedureType: ${clearance.procedureType})`,
      );
    }

    if (!clearance.t1GuaranteeId) {
      throw new Error("No linked T1 guarantee found on clearance record");
    }

    const guaranteeRecords = await db
      .select()
      .from(customsGuarantees)
      .where(eq(customsGuarantees.id, clearance.t1GuaranteeId))
      .limit(1);

    if (guaranteeRecords.length > 0) {
      const guarantee = guaranteeRecords[0];
      const releasedCredit = clearance.guaranteeCommittedEur;

      const newCommittedDebt = Math.max(
        0,
        Math.round(
          (guarantee.committedSuspendedDebtEur - releasedCredit) * 100,
        ) / 100,
      );
      const newAvailableCredit =
        Math.round((guarantee.availableCreditEur + releasedCredit) * 100) / 100;

      await db
        .update(customsGuarantees)
        .set({
          committedSuspendedDebtEur: newCommittedDebt,
          availableCreditEur: newAvailableCredit,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(customsGuarantees.id, clearance.t1GuaranteeId));
    }

    await db
      .update(customsClearances)
      .set({
        status: "DISCHARGED",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(customsClearances.id, clearanceId));

    return {
      clearanceId,
      status: "DISCHARGED",
      releasedGuaranteeAmountEur: clearance.guaranteeCommittedEur,
    };
  }

  /**
   * Records an explicit zero-markup disbursement line (suplido) with strict legal verification.
   */
  async recordDisbursement(dto: RecordDisbursementDto) {
    // Zero-markup check
    const check = validateZeroMarkupDisbursement(
      dto.incurredCostAmountEur,
      dto.billedRevenueAmountEur,
    );

    if (!check.isCompliant) {
      throw new Error(check.error);
    }

    const id = `dsb_${crypto.randomUUID()}`;
    const record = {
      id,
      clearanceId: dto.clearanceId,
      shipmentId: dto.shipmentId,
      disbursementType: dto.disbursementType,
      officialVoucherNumber: dto.officialVoucherNumber,
      incurredCostAmountEur: check.incurredCostAmountEur,
      billedRevenueAmountEur: check.billedRevenueAmountEur,
      markupAmountEur: 0.0,
      isZeroMarkupValidated: true,
      apInvoiceReference: dto.apInvoiceReference,
      arInvoiceId: dto.arInvoiceId || null,
      isReconciled: false,
      tenantId: dto.tenantId || "tenant-default",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(customsDisbursements).values(record);
    return record;
  }

  /**
   * Retrieves full details of a clearance including 1:N grouped shipments and itemized disbursements.
   */
  async getClearanceById(clearanceId: string) {
    const list = await db
      .select()
      .from(customsClearances)
      .where(eq(customsClearances.id, clearanceId))
      .limit(1);

    if (list.length === 0) {
      return null;
    }

    const clearance = list[0];
    const groupedShipments = await db
      .select()
      .from(customsClearanceShipments)
      .where(eq(customsClearanceShipments.clearanceId, clearanceId));

    const disbursements = await db
      .select()
      .from(customsDisbursements)
      .where(eq(customsDisbursements.clearanceId, clearanceId));

    return {
      ...clearance,
      shipments: groupedShipments,
      disbursements,
    };
  }
}
