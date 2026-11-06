import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { shipments, bookings } from "./operations.js";
import { commonAuditFields } from "./_common.js";

export const oceanBookingDetails = sqliteTable(
  "ocean_booking_details",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    shipmentId: text("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    carrierScac: text("carrier_scac").notNull(),
    serviceContractNumber: text("service_contract_number"),
    cargoCutOff: text("cargo_cut_off"),
    vcsCutOff: text("vcs_cut_off"),
    docCutOff: text("doc_cut_off"),
    siCutOff: text("si_cut_off"),
    siStatus: text("si_status", {
      enum: ["DRAFT", "SUBMITTED", "AMENDED", "CONFIRMED"],
    })
      .notNull()
      .default("DRAFT"),
    draftBlStatus: text("draft_bl_status", {
      enum: ["PENDING", "ISSUED", "APPROVED"],
    })
      .notNull()
      .default("PENDING"),
    hazardousDeclaration: text("hazardous_declaration"),
    specialInstructions: text("special_instructions"),
    vgmJson: text("vgm_json"),
    ...commonAuditFields,
  },
  (table) => ({
    bookingIdx: index("ocean_bkg_booking_idx").on(table.bookingId),
    shipmentIdx: index("ocean_bkg_shipment_idx").on(table.shipmentId),
  }),
);
