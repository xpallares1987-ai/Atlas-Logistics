/**
 * @file SystemPanelModule.tsx
 * @description Orchestrator for System Administration Panel, multi-phase seed injection, and AI Studio gateway.
 * @module @atlas/frontend/pages/SystemPanelModule
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import { useState, useEffect, lazy, Suspense } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useResolutionNotesStore } from "../store/useResolutionNotesStore";
import {
  Header,
  Navigation,
  NewNote,
  Resolutions,
  Rbac,
  DatabaseSeed,
  useDatabaseSeed,
  useGeminiGateway,
} from "../components/SystemPanel";
import type { SystemSubTab } from "../types/system-panel.types";

// ============================================================================
// LAZY-LOADED ADMINISTRATIVE TABS
// ============================================================================
const IntegrationsTab = lazy(
  () => import("../components/SystemPanel/Tab/Integrations"),
);
const ControlPlaneTab = lazy(
  () => import("../components/SystemPanel/Tab/ControlPlane"),
);
const SecurityVaultTab = lazy(
  () => import("../components/SystemPanel/Tab/SecurityVault"),
);
const WebhooksTab = lazy(
  () => import("../components/SystemPanel/Tab/Webhooks"),
);

function TabSkeleton() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 animate-pulse space-y-4">
      <div className="h-6 bg-slate-800 rounded-xl w-1/3" />
      <div className="h-4 bg-slate-800/60 rounded-xl w-1/2" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <div className="h-32 bg-slate-950/60 rounded-2xl" />
        <div className="h-32 bg-slate-950/60 rounded-2xl" />
        <div className="h-32 bg-slate-950/60 rounded-2xl" />
      </div>
    </div>
  );
}

export type { SystemSubTab };

export default function SystemPanelModule() {
  // ============================================================================
  // 1. STATE & HOOKS
  // ============================================================================
  const { user } = useAuth();
  const role = user?.role || "OPERATIONS";

  const isAdmin = role === "ADMIN";
  const isManagerOrAdmin =
    role === "ADMIN" || role === "MANAGER" || role === "EXECUTIVE";

  const [activeSubTab, setActiveSubTab] = useState<SystemSubTab>("RESOLUTIONS");
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [simulatedRole, setSimulatedRole] = useState(role);

  const [isRebuilding, setIsRebuilding] = useState(false);
  const [rebuildSuccess, setRebuildSuccess] = useState(false);

  // Resolution notes store
  const { notes, addNote, deleteNote, resetToDefaults } =
    useResolutionNotesStore();

  // Custom domain hooks
  const {
    seedStatus,
    isLoadingStatus,
    isSeeding,
    activeSeedingPhase,
    seedResult,
    setSeedResult,
    fetchSeedStatus,
    triggerSeed,
  } = useDatabaseSeed();

  const {
    aiStatus,
    apiKeyInput,
    setApiKeyInput,
    isSavingKey,
    keySaveFeedback,
    copilotPrompt,
    setCopilotPrompt,
    isRunningCopilot,
    copilotResponse,
    isGeneratingBriefing,
    executiveBriefing,
    setExecutiveBriefing,
    isSearchingSemantic,
    semanticResults,
    setSemanticResults,
    fetchAiStatus,
    handleConfigureGeminiKey,
    handleRunOnDemandCopilot,
    handleGenerateExecutiveBriefing,
    handlePurgeAiCache,
    handleSemanticProtocolSearch,
  } = useGeminiGateway();

  const canEditResolutions = isManagerOrAdmin;
  const canManageControlPlane = isAdmin;

  // ============================================================================
  // 2. EFFECTS & LIFECYCLE
  // ============================================================================
  useEffect(() => {
    if (activeSubTab === "DATABASE_SEED") {
      fetchSeedStatus();
    } else if (activeSubTab === "INTEGRATIONS") {
      fetchAiStatus();
    }
  }, [activeSubTab, fetchSeedStatus, fetchAiStatus]);

  // ============================================================================
  // 3. HANDLERS & COMPUTATIONS
  // ============================================================================
  const handleRebuildProjections = () => {
    setIsRebuilding(true);
    setTimeout(() => {
      setIsRebuilding(false);
      setRebuildSuccess(true);
      setTimeout(() => setRebuildSuccess(false), 4000);
    }, 1500);
  };

  const handleAddPredefinedNote = (note: {
    category: any;
    label: string;
    text: string;
  }) => {
    addNote({
      category: note.category,
      label: note.label,
      text: note.text,
    });
  };

  // ============================================================================
  // 4. RENDER ORCHESTRATION
  // ============================================================================
  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 space-y-6">
      <Header
        role={role}
        isAdmin={isAdmin}
        simulatedRole={simulatedRole}
        onSimulatedRoleChange={setSimulatedRole}
      />

      <Navigation
        activeSubTab={activeSubTab}
        onTabChange={setActiveSubTab}
        notesCount={notes.length}
      />

      {activeSubTab === "RESOLUTIONS" && (
        <Resolutions
          notes={notes}
          canEditResolutions={canEditResolutions}
          onResetDefaults={resetToDefaults}
          onOpenAddModal={() => setIsAddNoteModalOpen(true)}
          onDeleteNote={deleteNote}
          onSemanticSearch={handleSemanticProtocolSearch}
          isSearchingSemantic={isSearchingSemantic}
          semanticResults={semanticResults}
          onCloseSemanticResults={() => setSemanticResults(null)}
        />
      )}

      {activeSubTab === "RBAC" && <Rbac />}

      {activeSubTab === "DATABASE_SEED" && (
        <DatabaseSeed
          seedStatus={seedStatus}
          isLoadingStatus={isLoadingStatus}
          isSeeding={isSeeding}
          activeSeedingPhase={activeSeedingPhase}
          seedResult={seedResult}
          isAdmin={isAdmin}
          role={role}
          onRefreshStats={fetchSeedStatus}
          onDismissResult={() => setSeedResult(null)}
          onTriggerSeed={triggerSeed}
        />
      )}

      {activeSubTab === "INTEGRATIONS" && (
        <Suspense fallback={<TabSkeleton />}>
          <IntegrationsTab
            aiStatus={aiStatus}
            apiKeyInput={apiKeyInput}
            onApiKeyInputChange={setApiKeyInput}
            isSavingKey={isSavingKey}
            keySaveFeedback={keySaveFeedback}
            onConfigureGeminiKey={handleConfigureGeminiKey}
            copilotPrompt={copilotPrompt}
            onCopilotPromptChange={setCopilotPrompt}
            isRunningCopilot={isRunningCopilot}
            copilotResponse={copilotResponse}
            onRunOnDemandCopilot={handleRunOnDemandCopilot}
            isGeneratingBriefing={isGeneratingBriefing}
            executiveBriefing={executiveBriefing}
            onGenerateExecutiveBriefing={handleGenerateExecutiveBriefing}
            onCloseExecutiveBriefing={() => setExecutiveBriefing(null)}
            onPurgeAiCache={handlePurgeAiCache}
          />
        </Suspense>
      )}

      {activeSubTab === "CONTROL_PLANE" && (
        <Suspense fallback={<TabSkeleton />}>
          <ControlPlaneTab
            canManageControlPlane={canManageControlPlane}
            isRebuilding={isRebuilding}
            rebuildSuccess={rebuildSuccess}
            onRebuildProjections={handleRebuildProjections}
          />
        </Suspense>
      )}

      {activeSubTab === "SECURITY_VAULT" && (
        <Suspense fallback={<TabSkeleton />}>
          <SecurityVaultTab />
        </Suspense>
      )}

      {activeSubTab === "WEBHOOKS" && (
        <Suspense fallback={<TabSkeleton />}>
          <WebhooksTab />
        </Suspense>
      )}

      <NewNote
        isOpen={isAddNoteModalOpen}
        onClose={() => setIsAddNoteModalOpen(false)}
        onSubmit={handleAddPredefinedNote}
      />
    </div>
  );
}
