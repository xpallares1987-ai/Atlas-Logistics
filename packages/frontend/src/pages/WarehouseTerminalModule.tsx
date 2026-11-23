/**
 * @file WarehouseTerminalModule.tsx
 * @description Rugged Mobile WMS terminal interface optimized for handheld scanner computers (Zebra TC21/TC26/MC3300) with high contrast, glove touch targets, and directed warehouse workflows.
 * @module @atlas/frontend/pages/WarehouseTerminalModule
 * @see {@link docs/adr/0041-intelligent-document-processing-and-ruggedized-wms.md}
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Barcode,
  Truck,
  ArrowRightLeft,
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  BatteryCharging,
  ShieldCheck,
  Box,
} from "lucide-react";
import { isValidIso6346 } from "@atlas/shared";

type TerminalMode = "CROSS_DOCK" | "PUTAWAY" | "PICKING" | "GATE_IN";

interface CrossDockTask {
  id: string;
  inboundRef: string;
  outboundShipmentId: string;
  destinationHub: string;
  palletCount: number;
  priority: "HIGH" | "NORMAL";
  scannedCount: number;
}

interface PutawayTask {
  id: string;
  sscc: string;
  sku: string;
  description: string;
  recommendedBin: string;
  confirmedBin?: string;
  quantity: number;
  status: "PENDING" | "CONFIRMED";
}

interface WavePickItem {
  id: string;
  waveId: string;
  sku: string;
  binLocation: string;
  requiredQty: number;
  pickedQty: number;
  isComplete: boolean;
}

// Initial deterministic state
const INITIAL_CROSSDOCK: CrossDockTask[] = [
  {
    id: "CD-101",
    inboundRef: "INB-MAD-8821",
    outboundShipmentId: "BK-2026-67116",
    destinationHub: "JFK - New York Air Cargo CFS",
    palletCount: 4,
    priority: "HIGH",
    scannedCount: 2,
  },
  {
    id: "CD-102",
    inboundRef: "INB-MAD-8829",
    outboundShipmentId: "BK-2026-90412",
    destinationHub: "HAM - Hamburg Port Terminal",
    palletCount: 2,
    priority: "NORMAL",
    scannedCount: 0,
  },
];

const INITIAL_PUTAWAY: PutawayTask[] = [
  {
    id: "PW-01",
    sscc: "001843700000192841",
    sku: "MED-TEMP-2026",
    description: "Cold-chain Pharma Vials (-20°C)",
    recommendedBin: "COLD-R02-B-04",
    quantity: 48,
    status: "PENDING",
  },
  {
    id: "PW-02",
    sscc: "001843700000192842",
    sku: "ELEC-LITH-440",
    description: "Lithium Ion Battery Packs UN3480",
    recommendedBin: "HAZ-BAY-01-A",
    quantity: 24,
    status: "PENDING",
  },
];

const INITIAL_WAVE_ITEMS: WavePickItem[] = [
  {
    id: "W-01",
    waveId: "WAVE-2026-089",
    sku: "AUTO-FILT-X4",
    binLocation: "AISLE-03-A-12",
    requiredQty: 10,
    pickedQty: 4,
    isComplete: false,
  },
  {
    id: "W-02",
    waveId: "WAVE-2026-089",
    sku: "AERO-TURB-VALVE",
    binLocation: "AISLE-05-C-02",
    requiredQty: 2,
    pickedQty: 0,
    isComplete: false,
  },
];

export default function WarehouseTerminalModule() {
  const [mode, setMode] = useState<TerminalMode>("CROSS_DOCK");
  const [highContrast, setHighContrast] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Barcode input & scan buffer
  const [barcodeInput, setBarcodeInput] = useState("");
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(
    null,
  );
  const [scanStatusMessage, setScanStatusMessage] = useState<{
    text: string;
    type: "SUCCESS" | "ERROR" | "INFO";
  }>({ text: "Ready for scan or hardware laser trigger", type: "INFO" });

  // Domain task states
  const [crossDockTasks, setCrossDockTasks] =
    useState<CrossDockTask[]>(INITIAL_CROSSDOCK);
  const [putawayTasks, setPutawayTasks] =
    useState<PutawayTask[]>(INITIAL_PUTAWAY);
  const [waveItems, setWaveItems] =
    useState<WavePickItem[]>(INITIAL_WAVE_ITEMS);

  // Gate-In state
  const [gateInContainer, setGateInContainer] = useState("MSKU9284712");
  const [gateInSeal, setGateInSeal] = useState("EU-SEAL-889104");
  const [gateInInspectionPassed, setGateInInspectionPassed] = useState(false);

  // Audio Context synthesizer for audio feedback
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playTone = useCallback(
    (freq: number, durationSec: number, type: OscillatorType = "sine") => {
      if (!audioEnabled) return;
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext
          )();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + durationSec,
        );
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + durationSec);
      } catch {
        // Audio policy or unsupported
      }
    },
    [audioEnabled],
  );

  // Haptic feedback
  const triggerHaptic = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  // Online / Offline monitor
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Dispatch barcode scan logic
  const handleProcessBarcode = useCallback(
    (scanned: string) => {
      const code = scanned.trim().toUpperCase();
      if (!code) return;

      setLastScannedBarcode(code);

      if (mode === "CROSS_DOCK") {
        const found = crossDockTasks.find(
          (t) =>
            t.inboundRef.toUpperCase() === code ||
            t.outboundShipmentId.toUpperCase() === code,
        );
        if (found) {
          setCrossDockTasks((prev) =>
            prev.map((t) =>
              t.id === found.id
                ? {
                    ...t,
                    scannedCount: Math.min(t.palletCount, t.scannedCount + 1),
                  }
                : t,
            ),
          );
          playTone(880, 0.15, "triangle"); // High pitch confirmation
          triggerHaptic(50);
          setScanStatusMessage({
            text: `Cross-Dock Verified: Staged to ${found.outboundShipmentId}`,
            type: "SUCCESS",
          });
        } else {
          playTone(220, 0.35, "sawtooth"); // Low pitch error
          triggerHaptic([100, 50, 100]);
          setScanStatusMessage({
            text: `Unrecognized Cross-Dock Reference: ${code}`,
            type: "ERROR",
          });
        }
      } else if (mode === "PUTAWAY") {
        const found = putawayTasks.find(
          (p) =>
            p.sscc.toUpperCase() === code ||
            p.recommendedBin.toUpperCase() === code,
        );
        if (found) {
          setPutawayTasks((prev) =>
            prev.map((p) =>
              p.id === found.id
                ? {
                    ...p,
                    status: "CONFIRMED",
                    confirmedBin: p.recommendedBin,
                  }
                : p,
            ),
          );
          playTone(880, 0.15, "triangle");
          triggerHaptic(50);
          setScanStatusMessage({
            text: `Putaway Confirmed into Bin ${found.recommendedBin}`,
            type: "SUCCESS",
          });
        } else {
          playTone(220, 0.35, "sawtooth");
          triggerHaptic([100, 50, 100]);
          setScanStatusMessage({
            text: `No pending putaway matching ${code}`,
            type: "ERROR",
          });
        }
      } else if (mode === "PICKING") {
        const found = waveItems.find(
          (w) =>
            w.sku.toUpperCase() === code ||
            w.binLocation.toUpperCase() === code,
        );
        if (found) {
          setWaveItems((prev) =>
            prev.map((w) =>
              w.id === found.id
                ? {
                    ...w,
                    pickedQty: Math.min(w.requiredQty, w.pickedQty + 1),
                    isComplete: w.pickedQty + 1 >= w.requiredQty,
                  }
                : w,
            ),
          );
          playTone(980, 0.12, "sine");
          triggerHaptic(40);
          setScanStatusMessage({
            text: `Picked 1 unit of ${found.sku} at ${found.binLocation}`,
            type: "SUCCESS",
          });
        } else {
          playTone(220, 0.35, "sawtooth");
          triggerHaptic([100, 50, 100]);
          setScanStatusMessage({
            text: `SKU / Bin not found in active wave: ${code}`,
            type: "ERROR",
          });
        }
      } else if (mode === "GATE_IN") {
        if (isValidIso6346(code)) {
          setGateInContainer(code);
          playTone(880, 0.15, "triangle");
          triggerHaptic(50);
          setScanStatusMessage({
            text: `ISO 6346 Container Verified: ${code}`,
            type: "SUCCESS",
          });
        } else {
          setGateInSeal(code);
          playTone(700, 0.15, "sine");
          triggerHaptic(50);
          setScanStatusMessage({
            text: `Security Seal Number Recorded: ${code}`,
            type: "SUCCESS",
          });
        }
      }
      setBarcodeInput("");
    },
    [mode, crossDockTasks, putawayTasks, waveItems, playTone, triggerHaptic],
  );

  // Hardware wedge key listener (captures rapid laser scanner bursts)
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow standard typing if focused on manual input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        if (e.key === "Enter") {
          const val = (document.activeElement as HTMLInputElement).value;
          if (val) handleProcessBarcode(val);
        }
        return;
      }

      const now = Date.now();
      if (e.key === "Enter") {
        if (buffer.length > 2) {
          e.preventDefault();
          handleProcessBarcode(buffer);
          buffer = "";
        }
      } else if (e.key.length === 1) {
        if (now - lastKeyTime > 60) {
          buffer = ""; // Reset buffer if typing slow
        }
        buffer += e.key;
        lastKeyTime = now;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleProcessBarcode]);

  const bgTheme = highContrast
    ? "bg-black text-white"
    : "bg-slate-900 text-slate-100";

  return (
    <div
      className={`min-h-screen flex flex-col font-sans select-none pb-12 ${bgTheme}`}
    >
      {/* 1. TOP HARDWARE & OPERATIONAL BAR */}
      <header className="px-3 py-2 border-b border-zinc-700 bg-zinc-950 flex items-center justify-between text-xs sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <span className="font-mono font-black text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
            ZEBRA-TC21
          </span>
          <span className="font-semibold text-zinc-300">CFS-MAD-BAY4</span>
        </div>
        <div className="flex items-center gap-3">
          {isOnline ? (
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <Wifi className="w-3.5 h-3.5" /> ONLINE
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-400 font-bold">
              <WifiOff className="w-3.5 h-3.5" /> OFFLINE
            </span>
          )}
          <span className="flex items-center gap-1 text-cyan-400">
            <BatteryCharging className="w-3.5 h-3.5" /> 84%
          </span>
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="p-1 rounded text-zinc-400 hover:text-white"
            title="Toggle Audio Feedback"
          >
            {audioEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-zinc-500" />
            )}
          </button>
          <button
            onClick={() => setHighContrast(!highContrast)}
            className="p-1 rounded text-zinc-400 hover:text-white"
            title="Toggle High Contrast"
          >
            {highContrast ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-400" />
            )}
          </button>
        </div>
      </header>

      {/* 2. MODE SELECTOR (Large Glove-Friendly Touch Targets >= 48px) */}
      <nav className="grid grid-cols-4 gap-1 p-2 bg-zinc-900 border-b border-zinc-800">
        <button
          onClick={() => setMode("CROSS_DOCK")}
          className={`min-h-[48px] py-2 px-1 rounded flex flex-col items-center justify-center font-bold text-xs border ${
            mode === "CROSS_DOCK"
              ? "bg-cyan-600 text-white border-cyan-400 ring-2 ring-cyan-500/40"
              : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
          }`}
        >
          <ArrowRightLeft className="w-5 h-5 mb-0.5" />
          <span>Cross-Dock</span>
        </button>
        <button
          onClick={() => setMode("PUTAWAY")}
          className={`min-h-[48px] py-2 px-1 rounded flex flex-col items-center justify-center font-bold text-xs border ${
            mode === "PUTAWAY"
              ? "bg-amber-600 text-white border-amber-400 ring-2 ring-amber-500/40"
              : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
          }`}
        >
          <Box className="w-5 h-5 mb-0.5" />
          <span>Putaway</span>
        </button>
        <button
          onClick={() => setMode("PICKING")}
          className={`min-h-[48px] py-2 px-1 rounded flex flex-col items-center justify-center font-bold text-xs border ${
            mode === "PICKING"
              ? "bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-500/40"
              : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
          }`}
        >
          <PackageCheck className="w-5 h-5 mb-0.5" />
          <span>Wave Pick</span>
        </button>
        <button
          onClick={() => setMode("GATE_IN")}
          className={`min-h-[48px] py-2 px-1 rounded flex flex-col items-center justify-center font-bold text-xs border ${
            mode === "GATE_IN"
              ? "bg-purple-600 text-white border-purple-400 ring-2 ring-purple-500/40"
              : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
          }`}
        >
          <Truck className="w-5 h-5 mb-0.5" />
          <span>Gate-In</span>
        </button>
      </nav>

      {/* 3. HARDWARE BARCODE INPUT / SCAN STATUS BANNER */}
      <section className="p-3 bg-zinc-950 border-b border-zinc-800 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Scan Barcode (GS1/SSCC/Container)..."
              className="w-full min-h-[48px] px-3 font-mono text-base font-bold bg-zinc-900 border-2 border-zinc-700 rounded-lg text-white focus:border-amber-400 focus:outline-none"
            />
            {barcodeInput && (
              <button
                onClick={() => setBarcodeInput("")}
                className="absolute right-2 top-2 p-2 text-zinc-400 hover:text-white"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            )}
          </div>
          <button
            onClick={() => handleProcessBarcode(barcodeInput)}
            className="min-h-[48px] min-w-[64px] px-4 font-black text-sm bg-amber-500 hover:bg-amber-400 text-black rounded-lg flex items-center justify-center gap-1"
          >
            <Barcode className="w-5 h-5" />
            SCAN
          </button>
        </div>

        {/* Status notification toast */}
        <div
          className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center justify-between border ${
            scanStatusMessage.type === "SUCCESS"
              ? "bg-emerald-950 border-emerald-600 text-emerald-200"
              : scanStatusMessage.type === "ERROR"
                ? "bg-red-950 border-red-600 text-red-200"
                : "bg-zinc-900 border-zinc-700 text-zinc-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {scanStatusMessage.type === "SUCCESS" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : scanStatusMessage.type === "ERROR" ? (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <Barcode className="w-4 h-4 text-zinc-400 shrink-0" />
            )}
            <span>{scanStatusMessage.text}</span>
          </div>
          {lastScannedBarcode && (
            <span className="font-mono text-[11px] bg-black/40 px-2 py-0.5 rounded border border-zinc-700">
              {lastScannedBarcode}
            </span>
          )}
        </div>
      </section>

      {/* 4. WORKFLOW CONTENT PANELS */}
      <main className="flex-1 p-3 overflow-y-auto space-y-3">
        {mode === "CROSS_DOCK" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold px-1">
              <span>ACTIVE CROSS-DOCK MANIFESTS</span>
              <span>{crossDockTasks.length} PENDING</span>
            </div>
            {crossDockTasks.map((task) => (
              <div
                key={task.id}
                className="p-3 bg-zinc-900 border-2 border-zinc-800 rounded-xl space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-black text-cyan-400">
                    {task.inboundRef}
                  </span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded ${
                      task.priority === "HIGH"
                        ? "bg-red-900 text-red-200 border border-red-700"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {task.priority} PRIORITY
                  </span>
                </div>
                <div className="text-xs text-zinc-300">
                  <div className="font-bold text-white">
                    Target: {task.outboundShipmentId}
                  </div>
                  <div className="text-zinc-400">{task.destinationHub}</div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs">
                  <span className="text-zinc-400 font-semibold">
                    Staged Pallets:
                  </span>
                  <span className="font-mono text-sm font-black text-amber-400">
                    {task.scannedCount} / {task.palletCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {mode === "PUTAWAY" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold px-1">
              <span>DIRECTED PUTAWAY TASKS</span>
              <span>{putawayTasks.length} QUEUED</span>
            </div>
            {putawayTasks.map((item) => (
              <div
                key={item.id}
                className={`p-3 border-2 rounded-xl space-y-2 ${
                  item.status === "CONFIRMED"
                    ? "bg-emerald-950/40 border-emerald-700"
                    : "bg-zinc-900 border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-zinc-400">
                    SSCC: {item.sscc}
                  </span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded ${
                      item.status === "CONFIRMED"
                        ? "bg-emerald-800 text-emerald-100"
                        : "bg-amber-900 text-amber-200"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <div>
                  <div className="font-bold text-sm text-white">{item.sku}</div>
                  <div className="text-xs text-zinc-400">
                    {item.description} ({item.quantity} units)
                  </div>
                </div>
                <div className="p-2 bg-black rounded-lg border border-amber-500/50 flex items-center justify-between">
                  <span className="text-xs text-amber-400 font-semibold">
                    DIRECTED TARGET BIN:
                  </span>
                  <span className="font-mono text-base font-black text-amber-300">
                    {item.recommendedBin}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {mode === "PICKING" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold px-1">
              <span>WAVE 2026-089 PICK LIST</span>
              <span>
                {waveItems.filter((i) => i.isComplete).length} /{" "}
                {waveItems.length} COMPLETED
              </span>
            </div>
            {waveItems.map((item) => (
              <div
                key={item.id}
                className={`p-3 border-2 rounded-xl space-y-2 ${
                  item.isComplete
                    ? "bg-emerald-950/40 border-emerald-700"
                    : "bg-zinc-900 border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black text-cyan-400">
                    {item.binLocation}
                  </span>
                  <span className="font-mono text-sm font-black text-white">
                    {item.pickedQty} / {item.requiredQty} QTY
                  </span>
                </div>
                <div className="font-bold text-sm text-white">{item.sku}</div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{
                      width: `${(item.pickedQty / item.requiredQty) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {mode === "GATE_IN" && (
          <div className="p-3 bg-zinc-900 border-2 border-zinc-800 rounded-xl space-y-4">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
              <ShieldCheck className="w-5 h-5" />
              <span>Gate-In Safety & Container Verification</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 block font-semibold mb-1">
                  Container Identification (ISO 6346 Mod-11):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={gateInContainer}
                    onChange={(e) =>
                      setGateInContainer(e.target.value.toUpperCase())
                    }
                    className="flex-1 min-h-[44px] px-3 font-mono text-sm font-black bg-black border border-zinc-700 rounded-lg text-white"
                  />
                  <span
                    className={`px-2 py-2 rounded text-[11px] font-black ${
                      isValidIso6346(gateInContainer)
                        ? "bg-emerald-900 text-emerald-200 border border-emerald-600"
                        : "bg-red-900 text-red-200 border border-red-600"
                    }`}
                  >
                    {isValidIso6346(gateInContainer) ? "VALID ISO" : "INVALID"}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block font-semibold mb-1">
                  High-Security Bolt Seal ID:
                </label>
                <input
                  type="text"
                  value={gateInSeal}
                  onChange={(e) => setGateInSeal(e.target.value.toUpperCase())}
                  className="w-full min-h-[44px] px-3 font-mono text-sm font-bold bg-black border border-zinc-700 rounded-lg text-white"
                />
              </div>

              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2">
                <span className="text-[11px] text-zinc-400 font-semibold block">
                  Safety Inspection Checklist:
                </span>
                <label className="flex items-center gap-2 text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gateInInspectionPassed}
                    onChange={(e) =>
                      setGateInInspectionPassed(e.target.checked)
                    }
                    className="w-5 h-5 rounded text-purple-600"
                  />
                  <span>Physical Seal Intact & Tare Weight Verified</span>
                </label>
              </div>

              <button
                disabled={
                  !isValidIso6346(gateInContainer) ||
                  !gateInSeal ||
                  !gateInInspectionPassed
                }
                onClick={() => {
                  playTone(1050, 0.25, "sine");
                  triggerHaptic([50, 50, 50]);
                  setScanStatusMessage({
                    text: `Gate-In Authorized for Container ${gateInContainer}`,
                    type: "SUCCESS",
                  });
                }}
                className={`w-full min-h-[48px] font-black text-sm rounded-lg flex items-center justify-center gap-2 ${
                  isValidIso6346(gateInContainer) &&
                  gateInSeal &&
                  gateInInspectionPassed
                    ? "bg-purple-600 hover:bg-purple-500 text-white shadow-lg cursor-pointer"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
                CONFIRM GATE-IN ENTRY
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
