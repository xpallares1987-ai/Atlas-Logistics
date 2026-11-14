/**
 * @file AwbDetail.tsx
 * @description Interactive 12-Box IATA neutral AWB inspector, rating breakdown, and Cargo-XML/IMP exports.
 * @module @atlas/frontend/components/AirCargo/Panel
 */

import { Plane, Download, FileCode, FileText } from "lucide-react";
import { AirwayBillRecord } from "../types/index";

export interface AwbDetailProps {
  selectedAwb: AirwayBillRecord | null;
}

export function AwbDetail({ selectedAwb }: AwbDetailProps) {
  if (!selectedAwb) {
    return (
      <div className="w-full lg:w-2/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[500px]">
        <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
          <Plane className="w-12 h-12 mb-2 stroke-1 opacity-40" />
          Seleccione un Air Waybill para inspeccionar la liquidación e-AWB
        </div>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-2/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[500px]">
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Inspector Header */}
        <div className="p-4 md:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-sky-500/20 text-sky-400 border border-sky-500/30">
                {selectedAwb.type}
              </span>
              <h2 className="text-xl font-black text-white tracking-wide">
                {selectedAwb.awbNumber}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {selectedAwb.airlineName || "IATA Airline"} |{" "}
              {selectedAwb.flightNumber || "Flight"} (
              {selectedAwb.originAirport} ✈ {selectedAwb.destinationAirport})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/air-cargo/awb/${selectedAwb.id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Download size={14} />
              IATA AWB PDF
            </a>
            <a
              href={`/api/air-cargo/awb/${selectedAwb.id}/cargo-xml`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <FileCode size={14} />
              Cargo-XML (XFWB)
            </a>
            <a
              href={`/api/air-cargo/awb/${selectedAwb.id}/cargo-imp`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <FileText size={14} />
              Cargo-IMP (FWB)
            </a>
          </div>
        </div>

        {/* 12-Box IATA Neutral AWB Grid Layout */}
        <div className="p-4 md:p-6 space-y-4">
          {/* Boxes 1, 2: Shipper, Consignee */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: Shipper */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[10px] font-black tracking-wider text-sky-400 uppercase">
                Casilla 1 - Shipper / Expedidor
              </span>
              <p className="text-sm font-bold text-white">
                {selectedAwb.shipperData?.name || "N/A"}
              </p>
              <p className="text-xs text-slate-300">
                {selectedAwb.shipperData?.address || "N/A"}
              </p>
              <p className="text-xs text-slate-400">
                País: {selectedAwb.shipperData?.country || "ES"} | Tel:{" "}
                {selectedAwb.shipperData?.contact || "N/A"}
              </p>
            </div>

            {/* Box 2: Consignee */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[10px] font-black tracking-wider text-sky-400 uppercase">
                Casilla 2 - Consignee / Destinatario
              </span>
              <p className="text-sm font-bold text-white">
                {selectedAwb.consigneeData?.name || "N/A"}
              </p>
              <p className="text-xs text-slate-300">
                {selectedAwb.consigneeData?.address || "N/A"}
              </p>
              <p className="text-xs text-slate-400">
                País: {selectedAwb.consigneeData?.country || "US"} | Contacto:{" "}
                {selectedAwb.consigneeData?.contact || "N/A"}
              </p>
            </div>
          </div>

          {/* Boxes 3, 5: Agent & Routing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                Casilla 3 & 4 - Issuing Carrier's Agent
              </span>
              <p className="text-sm font-bold text-white">
                {selectedAwb.issuingAgentData?.name ||
                  "ATLAS AIR CARGO FORWARDING"}
              </p>
              <p className="text-xs text-slate-400">
                IATA Code:{" "}
                {selectedAwb.issuingAgentData?.iataCode || "78-4-7291/0014"} |
                CASS:{" "}
                {selectedAwb.issuingAgentData?.cassAddress || "ES-CASS-8819"}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                Casilla 5 & 6 - Departure, Destination & Flight
              </span>
              <p className="text-sm font-bold text-sky-300">
                {selectedAwb.originAirport} ➔ {selectedAwb.destinationAirport}
              </p>
              <p className="text-xs text-slate-400">
                Vuelo: {selectedAwb.flightNumber || "IB6251"} | Moneda:{" "}
                {selectedAwb.currency || "EUR"} (Prepaid)
              </p>
            </div>
          </div>

          {/* Box 8: Special Handling & Instructions */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
              Casilla 8 - Handling Information & Special Handling Codes (SHC)
            </span>
            <p className="text-xs text-white font-medium bg-slate-900/60 p-3 rounded-xl border border-white/5">
              {selectedAwb.handlingInfo || "GENERAL CARGO - HANDLE WITH CARE"}
            </p>
            <div className="flex flex-wrap gap-2">
              {(selectedAwb.specialHandlingCodes || ["GEN"]).map(
                (shc: string) => (
                  <span
                    key={shc}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30"
                  >
                    {shc}
                  </span>
                ),
              )}
            </div>
          </div>

          {/* Box 9: Standard Rating Table */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
              Casilla 9 - Liquidación de Flete y Tarificación Aérea (Rating
              Table)
            </span>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-2 px-3 font-semibold">Bultos</th>
                    <th className="py-2 px-3 font-semibold">Peso Bruto (kg)</th>
                    <th className="py-2 px-3 font-semibold">Clase</th>
                    <th className="py-2 px-3 font-semibold">Volumen (m³)</th>
                    <th className="py-2 px-3 font-semibold">
                      Peso Tarifable (kg)
                    </th>
                    <th className="py-2 px-3 font-semibold">Tarifa / kg</th>
                    <th className="py-2 px-3 font-semibold">Flete Base</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white">
                  <tr>
                    <td className="py-3 px-3 font-bold">
                      {selectedAwb.pieces}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {selectedAwb.grossWeightKg?.toFixed(1)}
                    </td>
                    <td className="py-3 px-3">
                      {selectedAwb.rateClass || "Q"}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {selectedAwb.volumeCbm?.toFixed(3)}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-sky-300">
                      {selectedAwb.chargeableWeightKg?.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {selectedAwb.ratePerKg?.toFixed(2)}{" "}
                      {selectedAwb.currency || "EUR"}
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-400">
                      {selectedAwb.freightCharge?.toFixed(2)}{" "}
                      {selectedAwb.currency || "EUR"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Box 10 & 11: Surcharges & Total Liquidation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Surcharges Breakdown */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                Casilla 10 - Recargos IATA Due Carrier
              </span>
              <div className="space-y-1.5 text-xs">
                {(selectedAwb.otherCharges || []).map((oc, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-slate-300"
                  >
                    <span>
                      <strong className="text-white">{oc.code}</strong> -{" "}
                      {oc.name || oc.code}
                    </span>
                    <span className="font-mono text-white">
                      {Number(oc.amount).toFixed(2)}{" "}
                      {selectedAwb.currency || "EUR"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Prepaid */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-900/30 to-blue-900/30 border border-sky-500/30 space-y-2">
              <span className="text-[10px] font-black tracking-wider text-sky-300 uppercase">
                Casilla 11 - Total Liquidación (Total Prepaid)
              </span>
              <div className="flex justify-between items-baseline pt-2">
                <span className="text-sm font-semibold text-slate-300">
                  Total Flete + Recargos:
                </span>
                <span className="text-2xl font-black text-white">
                  {(
                    selectedAwb.totalPrepaid ||
                    selectedAwb.freightCharge ||
                    0
                  ).toFixed(2)}{" "}
                  {selectedAwb.currency || "EUR"}
                </span>
              </div>
              <p className="text-[11px] text-sky-300/80">
                Certificación Electrónica IATA e-AWB Res. 672
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
