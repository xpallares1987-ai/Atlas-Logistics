import React from "react";
import { motion, Variants } from "framer-motion";
import { Layers, RefreshCw, FileCode2, Download } from "lucide-react";
import { Input, Button } from "@atlas/ui";
import { InterchangeRecord } from "../../types/edi-integration.types";

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export interface EdiAuditTabProps {
  interchanges: InterchangeRecord[];
  filterQuery: string;
  onFilterQueryChange: (query: string) => void;
  onRefresh: () => void;
  selectedInterchange: InterchangeRecord | null;
  onSelectInterchange: (item: InterchangeRecord | null) => void;
  downloadEdiFile: (content: string, filename: string) => void;
}

export const EdiAuditTab: React.FC<EdiAuditTabProps> = ({
  interchanges,
  filterQuery,
  onFilterQueryChange,
  onRefresh,
  selectedInterchange,
  onSelectInterchange,
  downloadEdiFile,
}) => {
  const filteredInterchanges = interchanges.filter((ic) => {
    const q = filterQuery.toLowerCase();
    return (
      (ic.controlNumber || "").toLowerCase().includes(q) ||
      (ic.senderId || "").toLowerCase().includes(q) ||
      (ic.receiverId || "").toLowerCase().includes(q) ||
      (ic.standard || "").toLowerCase().includes(q)
    );
  });

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="show"
      className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2">
          <Layers size={20} className="text-indigo-400" />
          <span className="text-base font-bold text-white">
            Libro Mayor de Intercambios EDI (Audit Trail)
          </span>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Input
            placeholder="Filtrar por control #, remitente o estándar..."
            value={filterQuery}
            onChange={(e: any) => onFilterQueryChange(e.target.value)}
            className="bg-slate-950 border-slate-800 text-xs w-72"
          />
          <Button
            onClick={onRefresh}
            variant="ghost"
            className="text-slate-400 hover:text-white p-2"
          >
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
            <tr>
              <th className="p-3.5">Nº Control</th>
              <th className="p-3.5">Dirección</th>
              <th className="p-3.5">Estándar</th>
              <th className="p-3.5">Remitente</th>
              <th className="p-3.5">Destinatario</th>
              <th className="p-3.5">Estado</th>
              <th className="p-3.5">Acuse (ACK)</th>
              <th className="p-3.5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
            {filteredInterchanges.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-8 text-center text-slate-500 font-sans"
                >
                  No hay intercambios registrados que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              filteredInterchanges.map((ic) => (
                <tr
                  key={ic.id}
                  className="hover:bg-slate-800/30 transition-colors"
                >
                  <td className="p-3.5 font-bold text-white">
                    {ic.controlNumber}
                  </td>
                  <td className="p-3.5 font-sans">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ic.direction === "INBOUND"
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                      }`}
                    >
                      {ic.direction}
                    </span>
                  </td>
                  <td className="p-3.5 text-indigo-400 font-bold">
                    {ic.standard}
                  </td>
                  <td className="p-3.5">{ic.senderId}</td>
                  <td className="p-3.5">{ic.receiverId}</td>
                  <td className="p-3.5 font-sans">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {ic.status}
                    </span>
                  </td>
                  <td className="p-3.5 font-sans">
                    {ic.ackStatus ? (
                      <span className="text-emerald-400 font-bold text-[11px]">
                        {ic.ackStatus}
                      </span>
                    ) : (
                      <span className="text-slate-500">N/A</span>
                    )}
                  </td>
                  <td className="p-3.5 text-right font-sans">
                    <Button
                      onClick={() => onSelectInterchange(ic)}
                      className="bg-slate-800 hover:bg-slate-700 text-white text-[11px] px-2.5 py-1 rounded-xl h-auto"
                    >
                      Detalles
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedInterchange && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode2 size={20} className="text-indigo-400" />
                <span className="font-bold text-white text-base">
                  Intercambio {selectedInterchange.controlNumber}
                </span>
              </div>
              <Button
                onClick={() => onSelectInterchange(null)}
                variant="ghost"
                className="text-slate-400 hover:text-white"
              >
                ✕
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Payload EDI en Bruto:
              </span>
              <pre className="bg-slate-950 p-3 rounded-2xl border border-white/5 text-xs font-mono text-slate-200 overflow-x-auto max-h-48 whitespace-pre-wrap">
                {selectedInterchange.rawPayload}
              </pre>
            </div>

            {selectedInterchange.ackPayload && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Acuse Técnico Generado (ACK):
                </span>
                <pre className="bg-slate-950 p-3 rounded-2xl border border-white/5 text-xs font-mono text-emerald-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                  {selectedInterchange.ackPayload}
                </pre>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                onClick={() =>
                  downloadEdiFile(
                    selectedInterchange.rawPayload,
                    `EDI_${selectedInterchange.controlNumber}.edi`,
                  )
                }
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"
              >
                <Download size={14} /> Descargar .edi
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
