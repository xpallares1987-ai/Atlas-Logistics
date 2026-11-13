/**
 * @file iot-control-tower.types.ts
 * @description Types and interfaces for IoT Control Tower (AIS Satellite Tracking, Live Sensors, Geofences & Playback).
 * @module @atlas/frontend/types
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

export type IoTControlTab = "MAP" | "SENSORS" | "ALERTS" | "PLAYBACK";

export interface IoTHeaderProps {
  summary: any;
  assetsCount: number;
}

export interface IoTNavigationProps {
  activeTab: IoTControlTab;
  onSelectTab: (tab: IoTControlTab) => void;
  activeAlertsCount: number;
}

export interface AssetListSidebarProps {
  assets: any[];
  selectedAssetId: string | null;
  onSelectAsset: (assetId: string) => void;
}

export interface SatelliteMapTabProps {
  assets: any[];
  geofences: any[];
  selectedAssetId: string | null;
  selectedAsset: any;
  assetDetail: any;
  onSelectAsset: (assetId: string) => void;
}

export interface LiveSensorsTabProps {
  selectedAsset: any;
  liveReading: any;
  onSimulateAnomaly: (anomalyType: string, customValue?: number) => void;
}

export interface ActiveAlertsTabProps {
  selectedAsset: any;
  assetDetail: any;
  activeAlertsCount: number;
  onResolveAlert: (alertId: string) => void;
}

export interface TimelinePlaybackTabProps {
  selectedAsset: any;
  history: any[];
  playbackIdx: number;
  setPlaybackIdx: (idx: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
}
