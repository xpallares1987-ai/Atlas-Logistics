/**
 * @file NewIncident.tsx
 * @description Dialog for registering new operational supply chain incidents into the Control Tower radar.
 * Captures incident typology, severity level, financial impact, delay estimations, and geographical node.
 * @module @atlas/frontend/components/ControlTower/Modal
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import { ShieldAlert, X } from "lucide-react";

export interface NewIncidentFormData {
  title: string;
  incidentType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  description: string;
  impactAmountEur: number;
  delayHours: number;
  locationName: string;
  shipmentId?: string;
}

export interface NewIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  data: NewIncidentFormData;
  onChangeData: (data: NewIncidentFormData) => void;
}

export const NewIncident: React.FC<NewIncidentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  data,
  onChangeData,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 text-xs"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-rose-400" />
            <h3 className="text-sm font-bold text-white">
              Registrar Nueva Incidencia Operativa
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-slate-400 font-medium">
            Título del Incidente:
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Bloqueo de acceso en Terminal CSP Valencia"
            value={data.title}
            onChange={(e) =>
              onChangeData({
                ...data,
                title: e.target.value,
              })
            }
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-400 font-medium">
              Tipo de Incidencia:
            </label>
            <select
              value={data.incidentType}
              onChange={(e) =>
                onChangeData({
                  ...data,
                  incidentType: e.target.value,
                })
              }
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
            >
              <option value="PORT_CONGESTION">Congestión Portuaria</option>
              <option value="CANAL_BLOCKAGE">Bloqueo Canal / Estrecho</option>
              <option value="VESSEL_DELAY">Retraso Naviera</option>
              <option value="COLD_CHAIN_BREACH">Rotura Cadena de Frío</option>
              <option value="CUSTOMS_HOLD">Retención Aduanera</option>
              <option value="ROAD_ACCIDENT">Avería / Tráfico Terrestre</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-400 font-medium">Severidad:</label>
            <select
              value={data.severity}
              onChange={(e) =>
                onChangeData({
                  ...data,
                  severity: e.target.value,
                })
              }
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
            >
              <option value="LOW">Baja (Menor)</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
              <option value="CRITICAL">Crítica</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-400 font-medium">Impacto (€):</label>
            <input
              type="number"
              value={data.impactAmountEur}
              onChange={(e) =>
                onChangeData({
                  ...data,
                  impactAmountEur: Number(e.target.value),
                })
              }
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-400 font-medium">
              Retraso Estimado (h):
            </label>
            <input
              type="number"
              value={data.delayHours}
              onChange={(e) =>
                onChangeData({
                  ...data,
                  delayHours: Number(e.target.value),
                })
              }
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-slate-400 font-medium">
            Ubicación / Nodo:
          </label>
          <input
            type="text"
            placeholder="Ej: Puerto de Barcelona (BEST)"
            value={data.locationName}
            onChange={(e) =>
              onChangeData({
                ...data,
                locationName: e.target.value,
              })
            }
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-slate-400 font-medium">Descripción:</label>
          <textarea
            rows={2}
            required
            value={data.description}
            onChange={(e) =>
              onChangeData({
                ...data,
                description: e.target.value,
              })
            }
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
          >
            Registrar Incidencia
          </button>
        </div>
      </form>
    </div>
  );
};

export const NewIncidentModal = NewIncident;
