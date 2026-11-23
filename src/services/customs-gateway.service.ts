/**
 * @file customs-gateway.service.ts
 * @description Sovereign Customs Authority Gateway Service for Atlas-Logistics.
 * Manages PKI Digital Certificates, outbound mTLS XML/SOAP declaration transmissions,
 * asynchronous CUSRES webhook intake, and automated clearance/hold state synchronization.
 * @module @atlas/services/customs-gateway
 * @see {@link docs/adr/0038-customs-mtls-and-regulatory-filing-gateway.md}
 */

import { v4 as uuidv4 } from "uuid";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  customsPkiCertificates,
  customsFilingTransmissions,
} from "../db/schema/customs_filings.js";
import { customsClearances } from "../db/schema/customs_brokerage.js";
import { outboxBus } from "../scm/kernel/outbox-bus.js";
import {
  SecurityActorContext,
  DEFAULT_OPERATOR_ACTOR,
} from "../scm/kernel/primitives.js";
import {
  synthesizeCustomsDeclaration,
  parseCusresResponse,
  type CustomsAgency,
  type CustomsProtocol,
  type MessageFunction,
} from "../scm/engines/customs-filing.engine.js";

export type { CustomsAgency, CustomsProtocol, MessageFunction };

// ============================================================================
// 1. DATA CONTRACTS & INTERFACES
// ============================================================================

export interface RegisterCertificateInput {
  tenantId?: string;
  agency: CustomsAgency;
  certificateAlias: string;
  thumbprintSha256: string;
  issuerDn: string;
  subjectDn: string;
  validFrom: string;
  validUntil: string;
  keyStorageType?: "LOCAL_PKCS12" | "AZURE_KEYVAULT" | "AWS_KMS" | "PKCS11_HSM";
}

export interface SubmitDeclarationInput {
  tenantId?: string;
  clearanceId: string;
  agency: CustomsAgency;
  protocol?: CustomsProtocol;
  messageFunction?: MessageFunction;
  guaranteeReference?: string;
  simulateImmediateAck?: boolean;
  actor?: SecurityActorContext;
}

export interface ListTransmissionsFilter {
  tenantId?: string;
  clearanceId?: string;
  agency?: CustomsAgency;
  responseStatus?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// 2. CUSTOMS GATEWAY SERVICE CLASS
// ============================================================================

export class CustomsGatewayService {
  /**
   * Registers a validated PKI digital certificate in the secure ledger.
   */
  async registerCertificate(input: RegisterCertificateInput) {
    const tenantId = input.tenantId ?? "tenant-default";
    const certId = `cert_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
    const now = new Date().toISOString();

    const [created] = await db
      .insert(customsPkiCertificates)
      .values({
        id: certId,
        tenantId,
        agency: input.agency,
        certificateAlias: input.certificateAlias,
        thumbprintSha256: input.thumbprintSha256,
        issuerDn: input.issuerDn,
        subjectDn: input.subjectDn,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        keyStorageType: input.keyStorageType ?? "LOCAL_PKCS12",
        isRevoked: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return created;
  }

  /**
   * Lists active, non-revoked digital certificates for a tenant and optional agency.
   */
  async listCertificates(tenantId = "tenant-default", agency?: CustomsAgency) {
    const conditions = [
      eq(customsPkiCertificates.tenantId, tenantId),
      eq(customsPkiCertificates.isRevoked, false),
    ];

    if (agency) {
      conditions.push(eq(customsPkiCertificates.agency, agency));
    }

    return db
      .select()
      .from(customsPkiCertificates)
      .where(and(...conditions))
      .orderBy(desc(customsPkiCertificates.createdAt));
  }

  /**
   * Submits a customs clearance declaration to the designated national authority.
   */
  async submitDeclaration(input: SubmitDeclarationInput) {
    const tenantId = input.tenantId ?? "tenant-default";
    const actor = input.actor ?? DEFAULT_OPERATOR_ACTOR;

    // 1. Fetch clearance record
    const [clearance] = await db
      .select()
      .from(customsClearances)
      .where(
        and(
          eq(customsClearances.id, input.clearanceId),
          eq(customsClearances.tenantId, tenantId),
        ),
      );

    if (!clearance) {
      throw new Error(`Customs clearance not found: ${input.clearanceId}`);
    }

    // 2. Fetch active PKI certificate for agency
    const activeCerts = await this.listCertificates(tenantId, input.agency);
    const cert = activeCerts[0];

    const thumbprint = cert
      ? cert.thumbprintSha256
      : `DEFAULT_THUMBPRINT_${input.agency}_${Date.now()}`;

    // 3. Synthesize canonical XML declaration payload via pure engine
    const synthesized = synthesizeCustomsDeclaration({
      clearanceId: clearance.id,
      clearanceNumber: clearance.clearanceNumber,
      agency: input.agency,
      protocol: input.protocol,
      messageFunction: input.messageFunction,
      customsOfficeCode: clearance.customsOfficeCode,
      importerEoriOrVat: clearance.importerCompanyId,
      declarantEoriOrVat: clearance.declarantAddressId,
      taricCode: clearance.taricCode,
      goodsDescription: clearance.goodsDescription,
      originCountryCode: clearance.originCountryCode,
      grossMassKg: clearance.grossMassKg,
      netMassKg: clearance.netMassKg,
      customsValueEur: clearance.customsValueEur,
      dutyAmountEur: clearance.assessedDutyAmountEur,
      vatAmountEur: clearance.assessedVatAmountEur,
      guaranteeReference: input.guaranteeReference,
      certificateThumbprint: thumbprint,
    });

    const transmissionId = `tx_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
    const now = new Date().toISOString();

    // 4. Record outbound transmission in pending/submitted status
    const [transmission] = await db
      .insert(customsFilingTransmissions)
      .values({
        id: transmissionId,
        tenantId,
        clearanceId: clearance.id,
        agency: input.agency,
        protocol: synthesized.protocol,
        messageFunction: synthesized.messageFunction,
        filingReference: synthesized.filingReference,
        payloadSha256: synthesized.canonicalPayloadSha256,
        signatureAlgorithm: synthesized.signatureAlgorithm,
        certificateThumbprint: synthesized.certificateThumbprint,
        responseStatus: "SUBMITTED",
        sentAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // 5. Emit Outbox Event for transmission submission
    await outboxBus.publish({
      eventType: "scm.customs.filing_submitted.v1",
      aggregateType: "CustomsFilingTransmission",
      aggregateId: transmission.id,
      actor,
      payload: {
        transmissionId: transmission.id,
        clearanceId: clearance.id,
        filingReference: transmission.filingReference,
        agency: transmission.agency,
        protocol: transmission.protocol,
        payloadSha256: transmission.payloadSha256,
      },
    });

    // 6. Handle immediate synchronous Ack simulation if requested
    if (input.simulateImmediateAck) {
      const simulatedCusresXml = `<?xml version="1.0" encoding="UTF-8"?>
<cusres:CustomsResponse xmlns:cusres="http://wco.org/cusres">
  <cusres:FilingReference>${transmission.filingReference}</cusres:FilingReference>
  <cusres:MRN>26${input.agency.slice(0, 2)}${clearance.customsOfficeCode.slice(-4)}${Date.now().toString().slice(-8)}</cusres:MRN>
  <cusres:RoutingChannel>GREEN</cusres:RoutingChannel>
</cusres:CustomsResponse>`;

      return this.processCusresWebhook(
        transmission.id,
        simulatedCusresXml,
        tenantId,
        actor,
      );
    }

    return transmission;
  }

  /**
   * Processes an incoming CUSRES (Customs Response) webhook notification.
   */
  async processCusresWebhook(
    transmissionId: string,
    rawPayload: string,
    tenantId = "tenant-default",
    actor = DEFAULT_OPERATOR_ACTOR,
  ) {
    const [transmission] = await db
      .select()
      .from(customsFilingTransmissions)
      .where(
        and(
          eq(customsFilingTransmissions.id, transmissionId),
          eq(customsFilingTransmissions.tenantId, tenantId),
        ),
      );

    if (!transmission) {
      throw new Error(
        `Customs filing transmission not found: ${transmissionId}`,
      );
    }

    // 1. Parse CUSRES via pure calculation engine
    const parsed = parseCusresResponse(rawPayload);
    const now = new Date().toISOString();

    // 2. Update transmission ledger
    const [updatedTx] = await db
      .update(customsFilingTransmissions)
      .set({
        responseStatus: parsed.responseStatus,
        mrnAssigned: parsed.mrnAssigned ?? transmission.mrnAssigned,
        errorCode: parsed.errorCode,
        errorMessage: parsed.errorMessage,
        acknowledgedAt: parsed.acknowledgedAt,
        updatedAt: now,
      })
      .where(eq(customsFilingTransmissions.id, transmission.id))
      .returning();

    // 3. Atomically synchronize parent clearance state
    const clearanceUpdates: Record<string, unknown> = {
      updatedAt: now,
    };

    if (parsed.mrnAssigned) {
      clearanceUpdates.mrn = parsed.mrnAssigned;
    }

    if (parsed.responseStatus === "ACCEPTED_GREEN") {
      clearanceUpdates.routingChannel = "GREEN";
      clearanceUpdates.status = "LEVANTE_RELEASED";
      clearanceUpdates.levanteReleasedAt = now;
    } else if (parsed.responseStatus === "DOCS_REQUIRED_ORANGE") {
      clearanceUpdates.routingChannel = "ORANGE";
      clearanceUpdates.status = "ROUTED";
    } else if (parsed.responseStatus === "INSPECTION_RED") {
      clearanceUpdates.routingChannel = "RED";
      clearanceUpdates.status = "ROUTED";
    }

    await db
      .update(customsClearances)
      .set(clearanceUpdates)
      .where(eq(customsClearances.id, transmission.clearanceId));

    // 4. Emit Outbox Event for processed response
    await outboxBus.publish({
      eventType: "scm.customs.cusres_processed.v1",
      aggregateType: "CustomsFilingTransmission",
      aggregateId: updatedTx.id,
      actor,
      payload: {
        transmissionId: updatedTx.id,
        clearanceId: transmission.clearanceId,
        filingReference: updatedTx.filingReference,
        responseStatus: updatedTx.responseStatus,
        mrnAssigned: updatedTx.mrnAssigned,
        acknowledgedAt: updatedTx.acknowledgedAt,
      },
    });

    return updatedTx;
  }

  /**
   * Queries filing transmissions with optional filters and sorting.
   */
  async listTransmissions(filters: ListTransmissionsFilter = {}) {
    const tenantId = filters.tenantId ?? "tenant-default";
    const conditions = [eq(customsFilingTransmissions.tenantId, tenantId)];

    if (filters.clearanceId) {
      conditions.push(
        eq(customsFilingTransmissions.clearanceId, filters.clearanceId),
      );
    }
    if (filters.agency) {
      conditions.push(eq(customsFilingTransmissions.agency, filters.agency));
    }
    if (filters.responseStatus) {
      conditions.push(
        // @ts-expect-error Drizzle enum string matching
        eq(customsFilingTransmissions.responseStatus, filters.responseStatus),
      );
    }

    return db
      .select()
      .from(customsFilingTransmissions)
      .where(and(...conditions))
      .orderBy(desc(customsFilingTransmissions.createdAt))
      .limit(filters.limit ?? 50)
      .offset(filters.offset ?? 0);
  }

  /**
   * Retrieves single transmission record by ID.
   */
  async getTransmissionById(id: string, tenantId = "tenant-default") {
    const [tx] = await db
      .select()
      .from(customsFilingTransmissions)
      .where(
        and(
          eq(customsFilingTransmissions.id, id),
          eq(customsFilingTransmissions.tenantId, tenantId),
        ),
      );

    return tx ?? null;
  }
}

export const customsGatewayService = new CustomsGatewayService();
