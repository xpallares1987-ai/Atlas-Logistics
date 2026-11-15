/**
 * @file iot-control-tower.types.ts
 * @description Types and interfaces for IoT Control Tower (AIS Satellite Tracking, Live Sensors, Geofences & Playback).
 * @module @atlas/frontend/types
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

export type IoTControlTab = "MAP" | "SENSORS" | "ALERTS" | "PLAYBACK";

export interface IoTAsset {
  id: string;
  name?: string;
  assetName?: string;
  assetCode?: string;
  assetType?: string;
  status?: string;
  imoNumber?: string;
  destinationName?: string;
  currentSpeedKnots?: number;
  currentHeadingDeg?: number;
  currentAltitudeMeters?: number;
  currentLat?: number;
  currentLng?: number;
  predictedEta?: string | number;
  minTempCelsius?: number;
  maxTempCelsius?: number;
  routeWaypoints?: Array<{ lat: number; lng: number; [key: string]: unknown }>;
  [key: string]: unknown;
}

export interface IoTReading {
  timestamp: string | number;
  temperatureCelsius?: number;
  humidityPct?: number;
  shockGForce?: number;
  sealTampered?: boolean;
  batteryPct?: number;
  lat?: number;
  lng?: number;
  speedKnots?: number;
  altitudeMeters?: number;
  [key: string]: unknown;
}

export interface IoTGeofence {
  id: string;
  name: string;
  type?: string;
  lat?: number;
  lng?: number;
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
  polygon?: Array<[number, number]>;
  [key: string]: unknown;
}

export interface IoTAssetAlert {
  id: string;
  alertType: string;
  severity: string;
  message: string;
  createdAt: string;
  assetName?: string;
  geofenceName?: string;
  metricValue?: string | number;
  thresholdValue?: string | number;
  status?: string;
  [key: string]: unknown;
}

export interface IoTAssetDetail extends IoTAsset {
  currentReading?: IoTReading;
  readings?: IoTReading[];
  alerts?: IoTAssetAlert[];
  [key: string]: unknown;
}

export interface IoTSummary {
  totalAssets?: number;
  totalAssetsCount?: number;
  totalTrackedAssets?: number;
  activeAlerts?: number;
  criticalAlertsCount?: number;
  warningAlertsCount?: number;
  sensorsOnline?: number;
  geofenceViolations?: number;
  activeGeofencesCount?: number;
  deviceHealthPercentage?: number;
  healthyDevicesCount?: number;
  totalDevices?: number;
  inTransitCount?: number;
  criticalAssetsCount?: number;
  [key: string]: unknown;
}

export interface IoTHeaderProps {
  summary: IoTSummary | null;
  assetsCount: number;
}

export interface IoTNavigationProps {
  activeTab: IoTControlTab;
  onSelectTab: (tab: IoTControlTab) => void;
  activeAlertsCount: number;
}

export interface AssetListSidebarProps {
  assets: IoTAsset[];
  selectedAssetId: string | null;
  onSelectAsset: (assetId: string) => void;
}

export interface SatelliteMapTabProps {
  assets: IoTAsset[];
  geofences: IoTGeofence[];
  selectedAssetId: string | null;
  selectedAsset: IoTAsset | null;
  assetDetail: IoTAssetDetail | null;
  onSelectAsset: (assetId: string) => void;
}

export interface LiveSensorsTabProps {
  selectedAsset: IoTAsset | null;
  liveReading: IoTReading | null;
  onSimulateAnomaly: (anomalyType: string, customValue?: number) => void;
}

export interface ActiveAlertsTabProps {
  selectedAsset: IoTAsset | null;
  assetDetail: IoTAssetDetail | null;
  activeAlertsCount: number;
  onResolveAlert: (alertId: string) => void;
}

export interface TimelinePlaybackTabProps {
  selectedAsset: IoTAsset | null;
  history: IoTReading[];
  playbackIdx: number;
  setPlaybackIdx: (idx: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
}
