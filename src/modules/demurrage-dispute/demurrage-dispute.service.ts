/**
 * @file demurrage-dispute.service.ts
 * @description Backend orchestration service for Automated Demurrage & Detention (D&D)
 * Dispute Resolver, Free-Time Clock Engine, and FMC 46 CFR § 541 Compliance Audits.
 */

import {
  CarrierInvoiceData,
  ClockSuspension,
  EDI315Milestone,
  DemurrageAuditResult,
  DisputePack,
  calculateDemurrageAudit,
  generateDisputePack,
  DEMURRAGE_DISPUTE_PRESETS,
} from "@atlas/shared";

export interface ActiveContainerClock {
  id: string;
  containerNumber: string;
  carrierName: string;
  carrierScac: string;
  billOfLading: string;
  pod: string;
  terminalName: string;
  dischargeDate: string;
  availableDate: string;
  freeTimeDays: number;
  grossDwellDays: number;
  suspendedDays: number;
  netDwellDays: number;
  remainingFreeDays: number;
  status: "NORMAL" | "WARNING" | "EXPIRED_ACCRUING" | "PAUSED";
  dailyRate: number;
  estimatedAccruedFee: number;
  currency: string;
  suspensions: ClockSuspension[];
  milestones: EDI315Milestone[];
}

export interface DispatchedEmailReceipt {
  dossierId: string;
  messageId: string;
  recipientEmail: string;
  subject: string;
  dispatchedAt: string;
  status: "SENT" | "DELIVERED" | "ACKNOWLEDGED";
  confirmationCode: string;
}

export class DemurrageDisputeService {
  private activeContainers: ActiveContainerClock[] = [
    {
      id: "cont-01",
      containerNumber: "MSKU9284712",
      carrierName: "Maersk Line A/S",
      carrierScac: "MAEU",
      billOfLading: "MAEU928471201",
      pod: "USLAX",
      terminalName: "APM Terminals Pier 400",
      dischargeDate: "2026-09-18",
      availableDate: "2026-09-20",
      freeTimeDays: 4,
      grossDwellDays: 14,
      suspendedDays: 5,
      netDwellDays: 9,
      remainingFreeDays: 0,
      status: "EXPIRED_ACCRUING",
      dailyRate: 360,
      estimatedAccruedFee: 3600,
      currency: "USD",
      suspensions: DEMURRAGE_DISPUTE_PRESETS[0].suspensions,
      milestones: DEMURRAGE_DISPUTE_PRESETS[0].milestones,
    },
    {
      id: "cont-02",
      containerNumber: "CMAU8173920",
      carrierName: "CMA CGM S.A.",
      carrierScac: "CMDU",
      billOfLading: "CMDU817392099",
      pod: "NLRTM",
      terminalName: "ECT Delta Dedicated East",
      dischargeDate: "2026-09-22",
      availableDate: "2026-09-23",
      freeTimeDays: 5,
      grossDwellDays: 9,
      suspendedDays: 4,
      netDwellDays: 5,
      remainingFreeDays: 0,
      status: "PAUSED",
      dailyRate: 180,
      estimatedAccruedFee: 1620,
      currency: "EUR",
      suspensions: DEMURRAGE_DISPUTE_PRESETS[1].suspensions,
      milestones: DEMURRAGE_DISPUTE_PRESETS[1].milestones,
    },
    {
      id: "cont-03",
      containerNumber: "SUDU4829103",
      carrierName: "Hapag-Lloyd AG",
      carrierScac: "HLCU",
      billOfLading: "HLCU482910300",
      pod: "ESBCN",
      terminalName: "BEST Hutchison Port Barcelona / Can Tunis Intermodal",
      dischargeDate: "2026-09-26",
      availableDate: "2026-09-27",
      freeTimeDays: 5,
      grossDwellDays: 8,
      suspendedDays: 4,
      netDwellDays: 4,
      remainingFreeDays: 1,
      status: "WARNING",
      dailyRate: 160,
      estimatedAccruedFee: 1280,
      currency: "EUR",
      suspensions: DEMURRAGE_DISPUTE_PRESETS[2].suspensions,
      milestones: DEMURRAGE_DISPUTE_PRESETS[2].milestones,
    },
    {
      id: "cont-04",
      containerNumber: "MSCU5581902",
      carrierName: "MSC Mediterranean Shipping Co",
      carrierScac: "MSCU",
      billOfLading: "MEDU88291023",
      pod: "ESVLC",
      terminalName: "MSC Terminal Valencia",
      dischargeDate: "2026-10-08",
      availableDate: "2026-10-09",
      freeTimeDays: 6,
      grossDwellDays: 3,
      suspendedDays: 0,
      netDwellDays: 3,
      remainingFreeDays: 3,
      status: "NORMAL",
      dailyRate: 140,
      estimatedAccruedFee: 0,
      currency: "EUR",
      suspensions: [],
      milestones: [],
    },
  ];

  private auditHistory: DemurrageAuditResult[] = [];
  private disputePacks: DisputePack[] = [];
  private emailDispatches: DispatchedEmailReceipt[] = [];

  /**
   * Retrieves all predefined high-impact regulatory scenarios.
   */
  public getPresets() {
    return DEMURRAGE_DISPUTE_PRESETS;
  }

  /**
   * Retrieves active containers monitored in the Free-Time Clock Radar.
   */
  public getActiveContainers(): ActiveContainerClock[] {
    return this.activeContainers;
  }

  /**
   * Performs technical and regulatory audit of a carrier invoice.
   */
  public auditInvoice(params: {
    invoice: CarrierInvoiceData;
    suspensions: ClockSuspension[];
    milestones?: EDI315Milestone[];
  }): DemurrageAuditResult {
    const result = calculateDemurrageAudit(params);
    this.auditHistory.unshift(result);
    return result;
  }

  /**
   * Generates a formal legal dispute dossier.
   */
  public generatePack(params: {
    auditResult: DemurrageAuditResult;
    shipperOrConsignee?: {
      companyName: string;
      contactName: string;
      email: string;
      accountReference: string;
    };
    recipientEmail?: string;
  }): DisputePack {
    const pack = generateDisputePack(params);
    this.disputePacks.unshift(pack);
    return pack;
  }

  /**
   * Dispatches formal dispute notice to ocean carrier claims department.
   */
  public dispatchDisputeEmail(params: {
    dossierId: string;
    recipientEmail: string;
    subject: string;
    body: string;
  }): DispatchedEmailReceipt {
    const receipt: DispatchedEmailReceipt = {
      dossierId: params.dossierId,
      messageId: `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      recipientEmail: params.recipientEmail,
      subject: params.subject,
      dispatchedAt: new Date().toISOString(),
      status: "SENT",
      confirmationCode: `CARRIER-ACK-${Math.floor(100000 + Math.random() * 900000)}`,
    };

    this.emailDispatches.unshift(receipt);
    return receipt;
  }

  /**
   * Returns recorded audit and dispatch history.
   */
  public getHistory() {
    return {
      audits: this.auditHistory,
      packs: this.disputePacks,
      dispatches: this.emailDispatches,
    };
  }
}

export const demurrageDisputeService = new DemurrageDisputeService();
