import { sqliteView } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { shipments } from "./operations.js";
import { invoices, invoiceItems } from "./finance.js";
import { locations } from "./core.js";
import { warehouseInventory } from "./support.js";

export const shipmentFinancialSummary = sqliteView(
  "shipment_financial_summary",
).as((qb) =>
  qb
    .select({
      shipmentId: shipments.id,
      vesselName: shipments.vesselName,
      totalInvoicedAmount: sql<number>`SUM(${invoiceItems.total})`.as(
        "total_invoiced_amount",
      ),
      invoiceCount: sql<number>`COUNT(DISTINCT ${invoices.id})`.as(
        "invoice_count",
      ),
    })
    .from(shipments)
    .leftJoin(invoices, sql`${invoices.shipmentId} = ${shipments.id}`)
    .leftJoin(invoiceItems, sql`${invoiceItems.invoiceId} = ${invoices.id}`)
    .groupBy(shipments.id),
);

export const warehouseOccupancy = sqliteView("warehouse_occupancy").as((qb) =>
  qb
    .select({
      locationId: locations.id,
      locationName: locations.name,
      totalItems: sql<number>`SUM(${warehouseInventory.quantity})`.as(
        "total_items",
      ),
      totalWeight: sql<number>`SUM(${warehouseInventory.weight})`.as(
        "total_weight",
      ),
      totalVolume: sql<number>`SUM(${warehouseInventory.volume})`.as(
        "total_volume",
      ),
    })
    .from(locations)
    .leftJoin(
      warehouseInventory,
      sql`${warehouseInventory.locationId} = ${locations.id}`,
    )
    .where(sql`${locations.type} = 'WAREHOUSE'`)
    .groupBy(locations.id),
);
