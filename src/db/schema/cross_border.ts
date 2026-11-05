import {
  sqliteTable,
  text,
  real,
  integer,
  index,
} from "drizzle-orm/sqlite-core";
import { shipments } from "./operations.js";

export const cartaPorteDeclarations = sqliteTable(
  "carta_porte_declarations",
  {
    id: text("id").primaryKey(),
    shipmentId: text("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    idCcp: text("id_ccp").notNull().unique(),
    transporteTipo: text("transporte_tipo")
      .notNull()
      .default("AUTOTRANSPORTE_FEDERAL"),
    rfcEmisor: text("rfc_emisor").notNull(),
    rfcReceptor: text("rfc_receptor").notNull(),
    origenJson: text("origen_json").notNull(),
    destinoJson: text("destino_json").notNull(),
    vehiculoJson: text("vehiculo_json").notNull(),
    operadorJson: text("operador_json").notNull(),
    mercanciasJson: text("mercancias_json").notNull(),
    xmlTimbrado: text("xml_timbrado"),
    qrCodeData: text("qr_code_data"),
    rvcPercentage: real("rvc_percentage"),
    immexPedimentoTipo: text("immex_pedimento_tipo"),
    customsDwellHoursPredicted: real("customs_dwell_hours_predicted"),
    status: text("status", { enum: ["DRAFT", "STAMPED", "CANCELLED"] })
      .notNull()
      .default("STAMPED"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => ({
    shipmentIdx: index("cp_shipment_idx").on(table.shipmentId),
    idCcpIdx: index("cp_id_ccp_idx").on(table.idCcp),
  }),
);
