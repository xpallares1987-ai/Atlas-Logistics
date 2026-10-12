import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateNetSuiteLandedCost,
  generateMockNetSuiteTbaHeader,
  mapAtlasToSapIncoterm,
  SAP_UOM_MAP,
  REVERSE_SAP_UOM_MAP,
  ERP_DEMO_PRESETS,
  LandedCostInputItem,
} from "./erp-integrations.js";
import {
  ErpSyncQueueManager,
  calculateErpBackoff,
} from "./erp-offline-sync.js";

describe("ERP Integrations: Landed Cost Allocation Engine", () => {
  const sampleItems: LandedCostInputItem[] = [
    {
      line: 1,
      itemRefName: "Turbocompresor Industrial",
      quantity: 10,
      unitValue: 1500, // Total Value: $15,000
      weightKg: 200,   // Total Weight: 200kg
      volumeCbm: 1.5,  // Total Volume: 1.5 CBM
    },
    {
      line: 2,
      itemRefName: "Válvulas Hidráulicas de Presión",
      quantity: 50,
      unitValue: 300,  // Total Value: $15,000
      weightKg: 300,   // Total Weight: 300kg
      volumeCbm: 0.5,  // Total Volume: 0.5 CBM
    },
    {
      line: 3,
      itemRefName: "Sensores Telemétricos CAN-Bus",
      quantity: 100,
      unitValue: 100,  // Total Value: $10,000
      weightKg: 100,   // Total Weight: 100kg
      volumeCbm: 0.2,  // Total Volume: 0.2 CBM
    },
  ];

  it("should accurately distribute landed freight by VALUE and reconcile total to the penny", () => {
    const totalFreight = 5000.0;
    const result = calculateNetSuiteLandedCost(totalFreight, "VALUE", sampleItems);

    expect(result.allocationMethod).toBe("VALUE");
    expect(result.items.length).toBe(3);

    // Total Value = 15000 + 15000 + 10000 = 40000
    // Line 1: 15000/40000 * 5000 = 1875
    // Line 2: 15000/40000 * 5000 = 1875
    // Line 3: 10000/40000 * 5000 = 1250
    expect(result.items[0].allocatedLandedCost).toBe(1875.0);
    expect(result.items[1].allocatedLandedCost).toBe(1875.0);
    expect(result.items[2].allocatedLandedCost).toBe(1250.0);

    const sumAllocated = result.items.reduce((acc, it) => acc + it.allocatedLandedCost, 0);
    expect(sumAllocated).toBe(totalFreight);
  });

  it("should distribute landed freight by GROSS WEIGHT accurately", () => {
    const totalFreight = 6000.0;
    const result = calculateNetSuiteLandedCost(totalFreight, "WEIGHT", sampleItems);

    expect(result.allocationMethod).toBe("WEIGHT");
    // Total Weight = 200 + 300 + 100 = 600kg
    // Line 1: 200/600 * 6000 = 2000
    // Line 2: 300/600 * 6000 = 3000
    // Line 3: 100/600 * 6000 = 1000
    expect(result.items[0].allocatedLandedCost).toBe(2000.0);
    expect(result.items[1].allocatedLandedCost).toBe(3000.0);
    expect(result.items[2].allocatedLandedCost).toBe(1000.0);
  });

  it("should distribute landed freight by VOLUME and compute effective unit costs", () => {
    const totalFreight = 4400.0;
    const result = calculateNetSuiteLandedCost(totalFreight, "VOLUME", sampleItems);

    expect(result.allocationMethod).toBe("VOLUME");
    // Total Volume = 1.5 + 0.5 + 0.2 = 2.2 CBM
    // Line 1: 1.5/2.2 * 4400 = 3000
    // Line 2: 0.5/2.2 * 4400 = 1000
    // Line 3: 0.2/2.2 * 4400 = 400
    expect(result.items[0].allocatedLandedCost).toBe(3000.0);
    expect(result.items[1].allocatedLandedCost).toBe(1000.0);
    expect(result.items[2].allocatedLandedCost).toBe(400.0);

    // Line 1 unit cost: (15000 + 3000) / 10 = 1800
    expect(result.items[0].effectiveUnitCost).toBe(1800.0);
  });

  it("should safely handle empty item arrays without NaN or dividing by zero", () => {
    const result = calculateNetSuiteLandedCost(1200, "VALUE", []);
    expect(result.items).toEqual([]);
    expect(result.totalLandedFreight).toBe(1200);
  });
});

describe("ERP Integrations: NetSuite SuiteTalk TBA Authentication", () => {
  it("should generate standard OAuth 1.0a TBA header with HMAC-SHA256 signature", () => {
    const headerResult = generateMockNetSuiteTbaHeader({
      accountId: "TSTDRV123456",
      consumerKey: "ck_abc1234567890",
      consumerSecret: "cs_secret_0987654321",
      tokenId: "tk_user_token_456",
      tokenSecret: "ts_token_secret_654",
    });

    expect(headerResult.authorizationHeader).toContain('OAuth realm="TSTDRV123456"');
    expect(headerResult.authorizationHeader).toContain('oauth_consumer_key="ck_abc1234567890"');
    expect(headerResult.authorizationHeader).toContain('oauth_token="tk_user_token_456"');
    expect(headerResult.authorizationHeader).toContain('oauth_signature_method="HMAC-SHA256"');
    expect(headerResult.authorizationHeader).toContain("oauth_signature=");
    expect(headerResult.nonce).toBeTruthy();
    expect(headerResult.timestamp).toBeTruthy();
  });
});

describe("ERP Integrations: BAPI Translations & Code Maps", () => {
  it("should translate SAP UoM codes back and forth with canonical metric units", () => {
    expect(SAP_UOM_MAP["KGM"]).toBe("KG");
    expect(SAP_UOM_MAP["MTQ"]).toBe("CBM");
    expect(REVERSE_SAP_UOM_MAP["KG"]).toBe("KGM");
    expect(REVERSE_SAP_UOM_MAP["CBM"]).toBe("MTQ");
  });

  it("should normalize Incoterms for SAP S/4HANA PO headers", () => {
    expect(mapAtlasToSapIncoterm("fob")).toBe("FOB");
    expect(mapAtlasToSapIncoterm("CIF")).toBe("CIF");
    expect(mapAtlasToSapIncoterm("dap")).toBe("DAP");
    expect(mapAtlasToSapIncoterm("UNKNOWN")).toBe("FOB");
  });

  it("should provide well-structured demo presets for sandbox testing", () => {
    expect(ERP_DEMO_PRESETS.sap_automotive_tier1).toBeDefined();
    expect(ERP_DEMO_PRESETS.netsuite_retail_hightech).toBeDefined();
    expect(ERP_DEMO_PRESETS.sap_automotive_tier1.sampleInput.items.length).toBeGreaterThan(0);
  });
});

describe("ERP Integrations: Offline-First Dexie Queue Manager", () => {
  let queue: ErpSyncQueueManager;

  beforeEach(() => {
    queue = new ErpSyncQueueManager();
  });

  it("should enqueue mutations with idempotency key and initial PENDING status", async () => {
    const item = await queue.enqueue({
      erpSystem: "SAP_S4HANA",
      operation: "POST_INBOUND_DELIVERY",
      payloadJson: JSON.stringify({ deliveryNumber: "DLV-998811" }),
      idempotencyKey: queue.generateIdempotencyKey("SAP", "DELIVERY", "DLV-998811"),
    });

    expect(item.id).toMatch(/^erp-tx-/);
    expect(item.status).toBe("PENDING");
    expect(item.retryCount).toBe(0);
    expect(item.idempotencyKey).toContain("IDEMP-SAP-DELIVERY");

    const all = await queue.getAll();
    expect(all.length).toBe(1);
  });

  it("should update status and increment retry count on failure", async () => {
    const item = await queue.enqueue({
      erpSystem: "ORACLE_NETSUITE",
      operation: "POST_ITEM_RECEIPT",
      payloadJson: JSON.stringify({ receiptNumber: "REC-4411" }),
      idempotencyKey: "IDEMP-123",
    });

    await queue.updateStatus(item.id, "FAILED", "429 Too Many Requests (Rate limit)");

    const all = await queue.getAll();
    const updated = all.find((i) => i.id === item.id);
    expect(updated?.status).toBe("FAILED");
    expect(updated?.retryCount).toBe(1);
    expect(updated?.lastError).toContain("429");
  });

  it("should calculate exponential backoff delay within upper bounds", () => {
    const delay1 = calculateErpBackoff(1);
    const delay3 = calculateErpBackoff(3);
    const delay10 = calculateErpBackoff(10);

    expect(delay1).toBeGreaterThanOrEqual(1500);
    expect(delay3).toBeGreaterThan(delay1);
    expect(delay10).toBeLessThanOrEqual(60000 + 1000); // MAX_BACKOFF + JITTER
  });

  it("should compute accurate queue statistics and purge completed items", async () => {
    const item1 = await queue.enqueue({
      erpSystem: "SAP_S4HANA",
      operation: "SYNC_PO",
      payloadJson: "{}",
      idempotencyKey: "K1",
    });

    const item2 = await queue.enqueue({
      erpSystem: "ORACLE_NETSUITE",
      operation: "POST_VENDOR_BILL",
      payloadJson: "{}",
      idempotencyKey: "K2",
    });

    await queue.updateStatus(item1.id, "COMPLETED");

    let stats = await queue.getStats();
    expect(stats.total).toBe(2);
    expect(stats.completed).toBe(1);
    expect(stats.pending).toBe(1);

    const purged = await queue.purgeCompleted();
    expect(purged).toBe(1);

    stats = await queue.getStats();
    expect(stats.total).toBe(1);
    expect(stats.completed).toBe(0);
  });
});
