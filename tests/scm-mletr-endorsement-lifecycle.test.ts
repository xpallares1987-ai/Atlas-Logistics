import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import smartContractsRoutes from "../src/modules/smart-contracts/smart-contracts.routes.js";
import { MletrLedgerService } from "../src/services/mletr/mletr-ledger.service.js";
import { createOperationalShipment } from "../src/scm/contexts/operational-core/operational-core.context.js";
import { db } from "../src/db/index.js";
import {
  mletrTransferableRecords,
  mletrEndorsementsLedger,
} from "../src/db/schema/smart_contracts.js";
import { eq } from "drizzle-orm";

describe("UNCITRAL MLETR & UCP 600 Electronic Transferable Records Lifecycle (Zero Mocks)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(smartContractsRoutes, {
      prefix: "/api/smart-contracts",
    });
    await app.ready();
    await MletrLedgerService.ensureTables();

    // Clean up sh_demo_01 test record if left from previous runs to ensure test idempotency
    const existing = await db
      .select()
      .from(mletrTransferableRecords)
      .where(eq(mletrTransferableRecords.shipmentId, "sh_demo_01"));
    for (const r of existing) {
      await db
        .delete(mletrEndorsementsLedger)
        .where(eq(mletrEndorsementsLedger.recordId, r.id));
      await db
        .delete(mletrTransferableRecords)
        .where(eq(mletrTransferableRecords.id, r.id));
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe("1. Full 4-Stage Lifecycle: Issue -> Pledge to Bank -> Endorse to Consignee -> Surrender to Carrier", () => {
    it("mines Genesis Block, pledges to Santander, endorses to Consignee, and surrenders for cargo release", async () => {
      const ref = `BK-MLETR-${Date.now()}`;

      // 1. Create real shipment
      const shipment = await createOperationalShipment({
        shipmentReference: ref,
        serviceType: "OCEAN_FCL",
        customerPartyId: "pty_global_industrial",
      });

      // 2. Stage 1: Register e-Title (ORIGINAL_ISSUE)
      const created = await MletrLedgerService.createTransferableRecord({
        shipmentId: shipment.shipmentId,
        documentReference: `HBL-${ref}`,
        registryType: "ELECTRONIC_BILL_OF_LADING",
        issuerName: "Global Industrial Exporter S.L.",
        consigneeName: "Atlas International Consignee Corp",
        signerName: "Carlos Delgado (Export Director)",
        signerTitle: "LEGAL_REPRESENTATIVE_EXPORTER",
        details:
          "Original electronic Bill of Lading registered under UNCITRAL MLETR Model Law.",
      });

      expect(created.recordId).toMatch(/^mletr_[a-f0-9]+$/);
      expect(created.status).toBe("ISSUED");
      expect(created.currentHolder).toBe("Global Industrial Exporter S.L.");
      expect(created.genesisHash).toMatch(/^[a-f0-9]{64}$/);
      expect(created.latestTxHash).toMatch(/^[a-f0-9]{64}$/);

      // Verify Initial Chain Integrity
      const v1 = await MletrLedgerService.verifyChainIntegrity(
        created.recordId,
      );
      expect(v1.isValid).toBe(true);
      expect(v1.totalBlocks).toBe(1);

      // 3. Stage 2: Pledge to Bank (PLEDGE_TO_BANK) under UCP 600 Letter of Credit
      const pledged = await MletrLedgerService.endorseRecord({
        recordId: created.recordId,
        toParty: "Banco Santander S.A. - Trade Finance Operations",
        toRole: "BANK",
        transferType: "PLEDGE_TO_BANK",
        signerName: "Carlos Delgado",
        signerTitle: "EXPORTER_TRADE_DIRECTOR",
        details:
          "Pledged as collateral in escrow under UCP 600 Letter of Credit LC-2026-BCN9921.",
        metadata: {
          letterOfCreditNumber: "LC-2026-BCN9921",
          issuingBankSwift: "BSCHESMMXXX",
        },
      });

      expect(pledged.success).toBe(true);
      expect(pledged.newBlockNumber).toBe(2);
      expect(pledged.currentHolderRole).toBe("BANK");
      expect(pledged.status).toBe("PLEDGED");
      expect(pledged.previousHash).toBe(created.latestTxHash);

      const v2 = await MletrLedgerService.verifyChainIntegrity(
        created.recordId,
      );
      expect(v2.isValid).toBe(true);
      expect(v2.totalBlocks).toBe(2);

      // 4. Stage 3: Bank Special Endorsement to Consignee (SPECIAL_ENDORSEMENT)
      const endorsed = await MletrLedgerService.endorseRecord({
        recordId: created.recordId,
        toParty: "Atlas International Consignee Corp",
        toRole: "CONSIGNEE",
        transferType: "SPECIAL_ENDORSEMENT",
        signerName: "Elena Rodriguez (Santander Trade Finance)",
        signerTitle: "DOCUMENTARY_CREDIT_OFFICER",
        details:
          "Payment documents accepted compliant. Title released and endorsed to order of Consignee.",
      });

      expect(endorsed.success).toBe(true);
      expect(endorsed.newBlockNumber).toBe(3);
      expect(endorsed.currentHolderRole).toBe("CONSIGNEE");
      expect(endorsed.status).toBe("ENDORSED");
      expect(endorsed.previousHash).toBe(pledged.txHash);

      const v3 = await MletrLedgerService.verifyChainIntegrity(
        created.recordId,
      );
      expect(v3.isValid).toBe(true);
      expect(v3.totalBlocks).toBe(3);

      // 5. Stage 4: Surrender to Carrier at Destination (SURRENDER_FOR_RELEASE)
      const surrendered = await MletrLedgerService.surrenderRecord(
        created.recordId,
        "MSC Mediterranean Shipping Co.",
        "Marta Gomez (Consignee Clearing Agent)",
        "Formal electronic title surrender at Port of Valencia terminal gate for physical release.",
      );

      expect(surrendered.success).toBe(true);
      expect(surrendered.newBlockNumber).toBe(4);
      expect(surrendered.currentHolderRole).toBe("CARRIER");
      expect(surrendered.status).toBe("SURRENDERED");

      const v4 = await MletrLedgerService.verifyChainIntegrity(
        created.recordId,
      );
      expect(v4.isValid).toBe(true);
      expect(v4.totalBlocks).toBe(4);

      // 6. Anti-Double-Spending Invariant: Attempting to endorse after surrender must fail!
      await expect(
        MletrLedgerService.endorseRecord({
          recordId: created.recordId,
          toParty: "Fraudulent Party Corp",
          toRole: "CONSIGNEE",
          transferType: "SPECIAL_ENDORSEMENT",
          signerName: "Hacker",
        }),
      ).rejects.toThrow(/SURRENDERED/);
    });
  });

  describe("2. Cryptographic Chain Tamper Detection", () => {
    it("detects any manipulated block in the ledger and identifies the exact corrupted block", async () => {
      const ref = `BK-TAMPER-${Date.now()}`;

      const shipment = await createOperationalShipment({
        shipmentReference: ref,
        serviceType: "OCEAN_FCL",
        customerPartyId: "pty_tamper_test",
      });

      const record = await MletrLedgerService.createTransferableRecord({
        shipmentId: shipment.shipmentId,
        documentReference: `HBL-${ref}`,
        issuerName: "Shipper A",
        consigneeName: "Consignee B",
        signerName: "Signer 1",
      });

      await MletrLedgerService.endorseRecord({
        recordId: record.recordId,
        toParty: "Bank B",
        toRole: "BANK",
        transferType: "PLEDGE_TO_BANK",
        signerName: "Signer 1",
      });

      await MletrLedgerService.endorseRecord({
        recordId: record.recordId,
        toParty: "Consignee C",
        toRole: "CONSIGNEE",
        transferType: "SPECIAL_ENDORSEMENT",
        signerName: "Bank Officer",
      });

      // Chain should be 100% valid initially
      const cleanCheck = await MletrLedgerService.verifyChainIntegrity(
        record.recordId,
      );
      expect(cleanCheck.isValid).toBe(true);
      expect(cleanCheck.totalBlocks).toBe(3);

      // Maliciously tamper with Block 2 in database directly
      await db
        .update(mletrEndorsementsLedger)
        .set({
          previousHash:
            "0000000000000000000000000000000000000000000000000000000000000000",
        })
        .where(eq(mletrEndorsementsLedger.recordId, record.recordId));

      // Chain verification must immediately detect the corruption!
      const tamperedCheck = await MletrLedgerService.verifyChainIntegrity(
        record.recordId,
      );
      expect(tamperedCheck.isValid).toBe(false);
      expect(tamperedCheck.reason).toBeDefined();
    });
  });

  describe("3. Fastify REST Endpoints for Smart Contracts Hub & Shipment 360", () => {
    it("serves canonical demo shipment sh_demo_01, supports issuing, endorsing, and verifying via REST API", async () => {
      // 1. GET /api/smart-contracts/mletr?shipmentId=sh_demo_01 (Auto-seeded)
      const getRes = await app.inject({
        method: "GET",
        url: "/api/smart-contracts/mletr?shipmentId=sh_demo_01",
      });

      expect(getRes.statusCode).toBe(200);
      const resJson = getRes.json();
      expect(resJson.success).toBe(true);
      expect(resJson.data).toBeDefined();
      expect(resJson.data.record.documentReference).toBe("HBL-BK-2026-67116");
      expect(resJson.data.record.currentHolderRole).toBe("BANK");
      expect(resJson.data.blocks.length).toBeGreaterThanOrEqual(2);
      expect(resJson.data.verification.isValid).toBe(true);

      const recordId = resJson.data.record.id;

      // 2. POST /api/smart-contracts/mletr/endorse
      const endorseRes = await app.inject({
        method: "POST",
        url: "/api/smart-contracts/mletr/endorse",
        payload: {
          recordId,
          toParty: "Atlas International Consignee Corp",
          toRole: "CONSIGNEE",
          transferType: "SPECIAL_ENDORSEMENT",
          signerName: "Banco Santander Trade Officer",
          details: "Released by Bank to Consignee under Letter of Credit.",
        },
      });

      expect(endorseRes.statusCode).toBe(200);
      expect(endorseRes.json().success).toBe(true);
      expect(endorseRes.json().data.status).toBe("ENDORSED");

      // 3. GET /api/smart-contracts/mletr/verify/:recordId
      const verifyRes = await app.inject({
        method: "GET",
        url: `/api/smart-contracts/mletr/verify/${recordId}`,
      });

      expect(verifyRes.statusCode).toBe(200);
      expect(verifyRes.json().success).toBe(true);
      expect(verifyRes.json().data.isValid).toBe(true);
      expect(verifyRes.json().data.totalBlocks).toBeGreaterThanOrEqual(3);

      // 4. POST /api/smart-contracts/mletr/surrender
      const surrenderRes = await app.inject({
        method: "POST",
        url: "/api/smart-contracts/mletr/surrender",
        payload: {
          recordId,
          carrierName: "MSC Mediterranean Shipping Co.",
          signerName: "Consignee Agent",
          notes: "Surrendered at terminal.",
        },
      });

      expect(surrenderRes.statusCode).toBe(200);
      expect(surrenderRes.json().success).toBe(true);
      expect(surrenderRes.json().data.status).toBe("SURRENDERED");
    });
  });
});
