/**
 * @file AllocationStudio.tsx
 * @description Insetting allocation form and real-time Scope 3 abatement calculator studio.
 * @module @atlas/frontend/components/CarbonInsetting/Tab
 */

import React from "react";
import { Sparkles, Coins, ShieldCheck } from "lucide-react";
import {
  CERTIFIED_FUELS_CATALOG,
  FuelType,
  TransportMode,
} from "@atlas/shared";
import { AllocFormState, AvailableShipmentOption } from "../types/index";

export interface AllocationStudioProps {
  allocForm: AllocFormState;
  setAllocForm: React.Dispatch<React.SetStateAction<AllocFormState>>;
  availableShipments: AvailableShipmentOption[];
  liveAbatement: {
    energyContentMJ: number;
    baselineEmissionsMTCO2e: number;
    actualEmissionsMTCO2e: number;
    abatedEmissionsMTCO2e: number;
    reductionPercentage: number;
  };
  onIssueToken: (e: React.FormEvent) => void;
}

export function AllocationStudio({
  allocForm,
  setAllocForm,
  availableShipments,
  liveAbatement,
  onIssueToken,
}: AllocationStudioProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Allocation Form */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-sm text-white">
            Asignación de Combustible Verde & Mass Balance
          </h3>
        </div>
        <p className="text-xs text-slate-400">
          Asigna de forma vinculante masa de combustible renovable bunkered bajo
          esquema Book-and-Claim a un embarque específico para transferir el
          derecho de cómputo Scope 3 al cliente.
        </p>

        <form onSubmit={onIssueToken} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">
                Tipo de Combustible Sostenible
              </label>
              <select
                value={allocForm.fuelType}
                onChange={(e) =>
                  setAllocForm({
                    ...allocForm,
                    fuelType: e.target.value as FuelType,
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {Object.values(CERTIFIED_FUELS_CATALOG).map((f) => (
                  <option key={f.fuelType} value={f.fuelType}>
                    {f.displayName} ({f.ghgReductionPercentage}% ahorro)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                Masa de Combustible Asignada (MT)
              </label>
              <input
                type="number"
                step="5"
                min="1"
                value={allocForm.fuelVolumeMT}
                onChange={(e) =>
                  setAllocForm({
                    ...allocForm,
                    fuelVolumeMT: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">
                Modalidad de Transporte
              </label>
              <select
                value={allocForm.transportMode}
                onChange={(e) =>
                  setAllocForm({
                    ...allocForm,
                    transportMode: e.target.value as TransportMode,
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="MARITIME_OCEAN">
                  Marítimo Oceánico (Portacontenedores)
                </option>
                <option value="ROAD_DRAYAGE">
                  Carretera (Camión Acarreo Portuario / Hub ZAL)
                </option>
                <option value="INTERMODAL_RAIL">
                  Ferroviario Intermodal (Lanzadera Tren)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                Lugar de Suministro / Bunkering
              </label>
              <input
                type="text"
                value={allocForm.bunkerLocation}
                onChange={(e) =>
                  setAllocForm({
                    ...allocForm,
                    bunkerLocation: e.target.value,
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">
                Referencia Albarán Bunkering (BDN)
              </label>
              <input
                type="text"
                value={allocForm.bdnReference}
                onChange={(e) =>
                  setAllocForm({
                    ...allocForm,
                    bdnReference: e.target.value,
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                N° Certificación de Sostenibilidad
              </label>
              <input
                type="text"
                value={allocForm.sustainabilityCertificateNumber}
                onChange={(e) =>
                  setAllocForm({
                    ...allocForm,
                    sustainabilityCertificateNumber: e.target.value,
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="allocatedShipmentRef"
                className="block text-slate-400 mb-1"
              >
                Expedición / Embarque Acreditado (SQLite)
              </label>
              <input
                id="allocatedShipmentRef"
                data-testid="allocatedShipmentRef"
                type="text"
                list="shipments-datalist"
                value={allocForm.allocatedShipmentRef}
                onChange={(e) =>
                  setAllocForm({
                    ...allocForm,
                    allocatedShipmentRef: e.target.value,
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
                placeholder="ej. sh_demo_01 o SHP-BCN-TEST-999"
              />
              <datalist id="shipments-datalist">
                <option value="sh_demo_01">
                  sh_demo_01 · BK-2026-67116 (Canónica Demo)
                </option>
                {availableShipments
                  .filter((s) => s.id !== "sh_demo_01")
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} ·{" "}
                      {s.bookingReference ||
                        s.shipmentNumber ||
                        s.referenceNumber ||
                        "Expedición"}
                    </option>
                  ))}
              </datalist>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                Entidad Beneficiaria (Cliente)
              </label>
              <input
                type="text"
                value={allocForm.beneficiaryCompany}
                onChange={(e) =>
                  setAllocForm({
                    ...allocForm,
                    beneficiaryCompany: e.target.value,
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            onClick={onIssueToken}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 mt-4 text-sm cursor-pointer"
          >
            <Coins className="w-4 h-4" />
            <span>Firmar Digitalmente & Expedir Token de Insetting</span>
          </button>
        </form>
      </div>

      {/* Real-time Abatement Calculator Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" />
            <span>Auditoría Telemétrica ISO 14083</span>
          </div>
          <h3 className="font-bold text-base text-white mt-1">
            Cálculo de Descarbonización en Tiempo Real
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Parámetros de ciclo de vida Well-to-Wake aplicados conforme al
            estándar oficial GLEC v3.0.
          </p>

          <div className="mt-4 space-y-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">
                Contenido Energético Asignado
              </span>
              <span className="text-xl font-bold font-mono text-white">
                {(liveAbatement.energyContentMJ / 1000000).toFixed(2)} GJ
              </span>
              <span className="text-[10px] text-slate-500 block">
                ({liveAbatement.energyContentMJ.toLocaleString()} MJ)
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">
                Línea Base Fósil (VLSFO/Diesel)
              </span>
              <span className="text-base font-bold font-mono text-slate-300">
                {liveAbatement.baselineEmissionsMTCO2e} tCO2e
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">
                Emisiones Reales Combustible Verde
              </span>
              <span className="text-base font-bold font-mono text-cyan-400">
                {liveAbatement.actualEmissionsMTCO2e} tCO2e
              </span>
            </div>

            <div className="bg-emerald-950/40 p-4 rounded-xl border border-emerald-500/40">
              <span className="text-emerald-300 font-bold block text-xs">
                Reducción Scope 3 Acreditada
              </span>
              <span className="text-3xl font-extrabold font-mono text-emerald-400 block mt-1">
                -{liveAbatement.abatedEmissionsMTCO2e} tCO2e
              </span>
              <span className="text-[11px] text-emerald-300 mt-1 block">
                {liveAbatement.reductionPercentage}% de reducción neta de
                emisiones
              </span>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-3">
          Certificación vinculante RED II · Custodia Mass Balance Book-and-Claim
        </div>
      </div>
    </div>
  );
}
