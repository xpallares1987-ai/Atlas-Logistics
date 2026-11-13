/**
 * @file JsonLdExplorer.tsx
 * @description W3C JSON-LD Linked Data Explorer and physical pieces breakdown tab.
 * @module @atlas/frontend/components/IataOneRecord/Tab/JsonLdExplorer
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { Box, Plane, ShieldCheck, Sparkles, Check, Copy } from "lucide-react";
import type { OneRecordWaybill } from "@atlas/shared";

export interface JsonLdExplorerProps {
  selectedWaybill: OneRecordWaybill;
  copiedJson: boolean;
  onCopyJsonLd: () => void;
}

export const JsonLdExplorer: React.FC<JsonLdExplorerProps> = ({
  selectedWaybill,
  copiedJson,
  onCopyJsonLd,
}) => {
  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 font-medium">
            e-AWB Reference
          </span>
          <p className="text-xl font-bold text-white mt-1">
            {selectedWaybill.fullAwbNumber}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-blue-400">
            <Box className="w-3.5 h-3.5" />
            <span>
              {selectedWaybill.piecesCount} Bultos (
              {selectedWaybill.totalGrossWeightKg} kg)
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 font-medium">
            Ruta Aérea & Vuelo
          </span>
          <p className="text-xl font-bold text-white mt-1">
            {selectedWaybill.originAirport} →{" "}
            {selectedWaybill.destinationAirport}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-emerald-400">
            <Plane className="w-3.5 h-3.5" />
            <span>
              {selectedWaybill.transportMovement.flightNumber} (
              {selectedWaybill.transportMovement.aircraftType})
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 font-medium">
            Handling Especial
          </span>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {selectedWaybill.specialHandlingCodes.map((c) => (
              <span
                key={c}
                className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30"
              >
                {c}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 truncate">
            {selectedWaybill.natureAndQuantityOfGoods}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 font-medium">
            Sello Criptográfico SHA-256
          </span>
          <p className="text-xs font-mono text-cyan-400 mt-2 break-all bg-slate-950 p-2 rounded border border-slate-800">
            {selectedWaybill.digitalSealHash}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Certificado e-AWB Conforme</span>
          </div>
        </div>
      </div>

      {/* Linked Pieces Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Box className="w-4 h-4 text-blue-400" />
            Desglose de Bultos Físicos (ONE Record Pieces)
          </h3>
          <span className="text-xs text-slate-400">
            Total: {selectedWaybill.pieces.length} bultos declarados
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 text-xs uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Piece ID</th>
                <th className="p-3">Secuencia</th>
                <th className="p-3">Dimensiones (LxWxH)</th>
                <th className="p-3">Peso Bruto</th>
                <th className="p-3">Volumen</th>
                <th className="p-3">Códigos de Manipulación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {selectedWaybill.pieces.map((p) => (
                <tr key={p.pieceId} className="hover:bg-slate-800/40">
                  <td className="p-3 font-mono text-blue-400 font-medium">
                    {p.pieceId}
                  </td>
                  <td className="p-3">{p.sequenceNumber}</td>
                  <td className="p-3 text-slate-400">
                    {p.dimensionsCm.length} x {p.dimensionsCm.width} x{" "}
                    {p.dimensionsCm.height} cm
                  </td>
                  <td className="p-3 font-medium text-white">
                    {p.grossWeightKg} kg
                  </td>
                  <td className="p-3 text-slate-400">{p.volumeCbm} m³</td>
                  <td className="p-3">
                    <div className="flex gap-1.5">
                      {p.specialHandlingCodes.map((code) => (
                        <span
                          key={code}
                          className="px-2 py-0.5 rounded text-xs font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* W3C JSON-LD Code Block */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h4 className="text-sm font-semibold text-white">
              Ontología W3C JSON-LD (https://onerecord.iata.org/ns/cargo#)
            </h4>
          </div>
          <button
            id="btnCopyJsonLd"
            onClick={onCopyJsonLd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 transition-all"
          >
            {copiedJson ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar JSON-LD</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto max-h-96">
          {JSON.stringify(selectedWaybill, null, 2)}
        </pre>
      </div>
    </div>
  );
};
