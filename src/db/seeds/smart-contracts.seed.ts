import { db } from "../index.js";
import * as schema from "../schema/index.js";

export async function seedSmartContracts(): Promise<void> {
  console.log(
    "⛓️ [SMART-CONTRACTS] Sembrando contratos inteligentes y bloques blockchain...",
  );

  const contract = {
    id: "sc_sh_demo_01",
    shipmentId: "sh_demo_01",
    title:
      "Contrato Escrow Inteligente MLETR - Shanghai a Valencia (MSC OSCAR)",
    description:
      "Liquidacion automatizada de flete y gastos de terminal sujeta a oraculos DCSA y despacho aduanero DUA.",
    carrierScac: "MSCU",
    shipperName: "Iberia Global Exports S.L.",
    consigneeName: "American Logistic Hub LLC",
    escrowAmountEur: 145000,
    escrowStatus: "MILESTONE_IN_PROGRESS" as const,
    disputeReason: null,
    eblDataJson: JSON.stringify({
      eblNumber: "BL-ATLS-2026-67116",
      carrier: "MSC Mediterranean Shipping Company",
      carrierScac: "MSCU",
      shipper: "Iberia Global Exports S.L.",
      consignee: "American Logistic Hub LLC",
      titleHolder: "Iberia Global Exports S.L.",
      vesselName: "MSC OSCAR",
      voyageNumber: "VOY-2026-88",
      portOfLoading: "CNSHA",
      portOfDischarge: "ESVLC",
      containerNumber: "MSKU9284712",
      issueDate: "2026-11-01T10:00:00Z",
      status: "ISSUED",
      endorsementChain: [
        {
          fromParty: "MSC Mediterranean Shipping Company",
          toParty: "Iberia Global Exports S.L.",
          timestamp: "2026-11-01T10:00:00Z",
          transferType: "SPECIAL_ENDORSEMENT",
        },
      ],
    }),
    milestonesDataJson: JSON.stringify({
      EBL_ISSUED: {
        title: "Emisión de Conocimiento Digital (e-BL)",
        percentage: 20,
        amountEur: 29000,
        completed: true,
        completedAt: "2026-11-01T10:00:00Z",
      },
      VESSEL_DEPARTED: {
        title: "Zarpe del Buque de Origen (DCSA 315 / VD)",
        percentage: 30,
        amountEur: 43500,
        completed: true,
        completedAt: "2026-11-02T16:30:00Z",
      },
      SEAL_VERIFIED: {
        title: "Verificación Telemática de Precinto IoT",
        percentage: 15,
        amountEur: 21750,
        completed: true,
        completedAt: "2026-11-03T12:00:00Z",
      },
      CUSTOMS_CLEARED: {
        title: "Levante Aduanero de Importación (Circuito Verde DUA)",
        percentage: 15,
        amountEur: 21750,
        completed: false,
      },
      DISCHARGED_PORT: {
        title: "Descarga en Muelle y Entrada en Terminal",
        percentage: 10,
        amountEur: 14500,
        completed: false,
      },
      PROOF_OF_DELIVERY: {
        title: "Entrega Final y Cierre e-CMR / e-BL",
        percentage: 10,
        amountEur: 14500,
        completed: false,
      },
    }),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await db
    .insert(schema.smartEscrowContracts)
    .values(contract)
    .onConflictDoUpdate({
      target: schema.smartEscrowContracts.id,
      set: contract,
    });

  const blocks = [
    {
      id: "blk_sh_demo_01_0",
      contractId: "sc_sh_demo_01",
      blockNumber: 0,
      timestamp: "2026-11-01T10:00:00.000Z",
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
      createdAt: 1793775000000,
    },
    {
      id: "blk_sh_demo_01_1",
      contractId: "sc_sh_demo_01",
      blockNumber: 1,
      timestamp: "2026-11-02T16:30:00.000Z",
      previousHash:
        "e4a2c9183d719280b1e42847c92b8d00923184912839b1a0942c718293849182",
      blockHash:
        "91b8273645c10928374650192837465019283746501928374650192837465019",
      eventType: "VESSEL_DEPARTED",
      payloadDataJson: JSON.stringify({
        milestone: "VESSEL_DEPARTED",
        actor: "DCSA Port Authority Oracle",
        details:
          "Zarpe confirmado del buque MSC OSCAR en terminal Shanghai Yangshan.",
      }),
      signer: "ORACLE-DCSA-CNSHA",
      createdAt: 1793779000000,
    },
    {
      id: "blk_sh_demo_01_2",
      contractId: "sc_sh_demo_01",
      blockNumber: 2,
      timestamp: "2026-11-03T12:00:00.000Z",
      previousHash:
        "91b8273645c10928374650192837465019283746501928374650192837465019",
      blockHash:
        "1829304958671829304958671829304958671829304958671829304958671829",
      eventType: "SEAL_VERIFIED",
      payloadDataJson: JSON.stringify({
        milestone: "SEAL_VERIFIED",
        actor: "IoT Telemetry Smart Gateway",
        details:
          "Precinto ISO 17712 verificado sin manipulacion durante la travesia.",
        isoSealNumber: "SEAL-MSC-99120",
        sealStatus: "VERIFIED",
      }),
      signer: "IOT-GATEWAY-MSKU9284712",
      createdAt: 1793783000000,
    },
  ];

  for (const blk of blocks) {
    await db.insert(schema.blockchainBlocks).values(blk).onConflictDoUpdate({
      target: schema.blockchainBlocks.id,
      set: blk,
    });
  }

  console.log(
    "✅ [SMART-CONTRACTS] Contratos e-BL y bloques blockchain sembrados con éxito.",
  );
}
