/**
 * @file smart-contracts.types.ts
 * @description Types and interfaces for Smart Contracts, e-BL MLETR & Escrow (DLT Merkle DAG).
 * @module @atlas/frontend/types
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import type {
  BlockchainBlock,
  DigitalBillOfLadingMLETR,
  SmartEscrowContract,
  EscrowMilestoneKey,
} from "@atlas/shared";

export type EndorseTransferType =
  "SPECIAL_ENDORSEMENT" | "PLEDGE_TO_BANK" | "BLANK_ENDORSEMENT";

export interface LedgerApiResponse {
  success: boolean;
  scenarioId: string;
  title: string;
  description: string;
  ebl: DigitalBillOfLadingMLETR;
  escrow: SmartEscrowContract;
  ledger: BlockchainBlock[];
  chainVerification: {
    isValid: boolean;
    corruptedBlockNumber?: number;
    reason?: string;
  };
}

export interface VerificationFeedbackState {
  show: boolean;
  isValid: boolean;
  totalBlocks: number;
  message: string;
}

export interface SmartContractsHeaderProps {
  chainVerification: LedgerApiResponse["chainVerification"];
  isVerifying: boolean;
  onVerifyChain: () => void;
  onDownloadLedger: () => void;
  verificationFeedback: VerificationFeedbackState | null;
  onDismissFeedback: () => void;
}

export interface RelationalDeploymentBannerProps {
  escrow: SmartEscrowContract;
  ledgerLength: number;
  title: string;
  activeShipment: any;
  shipments: any[];
  selectedShipmentId: string;
  onSelectShipmentId: (id: string) => void;
  onDeploy: () => void;
  isDeploying: boolean;
}

export interface SmartEscrowCardProps {
  escrow: SmartEscrowContract;
  ebl: DigitalBillOfLadingMLETR;
  isOraclePending: boolean;
  onTriggerOracle: (payload: {
    milestoneKey: EscrowMilestoneKey;
    sender: string;
    details: string;
    iotTelemetry?: any;
  }) => void;
  onOpenDisputeModal: () => void;
}

export interface EblMletrTrackerProps {
  ebl: DigitalBillOfLadingMLETR;
  copiedHash: string | null;
  onCopyHash: (text: string, id: string) => void;
  onOpenEndorseModal: () => void;
}

export interface DltLedgerVisualizerProps {
  ledger: BlockchainBlock[];
  filteredBlocks: BlockchainBlock[];
  selectedBlock: BlockchainBlock | null;
  onSelectBlock: (block: BlockchainBlock | null) => void;
  searchBlockQuery: string;
  onSearchBlockQueryChange: (q: string) => void;
  filterEvent: string;
  onFilterEventChange: (evt: string) => void;
  copiedHash: string | null;
  onCopyHash: (text: string, id: string) => void;
}

export interface EndorseTitleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTitleHolder: string;
  endorseToParty: string;
  setEndorseToParty: (val: string) => void;
  endorseType: EndorseTransferType;
  setEndorseType: (val: EndorseTransferType) => void;
  endorseSigner: string;
  setEndorseSigner: (val: string) => void;
  onSubmitEndorse: () => void;
  isPending: boolean;
}

export interface TriggerDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmountUsd: number;
  disputeReason: string;
  setDisputeReason: (val: string) => void;
  onSubmitDispute: () => void;
  isPending: boolean;
}
