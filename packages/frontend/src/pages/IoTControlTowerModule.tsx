/**
 * @file IoTControlTowerModule.tsx
 * @description Orchestrator for IoT Control Tower (AIS Satellite Tracking, Live Sensors, Geofences & Timeline Playback).
 * @module @atlas/frontend/pages
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Suspense, lazy } from "react";
import {
  Header,
  Navigation,
  AssetListSidebar,
  SatelliteMap,
  useIoTControlTower,
} from "../components/IoTControlTower";

const LiveSensors = lazy(
  () => import("../components/IoTControlTower/Tab/LiveSensors"),
);
const ActiveAlerts = lazy(
  () => import("../components/IoTControlTower/Tab/ActiveAlerts"),
);
const TimelinePlayback = lazy(
  () => import("../components/IoTControlTower/Tab/TimelinePlayback"),
);

export default function IoTControlTowerModule() {
  const {
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
  } = useIoTControlTower();

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto pr-2">
      <Header summary={summary} assetsCount={assets.length} />

      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeAlertsCount={activeAlerts.length}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <AssetListSidebar
          assets={assets}
          selectedAssetId={selectedAssetId}
          onSelectAsset={setSelectedAssetId}
        />

        <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 flex flex-col gap-5 min-h-0">
          {activeTab === "MAP" && (
            <SatelliteMap
              assets={assets}
              geofences={geofences}
              selectedAssetId={selectedAssetId}
              selectedAsset={selectedAsset}
              assetDetail={assetDetail}
              onSelectAsset={setSelectedAssetId}
            />
          )}

          {activeTab !== "MAP" && (
            <Suspense
              fallback={
                <div className="p-8 text-center text-slate-400 text-xs">
                  Cargando telemetría IoT...
                </div>
              }
            >
              {activeTab === "SENSORS" && (
                <LiveSensors
                  selectedAsset={selectedAsset}
                  liveReading={liveReading}
                  onSimulateAnomaly={handleSimulate}
                />
              )}

              {activeTab === "ALERTS" && (
                <ActiveAlerts
                  selectedAsset={selectedAsset}
                  assetDetail={assetDetail}
                  activeAlertsCount={activeAlerts.length}
                  onResolveAlert={handleResolveAlert}
                />
              )}

              {activeTab === "PLAYBACK" && (
                <TimelinePlayback
                  selectedAsset={selectedAsset}
                  history={history}
                  playbackIdx={playbackIdx}
                  setPlaybackIdx={setPlaybackIdx}
                  isPlaying={isPlaying}
                  setIsPlaying={setIsPlaying}
                  playbackSpeed={playbackSpeed}
                  setPlaybackSpeed={setPlaybackSpeed}
                />
              )}
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
