/**
 * @file customs_filings.ts
 * @description Drizzle ORM SQLite schema for Sovereign Customs Authority mTLS Gateways, PKI Hardware Certificates, and Filing Transmission Ledgers.
 * @module @atlas/db/schema/customs_filings
 * @see {@link docs/adr/0038-customs-mtls-and-regulatory-filing-gateway.md}
 */

import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { customsClearances } from "./customs_brokerage.js";

// ============================================================================
// 1. CUSTOMS PKI DIGITAL CERTIFICATES LEDGER
// ============================================================================

export const customsPkiCertificates = sqliteTable(
  "customs_pki_certificates",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull().default("tenant-default"),
    agency: text("agency", {
      enum: ["AEAT", "ATLAS", "DELTA", "NCTS_P5", "HMRC_CDS", "CBP_ACE"],
    }).notNull(),
    certificateAlias: text("certificate_alias").notNull(),
    thumbprintSha256: text("thumbprint_sha256").notNull().unique(),
    issuerDn: text("issuer_dn").notNull(),
    subjectDn: text("subject_dn").notNull(),
    validFrom: text("valid_from").notNull(),
    validUntil: text("valid_until").notNull(),
    keyStorageType: text("key_storage_type", {
      enum: ["LOCAL_PKCS12", "AZURE_KEYVAULT", "AWS_KMS", "PKCS11_HSM"],
    })
      .notNull()
      .default("LOCAL_PKCS12"),
    isRevoked: integer("is_revoked", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_customs_pki_certs_tenant_agency").on(
      table.tenantId,
      table.agency,
    ),
    index("idx_customs_pki_certs_thumbprint").on(table.thumbprintSha256),
  ],
);

// ============================================================================
// 2. CUSTOMS FILING TRANSMISSIONS & CUSRES AUDIT LEDGER
// ============================================================================

export const customsFilingTransmissions = sqliteTable(
  "customs_filing_transmissions",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull().default("tenant-default"),
    clearanceId: text("clearance_id")
      .notNull()
      .references(() => customsClearances.id, { onDelete: "cascade" }),
    agency: text("agency", {
      enum: ["AEAT", "ATLAS", "DELTA", "NCTS_P5", "HMRC_CDS", "CBP_ACE"],
    }).notNull(),
    protocol: text("protocol", {
      enum: ["SOAP_MTLS", "REST_MTLS", "AS4"],
    })
      .notNull()
      .default("SOAP_MTLS"),
    messageFunction: text("message_function", {
      enum: [
        "ORIGINAL",
        "REPLACEMENT",
        "AMENDMENT",
        "CANCELLATION",
        "STATUS_QUERY",
      ],
    })
      .notNull()
      .default("ORIGINAL"),
    filingReference: text("filing_reference").notNull().unique(), // e.g. TX-AEAT-2026-009182
    payloadSha256: text("payload_sha256").notNull(), // SHA-256 hash of outbound payload
    signatureAlgorithm: text("signature_algorithm")
      .notNull()
      .default("rsa-sha256"),
    certificateThumbprint: text("certificate_thumbprint").notNull(),
    rawRequestXmlPath: text("raw_request_xml_path"),
    rawResponseXmlPath: text("raw_response_xml_path"),
    responseStatus: text("response_status", {
      enum: [
        "PENDING",
        "SUBMITTED",
        "ACCEPTED_GREEN",
        "DOCS_REQUIRED_ORANGE",
        "INSPECTION_RED",
        "REJECTED_ERROR",
      ],
    })
      .notNull()
      .default("PENDING"),
    mrnAssigned: text("mrn_assigned"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    sentAt: text("sent_at"),
    acknowledgedAt: text("acknowledged_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_customs_transmissions_tenant_clearance").on(
      table.tenantId,
      table.clearanceId,
    ),
    index("idx_customs_transmissions_tenant_agency").on(
      table.tenantId,
      table.agency,
    ),
    index("idx_customs_transmissions_filing_ref").on(table.filingReference),
    index("idx_customs_transmissions_status").on(
      table.tenantId,
      table.responseStatus,
    ),
  ],
);
