/**
 * @file Certificates.tsx
 * @description Official Scope 3 carbon offset certificates registry and PDF download tab.
 * @module @atlas/frontend/components/CarbonEmissions/Tab
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Award, Download } from "lucide-react";
import type { CertificatesTabProps } from "../../../types/carbon-emissions.types";
import { toNumber } from "../hooks/useCarbonEmissions";

export function Certificates({ certificates }: CertificatesTabProps) {
  return (
    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Award size={18} className="text-emerald-400" />
            Registro Oficial de Certificados Scope 3
          </h3>
          <p className="text-xs text-slate-400">
            Certificados de neutralización emitidos con código QR y validez para
            auditorías CSRD
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              <th className="pb-3 px-3">Nº Certificado</th>
              <th className="pb-3 px-3">Beneficiario</th>
              <th className="pb-3 px-3">Proyecto Asignado</th>
              <th className="pb-3 px-3">Estándar</th>
              <th className="pb-3 px-3">tCO2e Neutralizadas</th>
              <th className="pb-3 px-3">Inversión Verde</th>
              <th className="pb-3 px-3">Fecha Emisión</th>
              <th className="pb-3 px-3 text-right">Descarga</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {certificates.map((cert) => (
              <tr key={cert.id} className="hover:bg-slate-800/30 transition">
                <td className="py-3 px-3 font-bold text-emerald-400">
                  {cert.certificateNumber}
                </td>
                <td className="py-3 px-3 font-medium text-white">
                  {cert.beneficiaryName}
                </td>
                <td className="py-3 px-3 text-slate-300 font-medium">
                  {cert.projectName}
                </td>
                <td className="py-3 px-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                    {String(cert.projectStandard || "").replace("_", " ")}
                  </span>
                </td>
                <td className="py-3 px-3 font-bold text-white">
                  {toNumber(cert.offsetTco2e).toFixed(4)} t
                </td>
                <td className="py-3 px-3 text-emerald-400 font-bold">
                  €{toNumber(cert.amountPaidEur).toFixed(2)}
                </td>
                <td className="py-3 px-3 text-slate-400">
                  {new Date(cert.issuedAt).toLocaleDateString("es-ES")}
                </td>
                <td className="py-3 px-3 text-right">
                  <a
                    href={`/api/carbon/certificates/${cert.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition"
                  >
                    <Download size={13} />
                    PDF
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default Certificates;
