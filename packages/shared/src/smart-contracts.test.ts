import { describe, it, expect } from "vitest";
import {
  sha256,
  calculateMerkleRoot,
  createGenesisBlock,
  createBlock,
  verifyChainIntegrity,
  createDigitalEbl,
  endorseEblTitle,
  createSmartEscrowContract,
  evaluateSmartEscrowMilestone,
  triggerEscrowDispute,
  SMART_CONTRACTS_PRESETS,
} from "./smart-contracts.js";

describe("Smart Contracts, e-BL MLETR & Cryptographic Escrow Engine", () => {
  describe("Cryptographic SHA-256 & Merkle Tree", () => {
    it("should produce standard deterministic SHA-256 hashes", () => {
      const emptyHash = sha256("");
      expect(emptyHash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");

      const testHash = sha256("ATLAS_LOGISTICS_2026");
      expect(testHash.length).toBe(64);
      expect(sha256("ATLAS_LOGISTICS_2026")).toBe(testHash);
    });

    it("should calculate correct Merkle Root for arbitrary lists of transactions", () => {
      const rootEmpty = calculateMerkleRoot([]);
      expect(rootEmpty.length).toBe(64);

      const items = ["tx1_ebl_created", "tx2_escrow_funded", "tx3_vessel_departed"];
      const root1 = calculateMerkleRoot(items);
      const root2 = calculateMerkleRoot(items);
      expect(root1).toBe(root2);
      expect(root1.length).toBe(64);
    });
  });

  describe("Blockchain DLT Ledger & Integrity Verification", () => {
    it("should generate a valid genesis block and append sequential blocks", () => {
      const genesis = createGenesisBlock();
      expect(genesis.blockNumber).toBe(0);
      expect(genesis.prevHash).toBe("0000000000000000000000000000000000000000000000000000000000000000");

      const block1 = createBlock(1, genesis.txHash, {
        event: "EBL_ISSUED",
        sender: "MSC Carrier Node",
        details: "Issued e-BL #MEDU-1234",
      });
      expect(block1.blockNumber).toBe(1);
      expect(block1.prevHash).toBe(genesis.txHash);
      expect(block1.txHash.length).toBe(64);

      const integrity = verifyChainIntegrity([genesis, block1]);
      expect(integrity.isValid).toBe(true);
    });

    it("should detect tampering if a block is altered in the chain", () => {
      const genesis = createGenesisBlock();
      const b1 = createBlock(1, genesis.txHash, {
        event: "ESCROW_DEPOSITED",
        sender: "Buyer",
        details: "Deposited $10,000 USD",
      });
      const b2 = createBlock(2, b1.txHash, {
        event: "CUSTOMS_CLEARED",
        sender: "Customs Oracle",
        details: "Cleared green channel",
      });

      // Tamper b1's txHash
      const tamperedB1 = { ...b1, txHash: "000000000000000000000000000000000000000000000000000000000000ffff" };

      const check = verifyChainIntegrity([genesis, tamperedB1, b2]);
      expect(check.isValid).toBe(false);
      expect(check.corruptedBlockNumber).toBe(2);
      expect(check.reason).toContain("Enlace roto");
    });
  });

  describe("Digital Bill of Lading (UNCITRAL MLETR)", () => {
    it("should issue an electronic Bill of Lading with valid electronic record hash", () => {
      const ebl = createDigitalEbl({
        eblNumber: "HBL-2026-0091",
        bookingReference: "BKG-0091",
        vesselName: "MAERSK MC-KINNEY MOLLER",
        voyageNumber: "2601W",
        portOfLoading: "CNSHA",
        portOfDischarge: "ESVLC",
        carrierName: "Maersk",
        shipperName: "Shenzhen Global Tech",
        consigneeName: "Iberian Logistics S.A.",
        notifyParty: "Banco Santander",
        goodsDescription: "Lithium Ion Battery Modules",
        grossWeightKg: 14500,
        totalVolumeCbm: 58.2,
        containerNumber: "MSKU1092834",
        isoSealNumber: "MSK-SEC-091",
      });

      expect(ebl.status).toBe("ISSUED");
      expect(ebl.currentTitleHolder).toBe("Shenzhen Global Tech");
      expect(ebl.electronicRecordHash.length).toBe(64);
      expect(ebl.isNegotiable).toBe(true);
    });

    it("should endorse title to Bank or Consignee under MLETR rules", () => {
      const ebl = createDigitalEbl({
        eblNumber: "HBL-2026-0092",
        bookingReference: "BKG-0092",
        vesselName: "MSC OSCAR",
        voyageNumber: "2602E",
        portOfLoading: "CNQIN",
        portOfDischarge: "ESBCN",
        carrierName: "MSC",
        shipperName: "Qingdao Solar Co.",
        consigneeName: "TO ORDER",
        notifyParty: "Solaria Energia",
        goodsDescription: "Solar Inverters",
        grossWeightKg: 12000,
        totalVolumeCbm: 45.0,
        containerNumber: "MEDU8821943",
        isoSealNumber: "MSC-77491",
      });

      const { updatedEbl, endorsementRecord } = endorseEblTitle(
        ebl,
        "Banco Santander S.A. (Trade Finance)",
        "PLEDGE_TO_BANK"
      );

      expect(updatedEbl.status).toBe("ENDORSED");
      expect(updatedEbl.currentTitleHolder).toBe("Banco Santander S.A. (Trade Finance)");
      expect(updatedEbl.endorsements.length).toBe(1);
      expect(endorsementRecord.fromParty).toBe("Qingdao Solar Co.");
      expect(endorsementRecord.transferType).toBe("PLEDGE_TO_BANK");
    });
  });

  describe("Smart Escrow Multi-Milestone Settlement", () => {
    it("should initialize escrow contract with 6 conditions", () => {
      const escrow = createSmartEscrowContract({
        contractId: "ESCROW-991",
        eblNumber: "HBL-991",
        totalAmountUsd: 50000,
        payerName: "Consignee S.L.",
        beneficiaryName: "Shipper Co.",
      });

      expect(escrow.status).toBe("FUNDED");
      expect(escrow.conditions.length).toBe(6);
      expect(escrow.conditions[0].isCompleted).toBe(true); // EBL_ISSUED
      expect(escrow.releasedAmountUsd).toBe(0);
    });

    it("should automatically release escrow funds once all milestones are confirmed", () => {
      let escrow = createSmartEscrowContract({
        contractId: "ESCROW-992",
        eblNumber: "HBL-992",
        totalAmountUsd: 35000,
        payerName: "Buyer Inc.",
        beneficiaryName: "Seller Ltd.",
      });

      // Progressively confirm milestones
      escrow = evaluateSmartEscrowMilestone(escrow, "VESSEL_DEPARTED", "AIS Oracle", 2).updatedContract;
      escrow = evaluateSmartEscrowMilestone(escrow, "SEAL_VERIFIED", "IoT Smart Lock", 3).updatedContract;
      escrow = evaluateSmartEscrowMilestone(escrow, "CUSTOMS_CLEARED", "Customs Authority", 4).updatedContract;
      escrow = evaluateSmartEscrowMilestone(escrow, "DISCHARGED_PORT", "Terminal Gate OCR", 5).updatedContract;
      
      expect(escrow.status).toBe("MILESTONES_IN_PROGRESS");
      expect(escrow.releasedAmountUsd).toBe(0);

      // Confirm final milestone (POD)
      const finalResult = evaluateSmartEscrowMilestone(escrow, "PROOF_OF_DELIVERY", "Consignee Signature", 6);
      expect(finalResult.isAutoSettled).toBe(true);
      expect(finalResult.updatedContract.status).toBe("AUTO_RELEASED");
      expect(finalResult.updatedContract.releasedAmountUsd).toBe(35000);
      expect(finalResult.updatedContract.settlementTxHash).toBeDefined();
    });

    it("should freeze funds when an escrow dispute is triggered", () => {
      const escrow = createSmartEscrowContract({
        contractId: "ESCROW-993",
        eblNumber: "HBL-993",
        totalAmountUsd: 28000,
        payerName: "Buyer",
        beneficiaryName: "Seller",
      });

      const disputed = triggerEscrowDispute(escrow, "Precinto violentado detectado por sensor IoT.");
      expect(disputed.status).toBe("DISPUTED");
      expect(disputed.disputeReason).toContain("Precinto violentado");

      // Attempting to evaluate milestone on disputed escrow should not auto-release
      const attempt = evaluateSmartEscrowMilestone(disputed, "PROOF_OF_DELIVERY", "Oracle");
      expect(attempt.isAutoSettled).toBe(false);
      expect(attempt.updatedContract.status).toBe("DISPUTED");
    });
  });

  describe("Pre-Configured Demo Scenarios", () => {
    it("should provide 3 valid demo presets with verified blockchain ledgers", () => {
      const presets = Object.values(SMART_CONTRACTS_PRESETS);
      expect(presets.length).toBe(3);

      for (const preset of presets) {
        expect(preset.ebl).toBeDefined();
        expect(preset.escrow).toBeDefined();
        expect(preset.ledger.length).toBeGreaterThanOrEqual(5);

        const check = verifyChainIntegrity(preset.ledger);
        expect(check.isValid).toBe(true);
      }

      // Check specific scenario details
      expect(SMART_CONTRACTS_PRESETS.shanghai_valencia_full_success.escrow.status).toBe("AUTO_RELEASED");
      expect(SMART_CONTRACTS_PRESETS.mletr_bank_endorsement.ebl.status).toBe("ENDORSED");
      expect(SMART_CONTRACTS_PRESETS.tampered_seal_dispute.escrow.status).toBe("DISPUTED");
    });
  });
});
