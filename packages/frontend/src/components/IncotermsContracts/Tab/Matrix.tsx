/**
 * @file Matrix.tsx
 * @description Official ICC Incoterms® 2020 matrix (11 rules x 10 stages of cost and risk transfer).
 * @module @atlas/frontend/components/IncotermsContracts/Tab
 */

import { IncotermRule } from "../types/index";

export interface MatrixProps {
  incotermRules: IncotermRule[];
}

export function Matrix({ incotermRules }: MatrixProps) {
  return (
    <div className="flex-1 px-4 md:px-8 pb-8 overflow-y-auto z-10 relative">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
        <div>
          <h2 className="text-lg font-black text-white">
            Matriz Oficial ICC Incoterms® 2020 (11 Reglas × 10 Etapas)
          </h2>
          <p className="text-xs text-slate-400">
            Distribución obligatoria de costes y riesgos entre Parte Vendedora
            (Azul) y Parte Compradora (Verde).
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="py-3 px-3 font-semibold">Regla</th>
                <th className="py-3 px-3 font-semibold">Categoría</th>
                <th className="py-3 px-3 font-semibold">
                  Punto de Entrega (Riesgo)
                </th>
                <th className="py-3 px-3 font-semibold">Seguro Obligatorio</th>
                <th className="py-3 px-3 font-semibold">Aduana Exp / Imp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white">
              {incotermRules.map((rule) => (
                <tr
                  key={rule.code}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="py-3.5 px-3">
                    <span className="px-2.5 py-1 rounded-lg font-black text-sm bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      {rule.code}
                    </span>
                    <p className="text-[11px] text-slate-300 font-medium mt-1">
                      {rule.name}
                    </p>
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        rule.transportCategory === "ANY_MODE"
                          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                          : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      }`}
                    >
                      {rule.transportCategory === "ANY_MODE"
                        ? "Multimodal"
                        : "Marítimo"}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-300 text-[11px] max-w-[280px]">
                    {rule.riskTransferPoint}
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                        rule.insuranceRequirement === "MANDATORY_CLAUSE_A"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : rule.insuranceRequirement === "MANDATORY_CLAUSE_C"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-white/10 text-slate-400"
                      }`}
                    >
                      {rule.insuranceRequirement === "MANDATORY_CLAUSE_A"
                        ? "Clause A (All Risks)"
                        : rule.insuranceRequirement === "MANDATORY_CLAUSE_C"
                          ? "Clause C (Min Cover)"
                          : "Opcional"}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-[11px] text-slate-300">
                    {rule.customsExportBy === "SELLER"
                      ? "Exp: Vendedor"
                      : "Exp: Comprador"}{" "}
                    /{" "}
                    {rule.customsImportBy === "SELLER"
                      ? "Imp: Vendedor"
                      : "Imp: Comprador"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
