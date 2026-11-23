/**
 * @file GateInTab.tsx
 * @description Gate-In container safety inspection and verification tab for rugged warehouse terminal.
 * @module @atlas/frontend/pages/WarehouseTerminal/Tab/GateInTab
 */

import { ShieldCheck } from "lucide-react";
import { isValidIso6346 } from "@atlas/shared";

interface GateInTabProps {
  gateInContainer: string;
  setGateInContainer: (val: string) => void;
  gateInSeal: string;
  setGateInSeal: (val: string) => void;
  gateInInspectionPassed: boolean;
  setGateInInspectionPassed: (val: boolean) => void;
  onConfirmGateIn: () => void;
}

export function GateInTab({
  gateInContainer,
  setGateInContainer,
  gateInSeal,
  setGateInSeal,
  gateInInspectionPassed,
  setGateInInspectionPassed,
  onConfirmGateIn,
}: GateInTabProps) {
  const isIsoValid = isValidIso6346(gateInContainer);
  const isReady =
    isIsoValid && gateInSeal.trim().length > 0 && gateInInspectionPassed;

  return (
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
              onChange={(e) => setGateInContainer(e.target.value.toUpperCase())}
              placeholder="MSCU1234567"
              className="flex-1 min-h-[44px] px-3 font-mono text-sm font-black bg-black border border-zinc-700 rounded-lg text-white"
            />
            <span
              className={`px-2 py-2 rounded text-[11px] font-black ${
                isIsoValid
                  ? "bg-emerald-900 text-emerald-200 border border-emerald-600"
                  : "bg-red-900 text-red-200 border border-red-600"
              }`}
            >
              {isIsoValid ? "VALID ISO" : "INVALID"}
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
            placeholder="SEAL-USC-99014"
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
              onChange={(e) => setGateInInspectionPassed(e.target.checked)}
              className="w-5 h-5 rounded text-purple-600"
            />
            <span>Physical Seal Intact & Tare Weight Verified</span>
          </label>
        </div>

        <button
          disabled={!isReady}
          onClick={onConfirmGateIn}
          className={`w-full min-h-[48px] font-black text-sm rounded-lg flex items-center justify-center gap-2 ${
            isReady
              ? "bg-purple-600 hover:bg-purple-500 text-white shadow-lg cursor-pointer"
              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
          }`}
        >
          <ShieldCheck className="w-5 h-5" />
          CONFIRM GATE-IN ENTRY
        </button>
      </div>
    </div>
  );
}
