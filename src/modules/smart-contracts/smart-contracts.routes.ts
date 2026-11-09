import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../../db/index.js";
import * as schema from "../../db/schema/index.js";
import { eq, asc } from "drizzle-orm";
import { MletrLedgerService } from "../../services/mletr/mletr-ledger.service.js";
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
  transferType: z
    .enum(["SPECIAL_ENDORSEMENT", "PLEDGE_TO_BANK", "BLANK_ENDORSEMENT"])
    .default("SPECIAL_ENDORSEMENT"),
  signerName: z.string().optional(),
});

const TriggerDisputeSchema = z.object({
  reason: z.string().min(5),
});

const MletrIssueSchema = z.object({
  documentId: z.string().optional(),
  shipmentId: z.string().min(1),
  registryType: z
    .enum([
      "ELECTRONIC_BILL_OF_LADING",
      "ELECTRONIC_AIR_WAYBILL",
      "ELECTRONIC_CMR",
    ])
    .optional(),
  documentReference: z.string().min(1),
  issuerName: z.string().min(1),
  consigneeName: z.string().min(1),
  signerName: z.string().optional(),
  signerTitle: z.string().optional(),
  details: z.string().optional(),
});

const MletrEndorseSchema = z.object({
  recordId: z.string().min(1),
  toParty: z.string().min(1),
  toRole: z
    .enum(["SHIPPER", "BANK", "CONSIGNEE", "CARRIER"])
    .default("CONSIGNEE"),
  transferType: z
    .enum([
      "ORIGINAL_ISSUE",
      "PLEDGE_TO_BANK",
      "SPECIAL_ENDORSEMENT",
      "SURRENDER_FOR_RELEASE",
      "VOID_RECORD",
    ])
    .default("SPECIAL_ENDORSEMENT"),
  signerName: z.string().optional(),
  signerTitle: z.string().optional(),
  details: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const MletrSurrenderSchema = z.object({
  recordId: z.string().min(1),
  carrierName: z.string().optional(),
  signerName: z.string().optional(),
  notes: z.string().optional(),
});

export const smartContractsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/smart-contracts/mletr
  fastify.get("/mletr", async (request, reply) => {
    try {
      const { shipmentId, recordId } = request.query as {
        shipmentId?: string;
        recordId?: string;
      };

      if (recordId) {
        const data = await MletrLedgerService.getRecordWithLedger(recordId);
        if (!data)
          return reply
            .code(404)
            .send({ success: false, error: "Record not found" });
        return reply.send({ success: true, data });
      }

      const targetShipmentId = shipmentId || "sh_demo_01";
      let data =
        await MletrLedgerService.findRecordByShipmentId(targetShipmentId);

      // Defensive auto-seed for sh_demo_01 if not yet created
      if (!data && targetShipmentId === "sh_demo_01") {
        const created = await MletrLedgerService.createTransferableRecord({
          shipmentId: "sh_demo_01",
          documentReference: "HBL-BK-2026-67116",
          registryType: "ELECTRONIC_BILL_OF_LADING",
          issuerName: "Global Industrial Exporter S.L.",
          consigneeName: "Atlas International Consignee Corp",
          signerName: "Carlos Delgado (Export Compliance Officer)",
          signerTitle: "LEGAL_REPRESENTATIVE_EXPORTER",
          details:
            "Genesis e-BL issued under UNCITRAL MLETR Model Law. Initial holder: Global Industrial Exporter S.L.",
        });

        // Automatically pledge to Banco Santander
        await MletrLedgerService.endorseRecord({
          recordId: created.recordId,
          toParty: "Banco Santander S.A. - Trade Finance Operations",
          toRole: "BANK",
          transferType: "PLEDGE_TO_BANK",
          signerName: "Carlos Delgado",
          signerTitle: "EXPORTER_TRADE_DIRECTOR",
          details:
            "Title pledged in escrow under UCP 600 Letter of Credit LC-2026-BCN9921.",
        });

        data = await MletrLedgerService.findRecordByShipmentId("sh_demo_01");
      }

      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.code(500).send({ success: false, error: err.message });
    }
  });

  // POST /api/smart-contracts/mletr/issue
  fastify.post("/mletr/issue", async (request, reply) => {
    try {
      const parsed = MletrIssueSchema.parse(request.body);
      const user = (request as any).user;
      const signer =
        parsed.signerName || user?.username || user?.id || parsed.issuerName;
      const result = await MletrLedgerService.createTransferableRecord({
        ...parsed,
        signerName: signer,
      });
      return reply.code(201).send({ success: true, data: result });
    } catch (err: any) {
      return reply.code(400).send({ success: false, error: err.message });
    }
  });

  // POST /api/smart-contracts/mletr/endorse
  fastify.post("/mletr/endorse", async (request, reply) => {
    try {
      const parsed = MletrEndorseSchema.parse(request.body);
      const user = (request as any).user;
      const signer =
        parsed.signerName ||
        user?.username ||
        user?.id ||
        "Trade Finance Specialist";
      const result = await MletrLedgerService.endorseRecord({
        recordId: parsed.recordId,
        toParty: parsed.toParty,
        toRole: parsed.toRole,
        transferType: parsed.transferType,
        signerName: signer,
        signerTitle: parsed.signerTitle,
        details: parsed.details,
        metadata: parsed.metadata,
      });
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.code(400).send({ success: false, error: err.message });
    }
  });

  // POST /api/smart-contracts/mletr/surrender
  fastify.post("/mletr/surrender", async (request, reply) => {
    try {
      const parsed = MletrSurrenderSchema.parse(request.body);
      const user = (request as any).user;
      const signer =
        parsed.signerName ||
        user?.username ||
        user?.id ||
        "Consignee Clearing Agent";
      const result = await MletrLedgerService.surrenderRecord(
        parsed.recordId,
        parsed.carrierName || "MSC Mediterranean Shipping Co.",
        signer,
        parsed.notes,
      );
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.code(400).send({ success: false, error: err.message });
    }
  });

  // GET /api/smart-contracts/mletr/verify/:recordId
  fastify.get("/mletr/verify/:recordId", async (request, reply) => {
    try {
      const { recordId } = request.params as { recordId: string };
      const verification =
        await MletrLedgerService.verifyChainIntegrity(recordId);
      return reply.send({ success: true, data: verification });
    } catch (err: any) {
      return reply.code(400).send({ success: false, error: err.message });
    }
  });
  // GET /api/smart-contracts/ledger (supports ?shipmentId=...)
  fastify.get("/ledger", async (request) => {
    const { shipmentId } = request.query as { shipmentId?: string };

    if (shipmentId) {
      const [contract] = await db
        .select()
        .from(schema.smartEscrowContracts)
        .where(eq(schema.smartEscrowContracts.shipmentId, shipmentId))
        .limit(1);

      if (contract) {
        const blocks = await db
          .select()
          .from(schema.blockchainBlocks)
          .where(eq(schema.blockchainBlocks.contractId, contract.id))
          .orderBy(asc(schema.blockchainBlocks.blockNumber));

        const formattedLedger: BlockchainBlock[] = blocks.map((b) => ({
          blockNumber: b.blockNumber,
          timestamp: b.timestamp,
          prevHash: b.previousHash,
          txHash: b.blockHash,
          merkleRoot:
            "0000000000000000000000000000000000000000000000000000000000000000",
          payload: JSON.parse(b.payloadDataJson),
          signature: `ecdsa:${b.signer}`,
          gasUsed: 21000,
          nonce: 1000 + b.blockNumber,
        }));

        const chainVerification = verifyChainIntegrity(formattedLedger);
        const parsedMilestones = JSON.parse(contract.milestonesDataJson);
        const parsedEbl = JSON.parse(contract.eblDataJson);
        const conditions = Array.isArray(parsedMilestones?.conditions)
          ? parsedMilestones.conditions
          : [
              {
                milestoneKey: "EBL_ISSUED" as const,
                description:
                  parsedMilestones?.EBL_ISSUED?.title ||
                  "Emisión y registro del e-BL en el Ledger DLT MLETR",
                isCompleted: !!parsedMilestones?.EBL_ISSUED?.completed,
                completedAt: parsedMilestones?.EBL_ISSUED?.completedAt,
                verificationSource: "Carrier Signing Authority",
              },
              {
                milestoneKey: "VESSEL_DEPARTED" as const,
                description:
                  parsedMilestones?.VESSEL_DEPARTED?.title ||
                  "Zarpada de buque confirmada por telemetría AIS portuaria",
                isCompleted: !!parsedMilestones?.VESSEL_DEPARTED?.completed,
                completedAt: parsedMilestones?.VESSEL_DEPARTED?.completedAt,
                verificationSource: "DCSA Port Authority Oracle",
              },
              {
                milestoneKey: "SEAL_VERIFIED" as const,
                description:
                  parsedMilestones?.SEAL_VERIFIED?.title ||
                  "Inspección de precinto ISO 17712 intacto sin alertas de violación",
                isCompleted: !!parsedMilestones?.SEAL_VERIFIED?.completed,
                completedAt: parsedMilestones?.SEAL_VERIFIED?.completedAt,
                verificationSource: "IoT Telemetry Smart Gateway",
              },
              {
                milestoneKey: "CUSTOMS_CLEARED" as const,
                description:
                  parsedMilestones?.CUSTOMS_CLEARED?.title ||
                  "Despacho Aduanero con Certificado Pre-Despacho",
                isCompleted: !!parsedMilestones?.CUSTOMS_CLEARED?.completed,
                completedAt: parsedMilestones?.CUSTOMS_CLEARED?.completedAt,
                verificationSource: "SAT Customs Node",
              },
              {
                milestoneKey: "DISCHARGED_PORT" as const,
                description:
                  parsedMilestones?.DISCHARGED_PORT?.title ||
                  "Descarga en terminal portuaria y confirmación de Gate-In / Gate-Out",
                isCompleted: !!parsedMilestones?.DISCHARGED_PORT?.completed,
                completedAt: parsedMilestones?.DISCHARGED_PORT?.completedAt,
                verificationSource: "Terminal Operating System (TOS)",
              },
              {
                milestoneKey: "PROOF_OF_DELIVERY" as const,
                description:
                  parsedMilestones?.PROOF_OF_DELIVERY?.title ||
                  "Prueba de entrega (POD) firmada criptográficamente por consignatario",
                isCompleted: !!parsedMilestones?.PROOF_OF_DELIVERY?.completed,
                completedAt: parsedMilestones?.PROOF_OF_DELIVERY?.completedAt,
                verificationSource: "Consignee Digital e-CMR",
              },
            ];

        const mletrData =
          await MletrLedgerService.findRecordByShipmentId(shipmentId);
        const eblEndorsements =
          mletrData && mletrData.blocks.length > 0
            ? mletrData.blocks.map((b) => ({
                endorsementId: b.id,
                fromParty: b.fromParty,
                toParty: b.toParty,
                timestamp: b.createdAt
                  ? new Date(b.createdAt).toISOString()
                  : new Date().toISOString(),
                transferType: b.transferType as any,
                digitalSignature: b.signature,
                transactionHash: b.txHash,
              }))
            : parsedEbl?.endorsements || parsedEbl?.endorsementChain || [];

        const enrichedEbl = mletrData
          ? {
              ...parsedEbl,
              eblNumber:
                mletrData.record.documentReference || parsedEbl.eblNumber,
              currentTitleHolder:
                mletrData.record.currentHolder || parsedEbl.currentTitleHolder,
              status:
                mletrData.record.status === "SURRENDERED"
                  ? "SURRENDERED"
                  : mletrData.record.totalEndorsements > 0
                    ? "ENDORSED"
                    : "ISSUED",
              endorsements: eblEndorsements,
              electronicRecordHash:
                mletrData.record.genesisHash || parsedEbl.electronicRecordHash,
            }
          : {
              ...parsedEbl,
              endorsements: eblEndorsements,
            };

        return {
          success: true,
          scenarioId: contract.id,
          title: contract.title,
          description: contract.description,
          ebl: enrichedEbl,
          escrow: {
            contractId: contract.id,
            eblNumber: parsedEbl.eblNumber || "BL-ATLS-2026-67116",
            totalAmountUsd: contract.escrowAmountEur,
            currency: "EUR",
            payerName: contract.consigneeName,
            beneficiaryName: contract.shipperName,
            escrowBankOrVault: "Atlas Vault Smart Escrow Node (Multi-Sig 2/3)",
            fundedAt: new Date(contract.createdAt).toISOString(),
            status: contract.escrowStatus as any,
            conditions,
            releasedAmountUsd:
              (conditions.filter((c: any) => c.isCompleted).length *
                contract.escrowAmountEur) /
              conditions.length,
            disputeReason: contract.disputeReason,
          },
          ledger: formattedLedger,
          chainVerification,
        };
      }
    }

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

  // POST /api/smart-contracts/deploy-for-shipment (Direct Operational Action)
  fastify.post("/deploy-for-shipment", async (request, reply) => {
    const { shipmentId, escrowAmountEur } = request.body as {
      shipmentId: string;
      escrowAmountEur?: number;
    };
    if (!shipmentId) {
      return reply.status(400).send({ error: "shipmentId is required" });
    }

    const [shipment] = await db
      .select()
      .from(schema.shipments)
      .where(eq(schema.shipments.id, shipmentId))
      .limit(1);

    if (!shipment) {
      return reply
        .status(404)
        .send({ error: `Shipment not found: ${shipmentId}` });
    }

    const contractId = `sc_${shipment.id}`;
    const amount = escrowAmountEur || 145000;

    const eblData = {
      eblNumber: `BL-ATLS-2026-${shipment.id.replace(/\D/g, "") || "67116"}`,
      carrier: "MSC Mediterranean Shipping Company",
      carrierScac: "MSCU",
      shipper: "Iberia Global Exports S.L.",
      consignee: "American Logistic Hub LLC",
      titleHolder: "Iberia Global Exports S.L.",
      vesselName: shipment.vesselName || "MSC OSCAR",
      voyageNumber: shipment.voyageNumber || "VOY-2026-88",
      portOfLoading: shipment.origin || "CNSHA",
      portOfDischarge: shipment.destination || "ESVLC",
      containerNumber: "MSKU9284712",
      issueDate: new Date().toISOString(),
      status: "ISSUED",
      endorsementChain: [
        {
          fromParty: "MSC Mediterranean Shipping Company",
          toParty: "Iberia Global Exports S.L.",
          timestamp: new Date().toISOString(),
          transferType: "SPECIAL_ENDORSEMENT",
        },
      ],
    };

    const milestonesData = {
      EBL_ISSUED: {
        title: "Emisión de Conocimiento Digital (e-BL)",
        percentage: 20,
        amountEur: amount * 0.2,
        completed: true,
        completedAt: new Date().toISOString(),
      },
      VESSEL_DEPARTED: {
        title: "Zarpe del Buque de Origen (DCSA 315 / VD)",
        percentage: 30,
        amountEur: amount * 0.3,
        completed: false,
      },
      SEAL_VERIFIED: {
        title: "Verificación Telemática de Precinto IoT",
        percentage: 15,
        amountEur: amount * 0.15,
        completed: false,
      },
      CUSTOMS_CLEARED: {
        title: "Levante Aduanero de Importación (Circuito Verde DUA)",
        percentage: 15,
        amountEur: amount * 0.15,
        completed: false,
      },
      DISCHARGED_PORT: {
        title: "Descarga en Muelle y Entrada en Terminal",
        percentage: 10,
        amountEur: amount * 0.1,
        completed: false,
      },
      PROOF_OF_DELIVERY: {
        title: "Entrega Final y Cierre e-CMR / e-BL",
        percentage: 10,
        amountEur: amount * 0.1,
        completed: false,
      },
    };

    const contractRecord = {
      id: contractId,
      shipmentId: shipment.id,
      title: `Contrato Escrow Inteligente MLETR - ${shipment.origin || "CNSHA"} a ${shipment.destination || "ESVLC"}`,
      description:
        "Liquidacion automatizada de flete sujeta a oraculos DCSA y despacho DUA.",
      carrierScac: "MSCU",
      shipperName: "Iberia Global Exports S.L.",
      consigneeName: "American Logistic Hub LLC",
      escrowAmountEur: amount,
      escrowStatus: "FUNDED" as const,
      disputeReason: null,
      eblDataJson: JSON.stringify(eblData),
      milestonesDataJson: JSON.stringify(milestonesData),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db
      .insert(schema.smartEscrowContracts)
      .values(contractRecord)
      .onConflictDoUpdate({
        target: schema.smartEscrowContracts.id,
        set: contractRecord,
      });

    const genesisBlockRecord = {
      id: `blk_${shipment.id}_0`,
      contractId: contractId,
      blockNumber: 0,
      timestamp: new Date().toISOString(),
      previousHash:
        "0000000000000000000000000000000000000000000000000000000000000000",
      blockHash:
        "e4a2c9183d719280b1e42847c92b8d00923184912839b1a0942c718293849182",
      eventType: "EBL_ISSUED",
      payloadDataJson: JSON.stringify({
        milestone: "EBL_ISSUED",
        actor: "MSC Mediterranean Shipping Company",
        details:
          "Conocimiento de embarque electrónico emitido bajo ley modelo MLETR.",
      }),
      signer: "MSCU-OFFICIAL-KEY-2026",
      createdAt: Date.now(),
    };

    await db
      .insert(schema.blockchainBlocks)
      .values(genesisBlockRecord)
      .onConflictDoUpdate({
        target: schema.blockchainBlocks.id,
        set: genesisBlockRecord,
      });

    return reply.status(200).send({
      success: true,
      contract: contractRecord,
      genesisBlock: genesisBlockRecord,
    });
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
        return reply
          .code(404)
          .send({ success: false, error: "Escenario no encontrado" });
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
      const prevHash = lastBlock
        ? lastBlock.txHash
        : "0000000000000000000000000000000000000000000000000000000000000000";

      // Map milestoneKey to blockchain event type
      let eventType: BlockchainEventType = "TELEMETRY_PING";
      if (parsed.milestoneKey === "VESSEL_DEPARTED")
        eventType = "VESSEL_DEPARTED";
      if (parsed.milestoneKey === "SEAL_VERIFIED") eventType = "SEAL_INSPECTED";
      if (parsed.milestoneKey === "CUSTOMS_CLEARED")
        eventType = "CUSTOMS_CLEARED";
      if (parsed.milestoneKey === "DISCHARGED_PORT")
        eventType = "CONTAINER_DISCHARGED";
      if (parsed.milestoneKey === "PROOF_OF_DELIVERY")
        eventType = "PROOF_OF_DELIVERY";

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
        newBlockNumber,
      );

      activeState.ledger.push(newBlock);
      activeState.escrow = evaluation.updatedContract;

      // If auto-settled, append settlement block
      if (evaluation.isAutoSettled) {
        const settlementBlock = createBlock(
          newBlockNumber + 1,
          newBlock.txHash,
          {
            event: "SMART_CONTRACT_SETTLEMENT",
            contractId: activeState.escrow.contractId,
            eblNumber: activeState.ebl.eblNumber,
            sender: "Atlas Smart Escrow VM",
            details: `Liquidación automática ejecutada: $${activeState.escrow.releasedAmountUsd.toLocaleString()} USD transferidos al beneficiario ${activeState.escrow.beneficiaryName}.`,
            metadata: { settlementTxHash: activeState.escrow.settlementTxHash },
          },
        );
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
        parsed.signerName || activeState.ebl.currentTitleHolder,
      );

      activeState.ebl = updatedEbl;

      const lastBlock = activeState.ledger[activeState.ledger.length - 1];
      const newBlockNumber = lastBlock ? lastBlock.blockNumber + 1 : 1;
      const prevHash = lastBlock
        ? lastBlock.txHash
        : "0000000000000000000000000000000000000000000000000000000000000000";

      const endorsementBlock = createBlock(newBlockNumber, prevHash, {
        event: "TITLE_ENDORSED",
        eblNumber: activeState.ebl.eblNumber,
        sender: endorsementRecord.fromParty,
        details: `Endoso de título e-BL (Ley Modelo MLETR) transmitido a favor de: ${parsed.toParty}.`,
        metadata: { endorsement: endorsementRecord },
      });

      activeState.ledger.push(endorsementBlock);

      // Synchronize persistence into SQLite MLETR transferable ledger
      try {
        const shipmentId = (request.query as any)?.shipmentId || "sh_demo_01";
        const existingMletr =
          await MletrLedgerService.findRecordByShipmentId(shipmentId);
        if (existingMletr) {
          await MletrLedgerService.endorseRecord({
            recordId: existingMletr.record.id,
            toParty: parsed.toParty,
            toRole:
              parsed.transferType === "PLEDGE_TO_BANK" ? "BANK" : "CONSIGNEE",
            transferType: parsed.transferType as any,
            signerName: parsed.signerName || existingMletr.record.currentHolder,
            details: `Endoso de título e-BL MLETR transmitido a favor de: ${parsed.toParty}.`,
          });
        }
      } catch {
        // Defensive synchronization fallback
      }

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
      const prevHash = lastBlock
        ? lastBlock.txHash
        : "0000000000000000000000000000000000000000000000000000000000000000";

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

  // POST /api/smart-contracts/deposit-escrow
  fastify.post("/deposit-escrow", async (request, reply) => {
    try {
      const body = (request.body as any) || {};
      const block = recordEscrowDeposit({
        contractId: body.contractId || `escrow_${Date.now()}`,
        eblNumber: body.eblNumber || `EBL-${Date.now()}`,
        sender: body.sender || "Client Shipper",
        amountUsd: Number(body.amountUsd || 2500),
        details:
          body.details ||
          "Depósito en garantía contractual bloqueado para reserva de flete.",
        metadata: body.metadata,
      });

      return reply.send({
        success: true,
        data: {
          escrow: activeState.escrow,
          block,
        },
      });
    } catch (err: any) {
      return reply.code(400).send({ success: false, error: err.message });
    }
  });
};

export function recordEscrowDeposit(input: {
  contractId: string;
  eblNumber: string;
  sender: string;
  amountUsd: number;
  details: string;
  metadata?: Record<string, any>;
}): BlockchainBlock {
  const lastBlock = activeState.ledger[activeState.ledger.length - 1];
  const newBlockNumber = lastBlock ? lastBlock.blockNumber + 1 : 1;
  const prevHash = lastBlock
    ? lastBlock.txHash
    : "0000000000000000000000000000000000000000000000000000000000000000";

  const block = createBlock(newBlockNumber, prevHash, {
    event: "ESCROW_DEPOSITED",
    contractId: input.contractId,
    eblNumber: input.eblNumber,
    sender: input.sender,
    details: input.details,
    metadata: {
      amountUsd: input.amountUsd,
      ...input.metadata,
    },
  });

  activeState.ledger.push(block);
  activeState.escrow.status = "FUNDED";
  activeState.escrow.totalAmountUsd = input.amountUsd;

  return block;
}

export function getSmartContractsActiveState() {
  return activeState;
}

export default smartContractsRoutes;
