import { useState, useEffect } from "react";
import { motion, Variants } from "framer-motion";
import {
  Zap,
  ArrowLeftRight,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  Download,
  Copy,
  Layers,
  Building2,
  RefreshCw,
  Send,
  Code2,
  FileCheck,
  Search,
} from "lucide-react";
import { Input, Button } from "@atlas/ui";

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

interface EdiSample {
  id: string;
  name: string;
  standard: string;
  messageType: string;
  carrier: string;
  bookingRef: string;
  description: string;
  payload: string;
}

interface InterchangeRecord {
  id: string;
  controlNumber: string;
  direction: "INBOUND" | "OUTBOUND";
  standard: "EDIFACT" | "ANSI_X12";
  senderId: string;
  receiverId: string;
  status: string;
  rawPayload: string;
  ackPayload?: string;
  ackStatus?: string;
  createdAt: string | number;
}

interface PartnerRecord {
  id: string;
  name: string;
  standard: string;
  senderId: string;
  senderQualifier: string;
  receiverId: string;
  receiverQualifier: string;
  transportProtocol: string;
  endpointUrl?: string;
  testMode: boolean;
}

export default function EdiIntegrationModule() {
  const [activeTab, setActiveTab] = useState<
    "STUDIO" | "OUTBOUND" | "AUDIT" | "PARTNERS"
  >("STUDIO");

  // Studio State
  const [ediInput, setEdiInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<any>(null);
  const [processResult, setProcessResult] = useState<any>(null);
  const [samples, setSamples] = useState<EdiSample[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<any>(null);

  // Outbound Generator State
  const [outboundFormat, setOutboundFormat] = useState<"IFTMIN" | "204">("IFTMIN");
  const [bookingRef, setBookingRef] = useState("BK-2026-9042");
  const [consignorName, setConsignorName] = useState("IBERIA EXPORT SL");
  const [consigneeName, setConsigneeName] = useState("GLOBAL LOGISTICS US INC");
  const [originPort, setOriginPort] = useState("ESVLC - VALENCIA PORT");
  const [destPort, setDestPort] = useState("USNYC - NEW YORK HARBOR");
  const [cargoDesc, setCargoDesc] = useState("INDUSTRIAL AUTOMATION SPARE PARTS");
  const [grossWeight, setGrossWeight] = useState(18500);
  const [containerNum, setContainerNum] = useState("MSKU9821034");
  const [outboundResult, setOutboundResult] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Audit Ledger State
  const [interchanges, setInterchanges] = useState<InterchangeRecord[]>([]);
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [selectedInterchange, setSelectedInterchange] = useState<InterchangeRecord | null>(null);
  const [filterQuery, setFilterQuery] = useState("");

  // Load samples and initial audit records
  useEffect(() => {
    fetchSamples();
    fetchInterchanges();
    fetchPartners();
  }, []);

  const fetchSamples = async () => {
    try {
      const res = await fetch("/api/edi/samples");
      if (res.ok) {
        const data = await res.json();
        setSamples(data.data || []);
        if (data.data && data.data.length > 0 && !ediInput) {
          setEdiInput(data.data[0].payload);
        }
      }
    } catch (e) {
      console.error("Failed to load EDI samples", e);
    }
  };

  const fetchInterchanges = async () => {
    try {
      const res = await fetch("/api/edi/interchanges");
      if (res.ok) {
        const data = await res.json();
        setInterchanges(data.data || []);
      }
    } catch (e) {
      console.error("Failed to load interchanges", e);
    }
  };

  const fetchPartners = async () => {
    try {
      const res = await fetch("/api/edi/partners");
      if (res.ok) {
        const data = await res.json();
        setPartners(data.data || []);
      }
    } catch (e) {
      console.error("Failed to load partners", e);
    }
  };

  const handleParse = async () => {
    if (!ediInput.trim()) return;
    setIsParsing(true);
    setProcessResult(null);
    try {
      const res = await fetch("/api/edi/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawPayload: ediInput }),
      });
      const data = await res.json();
      if (data.success) {
        setParseResult(data);
      } else {
        alert(`Error al analizar EDI: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error de red: ${err.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleProcessInbound = async () => {
    if (!ediInput.trim()) return;
    setIsProcessing(true);
    try {
      const res = await fetch("/api/edi/inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawPayload: ediInput }),
      });
      const data = await res.json();
      if (data.success) {
        setProcessResult(data.data);
        fetchInterchanges();
      } else {
        alert(`Error al procesar EDI: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error al transmitir: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateOutbound = async () => {
    setIsGenerating(true);
    try {
      const isEdifact = outboundFormat === "IFTMIN";
      const instructionData = isEdifact
        ? {
            bookingReference: bookingRef,
            consignor: { name: consignorName, city: "MADRID", country: "ES" },
            consignee: { name: consigneeName, city: "NEW YORK", country: "US" },
            portOfLoading: { code: "ESVLC", name: originPort },
            portOfDischarge: { code: "USNYC", name: destPort },
            cargoDescription: cargoDesc,
            grossWeightKg: grossWeight,
            containerNumber: containerNum,
            containerType: "40HC",
          }
        : {
            bookingReference: bookingRef,
            carrierScac: "KNIG",
            shipper: {
              name: consignorName,
              address: "AVDA PRINCIPAL 12",
              city: "VALENCIA",
              state: "VC",
              postalCode: "46024",
            },
            consignee: {
              name: consigneeName,
              address: "INDUSTRIAL PARKWAY 88",
              city: "NEW YORK",
              state: "NY",
              postalCode: "10001",
            },
            pickupDate: "20261006",
            deliveryDate: "20261008",
            cargoDescription: cargoDesc,
            totalWeightLbs: Math.round(grossWeight * 2.20462),
            totalQuantity: 22,
          };

      const res = await fetch("/api/edi/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: outboundFormat,
          bookingReference: bookingRef,
          senderId: "ATLASLOG",
          receiverId: isEdifact ? "MAERSKLINE" : "KNIGHTSWIFT",
          instructionData,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setOutboundResult(data.data);
        fetchInterchanges();
      } else {
        alert(`Error al generar EDI: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error al generar: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadEdiFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copiado al portapapeles");
  };

  const getSegmentSemantic = (tag: string) => {
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
      ST: "Transaction Set Header (Cabecera de Transacción 204/214)",
      B10: "Beginning Segment for Status (Referencia y Transportista)",
      B2: "Beginning Segment for Shipment Information",
      AT7: "Shipment Status Details (Código de Hito Terrestre)",
      MS1: "Location Information (Ciudad, Estado, País)",
      N1: "Name Party (Identificación de Parte Interviniente)",
      N3: "Address Information (Dirección de Recogida / Entrega)",
      N4: "Geographic Location (Código Postal y Estado)",
      G62: "Date / Time (Fechas Estimadas de Recogida y Entrega)",
      S5: "Stop-Off Details (Paradas y Cargas)",
      L5: "Description of Marks and Numbers (Marcas de Bultos)",
      SE: "Transaction Set Trailer (Cierre de Transacción)",
      GE: "Functional Group Trailer (Cierre de Grupo)",
      IEA: "Interchange Control Trailer (Cierre de Transmisión X12)",
      AK1: "Functional Group Response Header (Acuse 997)",
      AK2: "Transaction Set Response Header (Acuse 997)",
      AK5: "Transaction Set Response Trailer (Aceptación/Rechazo)",
      AK9: "Functional Group Response Trailer (Total Transacciones)",
      UCI: "Interchange Response (Acuse CONTRL EDIFACT)",
      UCM: "Message Response (Acuse CONTRL EDIFACT)",
    };
    return semantics[tag] || "Segmento de Datos Logísticos";
  };

  const filteredInterchanges = interchanges.filter((ic) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      ic.controlNumber.toLowerCase().includes(q) ||
      ic.senderId.toLowerCase().includes(q) ||
      ic.receiverId.toLowerCase().includes(q) ||
      ic.standard.toLowerCase().includes(q)
    );
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6 max-w-7xl mx-auto pb-12"
    >
      {/* Top Header Banner */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 p-8 shadow-2xl"
      >
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-inner">
                <ArrowLeftRight size={26} />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                B2B Multimodal Data Engine
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              EDI Integration Hub
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Intercambio Electrónico de Datos bidireccional de estándar global:
              UN/EDIFACT (IFTSTA, IFTMIN, CONTRL) y ANSI X12 (204, 214, 315, 997)
              para navieras, carriers y autoridades aduaneras.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 rounded-2xl text-emerald-400 text-xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              Gateway Activo & Seguro
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-8 border-t border-white/10 pt-4">
          <button
            onClick={() => setActiveTab("STUDIO")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "STUDIO"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Code2 size={16} />
            EDI Studio & Parser AST
          </button>
          <button
            onClick={() => setActiveTab("OUTBOUND")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "OUTBOUND"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Send size={16} />
            Generador Outbound (IFTMIN / 204)
          </button>
          <button
            onClick={() => setActiveTab("AUDIT")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "AUDIT"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Layers size={16} />
            Libro Mayor de Intercambios ({interchanges.length})
          </button>
          <button
            onClick={() => setActiveTab("PARTNERS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "PARTNERS"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Building2 size={16} />
            Directorio de Interlocutores ({partners.length})
          </button>
        </div>
      </motion.div>

      {/* TAB 1: EDI STUDIO & PARSER */}
      {activeTab === "STUDIO" && (
        <motion.div variants={containerVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Code Editor & Actions */}
          <motion.div variants={itemVariants} className="lg:col-span-6 flex flex-col gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode2 size={18} className="text-indigo-400" />
                  <span className="text-sm font-bold text-white">Cadena EDI en Bruto</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <span>{ediInput.length} caracteres</span>
                  <span>•</span>
                  <span>{ediInput.split(/'|~/).filter(Boolean).length} segmentos</span>
                </div>
              </div>

              {/* Sample Presets Buttons */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Carga Rápida de Ejemplos Reales:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {samples.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setEdiInput(s.payload);
                        setParseResult(null);
                        setProcessResult(null);
                      }}
                      className="text-left p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all text-xs"
                    >
                      <div className="font-bold text-slate-200 truncate">{s.name}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-indigo-400">{s.standard}</span>
                        <span>•</span>
                        <span>{s.carrier}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  value={ediInput}
                  onChange={(e) => setEdiInput(e.target.value)}
                  rows={9}
                  placeholder="Pegue aquí el texto EDI (UNA/UNB para EDIFACT o ISA para ANSI X12)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500/60 resize-none transition-all"
                />
              </div>

              {/* Actions Bar */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  onClick={() => setEdiInput("")}
                  variant="ghost"
                  className="text-slate-400 hover:text-white text-xs"
                >
                  Limpiar
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleParse}
                    disabled={isParsing || !ediInput.trim()}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2"
                  >
                    <Search size={14} />
                    {isParsing ? "Analizando..." : "Analizar AST"}
                  </Button>
                  <Button
                    onClick={handleProcessInbound}
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
                    <span>Transmisión Inbound Aplicada Exitosamente</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                    ID: {processResult.interchangeId}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs bg-slate-950/60 p-3 rounded-2xl border border-white/5 font-mono">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Estándar</div>
                    <div className="font-bold text-slate-200">{processResult.standard}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Remitente</div>
                    <div className="font-bold text-indigo-400">{processResult.senderId}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Hito Extraído</div>
                    <div className="font-bold text-emerald-400">
                      {processResult.extractedMilestones.join(", ") || "ACTUALIZADO"}
                    </div>
                  </div>
                </div>

                {processResult.exceptionsDetected > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>
                      Alerta de excepción detectada: Retención o demora registrada en el envío. Se ha notificado al centro de control.
                    </span>
                  </div>
                )}

                {/* Technical ACK Preview */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-bold uppercase tracking-wider">
                      Acuse de Recibo Técnico Generado ({processResult.standard === "EDIFACT" ? "CONTRL" : "997"}):
                    </span>
                    <button
                      onClick={() => copyToClipboard(processResult.ackPayload)}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Copy size={12} /> Copiar ACK
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-3 rounded-xl border border-white/5 text-[11px] font-mono text-emerald-300 overflow-x-auto">
                    {processResult.ackPayload}
                  </pre>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Right Column: Decomposed AST Segment Inspector */}
          <motion.div variants={itemVariants} className="lg:col-span-6 flex flex-col gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4 min-h-[500px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-indigo-400" />
                  <span className="text-sm font-bold text-white">Inspector de Árbol de Segmentos (AST)</span>
                </div>
                {parseResult && (
                  <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-full font-mono border border-indigo-500/30">
                    {parseResult.standard} • {parseResult.segmentsCount} Segmentos
                  </span>
                )}
              </div>

              {!parseResult ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 gap-3 border border-dashed border-slate-800 rounded-2xl">
                  <FileCode2 size={36} className="text-slate-600" />
                  <div className="text-sm font-medium">No se ha analizado ningún documento aún.</div>
                  <div className="text-xs text-slate-500 max-w-sm">
                    Haga clic en &quot;Analizar AST&quot; o &quot;Transmitir Inbound&quot; para descomponer la estructura sintáctica en segmentos y elementos.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 overflow-y-auto max-h-[550px] pr-1">
                  {/* Extracted Milestone Banner */}
                  {parseResult.parsedEvents && parseResult.parsedEvents.length > 0 && (
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
                        <div className="text-[10px] text-slate-400">Referencia</div>
                        <div className="font-mono text-indigo-300 font-bold">
                          {parseResult.parsedEvents[0].bookingReference || "N/A"}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Segments List */}
                  {parseResult.segments.map((seg: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedSegment(seg)}
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
                        <span className="text-[10px] text-slate-500 font-mono">#{idx + 1}</span>
                      </div>

                      {/* Elements Pills */}
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
                              <span className="text-[9px] text-slate-500 mr-1">[{elIdx + 1}]</span>
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
      )}

      {/* TAB 2: OUTBOUND GENERATOR */}
      {activeTab === "OUTBOUND" && (
        <motion.div variants={containerVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <motion.div variants={itemVariants} className="lg:col-span-6 flex flex-col gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send size={18} className="text-indigo-400" />
                  <span className="text-sm font-bold text-white">Parámetros de Expedición Outbound</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOutboundFormat("IFTMIN")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      outboundFormat === "IFTMIN"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    EDIFACT IFTMIN (Marítimo)
                  </button>
                  <button
                    onClick={() => setOutboundFormat("204")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      outboundFormat === "204"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    ANSI X12 204 (Terrestre)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                    Referencia de Booking
                  </label>
                  <Input
                    value={bookingRef}
                    onChange={(e: any) => setBookingRef(e.target.value)}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                    Nº Contenedor / Matrícula
                  </label>
                  <Input
                    value={containerNum}
                    onChange={(e: any) => setContainerNum(e.target.value)}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                    Embarcador (Consignor / Shipper)
                  </label>
                  <Input
                    value={consignorName}
                    onChange={(e: any) => setConsignorName(e.target.value)}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                    Consignatario (Consignee)
                  </label>
                  <Input
                    value={consigneeName}
                    onChange={(e: any) => setConsigneeName(e.target.value)}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                    Origen / Puerto de Carga (POL)
                  </label>
                  <Input
                    value={originPort}
                    onChange={(e: any) => setOriginPort(e.target.value)}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                    Destino / Puerto de Descarga (POD)
                  </label>
                  <Input
                    value={destPort}
                    onChange={(e: any) => setDestPort(e.target.value)}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                    Descripción de Carga
                  </label>
                  <Input
                    value={cargoDesc}
                    onChange={(e: any) => setCargoDesc(e.target.value)}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                    Peso Bruto (kg)
                  </label>
                  <Input
                    type="number"
                    value={grossWeight}
                    onChange={(e: any) => setGrossWeight(Number(e.target.value))}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
              </div>

              <Button
                onClick={handleGenerateOutbound}
                disabled={isGenerating}
                className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-xs"
              >
                <Zap size={16} />
                {isGenerating ? "Generando..." : "Generar Documento EDI Outbound"}
              </Button>
            </div>
          </motion.div>

          {/* Right Column: Outbound Preview & Download */}
          <motion.div variants={itemVariants} className="lg:col-span-6 flex flex-col gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4 min-h-[460px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck size={18} className="text-emerald-400" />
                  <span className="text-sm font-bold text-white">Vista Previa del Archivo Oficial</span>
                </div>
                {outboundResult && (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => copyToClipboard(outboundResult.rawPayload)}
                      variant="ghost"
                      className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 p-1.5 h-auto"
                    >
                      <Copy size={14} /> Copiar
                    </Button>
                    <Button
                      onClick={() =>
                        downloadEdiFile(
                          outboundResult.rawPayload,
                          `${outboundFormat}_${bookingRef}.edi`,
                        )
                      }
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 h-auto"
                    >
                      <Download size={14} /> Descargar .edi
                    </Button>
                  </div>
                )}
              </div>

              {!outboundResult ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 gap-3 border border-dashed border-slate-800 rounded-2xl">
                  <Send size={36} className="text-slate-600" />
                  <div className="text-sm font-medium">Ningún mensaje outbound generado aún.</div>
                  <div className="text-xs text-slate-500 max-w-sm">
                    Complete los campos a la izquierda y presione &quot;Generar Documento EDI Outbound&quot; para previsualizar y descargar la orden oficial de transporte.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="p-3 bg-slate-950 rounded-2xl border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">Control Number</span>
                      <div className="font-mono text-indigo-400 font-bold">{outboundResult.controlNumber}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">Formato</span>
                      <div className="font-bold text-emerald-400">{outboundResult.format}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">Estado</span>
                      <div className="font-bold text-white">ACKNOWLEDGED</div>
                    </div>
                  </div>

                  <pre className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto whitespace-pre-wrap max-h-[380px]">
                    {outboundResult.rawPayload}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* TAB 3: AUDIT LEDGER */}
      {activeTab === "AUDIT" && (
        <motion.div variants={itemVariants} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2">
              <Layers size={20} className="text-indigo-400" />
              <span className="text-base font-bold text-white">Libro Mayor de Intercambios EDI (Audit Trail)</span>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Input
                placeholder="Filtrar por control #, remitente o estándar..."
                value={filterQuery}
                onChange={(e: any) => setFilterQuery(e.target.value)}
                className="bg-slate-950 border-slate-800 text-xs w-72"
              />
              <Button
                onClick={fetchInterchanges}
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
                    <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                      No hay intercambios registrados que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredInterchanges.map((ic) => (
                    <tr key={ic.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5 font-bold text-white">{ic.controlNumber}</td>
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
                      <td className="p-3.5 text-indigo-400 font-bold">{ic.standard}</td>
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
                          onClick={() => setSelectedInterchange(ic)}
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

          {/* Modal / Drawer for selected interchange */}
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
                    onClick={() => setSelectedInterchange(null)}
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
      )}

      {/* TAB 4: PARTNERS DIRECTORY */}
      {activeTab === "PARTNERS" && (
        <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {partners.map((p) => (
            <motion.div
              key={p.id}
              variants={itemVariants}
              className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-indigo-400 px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    {p.standard}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    ACTIVO
                  </span>
                </div>
                <h3 className="font-extrabold text-white text-base">{p.name}</h3>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <span>Protocolo:</span>
                  <span className="font-mono text-indigo-300 font-bold">{p.transportProtocol}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-2xl border border-white/5 font-mono">
                <div>
                  <div className="text-[9px] text-slate-500 uppercase">Sender ID</div>
                  <div className="font-bold text-slate-200">{p.senderId} ({p.senderQualifier})</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-500 uppercase">Receiver ID</div>
                  <div className="font-bold text-slate-200">{p.receiverId} ({p.receiverQualifier})</div>
                </div>
              </div>

              {p.endpointUrl && (
                <div className="text-[11px] text-slate-500 truncate font-mono">
                  {p.endpointUrl}
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
