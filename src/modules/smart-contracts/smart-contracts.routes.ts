import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  BlockchainBlock,
  DigitalBillOfLadingMLETR,
  SmartEscrowContract,
  SMART_CONTRACTS_PRESETS,
  createBlock,
  verifyChainIntegrity,
  endorseEblTitle,
  evaluateSmartEscrowMilestone,
  triggerEscrowDispute,
  EscrowMilestoneKey,
  BlockchainEventType,
} from "@atlas/shared";

// In-memory active contract state initialized to Shanghai-Valencia full flow
let activeState = {
  ...SMART_CONTRACTS_PRESETS.shanghai_valencia_full_success,
};

const SelectPresetSchema = z.object({
  scenarioId: z.enum([
    "shanghai_valencia_full_success",
    "mletr_bank_endorsement",
    "tampered_seal_dispute",
  ]),
});

const IngestOracleEventSchema = z.object({
  milestoneKey: z.enum([
    "EBL_ISSUED",
    "VESSEL_DEPARTED",
    "SEAL_VERIFIED",
    "CUSTOMS_CLEARED",
    "DISCHARGED_PORT",
    "PROOF_OF_DELIVERY",
  ] as [EscrowMilestoneKey, ...EscrowMilestoneKey[]]),
  sender: z.string().min(2),
  details: z.string().min(3),
  iotTelemetry: z
    .object({
      temperatureCelsius: z.number().optional(),
      humidityPercent: z.number().optional(),
      batteryPercent: z.number().optional(),
      isoSealNumber: z.string().optional(),
      sealStatus: z.enum(["INTACT", "TAMPERED", "VERIFIED"]),
    })
    .optional(),
});

const EndorseTitleSchema = z.object({
  toParty: z.string().min(2),
  transferType: z.enum(["SPECIAL_ENDORSEMENT", "PLEDGE_TO_BANK", "BLANK_ENDORSEMENT"]).default("SPECIAL_ENDORSEMENT"),
  signerName: z.string().optional(),
});

const TriggerDisputeSchema = z.object({
  reason: z.string().min(5),
});

export const smartContractsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/smart-contracts/ledger
  fastify.get("/ledger", async () => {
    const chainVerification = verifyChainIntegrity(activeState.ledger);
    return {
      success: true,
      scenarioId: activeState.scenarioId,
      title: activeState.title,
      description: activeState.description,
      ebl: activeState.ebl,
      escrow: activeState.escrow,
      ledger: activeState.ledger,
      chainVerification,
    };
  });

  // GET /api/smart-contracts/presets
  fastify.get("/presets", async () => {
    return {
      success: true,
      presets: SMART_CONTRACTS_PRESETS,
    };
  });

  // POST /api/smart-contracts/select-preset
  fastify.post("/select-preset", async (request, reply) => {
    try {
      const { scenarioId } = SelectPresetSchema.parse(request.body);
      const preset = SMART_CONTRACTS_PRESETS[scenarioId];
      if (!preset) {
        return reply.code(404).send({ success: false, error: "Escenario no encontrado" });
      }
      activeState = {
        scenarioId: preset.scenarioId,
        title: preset.title,
        description: preset.description,
        ebl: { ...preset.ebl, endorsements: [...preset.ebl.endorsements] },
        escrow: { ...preset.escrow, conditions: [...preset.escrow.conditions] },
        ledger: [...preset.ledger],
      };

      return reply.send({
        success: true,
        data: activeState,
      });
    } catch (err: any) {
      return reply.code(400).send({ success: false, error: err.message });
    }
  });

  // POST /api/smart-contracts/oracle-event
  fastify.post("/oracle-event", async (request, reply) => {
    try {
      const parsed = IngestOracleEventSchema.parse(request.body);

      const lastBlock = activeState.ledger[activeState.ledger.length - 1];
      const newBlockNumber = lastBlock ? lastBlock.blockNumber + 1 : 1;
      const prevHash = lastBlock ? lastBlock.txHash : "0000000000000000000000000000000000000000000000000000000000000000";

      // Map milestoneKey to blockchain event type
      let eventType: BlockchainEventType = "TELEMETRY_PING";
      if (parsed.milestoneKey === "VESSEL_DEPARTED") eventType = "VESSEL_DEPARTED";
      if (parsed.milestoneKey === "SEAL_VERIFIED") eventType = "SEAL_INSPECTED";
      if (parsed.milestoneKey === "CUSTOMS_CLEARED") eventType = "CUSTOMS_CLEARED";
      if (parsed.milestoneKey === "DISCHARGED_PORT") eventType = "CONTAINER_DISCHARGED";
      if (parsed.milestoneKey === "PROOF_OF_DELIVERY") eventType = "PROOF_OF_DELIVERY";

      const newBlock = createBlock(newBlockNumber, prevHash, {
        event: eventType,
        contractId: activeState.escrow.contractId,
        eblNumber: activeState.ebl.eblNumber,
        containerNo: activeState.ebl.containerNumber,
        sender: parsed.sender,
        details: parsed.details,
        iotTelemetry: parsed.iotTelemetry,
      });

      // Update escrow conditions
      const evaluation = evaluateSmartEscrowMilestone(
        activeState.escrow,
        parsed.milestoneKey,
        parsed.sender,
        newBlockNumber
      );

      activeState.ledger.push(newBlock);
      activeState.escrow = evaluation.updatedContract;

      // If auto-settled, append settlement block
      if (evaluation.isAutoSettled) {
        const settlementBlock = createBlock(newBlockNumber + 1, newBlock.txHash, {
          event: "SMART_CONTRACT_SETTLEMENT",
          contractId: activeState.escrow.contractId,
          eblNumber: activeState.ebl.eblNumber,
          sender: "Atlas Smart Escrow VM",
          details: `Liquidación automática ejecutada: $${activeState.escrow.releasedAmountUsd.toLocaleString()} USD transferidos al beneficiario ${activeState.escrow.beneficiaryName}.`,
          metadata: { settlementTxHash: activeState.escrow.settlementTxHash },
        });
        activeState.ledger.push(settlementBlock);
        activeState.ebl.status = "SURRENDERED";
      }

      return reply.send({
        success: true,
        data: {
          block: newBlock,
          escrow: activeState.escrow,
          ebl: activeState.ebl,
          isAutoSettled: evaluation.isAutoSettled,
        },
      });
    } catch (err: any) {
      return reply.code(400).send({ success: false, error: err.message });
    }
  });

  // POST /api/smart-contracts/endorse-title
  fastify.post("/endorse-title", async (request, reply) => {
    try {
      const parsed = EndorseTitleSchema.parse(request.body);
      const { updatedEbl, endorsementRecord } = endorseEblTitle(
        activeState.ebl,
        parsed.toParty,
        parsed.transferType,
        parsed.signerName || activeState.ebl.currentTitleHolder
      );

      activeState.ebl = updatedEbl;

      const lastBlock = activeState.ledger[activeState.ledger.length - 1];
      const newBlockNumber = lastBlock ? lastBlock.blockNumber + 1 : 1;
      const prevHash = lastBlock ? lastBlock.txHash : "0000000000000000000000000000000000000000000000000000000000000000";

      const endorsementBlock = createBlock(newBlockNumber, prevHash, {
        event: "TITLE_ENDORSED",
        eblNumber: activeState.ebl.eblNumber,
        sender: endorsementRecord.fromParty,
        details: `Endoso de título e-BL (Ley Modelo MLETR) transmitido a favor de: ${parsed.toParty}.`,
        metadata: { endorsement: endorsementRecord },
      });

      activeState.ledger.push(endorsementBlock);

      return reply.send({
        success: true,
        data: {
          ebl: activeState.ebl,
          endorsement: endorsementRecord,
          block: endorsementBlock,
        },
      });
    } catch (err: any) {
      return reply.code(400).send({ success: false, error: err.message });
    }
  });

  // POST /api/smart-contracts/verify-chain
  fastify.post("/verify-chain", async () => {
    const verification = verifyChainIntegrity(activeState.ledger);
    return {
      success: true,
      verification,
      totalBlocks: activeState.ledger.length,
    };
  });

  // POST /api/smart-contracts/trigger-dispute
  fastify.post("/trigger-dispute", async (request, reply) => {
    try {
      const { reason } = TriggerDisputeSchema.parse(request.body);
      activeState.escrow = triggerEscrowDispute(activeState.escrow, reason);

      const lastBlock = activeState.ledger[activeState.ledger.length - 1];
      const newBlockNumber = lastBlock ? lastBlock.blockNumber + 1 : 1;
      const prevHash = lastBlock ? lastBlock.txHash : "0000000000000000000000000000000000000000000000000000000000000000";

      const disputeBlock = createBlock(newBlockNumber, prevHash, {
        event: "ESCROW_DISPUTED",
        contractId: activeState.escrow.contractId,
        eblNumber: activeState.ebl.eblNumber,
        sender: "Security Oracle Guardian",
        details: `Disputa contractual registrada: ${reason}. Fondos congelados preventivamente.`,
      });

      activeState.ledger.push(disputeBlock);

      return reply.send({
        success: true,
        data: {
          escrow: activeState.escrow,
          block: disputeBlock,
        },
      });
    } catch (err: any) {
      return reply.code(400).send({ success: false, error: err.message });
    }
  });
};

export default smartContractsRoutes;
