/**
 * @file useGeminiGateway.ts
 * @description Custom React hook managing Google AI Studio / Gemini API on-demand status, chat copilot, and executive briefings.
 * @module @atlas/frontend/components/SystemPanel/hooks
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import { useState, useCallback } from "react";
import type {
  GeminiAiStatusState,
  CopilotResponseState,
  ExecutiveBriefingState,
  SemanticSearchResultsState,
} from "../../../types/system-panel.types";

export function useGeminiGateway() {
  const [aiStatus, setAiStatus] = useState<GeminiAiStatusState | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keySaveFeedback, setKeySaveFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [copilotPrompt, setCopilotPrompt] = useState(
    "Analiza el estado operativo actual de la expedición sh_demo_01 (BK-2026-67116) y resume riesgos aduaneros o de demurrage.",
  );
  const [isRunningCopilot, setIsRunningCopilot] = useState(false);
  const [copilotResponse, setCopilotResponse] =
    useState<CopilotResponseState | null>(null);

  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [executiveBriefing, setExecutiveBriefing] =
    useState<ExecutiveBriefingState | null>(null);

  const [isSearchingSemantic, setIsSearchingSemantic] = useState(false);
  const [semanticResults, setSemanticResults] =
    useState<SemanticSearchResultsState | null>(null);

  const fetchAiStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/config-status");
      if (res.ok) {
        const data = await res.json();
        setAiStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch Gemini AI status:", err);
    }
  }, []);

  const handleGenerateExecutiveBriefing = useCallback(
    async (bypassCache: boolean = false) => {
      setIsGeneratingBriefing(true);
      try {
        const res = await fetch("/api/ai/executive-briefing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bypassCache }),
        });
        if (res.ok) {
          const data = await res.json();
          setExecutiveBriefing(data);
          await fetchAiStatus();
          window.dispatchEvent(new CustomEvent("atlas:ai-quota-updated"));
        }
      } catch (err) {
        console.error("Failed to generate executive briefing:", err);
      } finally {
        setIsGeneratingBriefing(false);
      }
    },
    [fetchAiStatus],
  );

  const handlePurgeAiCache = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/clear-cache", { method: "POST" });
      if (res.ok) {
        await fetchAiStatus();
        window.dispatchEvent(new CustomEvent("atlas:ai-quota-updated"));
      }
    } catch (err) {
      console.error("Failed to purge AI cache:", err);
    }
  }, [fetchAiStatus]);

  const handleConfigureGeminiKey = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!apiKeyInput.trim()) return;
      setIsSavingKey(true);
      setKeySaveFeedback(null);
      try {
        const res = await fetch("/api/ai/configure-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: apiKeyInput.trim(),
            persistToEnvLocal: true,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setKeySaveFeedback({
            success: true,
            message: data.message,
          });
          setApiKeyInput("");
          if (data.status) setAiStatus(data.status);
        } else {
          setKeySaveFeedback({
            success: false,
            message: data.error || "Error al vincular GEMINI_API_KEY",
          });
        }
      } catch (err: any) {
        setKeySaveFeedback({
          success: false,
          message: err?.message || "Error de red al configurar GEMINI_API_KEY",
        });
      } finally {
        setIsSavingKey(false);
      }
    },
    [apiKeyInput],
  );

  const handleRunOnDemandCopilot = useCallback(async () => {
    if (!copilotPrompt.trim()) return;
    setIsRunningCopilot(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: copilotPrompt.trim(),
          context: { shipmentId: "sh_demo_01" },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCopilotResponse({
          reply: data.reply,
          source: data.source,
          model: data.model,
          latencyMs: data.latencyMs,
          quotaRemainingRpm: data.quotaRemainingRpm,
        });
        await fetchAiStatus();
      }
    } catch (err) {
      console.error("Error running On-Demand Gemini Copilot:", err);
    } finally {
      setIsRunningCopilot(false);
    }
  }, [copilotPrompt, fetchAiStatus]);

  const handleSemanticProtocolSearch = useCallback(
    async (
      candidates: Array<{
        id: string;
        label: string;
        category?: string;
        text: string;
      }>,
      query: string,
    ) => {
      const sanitizedQuery =
        query.trim() || "inspección aduanera CBP demora contenedor";
      setIsSearchingSemantic(true);
      try {
        const res = await fetch("/api/ai/semantic-protocol-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: sanitizedQuery,
            candidates: candidates.map((n) => ({
              id: n.id,
              title: n.label,
              category: n.category,
              text: n.text,
            })),
            topK: 3,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setSemanticResults(data);
        }
      } catch (err) {
        console.error("Failed to run semantic protocol search:", err);
      } finally {
        setIsSearchingSemantic(false);
      }
    },
    [],
  );

  return {
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
  };
}
