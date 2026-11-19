/**
 * @file ebl-lifecycle.service.ts
 * @description Electronic Bill of Lading (eBL) cryptographic state machine and UNCITRAL MLETR title transfer orchestration.
 * @module @atlas/services/carrier/ebl-lifecycle
 * @see {@link docs/adr/0027-carrier-integrations-ocean-schedules-ebl-lifecycle.md}
 */

import {
  MletrLedgerService,
  MletrHolderRole,
  ChainVerificationResult,
} from "../mletr/mletr-ledger.service.js";
import { logger } from "../../config/logger.js";

// ============================================================================
// TYPES & CONTRACTS
// ============================================================================

export type EblLifecycleState =
  "ISSUED" | "ENDORSED" | "SURRENDERED" | "CANCELLED";

export interface IssueCarrierEblInput {
  shipmentId: string;
  documentReference: string;
  carrierCode: string; // e.g. MSCU, MAEU, HLCU
  carrierName: string;
  shipperName: string;
  consigneeName: string;
  vesselName: string;
  voyageNumber: string;
  signerName: string;
  signerTitle?: string;
  details?: string;
}

export interface EndorseCarrierEblInput {
  recordId: string;
  toParty: string;
  toRole: MletrHolderRole;
  signerName: string;
  signerTitle?: string;
  details?: string;
}

export interface SurrenderCarrierEblInput {
  recordId: string;
  carrierName: string;
  signerName: string;
  signerTitle?: string;
  details?: string;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class EblLifecycleService {
  /**
   * Issues a new negotiable Electronic Bill of Lading (eBL) under UNCITRAL MLETR.
   * Initializes Block 1 (ORIGINAL_ISSUE) in the immutable cryptographic ledger.
   */
  public static async issueCarrierEbl(input: IssueCarrierEblInput) {
    const details =
      input.details ||
      `Negotiable eBL (${input.documentReference}) issued by ${input.carrierName} (${input.carrierCode}) for voyage ${input.voyageNumber} on vessel ${input.vesselName}.`;

    const result = await MletrLedgerService.createTransferableRecord({
      shipmentId: input.shipmentId,
      registryType: "ELECTRONIC_BILL_OF_LADING",
      documentReference: input.documentReference,
      issuerName: input.carrierName,
      consigneeName: input.consigneeName,
      signerName: input.signerName,
      signerTitle: input.signerTitle || "Carrier Authorized Representative",
      details,
    });

    logger.info(
      { recordId: result.recordId, docRef: input.documentReference },
      "Issued carrier electronic Bill of Lading",
    );

    return result;
  }

  /**
   * Transfers ownership (endorses) of the eBL to a new legal holder (e.g., Bank or Consignee).
   */
  public static async endorseEbl(input: EndorseCarrierEblInput) {
    const current = await MletrLedgerService.getRecordWithLedger(
      input.recordId,
    );
    if (!current) {
      throw new Error(`eBL record '${input.recordId}' not found`);
    }

    if (
      current.record.isSurrendered ||
      current.record.status === "SURRENDERED"
    ) {
      throw new Error(
        `Cannot endorse eBL '${input.recordId}': title already surrendered for cargo delivery`,
      );
    }

    if (current.record.status === "VOIDED") {
      throw new Error(
        `Cannot endorse eBL '${input.recordId}': document is cancelled/voided`,
      );
    }

    const transferType =
      input.toRole === "BANK" ? "PLEDGE_TO_BANK" : "SPECIAL_ENDORSEMENT";

    const result = await MletrLedgerService.endorseRecord({
      recordId: input.recordId,
      toParty: input.toParty,
      toRole: input.toRole,
      transferType,
      signerName: input.signerName,
      signerTitle: input.signerTitle || "Authorized Title Holder",
      details:
        input.details ||
        `Electronic title endorsed to ${input.toParty} (${input.toRole}).`,
    });

    logger.info(
      {
        recordId: input.recordId,
        toParty: input.toParty,
        toRole: input.toRole,
      },
      "Endorsed carrier electronic Bill of Lading",
    );

    return result;
  }

  /**
   * Formally surrenders the eBL to the ocean carrier to release cargo at port of discharge.
   */
  public static async surrenderEbl(input: SurrenderCarrierEblInput) {
    const current = await MletrLedgerService.getRecordWithLedger(
      input.recordId,
    );
    if (!current) {
      throw new Error(`eBL record '${input.recordId}' not found`);
    }

    if (current.record.isSurrendered) {
      throw new Error(`eBL '${input.recordId}' is already surrendered`);
    }

    const result = await MletrLedgerService.surrenderRecord(
      input.recordId,
      input.carrierName,
      input.signerName,
      input.details ||
        `Negotiable eBL surrendered to carrier ${input.carrierName} for cargo release at POD.`,
    );

    logger.info(
      { recordId: input.recordId, carrierName: input.carrierName },
      "Surrendered carrier electronic Bill of Lading for cargo release",
    );

    return result;
  }

  /**
   * Verifies the entire cryptographic SHA-256 block ledger for tampering.
   */
  public static async verifyEblAuditChain(
    recordId: string,
  ): Promise<ChainVerificationResult> {
    return MletrLedgerService.verifyChainIntegrity(recordId);
  }

  /**
   * Retrieves full eBL record, ledger blocks, and cryptographic verification status.
   */
  public static async getEblDetails(recordId: string) {
    return MletrLedgerService.getRecordWithLedger(recordId);
  }

  /**
   * Retrieves eBL record by shipment ID.
   */
  public static async getEblByShipmentId(shipmentId: string) {
    return MletrLedgerService.findRecordByShipmentId(shipmentId);
  }
}
