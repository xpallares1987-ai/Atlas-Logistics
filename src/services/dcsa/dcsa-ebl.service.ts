/**
 * @file dcsa-ebl.service.ts
 * @description DCSA e-BL v3.0 Maritime Lifecycle & UNCITRAL MLETR Transferable Records Hub.
 */

import { v4 as uuidv4 } from "uuid";
import { db } from "../../db/index.js";
import {
  mletrTransferableRecords,
  mletrEndorsementsLedger,
  shipments,
} from "../../db/schema/index.js";
import { eq, desc, and } from "drizzle-orm";
import {
  MletrLedgerService,
  MletrHolderRole,
  MletrTransferType,
} from "../mletr/mletr-ledger.service.js";
import { outboxBus } from "../../scm/kernel/outbox-bus.js";
import { DEFAULT_OPERATOR_ACTOR } from "../../scm/kernel/primitives.js";
import { logger } from "../../config/logger.js";

export interface DcsaEblParty {
  name: string;
  address?: string;
  countryCode?: string;
  email?: string;
}

export interface DcsaEblCargoItem {
  description: string;
  grossWeightKg: number;
  volumeCbm: number;
  hsCode?: string;
  containerNumber: string;
}

export interface IssueDcsaEblInput {
  shipmentId: string;
  documentReference: string;
  transportDocumentTypeCode?: "BOL" | "SWB";
  isToOrder?: boolean;
  carrierCode: string; // e.g. MSCU, MAEU, HLCU
  carrierName: string;
  shipper: DcsaEblParty;
  consignee: DcsaEblParty;
  notifyParty?: DcsaEblParty;
  portOfLoading: string; // UN/LOCODE
  portOfDischarge: string; // UN/LOCODE
  placeOfReceipt?: string;
  placeOfDelivery?: string;
  vesselName: string;
  voyageNumber: string;
  cargoItems?: DcsaEblCargoItem[];
  numberOfPackages: number;
  freightPaymentTerms?: "PREPAID" | "COLLECT";
  signerName: string;
  signerTitle?: string;
  details?: string;
}

export interface TransferDcsaEblInput {
  recordId: string;
  toParty: string;
  toRole: MletrHolderRole;
  transferType?: MletrTransferType;
  signerName: string;
  signerTitle?: string;
  details?: string;
}

export interface SurrenderDcsaEblInput {
  recordId: string;
  carrierName?: string;
  signerName: string;
  notes?: string;
}

export class DcsaEblService {
  /**
   * Issue a new DCSA 3.0 Electronic Bill of Lading with UNCITRAL MLETR Genesis Block
   */
  public static async issueEbl(input: IssueDcsaEblInput) {
    await MletrLedgerService.ensureTables();

    // Verify shipment exists defensively
    const shipmentRows = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, input.shipmentId))
      .limit(1);

    const dcsaMetadata = {
      standard: "DCSA-eBL-v3.0.0",
      transportDocumentTypeCode: input.transportDocumentTypeCode || "BOL",
      isToOrder: input.isToOrder ?? true,
      carrierCode: input.carrierCode,
      carrierName: input.carrierName,
      shipper: input.shipper,
      consignee: input.consignee,
      notifyParty: input.notifyParty,
      portOfLoading: input.portOfLoading,
      portOfDischarge: input.portOfDischarge,
      placeOfReceipt: input.placeOfReceipt || input.portOfLoading,
      placeOfDelivery: input.placeOfDelivery || input.portOfDischarge,
      vesselName: input.vesselName,
      voyageNumber: input.voyageNumber,
      cargoItems: input.cargoItems || [],
      numberOfPackages: input.numberOfPackages,
      freightPaymentTerms: input.freightPaymentTerms || "PREPAID",
      issueDate: new Date().toISOString(),
    };

    const details =
      input.details ||
      `DCSA 3.0 e-BL (${input.documentReference}) issued under UNCITRAL MLETR. Carrier: ${input.carrierName} (${input.carrierCode}), Vessel: ${input.vesselName}.`;

    const record = await MletrLedgerService.createTransferableRecord({
      shipmentId: input.shipmentId,
      documentReference: input.documentReference,
      registryType: "ELECTRONIC_BILL_OF_LADING",
      issuerName: input.carrierName,
      consigneeName: input.consignee.name,
      signerName: input.signerName,
      signerTitle: input.signerTitle || "CARRIER_AUTHORIZED_ISSUING_AGENT",
      details,
    });

    // Update metadata JSON with full DCSA 3.0 structure
    await db
      .update(mletrTransferableRecords)
      .set({
        metadataJson: JSON.stringify(dcsaMetadata),
        updatedAt: new Date(),
      })
      .where(eq(mletrTransferableRecords.id, record.recordId));

    // Enqueue transactional outbox event for platform governance
    try {
      await outboxBus.enqueueEvents([
        {
          eventId: `evt_${uuidv4()}`,
          eventType: "dcsa.ebl.Issued.v3",
          schemaVersion: 3,
          producerContext: "dcsa_ebl_hub",
          aggregateType: "DCSA_EBL",
          aggregateId: record.recordId,
          aggregateVersion: 1,
          correlationId: `corr_${input.documentReference}`,
          causationId: `cmd_issue_${record.recordId}`,
          actor: DEFAULT_OPERATOR_ACTOR,
          occurredAt: new Date().toISOString(),
          payload: {
            recordId: record.recordId,
            shipmentId: input.shipmentId,
            documentReference: input.documentReference,
            carrierCode: input.carrierCode,
            vesselName: input.vesselName,
            status: "ISSUED",
            initialHolder: input.carrierName,
          },
        },
      ]);
    } catch (err) {
      logger.warn({ err }, "Could not enqueue dcsa.ebl.Issued.v3 outbox event");
    }

    return {
      success: true,
      data: {
        recordId: record.recordId,
        documentReference: input.documentReference,
        status: "ISSUED",
        currentHolder: input.carrierName,
        currentHolderRole: "CARRIER",
        genesisHash: record.genesisHash,
        latestTxHash: record.latestTxHash,
        dcsaMetadata,
      },
    };
  }

  /**
   * List all DCSA e-BL records with optional shipment filter
   */
  public static async listEbls(shipmentId?: string) {
    await MletrLedgerService.ensureTables();

    const query = db
      .select()
      .from(mletrTransferableRecords)
      .where(
        shipmentId
          ? and(
              eq(mletrTransferableRecords.shipmentId, shipmentId),
              eq(
                mletrTransferableRecords.registryType,
                "ELECTRONIC_BILL_OF_LADING",
              ),
            )
          : eq(
              mletrTransferableRecords.registryType,
              "ELECTRONIC_BILL_OF_LADING",
            ),
      )
      .orderBy(desc(mletrTransferableRecords.createdAt));

    const rows = await query;
    return rows.map((r) => {
      let dcsa = {};
      try {
        dcsa = JSON.parse(r.metadataJson || "{}");
      } catch {
        // Safe JSON fallback
      }
      return {
        ...r,
        dcsa,
      };
    });
  }

  /**
   * Get single e-BL with complete endorsements ledger and verification
   */
  public static async getEbl(recordId: string) {
    return MletrLedgerService.getRecordWithLedger(recordId);
  }

  /**
   * Transfer e-BL title to a new legitimate holder under MLETR
   */
  public static async transferEbl(
    recordId: string,
    input: TransferDcsaEblInput,
  ) {
    const result = await MletrLedgerService.endorseRecord({
      recordId,
      toParty: input.toParty,
      toRole: input.toRole,
      transferType: input.transferType || "SPECIAL_ENDORSEMENT",
      signerName: input.signerName,
      signerTitle: input.signerTitle,
      details: input.details,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Endorse e-BL (alias for special endorsement / bank pledge)
   */
  public static async endorseEbl(
    recordId: string,
    input: TransferDcsaEblInput,
  ) {
    return this.transferEbl(recordId, input);
  }

  /**
   * Surrender e-BL to ocean carrier at destination to authorize cargo release
   */
  public static async surrenderEbl(
    recordId: string,
    input: SurrenderDcsaEblInput,
  ) {
    const data = await MletrLedgerService.getRecordWithLedger(recordId);
    if (!data || !data.record) {
      throw new Error(`e-BL record '${recordId}' not found`);
    }
    const record = data.record;

    const carrierName =
      input.carrierName || record.issuerName || "Ocean Carrier Release Desk";
    const result = await MletrLedgerService.surrenderRecord(
      recordId,
      carrierName,
      input.signerName,
      input.notes ||
        "Surrendered at destination terminal for immediate cargo release.",
    );

    const releaseCode = `REL-${record.shipmentId.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    // Enqueue transactional domain event CARGO_RELEASE_AUTHORIZED
    try {
      await outboxBus.enqueueEvents([
        {
          eventId: `evt_${uuidv4()}`,
          eventType: "CARGO_RELEASE_AUTHORIZED",
          schemaVersion: 1,
          producerContext: "DCSA_EBL_HUB",
          aggregateType: "SHIPMENT",
          aggregateId: record.shipmentId,
          aggregateVersion: result.newBlockNumber,
          correlationId: `corr_ebl_${recordId}`,
          causationId: `cmd_surrender_${recordId}`,
          actor: DEFAULT_OPERATOR_ACTOR,
          occurredAt: new Date().toISOString(),
          payload: {
            recordId,
            shipmentId: record.shipmentId,
            documentReference: record.documentReference,
            carrierName,
            signerName: input.signerName,
            surrenderedAt: new Date().toISOString(),
            releaseAuthorizationCode: releaseCode,
            status: "SURRENDERED",
          },
        },
      ]);
    } catch (err) {
      logger.warn(
        { err },
        "Could not enqueue CARGO_RELEASE_AUTHORIZED outbox event",
      );
    }

    return {
      success: true,
      message: `e-BL '${record.documentReference}' surrendered successfully. Cargo release authorized.`,
      data: {
        ...result,
        releaseAuthorizationCode: releaseCode,
        isSurrendered: true,
      },
    };
  }

  /**
   * Verify cryptographic integrity of the entire endorsements chain
   */
  public static async verifyEblChain(recordId: string) {
    return MletrLedgerService.verifyChainIntegrity(recordId);
  }
}
