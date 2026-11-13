/**
 * @file useIoTControlTower.ts
 * @description Custom domain hook and coordinate helpers for IoT Control Tower module.
 * @module @atlas/frontend/components/IoTControlTower/hooks
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { useEffect, useRef, useState } from "react";
import { useApiMutation, useApiQuery } from "../../../hooks/useApiQuery";
import type { IoTControlTab } from "../../../types/iot-control-tower.types";

export function toSvgCoords(
  lat: number,
  lng: number,
): { x: number; y: number } {
  const x = ((lng + 15) / 60) * 800;
  const y = ((55 - lat) / 30) * 400;
  return {
    x: Math.max(0, Math.min(800, x)),
    y: Math.max(0, Math.min(400, y)),
  };
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "CRITICAL_ALERT":
      return "text-red-400 bg-red-500/10 border-red-500/30";
    case "CUSTOMS_HOLD":
      return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    case "IN_TRANSIT":
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    default:
      return "text-slate-400 bg-slate-500/10 border-slate-500/30";
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return "text-red-400 bg-red-500/10 border-red-500/30";
    case "WARNING":
      return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    default:
      return "text-blue-400 bg-blue-500/10 border-blue-500/30";
  }
}

export function useIoTControlTower() {
  const [activeTab, setActiveTab] = useState<IoTControlTab>("MAP");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [playbackIdx, setPlaybackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playbackRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: summary, refetch: refetchSummary } = useApiQuery<any>(
    ["telemetry-summary"],
    "/telemetry/summary",
  );
  const { data: assets = [], refetch: refetchAssets } = useApiQuery<any[]>(
    ["telemetry-assets"],
    "/telemetry/assets",
  );
  const { data: geofences = [] } = useApiQuery<any[]>(
    ["telemetry-geofences"],
    "/telemetry/geofences",
  );
  const { data: assetDetail, refetch: refetchDetail } = useApiQuery<any>(
    ["telemetry-asset-detail", selectedAssetId],
    selectedAssetId ? `/telemetry/assets/${selectedAssetId}` : "",
    { enabled: !!selectedAssetId },
  );
  const { data: history = [] } = useApiQuery<any[]>(
    ["telemetry-history", selectedAssetId],
    selectedAssetId ? `/telemetry/assets/${selectedAssetId}/history` : "",
    { enabled: !!selectedAssetId && activeTab === "PLAYBACK" },
  );

  const simulateMutation = useApiMutation<any, any>(
    "/telemetry/simulate-anomaly",
    "POST",
  );

  useEffect(() => {
    if (assets.length > 0 && !selectedAssetId) {
      setSelectedAssetId(assets[0].id);
    }
  }, [assets, selectedAssetId]);

  useEffect(() => {
    if (isPlaying && history.length > 0) {
      playbackRef.current = setInterval(
        () => {
          setPlaybackIdx((prev) => {
            if (prev >= history.length - 1) {
              setIsPlaying(false);
              return prev;
            }
            return prev + 1;
          });
        },
        Math.max(100, 500 / playbackSpeed),
      );
    } else if (playbackRef.current) {
      clearInterval(playbackRef.current);
    }
    return () => {
      if (playbackRef.current) clearInterval(playbackRef.current);
    };
  }, [isPlaying, playbackSpeed, history.length]);

  const handleSimulate = async (anomalyType: string, customValue?: number) => {
    if (!selectedAssetId) return;
    try {
      await simulateMutation.mutateAsync({
        assetId: selectedAssetId,
        anomalyType,
        customValue,
      });
      refetchSummary();
      refetchAssets();
      refetchDetail();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await fetch(`/api/telemetry/alerts/${alertId}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("atlas_token") || ""}`,
        },
        body: JSON.stringify({ resolvedBy: "Control Tower Operator" }),
      });
      refetchDetail();
      refetchSummary();
    } catch (e) {}
  };

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);
  const liveReading = assetDetail?.readings?.[assetDetail.readings.length - 1];
  const activeAlerts = (assetDetail?.alerts || []).filter(
    (a: any) => a.status === "ACTIVE",
  );

  return {
    activeTab,
    setActiveTab,
    selectedAssetId,
    setSelectedAssetId,
    playbackIdx,
    setPlaybackIdx,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    summary,
    assets,
    geofences,
    assetDetail,
    history,
    selectedAsset,
    liveReading,
    activeAlerts,
    handleSimulate,
    handleResolveAlert,
  };
}
