/**
 * @file useSmartContracts.ts
 * @description Custom domain hook and filtering helpers for Smart Contracts, e-BL MLETR & Escrow DLT.
 * @module @atlas/frontend/components/SmartContracts/hooks
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { useState } from "react";
import {
  useApiMutation,
  useApiQuery,
  useQueryClient,
} from "../../../hooks/useApiQuery";
import { useShipments } from "../../../hooks/useShipments";
import type {
  BlockchainBlock,
  BlockchainEventType,
  EscrowMilestoneKey,
} from "@atlas/shared";
import type {
  EndorseTransferType,
  LedgerApiResponse,
  VerificationFeedbackState,
} from "../../../types/smart-contracts.types";

export function filterLedgerBlocks(
  ledger: BlockchainBlock[],
  searchBlockQuery: string,
  filterEvent: string,
): BlockchainBlock[] {
  const q = searchBlockQuery.toLowerCase();
  return ledger.filter((block) => {
    const matchesSearch =
      searchBlockQuery === "" ||
      block.txHash.toLowerCase().includes(q) ||
      block.payload.sender.toLowerCase().includes(q) ||
      block.payload.details.toLowerCase().includes(q) ||
      block.payload.event.toLowerCase().includes(q);

    const matchesEvent =
      filterEvent === "ALL" || block.payload.event === filterEvent;
    return matchesSearch && matchesEvent;
  });
}

export function getEventBadgeClass(event: BlockchainEventType): string {
  switch (event) {
    case "GENESIS":
      return "bg-slate-700 text-slate-200 border-slate-600";
    case "EBL_ISSUED":
    case "TITLE_ENDORSED":
      return "bg-sky-500/10 text-sky-400 border-sky-500/30";
    case "ESCROW_DEPOSITED":
    case "SMART_CONTRACT_SETTLEMENT":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    case "SEAL_INSPECTED":
    case "CUSTOMS_CLEARED":
    case "CONTAINER_DISCHARGED":
    case "PROOF_OF_DELIVERY":
      return "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
    case "SEAL_TAMPER_ALERT":
    case "ESCROW_DISPUTED":
      return "bg-rose-500/10 text-rose-400 border-rose-500/30";
    default:
      return "bg-slate-800 text-slate-300 border-slate-700";
  }
}

export function useSmartContracts() {
  const queryClient = useQueryClient();
  const [selectedShipmentId, setSelectedShipmentId] =
    useState<string>("sh_demo_01");

  const { data: shipments = [] } = useShipments();
  const activeShipment =
    shipments.find((s) => s.id === selectedShipmentId) || shipments[0];

  const [selectedBlock, setSelectedBlock] = useState<BlockchainBlock | null>(
    null,
  );
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [searchBlockQuery, setSearchBlockQuery] = useState("");
  const [filterEvent, setFilterEvent] = useState<string>("ALL");

  // Modals state
  const [isEndorseModalOpen, setIsEndorseModalOpen] = useState(false);
  const [endorseToParty, setEndorseToParty] = useState("");
  const [endorseType, setEndorseType] = useState<EndorseTransferType>(
    "SPECIAL_ENDORSEMENT",
  );
  const [endorseSigner, setEndorseSigner] = useState("");

  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  const [verificationFeedback, setVerificationFeedback] =
    useState<VerificationFeedbackState | null>(null);

  const {
    data: ledgerData,
    isLoading,
    refetch: refetchLedger,
  } = useApiQuery<LedgerApiResponse>(
    ["smart-contracts-ledger", selectedShipmentId],
    `/smart-contracts/ledger?shipmentId=${selectedShipmentId}`,
  );

  const deployMutation = useApiMutation<any, { shipmentId: string }>(
    "/smart-contracts/deploy-for-shipment",
    "POST",
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["smart-contracts-ledger", selectedShipmentId],
        });
        refetchLedger();
      },
    },
  );

  const oracleEventMutation = useApiMutation<
    any,
    {
      milestoneKey: EscrowMilestoneKey;
      sender: string;
      details: string;
      iotTelemetry?: any;
    }
  >("/smart-contracts/oracle-event", "POST", {
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["smart-contracts-ledger", selectedShipmentId],
      });
      refetchLedger();
    },
  });

  const endorseTitleMutation = useApiMutation<
    any,
    { toParty: string; transferType: string; signerName?: string }
  >("/smart-contracts/endorse-title", "POST", {
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["smart-contracts-ledger", selectedShipmentId],
      });
      refetchLedger();
      setIsEndorseModalOpen(false);
      setEndorseToParty("");
      setEndorseSigner("");
    },
  });

  const triggerDisputeMutation = useApiMutation<any, { reason: string }>(
    "/smart-contracts/trigger-dispute",
    "POST",
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["smart-contracts-ledger", selectedShipmentId],
        });
        refetchLedger();
        setIsDisputeModalOpen(false);
        setDisputeReason("");
      },
    },
  );

  const verifyChainMutation = useApiMutation<any, void>(
    "/smart-contracts/verify-chain",
    "POST",
    {
      onSuccess: (data) => {
        setVerificationFeedback({
          show: true,
          isValid: data.verification.isValid,
          totalBlocks: data.totalBlocks,
          message: data.verification.isValid
            ? `Cadena criptográfica íntegra: ${data.totalBlocks} bloques validados con hashes SHA-256 y enlaces parentales inalterados.`
            : `Error de integridad: ${data.verification.reason}`,
        });
      },
    },
  );

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleDownloadLedger = () => {
    if (!ledgerData) return;
    const blob = new Blob([JSON.stringify(ledgerData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atlas-dlt-ledger-${ledgerData.scenarioId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredBlocks = ledgerData
    ? filterLedgerBlocks(ledgerData.ledger, searchBlockQuery, filterEvent)
    : [];

  return {
    selectedShipmentId,
    setSelectedShipmentId,
    shipments,
    activeShipment,
    selectedBlock,
    setSelectedBlock,
    copiedHash,
    copyToClipboard,
    searchBlockQuery,
    setSearchBlockQuery,
    filterEvent,
    setFilterEvent,
    isEndorseModalOpen,
    setIsEndorseModalOpen,
    endorseToParty,
    setEndorseToParty,
    endorseType,
    setEndorseType,
    endorseSigner,
    setEndorseSigner,
    isDisputeModalOpen,
    setIsDisputeModalOpen,
    disputeReason,
    setDisputeReason,
    verificationFeedback,
    setVerificationFeedback,
    ledgerData,
    isLoading,
    filteredBlocks,
    deployMutation,
    oracleEventMutation,
    endorseTitleMutation,
    triggerDisputeMutation,
    verifyChainMutation,
    handleDownloadLedger,
  };
}
