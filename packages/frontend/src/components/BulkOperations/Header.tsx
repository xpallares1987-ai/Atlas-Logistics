/**
 * @file Header.tsx
 * @description Header banner, quick KPI summary, and tab navigation for maritime bulk operations.
 * @module @atlas/frontend/components/BulkOperations
 */

import {
  Anchor,
  Download,
  Ship,
  Scale,
  Flame,
  CheckCircle2,
  Wheat,
  Droplets,
} from "lucide-react";
import { Card, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { VesselOperationRecord, BulkTab } from "./types/index";

interface HeaderProps {
  vesselOps: VesselOperationRecord[];
  selectedOp: VesselOperationRecord;
  onSelectOp: (op: VesselOperationRecord) => void;
  activeTab: BulkTab;
  onTabChange: (tab: BulkTab) => void;
}

export function Header({
  vesselOps,
  selectedOp,
  onSelectOp,
  activeTab,
  onTabChange,
}: HeaderProps) {
  return (
    <>
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <Anchor className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Logística de Graneles & Operaciones de Terminal Portuaria
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                IMSBC Code / BLU Code / IMO Grain Code / ASTM 54
              </span>
            </h1>
            <p className="text-sm text-slate-400">
              Cálculo hidrostático de calados (Draft Survey de 6 puntos),
              control de licuefacción de minerales TML/FMP, evaluación de
              estabilidad de grano y sondeo de tanques petroleros/quimiqueros.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedOp.id}
            onChange={(e) => {
              const op = vesselOps.find((v) => v.id === e.target.value);
              if (op) onSelectOp(op);
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200"
          >
            {vesselOps.map((op) => (
              <option key={op.id} value={op.id}>
                {op.vesselName} ({op.vesselType})
              </option>
            ))}
          </select>
          <Button
            onClick={() =>
              window.open(
                `/api/bulk-operations/draft-surveys/draft_survey_final_01/report-pdf`,
                "_blank",
              )
            }
            className="bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-2 text-xs"
          >
            <Download className="w-4 h-4" />
            Descargar Draft Survey PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">
                Buques en Operación
              </p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">
                3 Escalas
              </h3>
              <p className="text-[11px] text-amber-400 mt-0.5">
                Capesize, Panamax & Tanker
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
              <Ship className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">
                Carga Certificada (Draft)
              </p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                120.059 t
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Mineral de Hierro El Musel
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Scale className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">
                Control Licuefacción TML
              </p>
              <h3 className="text-2xl font-bold text-sky-400 mt-1">
                100% Conforme
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Humedad 8.5% &lt; TML 9.9%
              </p>
            </div>
            <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl">
              <Flame className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">
                Estabilidad Grain Code
              </p>
              <h3 className="text-2xl font-bold text-amber-400 mt-1">
                θ = 5.62°
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Escora &lt; 12.0° | GM₀ 1.15m
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-800 space-x-4">
        {[
          {
            id: "draft_survey" as const,
            label: "Draft Survey & Cálculo Hidrostático (6 Puntos & Densidad)",
            icon: Scale,
          },
          {
            id: "imsbc_grain" as const,
            label: "Graneles Sólidos IMSBC & Estabilidad de Grano OMI",
            icon: Wheat,
          },
          {
            id: "tanker_ullage" as const,
            label: "Sondeo de Tanques Ullage ASTM & Terminales BLU",
            icon: Droplets,
          },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs transition-colors ${
                isActive
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
