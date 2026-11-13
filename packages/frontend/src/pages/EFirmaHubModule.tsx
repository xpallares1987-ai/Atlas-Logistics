/**
 * @file EFirmaHubModule.tsx
 * @description Orchestrator page for the SAT e.firma Hub & Zero-Knowledge WebCrypto Vault.
 * @module @atlas/frontend/pages/EFirmaHubModule
 * @see {@link docs/adr/0020-modular-file-size-guardrails.md}
 */

import { AnimatePresence } from "framer-motion";
import {
  Header,
  Navigation,
  RelationalDocumentSelector,
  SigningStudio,
  VaultCert,
  PublicVerifier,
  useEFirmaHub,
} from "../components/EFirmaHub";

export default function EFirmaHubModule() {
  const {
    activeTab,
    setActiveTab,
    selectedShipmentId,
    setSelectedShipmentId,
    selectedDocId,
    setSelectedDocId,
    shipments,
    activeShipment,
    documents,
    activeDocument,
    stamps,
    matchingStamp,
    activeCertificate,
    isVaultUnlocked,
    vaultExpiresInMinutes,
    cerFileName,
    keyFileName,
    setKeyFileName,
    passphrase,
    setPassphrase,
    loadingUnlock,
    signingPayload,
    setSigningPayload,
    generatedCadenaOriginal,
    activeSealResult,
    activeAuditStamp,
    isSigning,
    copiedCadena,
    copiedSello,
    verifierCadena,
    setVerifierCadena,
    verifierSello,
    setVerifierSello,
    verifierSerial,
    setVerifierSerial,
    verifierRfc,
    setVerifierRfc,
    verificationFeedback,
    isVerifying,
    handleLoadSandboxCredentials,
    handleLockVault,
    handleCerFileUpload,
    handleExecuteSign,
    handleCopyCadena,
    handleCopySello,
    handleTestVerify,
  } = useEFirmaHub();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      <Header
        isVaultUnlocked={isVaultUnlocked}
        vaultExpiresInMinutes={vaultExpiresInMinutes}
      />

      <RelationalDocumentSelector
        shipments={shipments}
        activeShipment={activeShipment}
        selectedShipmentId={selectedShipmentId}
        onSelectShipmentId={setSelectedShipmentId}
        documents={documents}
        activeDocument={activeDocument}
        selectedDocId={selectedDocId}
        onSelectDocId={setSelectedDocId}
        matchingStamp={matchingStamp}
        isSigning={isSigning}
        isVaultUnlocked={isVaultUnlocked}
        onExecuteSign={handleExecuteSign}
      />

      <Navigation activeTab={activeTab} onSelectTab={setActiveTab} />

      <AnimatePresence mode="wait">
        {activeTab === "SIGNING_STUDIO" && (
          <SigningStudio
            signingPayload={signingPayload}
            onChangeSigningPayload={setSigningPayload}
            generatedCadenaOriginal={generatedCadenaOriginal}
            copiedCadena={copiedCadena}
            onCopyCadena={handleCopyCadena}
            isVaultUnlocked={isVaultUnlocked}
            activeCertificate={activeCertificate}
            isSigning={isSigning}
            onExecuteSign={handleExecuteSign}
            activeSealResult={activeSealResult}
            copiedSello={copiedSello}
            onCopySello={handleCopySello}
            activeAuditStamp={activeAuditStamp}
            onSelectTab={setActiveTab}
          />
        )}

        {activeTab === "VAULT_CERT" && (
          <VaultCert
            isVaultUnlocked={isVaultUnlocked}
            cerFileName={cerFileName}
            keyFileName={keyFileName}
            onCerFileUpload={handleCerFileUpload}
            onKeyFileSelect={setKeyFileName}
            passphrase={passphrase}
            onChangePassphrase={setPassphrase}
            loadingUnlock={loadingUnlock}
            onLoadSandboxCredentials={handleLoadSandboxCredentials}
            onLockVault={handleLockVault}
            activeCertificate={activeCertificate}
          />
        )}

        {activeTab === "PUBLIC_VERIFIER" && (
          <PublicVerifier
            verifierCadena={verifierCadena}
            onChangeVerifierCadena={setVerifierCadena}
            verifierSello={verifierSello}
            onChangeVerifierSello={setVerifierSello}
            verifierSerial={verifierSerial}
            onChangeVerifierSerial={setVerifierSerial}
            verifierRfc={verifierRfc}
            onChangeVerifierRfc={setVerifierRfc}
            isVerifying={isVerifying}
            onTestVerify={handleTestVerify}
            verificationFeedback={verificationFeedback}
            stamps={stamps}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
