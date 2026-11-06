import {
  sqliteTable,
  text,
  real,
  integer,
  index,
} from "drizzle-orm/sqlite-core";
import { shipments, shipmentContainers } from "./operations.js";
import { commonAuditFields } from "./_common.js";

export const containerStowagePlans = sqliteTable(
  "container_stowage_plans",
  {
    id: text("id").primaryKey(),
    containerId: text("container_id")
      .notNull()
      .references(() => shipmentContainers.id, { onDelete: "cascade" }),
    shipmentId: text("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    totalCargoWeightKg: real("total_cargo_weight_kg").notNull(),
    maxPayloadKg: real("max_payload_kg").notNull(),
    tareWeightKg: real("tare_weight_kg").notNull(),
    volumeUtilizationPercent: real("volume_utilization_percent").notNull(),
    weightUtilizationPercent: real("weight_utilization_percent").notNull(),
    centerOfGravityJson: text("center_of_gravity_json"),
    axleLoadDistributionJson: text("axle_load_distribution_json"),
    stabilityCertified: integer("stability_certified", { mode: "boolean" })
      .notNull()
      .default(false),
    certifiedBy: text("certified_by"),
    certifiedAt: integer("certified_at"),
    stowageSequenceJson: text("stowage_sequence_json"),
    ...commonAuditFields,
  },
  (table) => ({
    containerIdx: index("stowage_container_idx").on(table.containerId),
    shipmentIdx: index("stowage_shipment_idx").on(table.shipmentId),
  }),
);
