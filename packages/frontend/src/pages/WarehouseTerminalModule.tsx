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
  Box,
} from "lucide-react";
import { isValidIso6346 } from "@atlas/shared";
import {
  CrossDockTab,
  type CrossDockTask,
} from "./WarehouseTerminal/Tab/CrossDockTab";
import {
  PutawayTab,
  type PutawayTask,
} from "./WarehouseTerminal/Tab/PutawayTab";
import {
  WavePickTab,
  type WavePickItem,
} from "./WarehouseTerminal/Tab/WavePickTab";
import { GateInTab } from "./WarehouseTerminal/Tab/GateInTab";

type TerminalMode = "CROSS_DOCK" | "PUTAWAY" | "PICKING" | "GATE_IN";

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

const INITIAL_WAVE: WavePickItem[] = [
  {
    id: "WP-01",
    waveId: "WV-2026-089",
    sku: "AUTO-FILT-09",
    binLocation: "A-04-12",
    requiredQty: 10,
    pickedQty: 10,
    isComplete: true,
  },
  {
    id: "WP-02",
    waveId: "WV-2026-089",
    sku: "AUTO-SPRK-44",
    binLocation: "B-01-08",
    requiredQty: 25,
    pickedQty: 15,
    isComplete: false,
  },
  {
    id: "WP-03",
    waveId: "WV-2026-089",
    sku: "MED-TEST-KIT",
    binLocation: "COLD-R01-A",
    requiredQty: 50,
    pickedQty: 0,
    isComplete: false,
  },
];

export default function WarehouseTerminalModule() {
  const [mode, setMode] = useState<TerminalMode>("CROSS_DOCK");
  const [highContrast, setHighContrast] = useState<boolean>(true);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [isOnline] = useState<boolean>(true);

  // Workflow state
  const [crossDockTasks, setCrossDockTasks] =
    useState<CrossDockTask[]>(INITIAL_CROSSDOCK);
  const [putawayTasks, setPutawayTasks] =
    useState<PutawayTask[]>(INITIAL_PUTAWAY);
  const [waveItems, setWaveItems] = useState<WavePickItem[]>(INITIAL_WAVE);

  // Gate-In state
  const [gateInContainer, setGateInContainer] = useState<string>("MSCU9876543");
  const [gateInSeal, setGateInSeal] = useState<string>("SEAL-USC-99014");
  const [gateInInspectionPassed, setGateInInspectionPassed] =
    useState<boolean>(false);

  // Scanner state
  const [barcodeInput, setBarcodeInput] = useState<string>("");
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string>("");
  const [scanStatusMessage, setScanStatusMessage] = useState<{
    text: string;
    type: "SUCCESS" | "ERROR" | "INFO";
  }>({
    text: "Scanner Ready (Laser Wedge Active)",
    type: "INFO",
  });

  // Web Audio Context synthesizer for acoustic feedback on warehouse floor
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playTone = useCallback(
    (freq: number, durationSec: number, type: OscillatorType = "sine") => {
      if (!audioEnabled) return;
      try {
        if (!audioCtxRef.current) {
          const AudioContextClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext;
          if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
        }
        if (!audioCtxRef.current) return;
        if (audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume();
        }

        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtxRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          audioCtxRef.current.currentTime + durationSec,
        );
        osc.connect(gain);
        gain.connect(audioCtxRef.current.destination);
        osc.start();
        osc.stop(audioCtxRef.current.currentTime + durationSec);
      } catch {
        // Audio synthesis fallback (silent)
      }
    },
    [audioEnabled],
  );

  const triggerHaptic = useCallback((pattern: number | number[]) => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Haptic feedback unavailable
      }
    }
  }, []);

  // Process barcode input
  const handleProcessBarcode = useCallback(
    (rawCode: string) => {
      const code = rawCode.trim().toUpperCase();
      if (!code) return;

      setLastScannedBarcode(code);
      setBarcodeInput("");

      // Mode-specific dispatch
      if (mode === "CROSS_DOCK") {
        const found = crossDockTasks.find(
          (t) =>
            t.inboundRef.toUpperCase() === code ||
            t.outboundShipmentId.toUpperCase() === code ||
            code.includes(t.inboundRef.toUpperCase()),
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
          playTone(880, 0.15, "triangle");
          triggerHaptic(50);
          setScanStatusMessage({
            text: `Cross-Dock Pallet Verified: ${code}`,
            type: "SUCCESS",
          });
        } else {
          playTone(220, 0.35, "sawtooth");
          triggerHaptic([100, 50, 100]);
          setScanStatusMessage({
            text: `Unrecognized Manifest Barcode: ${code}`,
            type: "ERROR",
          });
        }
      } else if (mode === "PUTAWAY") {
        const found = putawayTasks.find(
          (p) =>
            p.sscc === code ||
            p.sku.toUpperCase() === code ||
            p.recommendedBin.toUpperCase() === code,
        );
        if (found) {
          setPutawayTasks((prev) =>
            prev.map((p) =>
              p.id === found.id
                ? { ...p, status: "CONFIRMED", confirmedBin: p.recommendedBin }
                : p,
            ),
          );
          playTone(1200, 0.12, "sine");
          triggerHaptic(60);
          setScanStatusMessage({
            text: `Putaway Staged in ${found.recommendedBin}: ${code}`,
            type: "SUCCESS",
          });
        } else {
          playTone(220, 0.35, "sawtooth");
          triggerHaptic([100, 50, 100]);
          setScanStatusMessage({
            text: `Bin or SSCC Mismatch: ${code}`,
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
          playTone(1000, 0.1, "sine");
          triggerHaptic(40);
          setScanStatusMessage({
            text: `Picked Item: ${found.sku}`,
            type: "SUCCESS",
          });
        } else {
          playTone(220, 0.35, "sawtooth");
          triggerHaptic([100, 50, 100]);
          setScanStatusMessage({
            text: `SKU Not in Active Wave: ${code}`,
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
          playTone(660, 0.15, "sine");
          triggerHaptic(40);
          setScanStatusMessage({
            text: `Seal Number Scanned: ${code}`,
            type: "SUCCESS",
          });
        }
      }
    },
    [mode, crossDockTasks, putawayTasks, waveItems, playTone, triggerHaptic],
  );

  // Hardware Scanner Wedge Listener (Zebra DataWedge)
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
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
          buffer = "";
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
        {mode === "CROSS_DOCK" && <CrossDockTab tasks={crossDockTasks} />}
        {mode === "PUTAWAY" && <PutawayTab tasks={putawayTasks} />}
        {mode === "PICKING" && <WavePickTab items={waveItems} />}
        {mode === "GATE_IN" && (
          <GateInTab
            gateInContainer={gateInContainer}
            setGateInContainer={setGateInContainer}
            gateInSeal={gateInSeal}
            setGateInSeal={setGateInSeal}
            gateInInspectionPassed={gateInInspectionPassed}
            setGateInInspectionPassed={setGateInInspectionPassed}
            onConfirmGateIn={() => {
              playTone(1050, 0.25, "sine");
              triggerHaptic([50, 50, 50]);
              setScanStatusMessage({
                text: `Gate-In Authorized for Container ${gateInContainer}`,
                type: "SUCCESS",
              });
            }}
          />
        )}
      </main>
    </div>
  );
}
