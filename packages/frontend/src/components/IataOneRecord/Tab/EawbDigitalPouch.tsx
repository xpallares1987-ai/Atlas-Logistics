/**
 * @file EawbDigitalPouch.tsx
 * @description e-AWB Digital Cargo Pouch & IATA Resolution 600b documentation tab.
 * @module @atlas/frontend/components/IataOneRecord/Tab/EawbDigitalPouch
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { FileText, Download, ShieldCheck } from "lucide-react";
import { Button } from "@atlas/ui";
import type { OneRecordWaybill } from "@atlas/shared";

export interface EawbDigitalPouchProps {
  selectedWaybill: OneRecordWaybill;
  onDownloadEawbPDF: (wbl: OneRecordWaybill) => void;
}

export const EawbDigitalPouch: React.FC<EawbDigitalPouchProps> = ({
  selectedWaybill,
  onDownloadEawbPDF,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              Valija Digital e-AWB (Digital Cargo Pouch)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Documentación electrónica asociada al máster aéreo bajo estándares
              IATA Resolution 600b
            </p>
          </div>
          <Button
            id="btnDownloadPouchPdf"
            onClick={() => onDownloadEawbPDF(selectedWaybill)}
            className="bg-purple-600 hover:bg-purple-500 text-white text-sm flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Descargar Documento Oficial e-AWB (PDF)
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-xl space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase">
              Expedidor (Shipper)
            </span>
            <p className="text-sm font-semibold text-white">
              {selectedWaybill.shipper.name}
            </p>
            <p className="text-xs text-slate-400">
              {selectedWaybill.shipper.address}
            </p>
            <p className="text-xs text-blue-400 font-mono">
              {selectedWaybill.shipper.contactEmail}
            </p>
          </div>

          <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-xl space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase">
              Destinatario (Consignee)
            </span>
            <p className="text-sm font-semibold text-white">
              {selectedWaybill.consignee.name}
            </p>
            <p className="text-xs text-slate-400">
              {selectedWaybill.consignee.address}
            </p>
            <p className="text-xs text-blue-400 font-mono">
              {selectedWaybill.consignee.contactEmail}
            </p>
          </div>

          <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-xl space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase">
              Aerolínea y Agente Emisor
            </span>
            <p className="text-sm font-semibold text-white">
              {selectedWaybill.carrier.name} ({selectedWaybill.carrier.iataCode}
              )
            </p>
            <p className="text-xs text-slate-400">
              Agente IATA: {selectedWaybill.issuingAgent.name} (
              {selectedWaybill.issuingAgent.iataCode})
            </p>
            <p className="text-xs text-emerald-400 font-mono">
              Vuelo: {selectedWaybill.transportMovement.flightNumber}
            </p>
          </div>
        </div>

        {/* Cargo Security Declaration (e-CSD) */}
        <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase text-emerald-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Declaración de Seguridad de Carga Aérea (e-CSD)
            </h4>
            <span className="text-xs font-mono text-slate-400">
              Regulated Agent ES/RA/0018-01
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Certificación de inspección de seguridad conforme a normativa ICAO
            Anexo 17 y Reglamento (UE) 2015/1998. Método de inspección aplicado:
            Equipo de Rayos X (X-RAY) dual-view + Control de Trazas de
            Explosivos (ETD). Carga protegida contra interferencias ilícitas
            hasta el momento del embarque.
          </p>
        </div>
      </div>
    </div>
  );
};
