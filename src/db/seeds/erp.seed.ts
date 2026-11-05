import { db } from "../index.js";
import * as schema from "../schema/index.js";

export async function seedErp(): Promise<void> {
  console.log(
    "🏢 [ERP] Sembrando ordenes de compra SAP y NetSuite con logs de sincronizacion...",
  );

  const sapOrder = {
    id: "po_sap_sh_demo_01",
    poNumber: "4500891234",
    erpSystem: "SAP_S4HANA" as const,
    shipmentId: "sh_demo_01",
    vendorName: "Iberia Global Exports S.L.",
    companyCode: "1000",
    purchasingGroup: "P01",
    totalAmount: 145000,
    currency: "EUR",
    status: "GOODS_RECEIPT_POSTED" as const,
    lineItemsJson: JSON.stringify([
      {
        material: "MAT-ROBOTICS-A",
        description: "Industrial Robotics and Precision Tooling Set A",
        quantity: 520,
        unitPriceEur: 278.85,
        netValueEur: 145000,
      },
    ]),
    grnNumber: "5000192841",
    freightAccrualDocNumber: "4900182741",
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now(),
  };

  const netSuiteOrder = {
    id: "po_ns_sh_demo_01",
    poNumber: "SO-2026-9912",
    erpSystem: "ORACLE_NETSUITE" as const,
    shipmentId: "sh_demo_01",
    vendorName: "American Logistic Hub LLC",
    companyCode: "SUBS-NA-01",
    purchasingGroup: "RETAIL-TECH",
    totalAmount: 172000,
    currency: "USD",
    status: "IN_TRANSIT" as const,
    lineItemsJson: JSON.stringify([
      {
        line: 1,
        itemRefName: "High-Tech Sensor Array Mod B",
        quantity: 240,
        unitValue: 450,
        weightKg: 12400,
        volumeCbm: 32,
      },
    ]),
    grnNumber: null,
    freightAccrualDocNumber: null,
    createdAt: Date.now() - 43200000,
    updatedAt: Date.now(),
  };

  await db
    .insert(schema.erpPurchaseOrders)
    .values(sapOrder)
    .onConflictDoUpdate({
      target: schema.erpPurchaseOrders.id,
      set: sapOrder,
    });

  await db
    .insert(schema.erpPurchaseOrders)
    .values(netSuiteOrder)
    .onConflictDoUpdate({
      target: schema.erpPurchaseOrders.id,
      set: netSuiteOrder,
    });

  const logs = [
    {
      id: "log_erp_01",
      poId: "po_sap_sh_demo_01",
      erpSystem: "SAP_S4HANA",
      operation: "SYNC_PO",
      status: "SUCCESS" as const,
      requestPayloadJson: JSON.stringify({ poNumber: "4500891234" }),
      responsePayloadJson: JSON.stringify({
        sapStatus: "RELEASED",
        currency: "EUR",
        amount: 145000,
      }),
      latencyMs: 118,
      createdAt: Date.now() - 86000000,
    },
    {
      id: "log_erp_02",
      poId: "po_sap_sh_demo_01",
      erpSystem: "SAP_S4HANA",
      operation: "POST_DELIVERY",
      status: "SUCCESS" as const,
      requestPayloadJson: JSON.stringify({
        poNumber: "4500891234",
        containerId: "MSKU9284712",
      }),
      responsePayloadJson: JSON.stringify({ grnNumber: "5000192841" }),
      latencyMs: 142,
      createdAt: Date.now() - 43000000,
    },
    {
      id: "log_erp_03",
      poId: "po_ns_sh_demo_01",
      erpSystem: "ORACLE_NETSUITE",
      operation: "SYNC_ORDER",
      status: "SUCCESS" as const,
      requestPayloadJson: JSON.stringify({ orderNumber: "SO-2026-9912" }),
      responsePayloadJson: JSON.stringify({
        suiteTalkStatus: "PENDING_RECEIPT",
        itemsCount: 1,
      }),
      latencyMs: 165,
      createdAt: Date.now() - 20000000,
    },
  ];

  for (const log of logs) {
    await db.insert(schema.erpSyncLogs).values(log).onConflictDoUpdate({
      target: schema.erpSyncLogs.id,
      set: log,
    });
  }

  console.log("✅ [ERP] Ordenes SAP y NetSuite con logs sembradas con éxito.");
}
