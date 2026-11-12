/**
 * @file Marketplace.tsx
 * @description Verified carbon offset projects catalog tab (Verra VCS, Gold Standard, Puro.earth).
 * @module @atlas/frontend/components/CarbonEmissions/Tab
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Button } from "@atlas/ui";
import { ExternalLink, Leaf, TreePine } from "lucide-react";
import type { MarketplaceTabProps } from "../../../types/carbon-emissions.types";
import { toNumber } from "../hooks/useCarbonEmissions";

export function Marketplace({
  projects,
  onSelectProjectForOffset,
}: MarketplaceTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <TreePine size={18} className="text-emerald-400" />
            Catálogo de Proyectos de Compensación Verificados
          </h3>
          <p className="text-xs text-slate-400">
            Créditos de carbono certificados por Verra VCS, Gold Standard y
            Puro.earth con trazabilidad total
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((proj) => (
          <div
            key={proj.id}
            className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col justify-between hover:border-emerald-500/40 transition shadow-xl"
          >
            <div>
              <div className="h-44 relative overflow-hidden bg-slate-950">
                {proj.imageUrl ? (
                  <img
                    src={proj.imageUrl}
                    alt={proj.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-800">
                    <Leaf size={40} className="text-emerald-500/40" />
                  </div>
                )}
                <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-extrabold text-emerald-400 border border-emerald-500/30">
                  {String(proj.standard || "").replace("_", " ")}
                </div>
              </div>

              <div className="p-5 flex flex-col gap-2.5">
                <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase">
                  {String(proj.category || "").replace("_", " ")} |{" "}
                  {proj.country}
                </span>
                <h4 className="text-sm font-bold text-white leading-snug">
                  {proj.name}
                </h4>
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {proj.description}
                </p>
              </div>
            </div>

            <div className="p-5 pt-0">
              <div className="flex items-baseline justify-between pt-3 border-t border-slate-800/80 mb-3">
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Precio por Tonelada
                  </span>
                  <span className="text-lg font-black text-white">
                    €{toNumber(proj.pricePerTco2eEur).toFixed(2)}{" "}
                    <span className="text-xs font-normal text-slate-400">
                      / tCO2e
                    </span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">
                    Créditos Disponibles
                  </span>
                  <span className="text-xs font-bold text-emerald-400">
                    {toNumber(proj.availableCreditsTco2e).toLocaleString()} t
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {proj.verificationRegistryUrl && (
                  <a
                    href={proj.verificationRegistryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Verificar en Registro Oficial"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
                <Button
                  onClick={() => onSelectProjectForOffset(proj.id)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30"
                >
                  Asignar Compensación
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default Marketplace;
