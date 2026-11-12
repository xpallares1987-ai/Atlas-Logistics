/**
 * @file useDatabaseSeed.ts
 * @description Custom React hook managing multi-phase enterprise database seed injections and status polling.
 * @module @atlas/frontend/components/SystemPanel/hooks
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import { useState, useCallback } from "react";
import type {
  SeedStatusStats,
  SeedResultState,
} from "../../../types/system-panel.types";

export function useDatabaseSeed() {
  const [seedStatus, setSeedStatus] = useState<SeedStatusStats | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [activeSeedingPhase, setActiveSeedingPhase] = useState<string | null>(
    null,
  );
  const [seedResult, setSeedResult] = useState<SeedResultState | null>(null);

  const fetchSeedStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch("/api/admin/seed/status");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stats) {
          setSeedStatus(data.stats);
        }
      }
    } catch (err) {
      console.error("Failed to fetch seed status:", err);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  const triggerSeed = useCallback(
    async (phase: "1" | "2" | "3" | "4" | "5" | "all") => {
      setIsSeeding(true);
      setActiveSeedingPhase(phase);
      setSeedResult(null);
      try {
        const res = await fetch(`/api/admin/seed/${phase}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setSeedResult({
            success: true,
            message: data.message,
            durationMs: data.durationMs,
          });
          await fetchSeedStatus();
        } else {
          setSeedResult({
            success: false,
            message: data.error || "Seed injection failed",
          });
        }
      } catch (err: any) {
        setSeedResult({
          success: false,
          message: err?.message || "Network error during seed execution",
        });
      } finally {
        setIsSeeding(false);
        setActiveSeedingPhase(null);
      }
    },
    [fetchSeedStatus],
  );

  return {
    seedStatus,
    isLoadingStatus,
    isSeeding,
    activeSeedingPhase,
    seedResult,
    setSeedResult,
    fetchSeedStatus,
    triggerSeed,
  };
}
