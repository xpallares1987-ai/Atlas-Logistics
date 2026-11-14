/**
 * @file SevenPointSeals.tsx
 * @description 7-Point inspection protocol and ISO 17712 high-security mechanical seals ledger.
 * @module @atlas/frontend/components/AeoSecurity/Tab
 */

import { motion, Variants } from "framer-motion";
import { ClipboardList, FileCheck2, Lock, Download } from "lucide-react";
import { Input } from "@atlas/ui";

export interface SevenPointSealsProps {
  inspEquipId: string;
  setInspEquipId: (value: string) => void;
  inspEquipType: string;
  setInspEquipType: (value: string) => void;
  inspInspector: string;
  setInspInspector: (value: string) => void;
  inspLocation: string;
  setInspLocation: (value: string) => void;
  p1: boolean;
  setP1: (val: boolean) => void;
  p2: boolean;
  setP2: (val: boolean) => void;
  p3: boolean;
  setP3: (val: boolean) => void;
  p4: boolean;
  setP4: (val: boolean) => void;
  p5: boolean;
  setP5: (val: boolean) => void;
  p6: boolean;
  setP6: (val: boolean) => void;
  p7: boolean;
  setP7: (val: boolean) => void;
  hasAgri: boolean;
  setHasAgri: (val: boolean) => void;
  hasTamper: boolean;
  setHasTamper: (val: boolean) => void;
  inspectionSimResult: any;
  onSimulateInspection: () => void;
  inspections: any[];
  seals: any[];
  itemVariants?: Variants;
}

export function SevenPointSeals({
  inspEquipId,
  setInspEquipId,
  inspEquipType,
  setInspEquipType,
  inspInspector,
  setInspInspector,
  inspLocation,
  setInspLocation,
  p1,
  setP1,
  p2,
  setP2,
  p3,
  setP3,
  p4,
  setP4,
  p5,
  setP5,
  p6,
  setP6,
  p7,
  setP7,
  hasAgri,
  setHasAgri,
  hasTamper,
  setHasTamper,
  inspectionSimResult,
  onSimulateInspection,
  inspections,
  seals,
  itemVariants,
}: SevenPointSealsProps) {
  return (
    <motion.div variants={itemVariants} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Point Simulator */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-sky-500" />
            Registrar Inspección en 7 Puntos (C-TPAT / OEAS)
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-500 block mb-1 font-medium">
                Identificador de Unidad (Contenedor / Semirremolque)
              </label>
              <Input
                value={inspEquipId}
                onChange={(e) => setInspEquipId(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-500 block mb-1 font-medium">
                  Tipo Unidad
                </label>
                <select
                  value={inspEquipType}
                  onChange={(e) => setInspEquipType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <option value="OCEAN_CONTAINER">Contenedor Marítimo</option>
                  <option value="ROAD_TRAILER">Semirremolque Carretera</option>
                  <option value="REEFER_BOX">Contenedor Frigorífico</option>
                </select>
              </div>
              <div>
                <label className="text-slate-500 block mb-1 font-medium">
                  Inspector
                </label>
                <Input
                  value={inspInspector}
                  onChange={(e) => setInspInspector(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-500 block mb-1 font-medium">
                Instalación / Muelle
              </label>
              <Input
                value={inspLocation}
                onChange={(e) => setInspLocation(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                Checklist de los 7 Puntos Obligatorios:
              </span>

              {[
                {
                  label: "P1: Pared Frontal / Mamparo",
                  val: p1,
                  set: setP1,
                },
                { label: "P2: Lateral Izquierdo", val: p2, set: setP2 },
                { label: "P3: Lateral Derecho", val: p3, set: setP3 },
                { label: "P4: Suelo & Travesaños", val: p4, set: setP4 },
                {
                  label: "P5: Techo & Estructura Superior",
                  val: p5,
                  set: setP5,
                },
                {
                  label: "P6: Puertas, Bisagras & Cierres",
                  val: p6,
                  set: setP6,
                },
                {
                  label: "P7: Tren de Rodaje & Chasis",
                  val: p7,
                  set: setP7,
                },
              ].map((pt, idx) => (
                <label
                  key={idx}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={pt.val}
                    onChange={(e) => pt.set(e.target.checked)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-slate-600 dark:text-slate-400">
                    {pt.label}
                  </span>
                </label>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                Alertas Críticas:
              </span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasAgri}
                  onChange={(e) => setHasAgri(e.target.checked)}
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-red-600 dark:text-red-400">
                  Contaminación Agrícola / Plagas (WDO)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasTamper}
                  onChange={(e) => setHasTamper(e.target.checked)}
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-red-600 dark:text-red-400">
                  Manipulación Física / Doble Fondo
                </span>
              </label>
            </div>

            <button
              onClick={onSimulateInspection}
              className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-md shadow-sky-600/20 transition-all text-xs"
            >
              Evaluar & Guardar Inspección
            </button>

            {inspectionSimResult && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-2 border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Resultado:</span>
                  <span
                    className={`font-bold ${
                      inspectionSimResult.overallPassed
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {inspectionSimResult.inspectionResult}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {inspectionSimResult.actionRequired}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Inspections and Seals Lists */}
        <div className="lg:col-span-2 space-y-6">
          {/* Inspections Table */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-sky-500" />
              Registro de Inspecciones en 7 Puntos Realizadas
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                    <th className="pb-2">Referencia</th>
                    <th className="pb-2">Unidad</th>
                    <th className="pb-2">Inspector</th>
                    <th className="pb-2">Resultado</th>
                    <th className="pb-2 text-right">Certificado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {inspections.map((insp: any) => (
                    <tr
                      key={insp.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    >
                      <td className="py-2.5 font-semibold">
                        {insp.inspectionReference}
                      </td>
                      <td className="py-2.5">{insp.equipmentIdentifier}</td>
                      <td className="py-2.5">{insp.inspectorName}</td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            insp.overallPassed
                              ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                              : "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300"
                          }`}
                        >
                          {insp.inspectionResult}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <a
                          href={`/api/aeo-security/inspections/${insp.id}/seven-point-pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-600 hover:text-sky-700 inline-flex items-center gap-1 font-medium"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Seals Table */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-500" />
              Libro Registro de Precintos ISO 17712 (Clase 'H')
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                    <th className="pb-2">Nº Precinto</th>
                    <th className="pb-2">Tipo</th>
                    <th className="pb-2">Unidad Asignada</th>
                    <th className="pb-2">Estado</th>
                    <th className="pb-2 text-right">Custodia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {seals.map((seal: any) => (
                    <tr
                      key={seal.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    >
                      <td className="py-2.5 font-bold text-indigo-600 dark:text-indigo-400">
                        {seal.sealNumber}
                      </td>
                      <td className="py-2.5">
                        {seal.sealType.replace(/_/g, " ")}
                      </td>
                      <td className="py-2.5">
                        {seal.associatedEquipmentIdentifier || "En Stock"}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            seal.sealStatus === "VERIFIED_INTACT" ||
                            seal.sealStatus === "AFFIXED_TRANSIT"
                              ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                              : seal.sealStatus === "TAMPERED_BROKEN"
                                ? "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {seal.sealStatus}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <a
                          href={`/api/aeo-security/seals/${seal.id}/custody-pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 font-medium"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
