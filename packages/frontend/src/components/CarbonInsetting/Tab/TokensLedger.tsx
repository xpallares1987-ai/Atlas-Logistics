/**
 * @file TokensLedger.tsx
 * @description Scope 3 insetting tokenized ledger table under book-and-claim scheme.
 * @module @atlas/frontend/components/CarbonInsetting/Tab
 */

import { Coins, Download, Ship, Truck, Train } from "lucide-react";
import { Button } from "@atlas/ui";
import { CERTIFIED_FUELS_CATALOG, InsettingToken } from "@atlas/shared";

export interface TokensLedgerProps {
  tokens: InsettingToken[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onDownloadPDF: (token: InsettingToken) => void;
}

export function TokensLedger({
  tokens,
  searchTerm,
  onSearchChange,
  onDownloadPDF,
}: TokensLedgerProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-400" />
            <span>Libro Mayor Tokenizado de Insetting (Book-and-Claim)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Certificados de descarbonización Scope 3 emitidos y retirados en
            favor de clientes y embarques acreditados.
          </p>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar token / expedición..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-56"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px]">
            <tr>
              <th className="p-3">ID Token</th>
              <th className="p-3">Combustible & Modalidad</th>
              <th className="p-3">Beneficiario & Expedición</th>
              <th className="p-3">Masa / Energía</th>
              <th className="p-3">Reducción Scope 3</th>
              <th className="p-3">Suministro BDN</th>
              <th className="p-3">Certificación</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {tokens.map((token) => (
              <tr key={token.tokenId} className="hover:bg-slate-800/50">
                <td className="p-3">
                  <span className="font-mono font-bold text-emerald-400 block">
                    {token.tokenId}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(
                      token.issueDate || Date.now(),
                    ).toLocaleDateString()}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    {token.transportMode === "MARITIME_OCEAN" ? (
                      <Ship className="w-3.5 h-3.5 text-cyan-400" />
                    ) : token.transportMode === "ROAD_DRAYAGE" ? (
                      <Truck className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Train className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>
                      {
                        CERTIFIED_FUELS_CATALOG[
                          token.fuelType
                        ]?.displayName.split("(")[0]
                      }
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    {token.transportMode}
                  </span>
                </td>
                <td className="p-3">
                  <span className="font-semibold text-slate-200 block">
                    {token.beneficiaryCompany}
                  </span>
                  <span className="text-[10px] text-cyan-300 font-mono">
                    {token.allocatedShipmentRef}
                  </span>
                </td>
                <td className="p-3 font-mono">
                  <span className="text-white font-bold">
                    {token.fuelVolumeMT} MT
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {((token.energyContentMJ || 0) / 1000000).toFixed(2)} GJ
                  </span>
                </td>
                <td className="p-3 font-mono">
                  <span className="text-emerald-400 font-extrabold text-sm">
                    -{token.ghgAbatementTonsCO2e} tCO2e
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {CERTIFIED_FUELS_CATALOG[token.fuelType]
                      ?.ghgReductionPercentage ?? 85}
                    % ahorro
                  </span>
                </td>
                <td className="p-3 text-[11px] text-slate-300">
                  <span>
                    {(token.bunkerLocation || "").split("-")[0] || "Port"}
                  </span>
                  <span className="text-[10px] text-slate-500 block font-mono">
                    {token.bdnReference}
                  </span>
                </td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 block w-max">
                    RETIRED
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono mt-0.5 block truncate max-w-[120px]">
                    {token.sustainabilityCertificateNumber}
                  </span>
                </td>
                <td className="p-3">
                  <Button
                    onClick={() => onDownloadPDF(token)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Certificado PDF</span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
