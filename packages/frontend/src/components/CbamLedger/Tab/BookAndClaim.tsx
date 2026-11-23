/**
 * @file BookAndClaim.tsx
 * @description Cryptographic Book-and-Claim mass-balance insetting ledger with SHA-256 hash chaining.
 * @module @atlas/frontend/components/CbamLedger/Tab/BookAndClaim
 * @see {@link docs/adr/0017-fueleu-maritime-ets-carbon-insetting.md}
 * @see {@link docs/adr/0042-maritime-decarbonization-and-cbam-financial-ledger.md}
 */

import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  Boxes,
  Flame,
  RefreshCw,
} from "lucide-react";

export interface InsettingToken {
  id: string;
  tokenCode: string;
  fuelType: "B100_BIODIESEL" | "HVO100" | "BIO_LNG" | "E_METHANOL";
  certificationStandard: "ISCC_EU" | "RED_II" | "RSB";
  certificateNumber: string;
  bunkeredVolumeMt: number;
  energyContentMj: number;
  wtwCarbonIntensity: number; // gCO2e/MJ
  avoidedCo2eMt: number;
  genesisBlockHash: string;
  status: "ACTIVE" | "RESERVED" | "RETIRED";
}

export interface InsettingAllocationBlock {
  blockHeight: number;
  allocationRef: string;
  tokenCode: string;
  shipmentId: string;
  customerName: string;
  avoidedTco2e: number;
  allocatedEnergyMj: number;
  previousBlockHash: string;
  currentBlockHash: string;
  timestamp: string;
  isVerified: boolean;
}

export interface BookAndClaimProps {
  tokens: InsettingToken[];
  blocks: InsettingAllocationBlock[];
  onVerifyChain: () => void;
  isVerifying: boolean;
  chainValid: boolean | null;
}

export const BookAndClaim: React.FC<BookAndClaimProps> = ({
  tokens,
  blocks,
  onVerifyChain,
  isVerifying,
  chainValid,
}) => {
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(
    tokens[0]?.id || null,
  );

  const retiredCo2e = blocks.reduce((acc, b) => acc + b.avoidedTco2e, 0);

  return (
    <div className="space-y-6">
      {/* Verification & Trust Banner */}
      <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900/60 to-purple-950/60 p-6 rounded-2xl border border-indigo-800/40 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white">
                Cryptographic Insetting & Mass-Balance Ledger
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                ISO 14083 & GLEC Framework v3.0
              </span>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">
              Links physical Bunker Delivery Notes (BDNs) and ISCC-EU certified
              sustainable fuels to specific customer shipments using
              deterministic SHA-256 block hashing, guaranteeing zero
              double-counting.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onVerifyChain}
              disabled={isVerifying}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              <RefreshCw
                className={`w-4 h-4 ${isVerifying ? "animate-spin" : ""}`}
              />
              {isVerifying ? "Verifying SHA-256..." : "Verify Hash Chain"}
            </button>

            {chainValid !== null && (
              <div
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border ${
                  chainValid
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                }`}
              >
                {chainValid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Chain Cryptographically
                    Certified
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" /> Hash Digest Mismatch Detected
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Available Physical Tokens */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400" />
          Certified Low-Carbon Fuel Batches (Bunker Delivery Notes)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tokens.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelectedTokenId(t.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                selectedTokenId === t.id
                  ? "bg-indigo-950/40 border-indigo-500"
                  : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-indigo-300 text-sm">
                  {t.tokenCode}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                  {t.fuelType.replace("_", " ")}
                </span>
              </div>
              <div className="text-xs text-slate-400 mb-2">
                Cert:{" "}
                <span className="text-slate-200 font-semibold">
                  {t.certificateNumber}
                </span>{" "}
                ({t.certificationStandard})
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                <div>
                  <span className="text-slate-500 block">Avoided CO₂e:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {t.avoidedCo2eMt.toFixed(1)} tCO₂e
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">
                    Carbon Intensity:
                  </span>
                  <span className="font-bold text-slate-300 font-mono">
                    {t.wtwCarbonIntensity.toFixed(1)} g/MJ
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-500 truncate">
                Genesis: {t.genesisBlockHash}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SHA-256 Block Chain History */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Boxes className="w-4 h-4 text-indigo-400" />
            Immutable Insetting Hash Chain ({blocks.length} Blocks)
          </h3>
          <span className="text-xs text-slate-400">
            Retired: {retiredCo2e.toFixed(1)} tCO₂e
          </span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {blocks.map((b) => (
            <div
              key={b.blockHeight}
              className="p-4 hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Block #{b.blockHeight}
                  </span>
                  <span className="font-semibold text-sm text-white">
                    {b.allocationRef}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Shipment: {b.shipmentId}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    Customer:{" "}
                    <strong className="text-slate-200">{b.customerName}</strong>
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/40">
                    -{b.avoidedTco2e.toFixed(2)} tCO₂e
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <div className="truncate">
                  <span className="text-slate-500">Prev Hash: </span>
                  {b.previousBlockHash}
                </div>
                <div className="truncate text-indigo-300">
                  <span className="text-slate-500">Block Hash: </span>
                  {b.currentBlockHash}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
