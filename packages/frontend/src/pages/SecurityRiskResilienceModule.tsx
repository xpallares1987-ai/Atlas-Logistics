/**
 * @file SecurityRiskResilienceModule.tsx
 * @description Orchestrator page for the Security, Risk & Resilience Center (FIDO2 Passkeys, TOTP, WebCrypto, Multimodal Risk Scorer, Offline Queue).
 * @module @atlas/frontend/pages
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import React, { Suspense } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Header,
  Navigation,
  PasskeysTotp,
  useSecurityRisk,
} from "../components/SecurityRisk";

// ============================================================================
// 1. LAZY-LOADED SECONDARY TABS
// ============================================================================

const DigitalSignatures = React.lazy(() =>
  import("../components/SecurityRisk/Tab/DigitalSignatures").then((m) => ({
    default: m.DigitalSignatures,
  })),
);
const RiskUnlocode = React.lazy(() =>
  import("../components/SecurityRisk/Tab/RiskUnlocode").then((m) => ({
    default: m.RiskUnlocode,
  })),
);
const OfflineResilience = React.lazy(() =>
  import("../components/SecurityRisk/Tab/OfflineResilience").then((m) => ({
    default: m.OfflineResilience,
  })),
);

// ============================================================================
// 2. MODULE ORCHESTRATOR
// ============================================================================

export default function SecurityRiskResilienceModule() {
  const vm = useSecurityRisk();

  return (
    <div className="space-y-6">
      <Header
        riskScore={vm.riskResult.score}
        riskBadgeText={vm.riskBadge.text}
        offlineTotal={vm.offlineStats.total}
      />

      <Navigation
        activeTab={vm.activeTab}
        onSelectTab={vm.setActiveTab}
        isOnline={vm.isOnline}
      />

      <AnimatePresence mode="wait">
        {vm.activeTab === "PASSKEYS_TOTP" && (
          <PasskeysTotp
            userEmail={vm.userEmail}
            setUserEmail={vm.setUserEmail}
            manifestId={vm.manifestId}
            setManifestId={vm.setManifestId}
            deviceModel={vm.deviceModel}
            setDeviceModel={vm.setDeviceModel}
            isAuthenticating={vm.isAuthenticating}
            passkeyResult={vm.passkeyResult}
            registeredKeys={vm.registeredKeys}
            onTestPasskeyAuth={vm.handleTestPasskeyAuth}
            totpSecret={vm.totpSecret}
            totpInputCode={vm.totpInputCode}
            setTotpInputCode={vm.setTotpInputCode}
            totpVerificationStatus={vm.totpVerificationStatus}
            backupCodes={vm.backupCodes}
            onVerifyTotp={vm.handleVerifyTotp}
            onGenerateNewSecret={vm.handleGenerateNewSecret}
          />
        )}

        <Suspense
          fallback={
            <div className="p-8 text-center text-xs text-slate-400">
              Cargando módulo de seguridad...
            </div>
          }
        >
          {vm.activeTab === "DIGITAL_SIGNATURES" && (
            <DigitalSignatures
              docType={vm.docType}
              setDocType={vm.setDocType}
              docId={vm.docId}
              setDocId={vm.setDocId}
              issuerOrg={vm.issuerOrg}
              setIssuerOrg={vm.setIssuerOrg}
              docPayload={vm.docPayload}
              setDocPayload={vm.setDocPayload}
              digitalSeal={vm.digitalSeal}
              tamperedPayload={vm.tamperedPayload}
              setTamperedPayload={vm.setTamperedPayload}
              tamperVerificationResult={vm.tamperVerificationResult}
              onSignDocument={vm.handleSignDocument}
              onVerifyTampering={vm.handleVerifyTampering}
            />
          )}

          {vm.activeTab === "RISK_UNLOCODE" && (
            <RiskUnlocode
              originPort={vm.originPort}
              setOriginPort={vm.setOriginPort}
              destinationPort={vm.destinationPort}
              setDestinationPort={vm.setDestinationPort}
              transportType={vm.transportType}
              setTransportType={vm.setTransportType}
              isHighPriority={vm.isHighPriority}
              setIsHighPriority={vm.setIsHighPriority}
              shipmentStatus={vm.shipmentStatus}
              setShipmentStatus={vm.setShipmentStatus}
              predictedDelay={vm.predictedDelay}
              setPredictedDelay={vm.setPredictedDelay}
              riskResult={vm.riskResult}
              riskBadge={vm.riskBadge}
              unlocodeQuery={vm.unlocodeQuery}
              unlocodeCountry={vm.unlocodeCountry}
              unlocodeResults={vm.unlocodeResults}
              onSearchUnlocodes={vm.handleSearchUnlocodes}
            />
          )}

          {vm.activeTab === "OFFLINE_RESILIENCE" && (
            <OfflineResilience
              isOnline={vm.isOnline}
              offlineStats={vm.offlineStats}
              offlineDocs={vm.offlineDocs}
              isSyncingQueue={vm.isSyncingQueue}
              onAddSampleOfflineDoc={vm.handleAddSampleOfflineDoc}
              onProcessSyncQueue={vm.handleProcessSyncQueue}
              onClearDeadLetter={vm.handleClearDeadLetter}
            />
          )}
        </Suspense>
      </AnimatePresence>
    </div>
  );
}
