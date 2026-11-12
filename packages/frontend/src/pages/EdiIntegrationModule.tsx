import { useState, useEffect } from "react";
import { motion, Variants } from "framer-motion";
import { Layers, Radio, FileCode2, Send, Users } from "lucide-react";

import {
  InterchangeRecord,
  PartnerRecord,
  DcsaEventItem,
  DcsaSubscriptionItem,
} from "../types/edi-integration.types";

import {
  EdiDcsaTab,
  EdiStudioTab,
  EdiOutboundTab,
  EdiAuditTab,
  EdiPartnersTab,
} from "../components/edi/index";

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

export default function EdiIntegrationModule() {
  const [activeTab, setActiveTab] = useState<
    "DCSA" | "STUDIO" | "OUTBOUND" | "AUDIT" | "PARTNERS"
  >("DCSA");

  // DCSA 3.0 Hub State
  const [dcsaEvents, setDcsaEvents] = useState<DcsaEventItem[]>([]);
  const [dcsaSubscriptions, setDcsaSubscriptions] = useState<
    DcsaSubscriptionItem[]
  >([]);
  const [selectedDcsaEvent, setSelectedDcsaEvent] =
    useState<DcsaEventItem | null>(null);
  const [dcsaFilterType, setDcsaFilterType] = useState<string>("ALL");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  // Simulator Inputs
  const [simCarrier, setSimCarrier] = useState<
    "MSCU" | "MAEU" | "CMDU" | "HLCU"
  >("MSCU");
  const [simEventType, setSimEventType] = useState<
    "EQUIPMENT" | "TRANSPORT" | "SHIPMENT"
  >("EQUIPMENT");
  const [simEventTypeCode, setSimEventTypeCode] = useState("LOAD");
  const [simBookingRef, setSimBookingRef] = useState("BK-2026-9042");
  const [simContainerNum, setSimContainerNum] = useState("MSKU9821034");
  const [simLocode, setSimLocode] = useState("ESVLC");
  const [simIsDisruption, setSimIsDisruption] = useState(false);
  const [simDisruptionReason, setSimDisruptionReason] = useState(
    "Rollover / Contenedor no embarcado por sobreocupación de bodega en terminal",
  );

  // Webhook Subscription Form
  const [subCarrier, setSubCarrier] = useState("MSCU");
  const [subUrl, setSubUrl] = useState(
    "https://api.atlaslogistics.internal/webhooks/dcsa/v3",
  );
  const [subSecret, setSubSecret] = useState("carrier-secret-key-prod-2026");
  const [isSubmittingSub, setIsSubmittingSub] = useState(false);

  // Studio State
  const [ediInput, setEdiInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<any>(null);
  const [processResult, setProcessResult] = useState<any>(null);
  const [selectedSegment, setSelectedSegment] = useState<any>(null);

  // Outbound Generator State
  const [outboundFormat, setOutboundFormat] = useState<
    "304" | "310" | "IFTMIN" | "204"
  >("304");
  const [bookingRef, setBookingRef] = useState("BK-2026-9042");
  const [consignorName, setConsignorName] = useState("IBERIA EXPORT SL");
  const [consigneeName, setConsigneeName] = useState("GLOBAL LOGISTICS US INC");
  const [originLocode, setOriginLocode] = useState("ESVLC");
  const [destLocode, setDestLocode] = useState("USNYC");
  const [cargoDesc, setCargoDesc] = useState(
    "INDUSTRIAL AUTOMATION SPARE PARTS",
  );
  const [containerNum, setContainerNum] = useState("MSKU9821034");
  const [sealNum, setSealNum] = useState("SL-993821");
  const [vesselName, setVesselName] = useState("MSC ISABELLA");
  const [voyageNum, setVoyageNum] = useState("V-2026-44E");

  // SOLAS VGM Specifics (EDI 304)
  const [vgmWeightKg, setVgmWeightKg] = useState(18500);
  const [vgmMethod, setVgmMethod] = useState<"METHOD_1" | "METHOD_2">(
    "METHOD_1",
  );
  const [vgmPerson, setVgmPerson] = useState(
    "Carlos Mendoza (Atlas Port Supervisor)",
  );

  // Ocean Invoice Specifics (EDI 310)
  const [invoiceNumber, setInvoiceNumber] = useState("INV-MSC-2026-8819");
  const [billOfLading, setBillOfLading] = useState("MEDUST991823");
  const [currency, setCurrency] = useState("USD");
  const [baseFreightRate, setBaseFreightRate] = useState(2450);
  const [bafAmount, setBafAmount] = useState(380);
  const [thcAmount, setThcAmount] = useState(195);

  const [isGenerating, setIsGenerating] = useState(false);
  const [outboundResult, setOutboundResult] = useState<any>(null);

  // Audit Ledger State
  const [interchanges, setInterchanges] = useState<InterchangeRecord[]>([]);
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedInterchange, setSelectedInterchange] =
    useState<InterchangeRecord | null>(null);

  // Partners Directory
  const [partners, setPartners] = useState<PartnerRecord[]>([]);

  // Real SCM Shipments from database
  const [scmShipments, setScmShipments] = useState<any[]>([]);

  useEffect(() => {
    fetchDcsaEvents();
    fetchDcsaSubscriptions();
    fetchInterchanges();
    fetchPartners();
    fetchScmShipments();
  }, []);

  const fetchScmShipments = async () => {
    try {
      const res = await fetch("/api/shipments");
      if (res.ok) {
        const data = await res.json();
        setScmShipments(Array.isArray(data) ? data : data.data || []);
      }
    } catch (e) {
      console.error("Failed to load real SCM shipments", e);
    }
  };

  const handleScmPreFill = (shipmentId: string) => {
    const s = scmShipments.find((item) => item.shipmentId === shipmentId);
    if (!s) return;
    if (s.shipmentReference) setBookingRef(s.shipmentReference);
    if (s.equipmentReference) setContainerNum(s.equipmentReference);
    if (s.originPort) setOriginLocode(s.originPort);
    if (s.destinationPort) setDestLocode(s.destinationPort);
    if (s.carrierCode) setSimCarrier(s.carrierCode);
    if (s.carrierName) setVesselName(s.carrierName);
    if (s.cargoWeight) {
      setVgmWeightKg(Number(s.cargoWeight));
    }
  };

  const fetchDcsaEvents = async () => {
    try {
      const res = await fetch("/api/dcsa/events");
      if (res.ok) {
        const data = await res.json();
        setDcsaEvents(data.data || []);
      }
    } catch (e) {
      console.error("Failed to load DCSA events", e);
    }
  };

  const fetchDcsaSubscriptions = async () => {
    try {
      const res = await fetch("/api/dcsa/subscriptions");
      if (res.ok) {
        const data = await res.json();
        setDcsaSubscriptions(data.data || []);
      }
    } catch (e) {
      console.error("Failed to load DCSA subscriptions", e);
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
      console.error("Failed to load EDI partners", e);
    }
  };

  const handleSimulateCarrierEvent = async () => {
    setIsSimulating(true);
    setSimulationResult(null);
    try {
      const eventPayload = {
        carrierCode: simCarrier,
        eventType: simEventType,
        eventTypeCode: simEventTypeCode,
        eventDateTime: new Date().toISOString(),
        eventClassifierCode: "ACT",
        carrierBookingReference: simBookingRef,
        equipmentReference: simContainerNum,
        unLocationCode: simLocode,
        vesselName:
          simCarrier === "MSCU"
            ? "MSC ISABELLA"
            : simCarrier === "MAEU"
              ? "MAERSK MC-KINNEY MOLLER"
              : "CMA CGM ANTOINE DE SAINT EXUPERY",
        carrierVoyageNumber: "2604W",
        disruptionReason: simIsDisruption ? simDisruptionReason : undefined,
      };

      const res = await fetch("/api/dcsa/simulate-carrier-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventPayload),
      });

      const data = await res.json();
      if (data.success) {
        setSimulationResult(data);
        await fetchDcsaEvents();
      } else {
        alert(`Error al simular evento DCSA: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error en simulación: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCreateSubscription = async () => {
    setIsSubmittingSub(true);
    try {
      const res = await fetch("/api/dcsa/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrierCode: subCarrier,
          callbackUrl: subUrl,
          secretToken: subSecret,
          eventTypeFilters: "EQUIPMENT,TRANSPORT,SHIPMENT",
        }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchDcsaSubscriptions();
        alert("¡Suscripción Webhook DCSA registrada con éxito!");
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error de red: ${err.message}`);
    } finally {
      setIsSubmittingSub(false);
    }
  };

  const handleParse = async () => {
    if (!ediInput.trim()) return;
    setIsParsing(true);
    setParseResult(null);
    setProcessResult(null);
    try {
      const res = await fetch("/api/edi/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: ediInput }),
      });
      const data = await res.json();
      if (data.success) {
        setParseResult(data.data);
      } else {
        alert(`Error de parsing: ${data.error}`);
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
      const res = await fetch("/api/edi/process-inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: ediInput }),
      });
      const data = await res.json();
      if (data.success) {
        setProcessResult(data.data);
        await fetchInterchanges();
      } else {
        alert(`Error de procesamiento inbound: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error de red: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateOutbound = async () => {
    setIsGenerating(true);
    setOutboundResult(null);
    try {
      let endpoint = "/api/edi/generate/304";
      let payloadData: any = {};

      if (outboundFormat === "304") {
        endpoint = "/api/edi/generate/304";
        payloadData = {
          bookingNumber: bookingRef,
          shipper: consignorName,
          consignee: consigneeName,
          portOfLoading: originLocode,
          portOfDischarge: destLocode,
          cargoDescription: cargoDesc,
          containers: [
            {
              containerNumber: containerNum,
              sealNumber: sealNum,
              grossWeightKg: vgmWeightKg,
              tareWeightKg: 3820,
              vgmWeightKg,
              vgmVerificationMethod: vgmMethod,
              vgmAuthorizedPerson: vgmPerson,
            },
          ],
          vessel: vesselName,
          voyage: voyageNum,
        };
      } else if (outboundFormat === "310") {
        endpoint = "/api/edi/generate/310";
        payloadData = {
          invoiceNumber,
          bookingNumber: bookingRef,
          billOfLading,
          currency,
          carrierName: vesselName,
          shipper: consignorName,
          consignee: consigneeName,
          portOfLoading: originLocode,
          portOfDischarge: destLocode,
          freightCharges: [
            {
              chargeType: "BASIC_FREIGHT",
              description: "Ocean Freight 40HC",
              amount: baseFreightRate,
              rateOrBasis: "LUMP_SUM",
            },
            {
              chargeType: "BAF",
              description: "Bunker Adjustment Factor",
              amount: bafAmount,
              rateOrBasis: "SURCHARGE",
            },
            {
              chargeType: "THC",
              description: "Terminal Handling Charges POL",
              amount: thcAmount,
              rateOrBasis: "SURCHARGE",
            },
          ],
          containers: [
            {
              containerNumber: containerNum,
              grossWeightKg: vgmWeightKg,
            },
          ],
        };
      } else if (outboundFormat === "IFTMIN") {
        endpoint = "/api/edi/generate/iftmin";
        payloadData = {
          bookingNumber: bookingRef,
          shipper: consignorName,
          consignee: consigneeName,
          portOfLoading: originLocode,
          portOfDischarge: destLocode,
          cargoDescription: cargoDesc,
          grossWeightKg: vgmWeightKg,
          containerNumber: containerNum,
        };
      } else {
        endpoint = "/api/edi/generate/204";
        payloadData = {
          shipmentId: bookingRef,
          shipper: consignorName,
          consignee: consigneeName,
          originLocation: originLocode,
          destinationLocation: destLocode,
          cargoDescription: cargoDesc,
          weightLbs: Math.round(vgmWeightKg * 2.20462),
        };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadData),
      });

      const data = await res.json();
      if (data.success) {
        setOutboundResult(data.data);
        await fetchInterchanges();
      } else {
        alert(`Error al generar mensaje EDI outbound: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error de red: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copiado al portapapeles");
  };

  const downloadEdiFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-6 max-w-[1600px] mx-auto flex flex-col gap-6"
    >
      {/* Top Header Hero */}
      <motion.div
        variants={itemVariants}
        className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                <Layers size={20} />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Interoperabilidad B2B & Estándares Globales
              </span>
            </div>
            <h1 className="text-2xl font-black text-white">
              Consola Integral EDIFACT / ANSI X12 / DCSA 3.0
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Motor de traducción sintáctica, parseo de árboles AST, generación
              outbound multimodal (SOLAS VGM, Ocean SI, Freight Invoice) y
              sincronización telemática directa con navieras asociadas.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/5 flex flex-col items-center min-w-[100px]">
              <span className="text-slate-400 text-[10px] font-bold uppercase">
                Intercambios
              </span>
              <span className="text-white text-lg font-black font-mono">
                {interchanges.length}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/5 flex flex-col items-center min-w-[100px]">
              <span className="text-indigo-400 text-[10px] font-bold uppercase">
                Eventos DCSA
              </span>
              <span className="text-indigo-400 text-lg font-black font-mono">
                {dcsaEvents.length}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/5 flex flex-col items-center min-w-[100px]">
              <span className="text-emerald-400 text-[10px] font-bold uppercase">
                Partners
              </span>
              <span className="text-emerald-400 text-lg font-black font-mono">
                {partners.length}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-8 border-t border-white/10 pt-4">
          <button
            onClick={() => setActiveTab("DCSA")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "DCSA"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Radio size={16} />
            DCSA 3.0 Hub ({dcsaEvents.length})
          </button>
          <button
            onClick={() => setActiveTab("STUDIO")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "STUDIO"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <FileCode2 size={16} />
            EDI Message Studio & Parser
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
            Generador Outbound (304/310/IFTMIN)
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
            <Users size={16} />
            Directorio de Trading Partners ({partners.length})
          </button>
        </div>
      </motion.div>

      {/* TAB 1: DCSA 3.0 TELEMETRY & EMITTER */}
      {activeTab === "DCSA" && (
        <EdiDcsaTab
          dcsaEvents={dcsaEvents}
          dcsaSubscriptions={dcsaSubscriptions}
          selectedDcsaEvent={selectedDcsaEvent}
          onSelectDcsaEvent={setSelectedDcsaEvent}
          dcsaFilterType={dcsaFilterType}
          onDcsaFilterTypeChange={setDcsaFilterType}
          isSimulating={isSimulating}
          simulationResult={simulationResult}
          simCarrier={simCarrier}
          onSimCarrierChange={setSimCarrier}
          simEventType={simEventType}
          onSimEventTypeChange={setSimEventType}
          simEventTypeCode={simEventTypeCode}
          onSimEventTypeCodeChange={setSimEventTypeCode}
          simBookingRef={simBookingRef}
          onSimBookingRefChange={setSimBookingRef}
          simContainerNum={simContainerNum}
          onSimContainerNumChange={setSimContainerNum}
          simLocode={simLocode}
          onSimLocodeChange={setSimLocode}
          simIsDisruption={simIsDisruption}
          onSimIsDisruptionChange={setSimIsDisruption}
          simDisruptionReason={simDisruptionReason}
          onSimDisruptionReasonChange={setSimDisruptionReason}
          onSimulateEvent={handleSimulateCarrierEvent}
          onFetchEvents={fetchDcsaEvents}
          subCarrier={subCarrier}
          onSubCarrierChange={setSubCarrier}
          subUrl={subUrl}
          onSubUrlChange={setSubUrl}
          subSecret={subSecret}
          onSubSecretChange={setSubSecret}
          isSubmittingSub={isSubmittingSub}
          onCreateSubscription={handleCreateSubscription}
          copyToClipboard={copyToClipboard}
        />
      )}

      {/* TAB 2: EDI STUDIO & PARSER */}
      {activeTab === "STUDIO" && (
        <EdiStudioTab
          ediInput={ediInput}
          onEdiInputChange={setEdiInput}
          isParsing={isParsing}
          isProcessing={isProcessing}
          parseResult={parseResult}
          processResult={processResult}
          selectedSegment={selectedSegment}
          onSelectSegment={setSelectedSegment}
          onParse={handleParse}
          onProcessInbound={handleProcessInbound}
          interchanges={interchanges}
        />
      )}

      {/* TAB 3: OUTBOUND GENERATOR */}
      {activeTab === "OUTBOUND" && (
        <EdiOutboundTab
          outboundFormat={outboundFormat}
          onOutboundFormatChange={setOutboundFormat}
          scmShipments={scmShipments}
          onScmPreFill={handleScmPreFill}
          bookingRef={bookingRef}
          onBookingRefChange={setBookingRef}
          containerNum={containerNum}
          onContainerNumChange={setContainerNum}
          consignorName={consignorName}
          onConsignorNameChange={setConsignorName}
          consigneeName={consigneeName}
          onConsigneeNameChange={setConsigneeName}
          originLocode={originLocode}
          onOriginLocodeChange={setOriginLocode}
          destLocode={destLocode}
          onDestLocodeChange={setDestLocode}
          invoiceNumber={invoiceNumber}
          onInvoiceNumberChange={setInvoiceNumber}
          billOfLading={billOfLading}
          onBillOfLadingChange={setBillOfLading}
          currency={currency}
          onCurrencyChange={setCurrency}
          vgmWeightKg={vgmWeightKg}
          onVgmWeightKgChange={setVgmWeightKg}
          vgmMethod={vgmMethod}
          onVgmMethodChange={setVgmMethod}
          vgmPerson={vgmPerson}
          onVgmPersonChange={setVgmPerson}
          vesselName={vesselName}
          onVesselNameChange={setVesselName}
          voyageNum={voyageNum}
          onVoyageNumChange={setVoyageNum}
          sealNum={sealNum}
          onSealNumChange={setSealNum}
          baseFreightRate={baseFreightRate}
          onBaseFreightRateChange={setBaseFreightRate}
          bafAmount={bafAmount}
          onBafAmountChange={setBafAmount}
          thcAmount={thcAmount}
          onThcAmountChange={setThcAmount}
          cargoDesc={cargoDesc}
          onCargoDescChange={setCargoDesc}
          isGenerating={isGenerating}
          onGenerateOutbound={handleGenerateOutbound}
          outboundResult={outboundResult}
          copyToClipboard={copyToClipboard}
          downloadEdiFile={downloadEdiFile}
        />
      )}

      {/* TAB 4: AUDIT LEDGER */}
      {activeTab === "AUDIT" && (
        <EdiAuditTab
          interchanges={interchanges}
          filterQuery={filterQuery}
          onFilterQueryChange={setFilterQuery}
          onRefresh={fetchInterchanges}
          selectedInterchange={selectedInterchange}
          onSelectInterchange={setSelectedInterchange}
          downloadEdiFile={downloadEdiFile}
        />
      )}

      {/* TAB 5: PARTNERS DIRECTORY */}
      {activeTab === "PARTNERS" && <EdiPartnersTab partners={partners} />}
    </motion.div>
  );
}
