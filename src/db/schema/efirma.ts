import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { shipments } from "./operations.js";
import { documents } from "./support.js";
import { cartaPorteDeclarations } from "./cross_border.js";

export const efirmaAuditStamps = sqliteTable(
  "efirma_audit_stamps",
  {
    id: text("id").primaryKey(),
    shipmentId: text("shipment_id").references(() => shipments.id, {
      onDelete: "set null",
    }),
    documentId: text("document_id").references(() => documents.id, {
      onDelete: "set null",
    }),
    cartaPorteId: text("carta_porte_id").references(
      () => cartaPorteDeclarations.id,
      { onDelete: "set null" },
    ),
    documentType: text("document_type", {
      enum: [
        "PEDIMENTO_ADUANAL",
        "CARTA_PORTE",
        "BILL_OF_LADING",
        "POLIZA_SEGURO",
        "CUSTOMS_RELEASE",
      ],
    }).notNull(),
    certificateSerial: text("certificate_serial").notNull(),
    rfcTitular: text("rfc_titular").notNull(),
    razonSocial: text("razon_social").notNull(),
    cadenaOriginal: text("cadena_original").notNull(),
    cadenaOriginalSha256: text("cadena_original_sha256").notNull(),
    selloDigitalBase64: text("sello_digital_base64").notNull(),
    rfc3161TimestampToken: text("rfc3161_timestamp_token").notNull(),
    tamperSealHash: text("tamper_seal_hash").notNull(),
    status: text("status", {
      enum: ["VALIDATED_AND_SEALED", "REVOKED", "INVALID_SIGNATURE"],
    })
      .notNull()
      .default("VALIDATED_AND_SEALED"),
    verifiedAt: text("verified_at").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => ({
    shipmentIdx: index("efirma_shipment_idx").on(table.shipmentId),
    docIdx: index("efirma_doc_idx").on(table.documentId),
    serialIdx: index("efirma_serial_idx").on(table.certificateSerial),
  }),
);
