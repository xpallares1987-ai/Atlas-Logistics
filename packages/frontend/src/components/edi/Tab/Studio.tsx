import React from "react";
import { motion, Variants } from "framer-motion";
import {
  FileCode2,
  Database,
  Search,
  Zap,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { Button } from "@atlas/ui";
import { InterchangeRecord } from "../../../types/edi-integration.types";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export const getSegmentSemantic = (tag: string): string => {
  const semantics: Record<string, string> = {
    UNA: "Service String Advice (Definición de Separadores)",
    UNB: "Interchange Header (Cabecera de Intercambio)",
    UNH: "Message Header (Cabecera de Mensaje)",
    BGM: "Beginning of Message (Tipo de Documento y Referencia)",
    RFF: "Reference Identification (Conocimiento B/L o Reserva)",
    DTM: "Date / Time / Period (Marcas Temporales de Hitos)",
    LOC: "Place / Location Identification (Puertos / Terminales)",
    NAD: "Name and Address (Intervinientes: Embarcador/Consignatario)",
    STS: "Status / Milestone Indicator (Código de Evento Operativo)",
    MEA: "Measurements (Pesos Brutos / Volúmenes)",
    GID: "Goods Item Details (Partida de Carga)",
    FTX: "Free Text (Descripción de Mercancía o Notas)",
    EQD: "Equipment Details (Número y Tipo de Contenedor)",
    UNT: "Message Trailer (Cierre de Mensaje y Total Segmentos)",
    UNZ: "Interchange Trailer (Cierre de Transmisión)",
    ISA: "Interchange Control Header (Cabecera Principal X12)",
    GS: "Functional Group Header (Grupo Funcional X12)",
    ST: "Transaction Set Header (Cabecera de Transacción)",
    B10: "Beginning Segment for Status (Referencia y Transportista 214)",
    B2: "Beginning Segment for Shipment Information (204/304)",
    B3: "Beginning Segment for Carrier's Invoice (Factura Marítima 310)",
    B4: "Beginning Segment for Inquiry or Carrier Information (Hito Marítimo 315)",
    N9: "Reference Identification (Booking / Bill of Lading)",
    Q2: "Status Details (Ocean Vessel / Voyage)",
    R4: "Port or Terminal Identification (POL / POD)",
    W09: "Verified Gross Mass (SOLAS VGM - Peso Verificado & Método)",
    Y4: "Container Release Information (Precinto & Tipo)",
    L1: "Rate and Charges (Cargos de Flete y Recargos BAF/THC)",
    L3: "Total Weight and Charges (Totales de Flete Marítimo)",
    C3: "Currency (Divisa de Facturación)",
    LX: "Assigned Number (Línea de Partida)",
    L0: "Line Item - Quantity and Weight (Pesos y Volúmenes de Carga)",
    AT7: "Shipment Status Details (Código de Hito Terrestre 214)",
    MS1: "Location Information (Ciudad, Estado, País)",
    N1: "Name Party (Identificación de Parte Interviniente)",
    N3: "Address Information (Dirección de Recogida / Entrega)",
    N4: "Geographic Location (Código Postal y Estado)",
  };
  return semantics[tag] || "Segmento Estándar EDI";
};

export interface EdiStudioTabProps {
  ediInput: string;
  onEdiInputChange: (input: string) => void;
  isParsing: boolean;
  isProcessing: boolean;
  parseResult: any;
  processResult: any;
  selectedSegment: any;
  onSelectSegment: (segment: any) => void;
  onParse: () => void;
  onProcessInbound: () => void;
  interchanges: InterchangeRecord[];
}

export const EdiStudioTab: React.FC<EdiStudioTabProps> = ({
  ediInput,
  onEdiInputChange,
  isParsing,
  isProcessing,
  parseResult,
  processResult,
  selectedSegment,
  onSelectSegment,
  onParse,
  onProcessInbound,
  interchanges,
}) => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      {/* Left Column: Code Editor & Actions */}
      <motion.div
        variants={itemVariants}
        className="lg:col-span-6 flex flex-col gap-4"
      >
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode2 size={18} className="text-indigo-400" />
              <span className="text-sm font-bold text-white">
                Cadena EDI en Bruto
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>{ediInput.length} caracteres</span>
              <span>•</span>
              <span>
                {ediInput.split(/'|~/).filter(Boolean).length} segmentos
              </span>
            </div>
          </div>

          {/* Database Interchange Selector */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                Cargar Transmisión desde Libro Mayor B2B ({interchanges.length}
                ):
              </span>
              {interchanges.length > 0 && (
                <span className="text-[10px] text-emerald-400 font-mono">
                  {interchanges.length} transmisiones registradas en BD
                </span>
              )}
            </div>
            <select
              aria-label="Cargar Transmisión desde Libro Mayor B2B"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500/60 transition-all cursor-pointer"
              defaultValue=""
              onChange={(e) => {
                const selected = interchanges.find(
                  (item) => item.id === e.target.value,
                );
                if (selected && selected.rawPayload) {
                  onEdiInputChange(selected.rawPayload);
                }
              }}
            >
              <option value="" disabled>
                -- Seleccionar intercambio real (Control # / Interlocutor /
                Estándar) --
              </option>
              {interchanges.map((ic) => (
                <option key={ic.id} value={ic.id}>
                  [{ic.direction}] {ic.standard} • Control #{ic.controlNumber} •
                  De: {ic.senderId} → A: {ic.receiverId} ({ic.status})
                </option>
              ))}
            </select>
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              value={ediInput}
              onChange={(e) => onEdiInputChange(e.target.value)}
              rows={9}
              placeholder="Pegue aquí el texto EDI (UNA/UNB para EDIFACT o ISA para ANSI X12)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500/60 resize-none transition-all"
            />
          </div>

          {/* Actions Bar */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              onClick={() => onEdiInputChange("")}
              variant="ghost"
              className="text-slate-400 hover:text-white text-xs"
            >
              Limpiar
            </Button>
            <div className="flex items-center gap-2">
              <Button
                onClick={onParse}
                disabled={isParsing || !ediInput.trim()}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2"
              >
                <Search size={14} />
                {isParsing ? "Analizando..." : "Analizar AST"}
              </Button>
              <Button
                onClick={onProcessInbound}
                disabled={isProcessing || !ediInput.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2"
              >
                <Zap size={14} />
                {isProcessing ? "Transmitiendo..." : "Transmitir Inbound"}
              </Button>
            </div>
          </div>
        </div>

        {/* Inbound Process Result Alert */}
        {processResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-950/40 border border-emerald-500/30 rounded-3xl p-6 shadow-xl flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 size={18} />
                <span>Transmisión Inbound Procesada con Éxito</span>
              </div>
              <span className="text-xs font-mono text-emerald-300">
                Control #{processResult.interchange?.controlNumber}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/60 p-4 rounded-2xl border border-white/5 font-mono">
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">
                  Emisor
                </span>
                <span className="text-slate-200 font-bold">
                  {processResult.interchange?.senderId}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">
                  Receptor
                </span>
                <span className="text-slate-200 font-bold">
                  {processResult.interchange?.receiverId}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">
                  Hito Ingerido
                </span>
                <span className="text-emerald-400 font-bold">
                  {processResult.events?.[0]?.milestone || "PROCESSED"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">
                  Acuse Generado
                </span>
                <span className="text-indigo-400 font-bold">
                  {processResult.interchange?.ackStatus || "ACKNOWLEDGED"}
                </span>
              </div>
            </div>

            {processResult.acknowledgment && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Acuse Técnico Generado (CONTRL / 997):
                </span>
                <pre className="bg-slate-950 p-3 rounded-2xl border border-white/5 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                  {processResult.acknowledgment}
                </pre>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Right Column: AST Visualization */}
      <motion.div
        variants={itemVariants}
        className="lg:col-span-6 flex flex-col gap-4"
      >
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4 min-h-[460px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-indigo-400" />
              <span className="text-sm font-bold text-white">
                Desglose Sintáctico de Segmentos (AST)
              </span>
            </div>
            {parseResult && (
              <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-xl border border-indigo-500/20">
                {parseResult.standard} • {parseResult.segmentsCount} segmentos
              </span>
            )}
          </div>

          {!parseResult ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 gap-3 border border-dashed border-slate-800 rounded-2xl">
              <FileCode2 size={36} className="text-slate-600" />
              <div className="text-sm font-medium">
                Ningún documento analizado aún.
              </div>
              <div className="text-xs text-slate-500 max-w-sm">
                Seleccione un ejemplo preconfigurado o pegue un mensaje EDI a la
                izquierda y presione &quot;Analizar AST&quot;.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[550px] pr-1">
              {parseResult.parsedEvents &&
                parseResult.parsedEvents.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[10px] text-indigo-300 uppercase font-bold tracking-wider">
                        Hito Operativo Detectado
                      </div>
                      <div className="font-bold text-white text-sm mt-0.5">
                        {parseResult.parsedEvents[0].milestone}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400">
                        Referencia
                      </div>
                      <div className="font-mono text-indigo-300 font-bold">
                        {parseResult.parsedEvents[0].bookingReference || "N/A"}
                      </div>
                    </div>
                  </div>
                )}

              {parseResult.segments.map((seg: any, idx: number) => (
                <div
                  key={idx}
                  onClick={() => onSelectSegment(seg)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    selectedSegment === seg
                      ? "bg-indigo-950/60 border-indigo-500/70 shadow-md shadow-indigo-500/10"
                      : "bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {seg.tag}
                      </span>
                      <span className="text-xs font-semibold text-slate-300">
                        {getSegmentSemantic(seg.tag)}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      #{idx + 1}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {seg.elements.map((el: any, elIdx: number) => {
                      const isComp = typeof el === "object" && el.isComposite;
                      const displayVal = isComp
                        ? el.components.join(" : ")
                        : el || "<vacío>";
                      return (
                        <span
                          key={elIdx}
                          className={`text-[11px] font-mono px-2 py-0.5 rounded-lg border ${
                            isComp
                              ? "bg-purple-950/30 border-purple-500/30 text-purple-300"
                              : "bg-slate-900 border-white/5 text-slate-300"
                          }`}
                        >
                          <span className="text-[9px] text-slate-500 mr-1">
                            [{elIdx + 1}]
                          </span>
                          {displayVal}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
