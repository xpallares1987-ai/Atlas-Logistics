/**
 * @file cbam-certificate.service.ts
 * @description Service for managing CBAM electronic certificates (inventory, FIFO consumption, ISO 20022 settlement payments, and cryptographically verified surrender under EU Reg. 2023/956 Art. 8 & 22).
 * @module @atlas/api/modules/cbam/services/cbam-certificate
 * @see {@link docs/adr/0042-maritime-decarbonization-and-cbam-financial-ledger.md}
 */

import crypto from "node:crypto";
import { db } from "../../db/index.js";
import {
  cbamCertificateInventory,
  cbamCertificateSurrenders,
  cbamDeclarations,
  type CbamSurrenderLotAllocation,
} from "../../db/schema/cbam.js";
import { eq, and, asc, sql } from "drizzle-orm";
import { escapeXml } from "../../scm/engines/swift-iso20022.engine.js";

export interface PurchaseCertificateLotInput {
  lotReference: string;
  purchaseDate: string; // ISO date YYYY-MM-DD
  ncaRegistryAccountId: string; // e.g. "ES-CBAM-ACC-88319"
  quantityPurchased: number; // integer (1 cert = 1 tCO2e)
  unitPriceEur: number;
  paymentReference?: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
}

export interface InventorySummary {
  totalPurchased: number;
  totalSurrendered: number;
  totalAvailable: number;
  totalValuationEur: number;
  activeLotsCount: number;
}

export interface SurrenderCertificatesInput {
  declarationId: string;
  verifierName: string;
  verifierAccreditationNumber: string; // e.g. "ENAC-045/V-012"
  verificationReportId: string;
  surrenderDate?: string;
  tenantId?: string;
}

export interface CbamPaymentOrderInput {
  lotId: string;
  debtorName: string;
  debtorIban: string;
  debtorBic: string;
  creditorNcaName?: string;
  creditorNcaIban?: string;
  creditorNcaBic?: string;
}

export interface CbamSurrenderPaymentOrderInput {
  surrenderId: string;
  debtorName: string;
  debtorIban: string;
  debtorBic: string;
  creditorNcaName?: string;
  creditorNcaIban?: string;
  creditorNcaBic?: string;
}

export interface SurrenderResult {
  surrenderReference: string;
  declarationId: string;
  declarationNumber: string;
  reportingPeriod: string;
  totalCertificatesSurrendered: number;
  totalCostEur: number;
  verifierName: string;
  verifierAccreditationNumber: string;
  verificationReportId: string;
  surrenderPayloadHashSha256: string;
  surrenderLots: CbamSurrenderLotAllocation[];
  surrenderDate: string;
}

export interface CbamPaymentOrderInput {
  lotId: string;
  debtorName: string;
  debtorIban: string;
  debtorBic: string;
  creditorNcaName?: string;
  creditorNcaIban?: string;
  creditorNcaBic?: string;
}

export class CbamCertificateService {
  /**
   * Registers a new batch of purchased electronic CBAM certificates in the holding inventory.
   */
  public static async purchaseLot(
    input: PurchaseCertificateLotInput,
  ): Promise<typeof cbamCertificateInventory.$inferSelect> {
    const tenantId = input.tenantId ?? "tenant-default";
    const quantity = Math.floor(Math.max(1, input.quantityPurchased));
    const unitPriceEur = Number(Math.max(0.01, input.unitPriceEur).toFixed(2));
    const totalCostEur = Number((quantity * unitPriceEur).toFixed(2));
    const unitPriceScaled = Math.round(unitPriceEur * 1_000_000);
    const totalCostScaled = Math.round(totalCostEur * 1_000_000);
    const id = `lot-${crypto.randomUUID()}`;

    const newLot = {
      id,
      tenantId,
      lotReference: input.lotReference,
      purchaseDate: input.purchaseDate,
      ncaRegistryAccountId: input.ncaRegistryAccountId,
      quantityPurchased: quantity,
      quantitySurrendered: 0,
      quantityAvailable: quantity,
      unitPriceEur,
      unitPriceScaled,
      totalCostEur,
      totalCostScaled,
      paymentReference: input.paymentReference ?? null,
      bankingTransmissionId: null,
      status: "ACTIVE" as const,
      metadata: input.metadata ?? null,
    };

    await db.insert(cbamCertificateInventory).values(newLot);
    return newLot as typeof cbamCertificateInventory.$inferSelect;
  }

  /**
   * Lists certificate inventory lots, ordered chronologically ascending for FIFO operations.
   */
  public static async listInventory(
    tenantId = "tenant-default",
    status?: "ACTIVE" | "EXHAUSTED" | "CANCELLED",
  ): Promise<Array<typeof cbamCertificateInventory.$inferSelect>> {
    const conditions = [eq(cbamCertificateInventory.tenantId, tenantId)];
    if (status) {
      conditions.push(eq(cbamCertificateInventory.status, status));
    }

    return db
      .select()
      .from(cbamCertificateInventory)
      .where(and(...conditions))
      .orderBy(
        asc(cbamCertificateInventory.purchaseDate),
        asc(cbamCertificateInventory.createdAt),
      );
  }

  /**
   * Computes inventory aggregate balance metrics.
   */
  public static async getInventorySummary(
    tenantId = "tenant-default",
  ): Promise<InventorySummary> {
    const lots = await this.listInventory(tenantId);

    let totalPurchased = 0;
    let totalSurrendered = 0;
    let totalAvailable = 0;
    let totalValuationEur = 0;
    let activeLotsCount = 0;

    for (const lot of lots) {
      totalPurchased += lot.quantityPurchased;
      totalSurrendered += lot.quantitySurrendered;
      totalAvailable += lot.quantityAvailable;
      totalValuationEur += lot.quantityAvailable * lot.unitPriceEur;
      if (lot.status === "ACTIVE") {
        activeLotsCount++;
      }
    }

    return {
      totalPurchased,
      totalSurrendered,
      totalAvailable,
      totalValuationEur: Number(totalValuationEur.toFixed(2)),
      activeLotsCount,
    };
  }

  /**
   * Surrenders CBAM certificates for a validated declaration using FIFO inventory consumption
   * and generates a non-repudiation cryptographic SHA-256 seal.
   */
  public static async surrenderCertificates(
    input: SurrenderCertificatesInput,
  ): Promise<SurrenderResult> {
    const tenantId = input.tenantId ?? "tenant-default";
    const surrenderDate = input.surrenderDate ?? new Date().toISOString();

    // 1. Validate declaration
    const decResults = await db
      .select()
      .from(cbamDeclarations)
      .where(eq(cbamDeclarations.id, input.declarationId))
      .limit(1);

    if (decResults.length === 0) {
      throw new Error(`Declaration not found: ${input.declarationId}`);
    }

    const declaration = decResults[0];

    if (declaration.status === "CERTIFICATES_SURRENDERED") {
      throw new Error(
        `Declaration ${declaration.declarationNumber} has already been surrendered.`,
      );
    }

    if (
      declaration.status !== "VALIDATED" &&
      declaration.status !== "SUBMITTED_REGISTRY" &&
      declaration.status !== "PENDING_SURRENDER"
    ) {
      throw new Error(
        `Cannot surrender declaration with status '${declaration.status}'. Only VALIDATED declarations can be surrendered.`,
      );
    }

    // 2. Validate independent accredited verifier
    if (
      !input.verifierName ||
      !input.verifierAccreditationNumber ||
      !input.verificationReportId
    ) {
      throw new Error(
        "Article 8 compliance violation: Independent accredited verifier details and verification report ID are mandatory for certificate surrender.",
      );
    }

    // 3. Compute certificates required (Art. 22 Regulation (EU) 2023/956)
    // Certificates needed = ceil(Net Carbon Liability / EU ETS Benchmark Price)
    const etsPrice = declaration.euEtsBenchmarkPriceEur || 85.5;
    const certsRequired = Math.ceil(
      Math.max(0, declaration.netCarbonLiabilityEur / etsPrice),
    );

    if (certsRequired === 0) {
      // Net liability is 0 (fully offset by third-country foreign carbon price)
      const emptyHash = crypto
        .createHash("sha256")
        .update(
          JSON.stringify({
            declarationId: declaration.id,
            declarationNumber: declaration.declarationNumber,
            totalCertificatesSurrendered: 0,
            verifierAccreditationNumber: input.verifierAccreditationNumber,
            verificationReportId: input.verificationReportId,
            surrenderDate,
            lots: [],
          }),
        )
        .digest("hex");

      const surrenderRef = `SURRENDER-${declaration.reportingPeriod}-${Date.now().toString(36).toUpperCase()}`;

      await db.transaction(async (tx) => {
        await tx.insert(cbamCertificateSurrenders).values({
          id: `surr-${crypto.randomUUID()}`,
          tenantId,
          surrenderReference: surrenderRef,
          declarationId: declaration.id,
          reportingPeriod: declaration.reportingPeriod,
          totalCertificatesSurrendered: 0,
          surrenderDate,
          surrenderLots: JSON.stringify([]),
          totalCostEur: 0,
          verifierName: input.verifierName,
          verifierAccreditationNumber: input.verifierAccreditationNumber,
          verificationReportId: input.verificationReportId,
          surrenderPayloadHashSha256: emptyHash,
          iso20022PaymentTransmissionId: null,
        });

        await tx
          .update(cbamDeclarations)
          .set({ status: "CERTIFICATES_SURRENDERED" })
          .where(eq(cbamDeclarations.id, declaration.id));
      });

      return {
        surrenderReference: surrenderRef,
        declarationId: declaration.id,
        declarationNumber: declaration.declarationNumber,
        reportingPeriod: declaration.reportingPeriod,
        totalCertificatesSurrendered: 0,
        totalCostEur: 0,
        verifierName: input.verifierName,
        verifierAccreditationNumber: input.verifierAccreditationNumber,
        verificationReportId: input.verificationReportId,
        surrenderPayloadHashSha256: emptyHash,
        surrenderLots: [],
        surrenderDate,
      };
    }

    // 4. Retrieve available active lots for tenant (FIFO)
    const activeLots = await db
      .select()
      .from(cbamCertificateInventory)
      .where(
        and(
          eq(cbamCertificateInventory.tenantId, tenantId),
          eq(cbamCertificateInventory.status, "ACTIVE"),
        ),
      )
      .orderBy(
        asc(cbamCertificateInventory.purchaseDate),
        asc(cbamCertificateInventory.createdAt),
      );

    const totalAvailable = activeLots.reduce(
      (sum, lot) => sum + lot.quantityAvailable,
      0,
    );

    if (totalAvailable < certsRequired) {
      throw new Error(
        `INSUFFICIENT_CBAM_CERTIFICATES: Required ${certsRequired} certificates for declaration ${declaration.declarationNumber}, but only ${totalAvailable} are available in holding inventory. Please purchase additional certificate lots.`,
      );
    }

    // 5. FIFO Lot Allocation
    let remainingToSurrender = certsRequired;
    const lotAllocations: CbamSurrenderLotAllocation[] = [];
    const lotUpdates: Array<{
      lotId: string;
      newAvailable: number;
      newSurrendered: number;
      newStatus: "ACTIVE" | "EXHAUSTED";
    }> = [];
    let totalSurrenderCostEur = 0;

    for (const lot of activeLots) {
      if (remainingToSurrender <= 0) break;

      const toConsume = Math.min(lot.quantityAvailable, remainingToSurrender);
      const newAvailable = lot.quantityAvailable - toConsume;
      const newSurrendered = lot.quantitySurrendered + toConsume;
      const newStatus = newAvailable === 0 ? "EXHAUSTED" : "ACTIVE";

      lotAllocations.push({
        lotId: lot.id,
        lotReference: lot.lotReference,
        quantity: toConsume,
        unitPriceEur: lot.unitPriceEur,
      });

      totalSurrenderCostEur += toConsume * lot.unitPriceEur;

      lotUpdates.push({
        lotId: lot.id,
        newAvailable,
        newSurrendered,
        newStatus,
      });

      remainingToSurrender -= toConsume;
    }

    totalSurrenderCostEur = Number(totalSurrenderCostEur.toFixed(2));

    // 6. Compute Non-Repudiation SHA-256 Audit Seal
    const auditPayload = {
      declarationId: declaration.id,
      declarationNumber: declaration.declarationNumber,
      reportingPeriod: declaration.reportingPeriod,
      totalCertificatesSurrendered: certsRequired,
      totalCostEur: totalSurrenderCostEur,
      verifierName: input.verifierName,
      verifierAccreditationNumber: input.verifierAccreditationNumber,
      verificationReportId: input.verificationReportId,
      surrenderDate,
      lots: lotAllocations,
    };

    const surrenderHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(auditPayload))
      .digest("hex");

    const surrenderRef = `SURRENDER-${declaration.reportingPeriod}-${Date.now().toString(36).toUpperCase()}`;

    // 7. Atomic SQLite WAL Transaction
    await db.transaction(async (tx) => {
      // Update each lot
      for (const update of lotUpdates) {
        await tx
          .update(cbamCertificateInventory)
          .set({
            quantityAvailable: update.newAvailable,
            quantitySurrendered: update.newSurrendered,
            status: update.newStatus,
          })
          .where(eq(cbamCertificateInventory.id, update.lotId));
      }

      // Record surrender event
      await tx.insert(cbamCertificateSurrenders).values({
        id: `surr-${crypto.randomUUID()}`,
        tenantId,
        surrenderReference: surrenderRef,
        declarationId: declaration.id,
        reportingPeriod: declaration.reportingPeriod,
        totalCertificatesSurrendered: certsRequired,
        surrenderDate,
        surrenderLots: JSON.stringify(lotAllocations),
        totalCostEur: totalSurrenderCostEur,
        verifierName: input.verifierName,
        verifierAccreditationNumber: input.verifierAccreditationNumber,
        verificationReportId: input.verificationReportId,
        surrenderPayloadHashSha256: surrenderHash,
        iso20022PaymentTransmissionId: null,
      });

      // Update declaration status
      await tx
        .update(cbamDeclarations)
        .set({
          status: "CERTIFICATES_SURRENDERED",
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(cbamDeclarations.id, declaration.id));
    });

    return {
      surrenderReference: surrenderRef,
      declarationId: declaration.id,
      declarationNumber: declaration.declarationNumber,
      reportingPeriod: declaration.reportingPeriod,
      totalCertificatesSurrendered: certsRequired,
      totalCostEur: totalSurrenderCostEur,
      verifierName: input.verifierName,
      verifierAccreditationNumber: input.verifierAccreditationNumber,
      verificationReportId: input.verificationReportId,
      surrenderPayloadHashSha256: surrenderHash,
      surrenderLots: lotAllocations,
      surrenderDate,
    };
  }

  /**
   * Generates a standardized ISO 20022 pain.001.001.09 payment initiation XML document
   * for settling the purchase of a CBAM certificate lot with the National Competent Authority.
   */
  public static generatePaymentOrderXml(input: CbamPaymentOrderInput): {
    messageId: string;
    xml: string;
  } {
    const messageId = `MSG-CBAM-${Date.now()}`;
    const creationDate = new Date().toISOString();
    const creditorName =
      input.creditorNcaName ??
      "Agencia Tributaria - Tesoro Publico / Registro CBAM";
    const creditorIban = input.creditorNcaIban ?? "ES6001820001000000000001";
    const creditorBic = input.creditorNcaBic ?? "BBVAESMMXXX";

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${escapeXml(messageId)}</MsgId>
      <CreDtTm>${escapeXml(creationDate)}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <InitgPty>
        <Nm>${escapeXml(input.debtorName)}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>PMT-CBAM-${escapeXml(input.lotId)}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <ReqdExctnDt>
        <Dt>${escapeXml(creationDate.slice(0, 10))}</Dt>
      </ReqdExctnDt>
      <Dbtr>
        <Nm>${escapeXml(input.debtorName)}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>${escapeXml(input.debtorIban.replace(/\s+/g, ""))}</IBAN>
        </Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${escapeXml(input.debtorBic)}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>E2E-CBAM-${escapeXml(input.lotId)}</EndToEndId>
        </PmtId>
        <Cdtr>
          <Nm>${escapeXml(creditorName)}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <IBAN>${escapeXml(creditorIban.replace(/\s+/g, ""))}</IBAN>
          </Id>
        </CdtrAcct>
        <CdtrAgt>
          <FinInstnId>
            <BICFI>${escapeXml(creditorBic)}</BICFI>
          </FinInstnId>
        </CdtrAgt>
        <RmtInf>
          <Ustrd>PAGO ADQUISICION CERTIFICADOS CBAM REG (UE) 2023/956 - LOTE ${escapeXml(input.lotId)}</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

    return {
      messageId,
      xml,
    };
  }

  /**
   * Generates a standardized ISO 20022 pain.001.001.09 payment initiation XML document
   * for settling the definitive surrender liability of a CBAM declaration with the National Competent Authority.
   */
  public static async generateSurrenderPaymentOrderXml(
    input: CbamSurrenderPaymentOrderInput,
  ): Promise<{
    messageId: string;
    surrenderReference: string;
    totalAmountEur: number;
    xml: string;
  }> {
    const surrenderResults = await db
      .select()
      .from(cbamCertificateSurrenders)
      .where(eq(cbamCertificateSurrenders.id, input.surrenderId))
      .limit(1);

    if (surrenderResults.length === 0) {
      throw new Error(`Surrender record not found: ${input.surrenderId}`);
    }

    const surrender = surrenderResults[0];
    const messageId = `MSG-SURR-${Date.now()}`;
    const creationDate = new Date().toISOString();
    const creditorName =
      input.creditorNcaName ??
      "Agencia Tributaria - Tesoro Publico / Liquidacion CBAM";
    const creditorIban = input.creditorNcaIban ?? "ES6001820001000000000001";
    const creditorBic = input.creditorNcaBic ?? "BBVAESMMXXX";
    const totalAmount = surrender.totalCostEur;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${escapeXml(messageId)}</MsgId>
      <CreDtTm>${escapeXml(creationDate)}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <InitgPty>
        <Nm>${escapeXml(input.debtorName)}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>PMT-CBAM-SURR-${escapeXml(surrender.surrenderReference)}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <ReqdExctnDt>
        <Dt>${escapeXml(creationDate.slice(0, 10))}</Dt>
      </ReqdExctnDt>
      <Dbtr>
        <Nm>${escapeXml(input.debtorName)}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>${escapeXml(input.debtorIban.replace(/\s+/g, ""))}</IBAN>
        </Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${escapeXml(input.debtorBic)}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>E2E-CBAM-SURR-${escapeXml(surrender.surrenderReference)}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="EUR">${totalAmount.toFixed(2)}</InstdAmt>
        </Amt>
        <Cdtr>
          <Nm>${escapeXml(creditorName)}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <IBAN>${escapeXml(creditorIban.replace(/\s+/g, ""))}</IBAN>
          </Id>
        </CdtrAcct>
        <CdtrAgt>
          <FinInstnId>
            <BICFI>${escapeXml(creditorBic)}</BICFI>
          </FinInstnId>
        </CdtrAgt>
        <RmtInf>
          <Ustrd>LIQUIDACION DEFINITIVA ENTREGA CERTIFICADOS CBAM REG (UE) 2023/956 - ${escapeXml(surrender.surrenderReference)} - PERIODO ${escapeXml(surrender.reportingPeriod)}</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

    // Store payment transmission id if not set
    await db
      .update(cbamCertificateSurrenders)
      .set({ iso20022PaymentTransmissionId: messageId })
      .where(eq(cbamCertificateSurrenders.id, input.surrenderId));

    return {
      messageId,
      surrenderReference: surrender.surrenderReference,
      totalAmountEur: totalAmount,
      xml,
    };
  }
}
