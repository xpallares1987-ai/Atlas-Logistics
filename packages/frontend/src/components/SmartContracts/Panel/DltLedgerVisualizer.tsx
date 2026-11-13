/**
 * @file DltLedgerVisualizer.tsx
 * @description Cryptographic Blockchain DLT Ledger visualizer with Merkle DAG inspector.
 * @module @atlas/frontend/components/SmartContracts/Panel
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Input } from "@atlas/ui";
import { motion } from "framer-motion";
import { Check, Copy, Radio, Search } from "lucide-react";
import type { DltLedgerVisualizerProps } from "../../../types/smart-contracts.types";
import { getEventBadgeClass } from "../hooks/useSmartContracts";

export function DltLedgerVisualizer({
  ledger,
  filteredBlocks,
  selectedBlock,
  onSelectBlock,
  searchBlockQuery,
  onSearchBlockQueryChange,
  filterEvent,
  onFilterEventChange,
  copiedHash,
  onCopyHash,
}: DltLedgerVisualizerProps) {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex-1 flex flex-col">
      {/* Ledger Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Libro Mayor Distribuido DLT (Ledger)
            <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300">
              {ledger.length} Bloques
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Estructura de Merkle DAG con enlaces criptográficos SHA-256
            inmutables
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative w-40 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <Input
              id="search-block-query"
              name="searchBlockQuery"
              placeholder="Filtrar tx / evento..."
              className="pl-8 text-xs py-1.5 h-8 bg-slate-950/80 border-slate-800 text-slate-200"
              value={searchBlockQuery}
              onChange={(e) => onSearchBlockQueryChange(e.target.value)}
            />
          </div>

          <select
            id="filter-ledger-event"
            name="filterLedgerEvent"
            aria-label="Filtrar por tipo de evento"
            value={filterEvent}
            onChange={(e) => onFilterEventChange(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 rounded-lg text-xs py-1 px-2 text-slate-300 h-8"
          >
            <option value="ALL">Todos los Eventos</option>
            <option value="GENESIS">GENESIS</option>
            <option value="EBL_ISSUED">EBL_ISSUED</option>
            <option value="TITLE_ENDORSED">TITLE_ENDORSED</option>
            <option value="ESCROW_DEPOSITED">ESCROW_DEPOSITED</option>
            <option value="VESSEL_DEPARTED">VESSEL_DEPARTED</option>
            <option value="SEAL_INSPECTED">SEAL_INSPECTED</option>
            <option value="CUSTOMS_CLEARED">CUSTOMS_CLEARED</option>
            <option value="CONTAINER_DISCHARGED">CONTAINER_DISCHARGED</option>
            <option value="PROOF_OF_DELIVERY">PROOF_OF_DELIVERY</option>
            <option value="SMART_CONTRACT_SETTLEMENT">
              SMART_CONTRACT_SETTLEMENT
            </option>
            <option value="ESCROW_DISPUTED">ESCROW_DISPUTED</option>
          </select>
        </div>
      </div>

      {/* Blocks List */}
      <div className="space-y-3 mt-4 overflow-y-auto max-h-[680px] pr-1">
        {filteredBlocks.map((block) => {
          const isSelected = selectedBlock?.blockNumber === block.blockNumber;
          return (
            <motion.div
              key={block.blockNumber}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? "bg-slate-800/90 border-indigo-500 shadow-md ring-1 ring-indigo-500"
                  : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60"
              }`}
              onClick={() => onSelectBlock(isSelected ? null : block)}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                    #{block.blockNumber}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold border ${getEventBadgeClass(
                      block.payload.event,
                    )}`}
                  >
                    {block.payload.event}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(block.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyHash(block.txHash, `tx-${block.blockNumber}`);
                    }}
                    className="font-mono text-[10px] text-slate-400 hover:text-slate-200 bg-slate-900 px-2 py-1 rounded border border-slate-800 flex items-center gap-1"
                  >
                    <span>tx: {block.txHash.slice(0, 10)}...</span>
                    {copiedHash === `tx-${block.blockNumber}` ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-300 mb-2 leading-relaxed">
                <span className="text-slate-400 font-medium">
                  {block.payload.sender}:{" "}
                </span>
                {block.payload.details}
              </div>

              {block.payload.iotTelemetry && (
                <div className="flex flex-wrap items-center gap-2 mb-2 p-2 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-[11px]">
                  <span className="text-indigo-400 font-semibold flex items-center gap-1">
                    <Radio className="w-3 h-3" /> Telemetría IoT:
                  </span>
                  <span className="text-slate-300">
                    Precinto:{" "}
                    <strong>{block.payload.iotTelemetry.isoSealNumber}</strong>{" "}
                    ({block.payload.iotTelemetry.sealStatus})
                  </span>
                  {block.payload.iotTelemetry.temperatureCelsius !==
                    undefined && (
                    <span className="text-slate-300">
                      Temp:{" "}
                      <strong>
                        {block.payload.iotTelemetry.temperatureCelsius}°C
                      </strong>
                    </span>
                  )}
                  {block.payload.iotTelemetry.batteryPercent !== undefined && (
                    <span className="text-slate-300">
                      Batería:{" "}
                      <strong>
                        {block.payload.iotTelemetry.batteryPercent}%
                      </strong>
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-800/60">
                <div className="flex items-center gap-1 truncate max-w-[70%]">
                  <span className="text-slate-600">prevHash:</span>
                  <span className="truncate">
                    {block.prevHash.slice(0, 16)}...
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-600">Merkle Root:</span>
                  <span>{block.merkleRoot.slice(0, 8)}...</span>
                </div>
              </div>

              {isSelected && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 pt-3 border-t border-slate-800 text-[11px] space-y-2 bg-slate-950/80 p-3 rounded-lg"
                >
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hash Completo Tx:</span>
                    <span className="font-mono text-indigo-300 select-all break-all">
                      {block.txHash}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hash Previo:</span>
                    <span className="font-mono text-slate-400 select-all break-all">
                      {block.prevHash}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Raíz de Merkle:</span>
                    <span className="font-mono text-emerald-400 select-all break-all">
                      {block.merkleRoot}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Firma Nodo Autoridad:
                    </span>
                    <span className="font-mono text-slate-400 truncate max-w-[300px]">
                      {block.signature}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Gas Empleado / Nonce:
                    </span>
                    <span className="font-mono text-slate-300">
                      {block.gasUsed} gas • Nonce: {block.nonce}
                    </span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
