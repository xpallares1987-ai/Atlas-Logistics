/**
 * @file SmartContractsModule.tsx
 * @description Orchestrator for Smart Contracts, e-BL MLETR & Escrow (DLT Merkle DAG).
 * @module @atlas/frontend/pages
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Suspense, lazy } from "react";
import { RefreshCw } from "lucide-react";
import {
  Header,
  RelationalDeployment,
  SmartEscrowCard,
  EblMletrTracker,
  DltLedgerVisualizer,
  useSmartContracts,
} from "../components/SmartContracts";

const EndorseTitle = lazy(
  () => import("../components/SmartContracts/Modal/EndorseTitle"),
);
const TriggerDispute = lazy(
  () => import("../components/SmartContracts/Modal/TriggerDispute"),
);

export default function SmartContractsModule() {
  const {
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
  } = useSmartContracts();

  if (isLoading || !ledgerData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-sm text-slate-400 font-medium">
          Cargando libro mayor distribuido y contratos inteligentes DLT...
        </p>
      </div>
    );
  }

  const { ebl, escrow, ledger, chainVerification } = ledgerData;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto text-slate-100">
      <Header
        chainVerification={chainVerification}
        isVerifying={verifyChainMutation.isPending}
        onVerifyChain={() => verifyChainMutation.mutate()}
        onDownloadLedger={handleDownloadLedger}
        verificationFeedback={verificationFeedback}
        onDismissFeedback={() => setVerificationFeedback(null)}
      />

      <RelationalDeployment
        escrow={escrow}
        ledgerLength={ledger.length}
        title={ledgerData.title}
        activeShipment={activeShipment}
        shipments={shipments}
        selectedShipmentId={selectedShipmentId}
        onSelectShipmentId={setSelectedShipmentId}
        onDeploy={() =>
          deployMutation.mutate({ shipmentId: selectedShipmentId })
        }
        isDeploying={deployMutation.isPending}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 flex flex-col gap-6">
          <SmartEscrowCard
            escrow={escrow}
            ebl={ebl}
            isOraclePending={oracleEventMutation.isPending}
            onTriggerOracle={(payload) => oracleEventMutation.mutate(payload)}
            onOpenDisputeModal={() => setIsDisputeModalOpen(true)}
          />

          <EblMletrTracker
            ebl={ebl}
            copiedHash={copiedHash}
            onCopyHash={copyToClipboard}
            onOpenEndorseModal={() => setIsEndorseModalOpen(true)}
          />
        </div>

        <div className="lg:col-span-7 flex flex-col gap-4">
          <DltLedgerVisualizer
            ledger={ledger}
            filteredBlocks={filteredBlocks}
            selectedBlock={selectedBlock}
            onSelectBlock={setSelectedBlock}
            searchBlockQuery={searchBlockQuery}
            onSearchBlockQueryChange={setSearchBlockQuery}
            filterEvent={filterEvent}
            onFilterEventChange={setFilterEvent}
            copiedHash={copiedHash}
            onCopyHash={copyToClipboard}
          />
        </div>
      </div>

      {isEndorseModalOpen && (
        <Suspense fallback={null}>
          <EndorseTitle
            isOpen={isEndorseModalOpen}
            onClose={() => setIsEndorseModalOpen(false)}
            currentTitleHolder={ebl.currentTitleHolder}
            endorseToParty={endorseToParty}
            setEndorseToParty={setEndorseToParty}
            endorseType={endorseType}
            setEndorseType={setEndorseType}
            endorseSigner={endorseSigner}
            setEndorseSigner={setEndorseSigner}
            onSubmitEndorse={() =>
              endorseTitleMutation.mutate({
                toParty: endorseToParty,
                transferType: endorseType,
                signerName: endorseSigner || undefined,
              })
            }
            isPending={endorseTitleMutation.isPending}
          />
        </Suspense>
      )}

      {isDisputeModalOpen && (
        <Suspense fallback={null}>
          <TriggerDispute
            isOpen={isDisputeModalOpen}
            onClose={() => setIsDisputeModalOpen(false)}
            totalAmountUsd={escrow.totalAmountUsd}
            disputeReason={disputeReason}
            setDisputeReason={setDisputeReason}
            onSubmitDispute={() =>
              triggerDisputeMutation.mutate({ reason: disputeReason })
            }
            isPending={triggerDisputeMutation.isPending}
          />
        </Suspense>
      )}
    </div>
  );
}
