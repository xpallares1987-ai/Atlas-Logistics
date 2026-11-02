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
  Radio,
  ShieldCheck,
  Ship,
  Play,
  Server,
  PlusCircle,
  DollarSign,
  Scale,
} from "lucide-react";
import { Input, Button } from "@atlas/ui";
import { authFetch } from "../lib/api";

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

interface DcsaEventItem {
  id: string;
  eventId: string;
  eventType: "EQUIPMENT" | "TRANSPORT" | "SHIPMENT";
  eventClassifierCode: "ACT" | "EST" | "PLN";
  eventDateTime: string;
  eventTypeCode: string;
  carrierBookingReference?: string;
  transportDocumentReference?: string;
  equipmentReference?: string;
  unLocationCode?: string;
  facilityCode?: string;
  vesselIMONumber?: string;
  vesselName?: string;
  carrierVoyageNumber?: string;
  sealNumber?: string;
  disruptionReason?: string;
  delayHours?: number;
  carrierCode?: string;
  signatureVerified?: boolean;
  createdAt: string;
}

interface DcsaSubscriptionItem {
  id: string;
  carrierCode: string;
  callbackUrl: string;
  secretToken?: string;
  eventTypeFilters?: string;
  bookingReference?: string;
  equipmentReference?: string;
  isActive: boolean | number;
  createdAt: string;
}

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
  const [showSubModal, setShowSubModal] = useState(false);
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
  const [samples, setSamples] = useState<EdiSample[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<any>(null);

  // Outbound Generator State
  const [outboundFormat, setOutboundFormat] = useState<
    "304" | "310" | "IFTMIN" | "204"
  >("304");
  const [bookingRef, setBookingRef] = useState("BK-2026-9042");
  const [consignorName, setConsignorName] = useState("IBERIA EXPORT SL");
  const [consigneeName, setConsigneeName] = useState("GLOBAL LOGISTICS US INC");
  const [originPort, setOriginPort] = useState("ESVLC - VALENCIA PORT");
  const [originLocode, setOriginLocode] = useState("ESVLC");
  const [destPort, setDestPort] = useState("USNYC - NEW YORK HARBOR");
  const [destLocode, setDestLocode] = useState("USNYC");
  const [cargoDesc, setCargoDesc] = useState(
    "INDUSTRIAL AUTOMATION SPARE PARTS",
  );
  const [grossWeight, setGrossWeight] = useState(18500);
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
    "CARLOS MENDEZ - CHIEF WEIGHMASTER",
  );

  // Ocean Invoice Specifics (EDI 310)
  const [invoiceNumber, setInvoiceNumber] = useState("INV-OCN-88392");
  const [billOfLading, setBillOfLading] = useState("MSCUBL883921");
  const [baseFreightRate, setBaseFreightRate] = useState(2450.0);
  const [bafAmount, setBafAmount] = useState(380.0);
  const [thcAmount, setThcAmount] = useState(210.0);
  const [currency, setCurrency] = useState<"USD" | "EUR">("USD");

  const [outboundResult, setOutboundResult] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // SCM 1-Click Integration
  const [scmShipments, setScmShipments] = useState<any[]>([]);

  // Audit Ledger State
  const [interchanges, setInterchanges] = useState<InterchangeRecord[]>([]);
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [selectedInterchange, setSelectedInterchange] =
    useState<InterchangeRecord | null>(null);
  const [filterQuery, setFilterQuery] = useState("");

  // Load initial data
  useEffect(() => {
    fetchDcsaEvents();
    fetchDcsaSubscriptions();
    fetchSamples();
    fetchInterchanges();
    fetchPartners();
    fetchScmShipments();
  }, []);

  const fetchDcsaEvents = async () => {
    try {
      const res = await fetch("/api/dcsa/v3/events?limit=50");
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
      const res = await fetch("/api/dcsa/v3/event-subscriptions");
      if (res.ok) {
        const data = await res.json();
        setDcsaSubscriptions(data.data || []);
      }
    } catch (e) {
      console.error("Failed to load DCSA subscriptions", e);
    }
  };

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

  const fetchScmShipments = async () => {
    try {
      const res = await authFetch("/api/scm/v1/operational/shipments-360");
      if (res.ok) {
        const data = await res.json();
        setScmShipments(data.items || []);
      }
    } catch (e) {
      console.error("Failed to load SCM shipments for 1-click pre-fill", e);
    }
  };

  const handleSimulateCarrierEvent = async () => {
    setIsSimulating(true);
    setSimulationResult(null);
    try {
      const res = await fetch("/api/dcsa/v3/simulate-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrierCode: simCarrier,
          eventType: simEventType,
          eventTypeCode: simEventTypeCode,
          bookingReference: simBookingRef,
          containerNumber: simContainerNum,
          locode: simLocode,
          isDisruption: simIsDisruption,
          disruptionReason: simIsDisruption ? simDisruptionReason : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSimulationResult(data);
        fetchDcsaEvents();
      } else {
        alert(`Error al simular evento DCSA: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error de red en simulación: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCreateSubscription = async () => {
    if (!subCarrier || !subUrl) return;
    setIsSubmittingSub(true);
    try {
      const res = await fetch("/api/dcsa/v3/event-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrierCode: subCarrier,
          callbackUrl: subUrl,
          secretToken: subSecret || undefined,
          eventTypeFilters: ["EQUIPMENT", "TRANSPORT", "SHIPMENT"],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowSubModal(false);
        fetchDcsaSubscriptions();
      } else {
        alert(`Error al crear suscripción: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error al registrar suscripción: ${err.message}`);
    } finally {
      setIsSubmittingSub(false);
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

  const handleScmPreFill = (shipmentId: string) => {
    const s = scmShipments.find(
      (item) =>
        item.shipmentId === shipmentId || item.shipmentReference === shipmentId,
    );
    if (!s) return;

    setBookingRef(s.shipmentReference || s.shipmentId || "BK-SCM-2026");
    if (s.shipment?.originLocationId) {
      setOriginLocode(s.shipment.originLocationId.slice(0, 5).toUpperCase());
      setOriginPort(`${s.shipment.originLocationId} PORT`);
    }
    if (s.shipment?.destinationLocationId) {
      setDestLocode(s.shipment.destinationLocationId.slice(0, 5).toUpperCase());
      setDestPort(`${s.shipment.destinationLocationId} HARBOR`);
    }
    if (s.shipment?.customerPartyId) {
      setConsignorName(s.shipment.customerPartyId);
    }
    if (s.shipment?.cargoSummary) {
      setCargoDesc(s.shipment.cargoSummary);
    }
    if (s.shipment?.weightKg) {
      setGrossWeight(s.shipment.weightKg);
      setVgmWeightKg(s.shipment.weightKg);
    }
  };

  const handleGenerateOutbound = async () => {
    setIsGenerating(true);
    try {
      let instructionData: any = {};
      let senderId = "ATLASLOG";
      let receiverId = "MAERSKLINE";

      if (outboundFormat === "304") {
        receiverId = "MAERSKLINE";
        instructionData = {
          bookingReference: bookingRef,
          carrierScac: "MAEU",
          vesselName,
          voyageNumber: voyageNum,
          shipper: {
            name: consignorName,
            address: "AVENIDA DEL PUERTO 42",
            city: "VALENCIA",
            state: "VC",
            postalCode: "46024",
            countryCode: "ES",
          },
          consignee: {
            name: consigneeName,
            address: "BROADWAY COMMERCE SUITE 500",
            city: "NEW YORK",
            state: "NY",
            postalCode: "10001",
            countryCode: "US",
          },
          portOfLoading: { locode: originLocode, portName: originPort },
          portOfDischarge: { locode: destLocode, portName: destPort },
          container: {
            containerNumber: containerNum,
            sealNumber: sealNum,
            equipmentType: "40HC",
            grossWeightKg: grossWeight,
            verifiedGrossMassKg: vgmWeightKg,
            vgmVerificationMethod: vgmMethod,
            vgmAuthorizedPerson: vgmPerson,
          },
          cargo: {
            description: cargoDesc,
            packageCount: 24,
            packageType: "PK",
            grossWeightKg: grossWeight,
            volumeCbm: 42.5,
            hsCode: "84798997",
          },
        };
      } else if (outboundFormat === "310") {
        senderId = "MAERSKLINE";
        receiverId = "ATLASLOG";
        const total = baseFreightRate + bafAmount + thcAmount;
        instructionData = {
          invoiceNumber,
          billOfLadingNumber: billOfLading,
          invoiceDate: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
          carrierScac: "MAEU",
          shipper: { name: consignorName, city: "VALENCIA", countryCode: "ES" },
          consignee: {
            name: consigneeName,
            city: "NEW YORK",
            countryCode: "US",
          },
          portOfLoading: originLocode,
          portOfDischarge: destLocode,
          currency,
          lineItems: [
            {
              chargeCode: "400",
              chargeDescription: "OCEAN FREIGHT 40HC",
              rate: baseFreightRate,
              basis: "FL",
              amount: baseFreightRate,
            },
            {
              chargeCode: "BAF",
              chargeDescription: "BUNKER ADJUSTMENT FACTOR",
              rate: bafAmount,
              basis: "FL",
              amount: bafAmount,
            },
            {
              chargeCode: "THC",
              chargeDescription: "TERMINAL HANDLING CHARGE",
              rate: thcAmount,
              basis: "FL",
              amount: thcAmount,
            },
          ],
          totalAmount: total,
          totalWeightKg: grossWeight,
          totalVolumeCbm: 42.5,
        };
      } else if (outboundFormat === "IFTMIN") {
        receiverId = "MAERSKLINE";
        instructionData = {
          bookingReference: bookingRef,
          consignor: { name: consignorName, city: "VALENCIA", country: "ES" },
          consignee: { name: consigneeName, city: "NEW YORK", country: "US" },
          portOfLoading: { code: originLocode, name: originPort },
          portOfDischarge: { code: destLocode, name: destPort },
          cargoDescription: cargoDesc,
          grossWeightKg: grossWeight,
          containerNumber: containerNum,
          containerType: "40HC",
        };
      } else {
        receiverId = "KNIGHTSWIFT";
        instructionData = {
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
          pickupDate: "20261105",
          deliveryDate: "20261112",
          cargoDescription: cargoDesc,
          totalWeightLbs: Math.round(grossWeight * 2.20462),
          totalQuantity: 24,
        };
      }

      const res = await fetch("/api/edi/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: outboundFormat,
          bookingReference: bookingRef,
          senderId,
          receiverId,
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

  const filteredDcsaEvents = dcsaEvents.filter((ev) => {
    if (dcsaFilterType === "ALL") return true;
    if (dcsaFilterType === "DISRUPTION") return Boolean(ev.disruptionReason);
    return ev.eventType === dcsaFilterType;
  });

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
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                <Radio size={12} className="animate-pulse" />
                DCSA 3.0 & Ocean EDI
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              B2B Interoperability Hub
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Intercambio Electrónico de Datos y Telemetría Marítima Abierta:
              DCSA Track & Trace 3.0 con verificación criptográfica HMAC
              SHA-256, ANSI X12 (304 SOLAS VGM, 310 Facturas, 315 Hitos, 204,
              214) y UN/EDIFACT (IFTMIN, IFTSTA).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 rounded-2xl text-emerald-400 text-xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              Gateway Criptográfico Activo
            </div>
            <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 px-3.5 py-2 rounded-2xl text-indigo-300 text-xs font-mono">
              <ShieldCheck size={14} className="text-indigo-400" />
              HMAC-SHA256 Enabled
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
            DCSA 3.0 Event Hub ({dcsaEvents.length})
          </button>
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
            Generador Marítimo (304 / 310 / IFTMIN)
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

      {/* TAB 1: DCSA 3.0 EVENT HUB */}
      {activeTab === "DCSA" && (
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* Left: Live DCSA Telemetry Stream */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-7 flex flex-col gap-4"
          >
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    <Radio size={18} />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Telemetría Marítima en Tiempo Real (DCSA 3.0)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Eventos OpenAPI Track & Trace recibidos desde MSC, Maersk,
                      CMA CGM y Hapag-Lloyd
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={fetchDcsaEvents}
                    variant="ghost"
                    className="text-slate-400 hover:text-white p-2 h-auto"
                    title="Actualizar eventos"
                  >
                    <RefreshCw size={15} />
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  "ALL",
                  "EQUIPMENT",
                  "TRANSPORT",
                  "SHIPMENT",
                  "DISRUPTION",
                ].map((f) => (
                  <button
                    key={f}
                    onClick={() => setDcsaFilterType(f)}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                      dcsaFilterType === f
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800/50"
                    }`}
                  >
                    {f === "ALL"
                      ? `Todos (${dcsaEvents.length})`
                      : f === "DISRUPTION"
                        ? `Disrupciones (${dcsaEvents.filter((e) => e.disruptionReason).length})`
                        : `${f} (${dcsaEvents.filter((e) => e.eventType === f).length})`}
                  </button>
                ))}
              </div>

              {/* Events List */}
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[640px] pr-1">
                {filteredDcsaEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl gap-2">
                    <Radio size={32} className="text-slate-600 animate-pulse" />
                    <span className="text-xs">
                      No hay eventos DCSA registrados en este filtro.
                    </span>
                    <span className="text-[11px] text-slate-600">
                      Utilice el simulador a la derecha para emitir un evento
                      con firma HMAC.
                    </span>
                  </div>
                ) : (
                  filteredDcsaEvents.map((ev, idx) => {
                    const isDisruption = Boolean(ev.disruptionReason);
                    const carrierBadgeColor =
                      ev.carrierCode === "MSCU"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        : ev.carrierCode === "MAEU"
                          ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
                          : ev.carrierCode === "CMDU"
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                            : "bg-orange-500/20 text-orange-300 border-orange-500/30";

                    return (
                      <div
                        key={ev.eventId || ev.id || idx}
                        className={`p-4 rounded-2xl border transition-all ${
                          isDisruption
                            ? "bg-red-950/20 border-red-500/40 shadow-lg shadow-red-950/20"
                            : "bg-slate-950/60 border-slate-800 hover:border-indigo-500/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${carrierBadgeColor}`}
                            >
                              {ev.carrierCode || "CARRIER"}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-300 px-2 py-0.5 bg-slate-800/80 rounded-md">
                              {ev.eventType}
                            </span>
                            <span
                              className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-md ${
                                ev.eventTypeCode === "ROLL" || isDisruption
                                  ? "bg-red-500/20 text-red-300 border border-red-500/40"
                                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              }`}
                            >
                              {ev.eventTypeCode}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400">
                              [{ev.eventClassifierCode}]
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                            <ShieldCheck size={13} />
                            <span>HMAC OK</span>
                          </div>
                        </div>

                        {/* Disruption Alert if present */}
                        {isDisruption && (
                          <div className="my-2 p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start gap-2 text-xs text-red-200">
                            <AlertTriangle
                              size={15}
                              className="text-red-400 shrink-0 mt-0.5"
                            />
                            <div>
                              <div className="font-bold text-red-300 text-[11px] uppercase tracking-wide">
                                Disrupción Naviera Detectada (Bloqueo Operativo
                                SCM)
                              </div>
                              <div className="text-[11px] text-red-200/90 mt-0.5">
                                {ev.disruptionReason}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] mt-2 pt-2 border-t border-white/5">
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase block">
                              Booking
                            </span>
                            <span className="font-mono text-indigo-300 font-bold">
                              {ev.carrierBookingReference || "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase block">
                              Contenedor
                            </span>
                            <span className="font-mono text-slate-200 font-semibold">
                              {ev.equipmentReference || "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase block">
                              Puerto / LOCODE
                            </span>
                            <span className="font-mono text-amber-300 font-bold">
                              {ev.unLocationCode || "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase block">
                              Fecha / Hora
                            </span>
                            <span className="text-slate-400 truncate block">
                              {new Date(ev.eventDateTime).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {ev.vesselName && (
                          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-2">
                            <Ship size={12} className="text-indigo-400" />
                            <span>
                              Buque:{" "}
                              <strong className="text-slate-200">
                                {ev.vesselName}
                              </strong>
                            </span>
                            {ev.carrierVoyageNumber && (
                              <span>
                                (Viaje:{" "}
                                <strong className="text-slate-300 font-mono">
                                  {ev.carrierVoyageNumber}
                                </strong>
                                )
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex justify-end mt-2 pt-1">
                          <button
                            onClick={() => setSelectedDcsaEvent(ev)}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1"
                          >
                            <FileCode2 size={12} />
                            Ver Payload JSON
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>

          {/* Right: Simulator & Webhook Subscriptions */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-5 flex flex-col gap-4"
          >
            {/* Simulator Box */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Play size={18} className="text-indigo-400" />
                  <span className="text-sm font-bold text-white">
                    Simulador de Telemetría Carrier
                  </span>
                </div>
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  DCSA 3.0 Standard
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                    Línea Naviera (Carrier)
                  </label>
                  <select
                    value={simCarrier}
                    onChange={(e: any) => setSimCarrier(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500/60"
                  >
                    <option value="MSCU">
                      MSC - Mediterranean Shipping Co
                    </option>
                    <option value="MAEU">Maersk Line</option>
                    <option value="CMDU">CMA CGM</option>
                    <option value="HLCU">Hapag-Lloyd</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                    Categoría de Evento
                  </label>
                  <select
                    value={simEventType}
                    onChange={(e: any) => setSimEventType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500/60"
                  >
                    <option value="EQUIPMENT">EQUIPMENT (Contenedor)</option>
                    <option value="TRANSPORT">
                      TRANSPORT (Buque / Escala)
                    </option>
                    <option value="SHIPMENT">
                      SHIPMENT (Conocimiento / BL)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                    Código de Hito DCSA
                  </label>
                  <select
                    value={simEventTypeCode}
                    onChange={(e: any) => setSimEventTypeCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500/60 font-mono"
                  >
                    <option value="LOAD">LOAD - Cargado en Buque</option>
                    <option value="DEPA">
                      DEPA - Salida de Puerto (Zarpe)
                    </option>
                    <option value="ARRI">
                      ARRI - Llegada a Puerto Destino
                    </option>
                    <option value="DISC">DISC - Descargado en Terminal</option>
                    <option value="GTIN">
                      GTIN - Entrada en Terminal (Gate-In)
                    </option>
                    <option value="ROLL">ROLL - Rollover / Disrupción</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                    Puerto UN/LOCODE
                  </label>
                  <Input
                    value={simLocode}
                    onChange={(e: any) => setSimLocode(e.target.value)}
                    className="bg-slate-950 border-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                    Referencia de Booking
                  </label>
                  <Input
                    value={simBookingRef}
                    onChange={(e: any) => setSimBookingRef(e.target.value)}
                    className="bg-slate-950 border-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                    Nº Contenedor
                  </label>
                  <Input
                    value={simContainerNum}
                    onChange={(e: any) => setSimContainerNum(e.target.value)}
                    className="bg-slate-950 border-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* Disruption Toggle */}
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-amber-400" />
                    Simular Disrupción Operativa / Rollover
                  </span>
                  <input
                    type="checkbox"
                    checked={simIsDisruption}
                    onChange={(e) => {
                      setSimIsDisruption(e.target.checked);
                      if (e.target.checked) setSimEventTypeCode("ROLL");
                    }}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>
                {simIsDisruption && (
                  <Input
                    value={simDisruptionReason}
                    onChange={(e: any) =>
                      setSimDisruptionReason(e.target.value)
                    }
                    placeholder="Motivo de la disrupción..."
                    className="bg-slate-900 border-red-500/30 text-xs text-red-200 mt-1"
                  />
                )}
              </div>

              <Button
                onClick={handleSimulateCarrierEvent}
                disabled={isSimulating}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-xs"
              >
                <Zap size={15} />
                {isSimulating
                  ? "Firmando y Transmitiendo..."
                  : "Emitir Evento Carrier (con HMAC SHA-256)"}
              </Button>

              {/* Simulation Result Box */}
              {simulationResult && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 size={15} />
                      Evento DCSA Ingerido Exitosamente
                    </span>
                    <span className="text-[10px] font-mono text-emerald-300">
                      HTTP 200 OK
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-300 font-mono break-all bg-slate-950/70 p-2 rounded-xl border border-white/5">
                    <span className="text-slate-500">Signature: </span>
                    {simulationResult.verification?.headerReceived ||
                      "sha256 verified"}
                  </div>

                  <div className="text-[11px] text-slate-300 flex items-center justify-between">
                    <span>Integración SCM:</span>
                    <span className="font-bold text-indigo-300">
                      {simulationResult.scmIntegration?.action ||
                        "Milestone Synchronized"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Webhook Subscriptions Management */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server size={18} className="text-indigo-400" />
                  <span className="text-sm font-bold text-white">
                    Suscripciones Webhook DCSA v3
                  </span>
                </div>
                <Button
                  onClick={() => setShowSubModal(!showSubModal)}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-[11px] px-2.5 py-1 rounded-xl h-auto flex items-center gap-1"
                >
                  <PlusCircle size={13} />
                  Nueva
                </Button>
              </div>

              {showSubModal && (
                <div className="p-3 rounded-2xl bg-slate-950 border border-indigo-500/30 flex flex-col gap-2.5 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Carrier Code
                    </label>
                    <select
                      value={subCarrier}
                      onChange={(e: any) => setSubCarrier(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-1.5 text-xs text-white"
                    >
                      <option value="MSCU">MSCU (MSC)</option>
                      <option value="MAEU">MAEU (Maersk)</option>
                      <option value="CMDU">CMDU (CMA CGM)</option>
                      <option value="HLCU">HLCU (Hapag-Lloyd)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Callback URL (Webhook)
                    </label>
                    <Input
                      value={subUrl}
                      onChange={(e: any) => setSubUrl(e.target.value)}
                      className="bg-slate-900 border-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Secret Token (HMAC SHA-256)
                    </label>
                    <Input
                      value={subSecret}
                      onChange={(e: any) => setSubSecret(e.target.value)}
                      className="bg-slate-900 border-slate-800 text-xs font-mono"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      onClick={() => setShowSubModal(false)}
                      variant="ghost"
                      className="text-xs text-slate-400"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCreateSubscription}
                      disabled={isSubmittingSub}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-xl font-bold"
                    >
                      {isSubmittingSub ? "Guardando..." : "Guardar Suscripción"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {dcsaSubscriptions.length === 0 ? (
                  <div className="text-xs text-slate-500 text-center py-4">
                    No hay suscripciones webhook activas. Registre los endpoints
                    de sus navieras colaboradoras.
                  </div>
                ) : (
                  dcsaSubscriptions.map((sub, idx) => (
                    <div
                      key={sub.subscriptionId || (sub as any).id || idx}
                      className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-indigo-400">
                            {sub.carrierCode}
                          </span>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                            ACTIVO
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate max-w-[240px] mt-0.5">
                          {sub.callbackUrl}
                        </div>
                      </div>
                      <div className="text-right text-[10px] text-slate-500 font-mono">
                        HMAC SHA-256
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>

          {/* Modal for inspect DCSA payload */}
          {selectedDcsaEvent && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode2 size={20} className="text-indigo-400" />
                    <span className="font-bold text-white text-base">
                      DCSA Event: {selectedDcsaEvent.eventId}
                    </span>
                  </div>
                  <Button
                    onClick={() => setSelectedDcsaEvent(null)}
                    variant="ghost"
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </Button>
                </div>

                <pre className="bg-slate-950 p-4 rounded-2xl border border-white/5 text-xs font-mono text-slate-200 overflow-x-auto max-h-96 whitespace-pre-wrap">
                  {JSON.stringify(selectedDcsaEvent, null, 2)}
                </pre>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() =>
                      copyToClipboard(
                        JSON.stringify(selectedDcsaEvent, null, 2),
                      )
                    }
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"
                  >
                    <Copy size={14} /> Copiar JSON
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* TAB 2: EDI STUDIO & PARSER */}
      {activeTab === "STUDIO" && (
        <motion.div
          variants={containerVariants}
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

              {/* Sample Presets Buttons */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Carga Rápida de Ejemplos Multimodales:
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
                      <div className="font-bold text-slate-200 truncate">
                        {s.name}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-indigo-400">
                          {s.standard}
                        </span>
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
                    {parseResult.standard} • {parseResult.segmentsCount}{" "}
                    segmentos
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
                    Seleccione un ejemplo preconfigurado o pegue un mensaje EDI
                    a la izquierda y presione &quot;Analizar AST&quot;.
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
                            {parseResult.parsedEvents[0].bookingReference ||
                              "N/A"}
                          </div>
                        </div>
                      </div>
                    )}

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
                        <span className="text-[10px] text-slate-500 font-mono">
                          #{idx + 1}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {seg.elements.map((el: any, elIdx: number) => {
                          const isComp =
                            typeof el === "object" && el.isComposite;
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
      )}

      {/* TAB 3: OUTBOUND GENERATOR */}
      {activeTab === "OUTBOUND" && (
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          <motion.div
            variants={itemVariants}
            className="lg:col-span-6 flex flex-col gap-4"
          >
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <Send size={18} className="text-indigo-400" />
                  <span className="text-sm font-bold text-white">
                    Generador Multimodal Outbound
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setOutboundFormat("304")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      outboundFormat === "304"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    304 (Ocean SI + VGM)
                  </button>
                  <button
                    onClick={() => setOutboundFormat("310")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      outboundFormat === "310"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    310 (Ocean Invoice)
                  </button>
                  <button
                    onClick={() => setOutboundFormat("IFTMIN")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      outboundFormat === "IFTMIN"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    IFTMIN
                  </button>
                  <button
                    onClick={() => setOutboundFormat("204")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      outboundFormat === "204"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    204 (Tender)
                  </button>
                </div>
              </div>

              {/* 1-Click SCM Pre-fill Dropdown */}
              <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Zap size={14} className="text-amber-400" />
                    Autocompletar con Expedición SCM Activa (1-Click)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {scmShipments.length} disponibles
                  </span>
                </div>
                <select
                  onChange={(e) => handleScmPreFill(e.target.value)}
                  defaultValue=""
                  className="w-full bg-slate-950 border border-indigo-500/30 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="" disabled>
                    Seleccione una expedición operativa para precargar
                    parámetros...
                  </option>
                  {scmShipments.map((s) => (
                    <option key={s.shipmentId} value={s.shipmentId}>
                      {s.shipmentReference || s.shipmentId} •{" "}
                      {s.serviceType || "OCEAN"} • {s.lifecycle || "ACTIVE"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                    Referencia de Booking
                  </label>
                  <Input
                    value={bookingRef}
                    onChange={(e: any) => setBookingRef(e.target.value)}
                    className="bg-slate-950 border-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                    Nº Contenedor
                  </label>
                  <Input
                    value={containerNum}
                    onChange={(e: any) => setContainerNum(e.target.value)}
                    className="bg-slate-950 border-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                    Embarcador (Shipper)
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
                    Puerto Carga (POL) LOCODE
                  </label>
                  <Input
                    value={originLocode}
                    onChange={(e: any) => setOriginLocode(e.target.value)}
                    className="bg-slate-950 border-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                    Puerto Descarga (POD) LOCODE
                  </label>
                  <Input
                    value={destLocode}
                    onChange={(e: any) => setDestLocode(e.target.value)}
                    className="bg-slate-950 border-slate-800 font-mono"
                  />
                </div>

                {/* Specifics for 304 Ocean SI */}
                {outboundFormat === "304" && (
                  <>
                    <div className="col-span-2 p-3 rounded-2xl bg-slate-950/80 border border-indigo-500/20 flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 text-indigo-300 font-bold text-xs">
                        <Scale size={14} />
                        <span>
                          Declaración Oficial SOLAS VGM (Verified Gross Mass -
                          Regla VI/2)
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">
                            Nº Factura Carrier
                          </label>
                          <Input
                            value={invoiceNumber}
                            onChange={(e: any) =>
                              setInvoiceNumber(e.target.value)
                            }
                            className="bg-slate-900 border-slate-800 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">
                            Nº Bill of Lading (B/L)
                          </label>
                          <Input
                            value={billOfLading}
                            onChange={(e: any) =>
                              setBillOfLading(e.target.value)
                            }
                            className="bg-slate-900 border-slate-800 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">
                            Divisa de Facturación
                          </label>
                          <select
                            value={currency}
                            onChange={(e: any) => setCurrency(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white"
                          >
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">
                            Masa Bruta (kg)
                          </label>
                          <Input
                            type="number"
                            value={vgmWeightKg}
                            onChange={(e: any) =>
                              setVgmWeightKg(Number(e.target.value))
                            }
                            className="bg-slate-900 border-slate-800 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">
                            Método de Pesaje
                          </label>
                          <select
                            value={vgmMethod}
                            onChange={(e: any) => setVgmMethod(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white"
                          >
                            <option value="METHOD_1">
                              Método 1 (Báscula Certificada SM1)
                            </option>
                            <option value="METHOD_2">
                              Método 2 (Cálculo de Bultos SM2)
                            </option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">
                            Declarante Autorizado
                          </label>
                          <Input
                            value={vgmPerson}
                            onChange={(e: any) => setVgmPerson(e.target.value)}
                            className="bg-slate-900 border-slate-800 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                        Nombre del Buque
                      </label>
                      <Input
                        value={vesselName}
                        onChange={(e: any) => setVesselName(e.target.value)}
                        className="bg-slate-950 border-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                        Nº de Viaje (Voyage)
                      </label>
                      <Input
                        value={voyageNum}
                        onChange={(e: any) => setVoyageNum(e.target.value)}
                        className="bg-slate-950 border-slate-800 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                        Nº de Precinto (Seal)
                      </label>
                      <Input
                        value={sealNum}
                        onChange={(e: any) => setSealNum(e.target.value)}
                        className="bg-slate-950 border-slate-800 font-mono"
                      />
                    </div>
                  </>
                )}

                {/* Specifics for 310 Ocean Invoice */}
                {outboundFormat === "310" && (
                  <div className="col-span-2 p-3 rounded-2xl bg-slate-950/80 border border-emerald-500/20 flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
                      <DollarSign size={14} />
                      <span>
                        Desglose de Tarifas Marítimas y Recargos Portuarios
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">
                          Nº Factura Carrier
                        </label>
                        <Input
                          value={invoiceNumber}
                          onChange={(e: any) =>
                            setInvoiceNumber(e.target.value)
                          }
                          className="bg-slate-900 border-slate-800 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">
                          Nº Bill of Lading (B/L)
                        </label>
                        <Input
                          value={billOfLading}
                          onChange={(e: any) => setBillOfLading(e.target.value)}
                          className="bg-slate-900 border-slate-800 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">
                          Divisa de Facturación
                        </label>
                        <select
                          value={currency}
                          onChange={(e: any) => setCurrency(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">
                          Flete Base 40HC
                        </label>
                        <Input
                          type="number"
                          value={baseFreightRate}
                          onChange={(e: any) =>
                            setBaseFreightRate(Number(e.target.value))
                          }
                          className="bg-slate-900 border-slate-800 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">
                          Recargo BAF (Combustible)
                        </label>
                        <Input
                          type="number"
                          value={bafAmount}
                          onChange={(e: any) =>
                            setBafAmount(Number(e.target.value))
                          }
                          className="bg-slate-900 border-slate-800 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">
                          Recargo THC (Terminal)
                        </label>
                        <Input
                          type="number"
                          value={thcAmount}
                          onChange={(e: any) =>
                            setThcAmount(Number(e.target.value))
                          }
                          className="bg-slate-900 border-slate-800 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-white/5 text-xs">
                      <span className="text-slate-400">
                        Total Factura Carrier:
                      </span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {(baseFreightRate + bafAmount + thcAmount).toFixed(2)}{" "}
                        {currency}
                      </span>
                    </div>
                  </div>
                )}

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
              </div>

              <Button
                onClick={handleGenerateOutbound}
                disabled={isGenerating}
                className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-xs"
              >
                <Zap size={16} />
                {isGenerating
                  ? "Generando..."
                  : `Generar Documento EDI Outbound (${outboundFormat})`}
              </Button>
            </div>
          </motion.div>

          {/* Right Column: Outbound Preview & Download */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-6 flex flex-col gap-4"
          >
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4 min-h-[460px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck size={18} className="text-emerald-400" />
                  <span className="text-sm font-bold text-white">
                    Vista Previa del Archivo Oficial
                  </span>
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
                  <div className="text-sm font-medium">
                    Ningún mensaje outbound generado aún.
                  </div>
                  <div className="text-xs text-slate-500 max-w-sm">
                    Complete los campos o seleccione una expedición SCM y
                    presione &quot;Generar Documento EDI Outbound&quot;.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="p-3 bg-slate-950 rounded-2xl border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">
                        Control Number
                      </span>
                      <div className="font-mono text-indigo-400 font-bold">
                        {outboundResult.controlNumber}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">
                        Formato
                      </span>
                      <div className="font-bold text-emerald-400">
                        {outboundResult.format}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">
                        Estado
                      </span>
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

      {/* TAB 4: AUDIT LEDGER */}
      {activeTab === "AUDIT" && (
        <motion.div
          variants={itemVariants}
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
                    <td
                      colSpan={8}
                      className="p-8 text-center text-slate-500 font-sans"
                    >
                      No hay intercambios registrados que coincidan con la
                      búsqueda.
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

      {/* TAB 5: PARTNERS DIRECTORY */}
      {activeTab === "PARTNERS" && (
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
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
                <h3 className="font-extrabold text-white text-base">
                  {p.name}
                </h3>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <span>Protocolo:</span>
                  <span className="font-mono text-indigo-300 font-bold">
                    {p.transportProtocol}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-2xl border border-white/5 font-mono">
                <div>
                  <div className="text-[9px] text-slate-500 uppercase">
                    Sender ID
                  </div>
                  <div className="font-bold text-slate-200">
                    {p.senderId} ({p.senderQualifier})
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-500 uppercase">
                    Receiver ID
                  </div>
                  <div className="font-bold text-slate-200">
                    {p.receiverId} ({p.receiverQualifier})
                  </div>
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
