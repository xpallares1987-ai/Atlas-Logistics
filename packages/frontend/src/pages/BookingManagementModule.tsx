import { useState, useMemo, useEffect } from "react";
import {
  Ship,
  Anchor,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Search,
  ArrowRight,
  ShieldCheck,
  Send,
  Sparkles,
  QrCode,
  Key,
  Copy,
  Check,
  ChevronRight,
  DollarSign,
  AlertCircle,
  Package,
} from "lucide-react";
import { Button } from "@atlas/ui";
import {
  OCEAN_BOOKING_PRESETS,
  CARRIER_METADATA,
  validateCutOffDeadlines,
  generateEDI301Transaction,
  generateEDI304ShippingInstruction,
  type OceanBooking,
  type RateLockQuote,
  type CarrierCode,
} from "@atlas/shared";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useApiMutation } from "../hooks/useApiQuery";

type TabKey = "RATE_LOCK" | "CUTOFF_RADAR" | "SI_STUDIO" | "EQUIPMENT_RELEASE";

export default function BookingManagementModule() {
  const [activeTab, setActiveTab] = useState<TabKey>("RATE_LOCK");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("bkg-transpac-01");
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedEdi, setCopiedEdi] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(882); // ~14m 42s

  // Live countdown timer for rate lock
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 900));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Preset state
  const initialPreset = useMemo(
    () => OCEAN_BOOKING_PRESETS.find((p) => p.id === selectedPresetId) || OCEAN_BOOKING_PRESETS[0],
    [selectedPresetId]
  );

  const [activeBooking, setActiveBooking] = useState<OceanBooking>(initialPreset);
  const [allBookings, setAllBookings] = useState<OceanBooking[]>(OCEAN_BOOKING_PRESETS);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const found = OCEAN_BOOKING_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setActiveBooking(found);
    }
  };

  // Multi-carrier spot rates list
  const rateLockQuotes = useMemo<RateLockQuote[]>(() => {
    const carriers: CarrierCode[] = ["MAERSK", "MSC", "CMA_CGM", "HAPAG_LLOYD", "ONE"];
    return carriers.map((code) => {
      const meta = CARRIER_METADATA[code];
      const baseMap: Record<CarrierCode, { freight: number; baf: number; free: number; transit: number }> = {
        MAERSK: { freight: 2150, baf: 320, free: 5, transit: 14 },
        MSC: { freight: 2080, baf: 340, free: 6, transit: 15 },
        CMA_CGM: { freight: 2120, baf: 310, free: 7, transit: 16 },
        HAPAG_LLOYD: { freight: 2200, baf: 290, free: 7, transit: 13 },
        ONE: { freight: 2100, baf: 330, free: 5, transit: 15 },
        EVERGREEN: { freight: 2140, baf: 320, free: 6, transit: 15 },
      };
      const base = baseMap[code];
      return {
        quoteId: `QTE-${meta.scac}-${activeBooking.originPort}-${activeBooking.destinationPort}`,
        carrier: code,
        carrierName: meta.name,
        carrierScac: meta.scac,
        originPort: activeBooking.originPort,
        destPort: activeBooking.destinationPort,
        containerType: activeBooking.requestedEquipment.isoType,
        oceanFreightUsd: base.freight,
        bafUsd: base.baf,
        thcOriginUsd: 140,
        thcDestUsd: 280,
        totalSpotUsd: base.freight + base.baf + 140 + 280,
        validityExpiresAt: new Date(Date.now() + countdownSeconds * 1000).toISOString(),
        rateLockToken: `RL-${meta.scac}-2026-LOCK`,
        freeTimeDays: base.free,
        transitTimeDays: base.transit,
      };
    });
  }, [activeBooking.originPort, activeBooking.destinationPort, activeBooking.requestedEquipment.isoType, countdownSeconds]);

  // Cut-off Evaluation
  const cutOffEval = useMemo(() => {
    if (!activeBooking.cutOffs) return null;
    return validateCutOffDeadlines(activeBooking.cutOffs);
  }, [activeBooking.cutOffs]);

  // API Mutations
  const bookingMutation = useApiMutation<any, any>(
    "/ocean-booking/request",
    "POST",
    {
      onSuccess: (newBkg) => {
        setAllBookings((prev) => [newBkg, ...prev]);
        setActiveBooking(newBkg);
        setActiveTab("CUTOFF_RADAR");
      },
    }
  );

  const siMutation = useApiMutation<any, any>(
    "/ocean-booking/submit-si",
    "POST",
    {
      onSuccess: (res) => {
        setActiveBooking(res.booking);
        setAllBookings((prev) => prev.map((b) => (b.id === res.booking.id ? res.booking : b)));
      },
    }
  );

  const releaseMutation = useApiMutation<any, any>(
    "/ocean-booking/release-equipment",
    "POST",
    {
      onSuccess: (res) => {
        setActiveBooking(res.booking);
        setAllBookings((prev) => prev.map((b) => (b.id === res.booking.id ? res.booking : b)));
      },
    }
  );

  // PDF Draft Bill of Lading Download
  const handleDownloadDraftBL = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Top Carrier Header
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 32, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text(`${activeBooking.rateLock.carrierName.toUpperCase()} - DRAFT BILL OF LADING`, 14, 14);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(
      `DCSA v2.0 / EDI 304 Standard | Booking Ref: ${activeBooking.bookingNumber || activeBooking.referenceNumber} | SCAC: ${activeBooking.carrierScac}`,
      14,
      22
    );

    // Parties Grid
    const si = activeBooking.shippingInstructions;
    const partiesData = [
      ["Shipper / Exporter", si?.shipperName || "Atlas Logistics Enterprise Group", si?.shipperAddress || "Pudong Logistics Hub, Shanghai"],
      ["Consignee", si?.consigneeName || "Atlas Logistics Corp USA", si?.consigneeAddress || "Port of Los Angeles Gate 3"],
      ["Notify Party", si?.notifyPartyName || "Same as Consignee", "Notify on Arrival via Automated Webhook"],
      ["Vessel & Voyage", `${activeBooking.vesselName} / ${activeBooking.voyageNumber}`, `Port of Loading: ${activeBooking.originPort} | Port of Discharge: ${activeBooking.destinationPort}`],
      ["Bill of Lading Type", si?.blType || "WAYBILL", `Freight Payment Term: ${si?.freightPaymentTerm || "PREPAID"}`],
    ];

    autoTable(doc, {
      startY: 38,
      head: [["Transport Party", "Name / Entity", "Address & Routing Instructions"]],
      body: partiesData,
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2.2 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    });

    // Container Cargo Manifest Table
    const nextY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(10.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("CONTAINER PARTICULARS & VERIFIED GROSS MASS (VGM)", 14, nextY);

    const cargoRows = (si?.containerDetails || [
      {
        containerNumber: "MSKU9284712",
        sealNumber: "SL-MAEU-884910",
        tareWeightKg: 3880,
        verifiedGrossMassKg: 24500,
        packagesCount: 1200,
        packageType: "Cartons",
        cargoDescription: activeBooking.commodityDescription,
        hsCode: "8528.59",
      },
    ]).map((c) => [
      c.containerNumber,
      c.sealNumber,
      `${c.verifiedGrossMassKg.toLocaleString()} kg`,
      `${c.packagesCount} ${c.packageType}`,
      c.cargoDescription,
      c.hsCode,
    ]);

    autoTable(doc, {
      startY: nextY + 4,
      head: [["Container No.", "Seal No.", "VGM Gross Wt", "Packages", "Cargo Description", "HS Code"]],
      body: cargoRows,
      theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
    });

    // Legal disclaimer
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(
      "This document is a certified Draft Ocean Bill of Lading / Sea Waybill generated in compliance with DCSA Transport Document Standards. Received for shipment in apparent external good order and condition.",
      14,
      finalY,
      { maxWidth: 182 }
    );

    doc.save(`Draft_BL_${activeBooking.bookingNumber || activeBooking.referenceNumber}.pdf`);
  };

  // PDF Depot Release Gate Pass Download
  const handleDownloadDepotPass = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const release = activeBooking.equipmentRelease;

    // Header styling
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 32, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text("EMPTY CONTAINER EQUIPMENT RELEASE ORDER", 14, 14);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Depot Gate Pass | Ref: ${release?.releaseOrderNumber || "REL-PENDING"} | Valid Until: ${release?.validUntil || "2026-10-25"}`,
      14,
      22
    );

    const depotData = [
      ["Carrier & SCAC", `${activeBooking.rateLock.carrierName} (${activeBooking.carrierScac})`],
      ["Carrier Booking Number", activeBooking.bookingNumber || activeBooking.referenceNumber],
      ["Depot Facility", release?.depotName || "Intermodal Container Terminal"],
      ["Depot Code & Address", `${release?.depotCode || "DEPOT-01"} - ${release?.depotAddress || "Gate 4, Terminal Area"}`],
      ["Container Equipment Allotted", `${activeBooking.requestedEquipment.quantity}x ${activeBooking.requestedEquipment.isoType} High Cube`],
      ["Assigned Container Seals", release?.sealNumbersAllocated.join(", ") || "SL-PENDING"],
      ["DRIVER AUTHORIZATION PIN", release?.pickupPin || "8492"],
      ["Status & Validity", `${release?.status || "ISSUED"} - Valid through ${release?.validUntil || "2026-10-25"}`],
    ];

    autoTable(doc, {
      startY: 38,
      head: [["Depot Dispatch Field", "Authorized Terminal Value"]],
      body: depotData,
      theme: "striped",
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    });

    const pinY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, pinY, 182, 28, "F");

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("DRIVER TERMINAL GATE INSTRUCTIONS", 20, pinY + 8);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Present Authorization PIN [ ${release?.pickupPin || "8492"} ] and Booking Ref [ ${activeBooking.bookingNumber} ] at Depot Ingate Kiosk.\nConfirm external container inspection and seal integrity before departing terminal gate.`,
      20,
      pinY + 16
    );

    doc.save(`Depot_Gate_Pass_${activeBooking.bookingNumber || activeBooking.referenceNumber}.pdf`);
  };

  const handleCopyEdi = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEdi(true);
    setTimeout(() => setCopiedEdi(false), 2000);
  };

  return (
    <div className="w-full min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header & Badges */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Ship className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                  Ocean Booking & Equipment Control Tower
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-medium">
                    DCSA v2.0 / EDI 301 & 304
                  </span>
                </h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  Motor de Reserva Multi-Naviera Autónomo, Bloqueo de Tarifa Spot y Despacho de Instrucciones B/L
                </p>
              </div>
            </div>
          </div>

          {/* Scenario Presets Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-medium mr-1">Corredores Activos:</span>
            {OCEAN_BOOKING_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  selectedPresetId === p.id
                    ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20"
                    : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700"
                }`}
              >
                {p.id === "bkg-transpac-01"
                  ? "🇺🇸 Transpacífico (Shanghai -> LA)"
                  : p.id === "bkg-asiaeu-02"
                  ? "🇪🇺 Asia-Europa (Singapur -> RTM)"
                  : "🇪🇸 SAICA Corredor (BCN -> NYC Book 012)"}
              </button>
            ))}
          </div>
        </div>

        {/* Global KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Reserva Seleccionada</span>
              <Ship className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-lg font-bold text-white font-mono truncate">
              {activeBooking.bookingNumber || activeBooking.referenceNumber}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {activeBooking.rateLock.carrierName} ({activeBooking.carrierScac})
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Tarifa Spot Bloqueada</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-emerald-400 font-mono">
              ${activeBooking.rateLock.totalSpotUsd.toLocaleString()} USD
            </div>
            <div className="text-xs text-emerald-400/80 mt-1 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Bloqueada: {formatCountdown(countdownSeconds)}
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Estado de Plazos (Cut-Offs)</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
              {cutOffEval?.overallStatus === "SAFE" ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Plazos en Tiempo
                </span>
              ) : cutOffEval?.overallStatus === "URGENT" ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Próximo Vencimiento
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Cut-off Vencido
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              SI Cut-off: {cutOffEval?.siHoursRemaining ?? 24}h restantes
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Liberación de Equipo</span>
              <QrCode className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-sm font-bold text-white mt-0.5">
              {activeBooking.equipmentRelease ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Pase Depósito Emitido
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <Clock className="w-4 h-4" /> Pendiente de Asignación
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-1 truncate">
              PIN: {activeBooking.equipmentRelease?.pickupPin || "Sin PIN"}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 gap-2">
          {[
            { key: "RATE_LOCK", label: "1. Tarifas Spot & Despacho DCSA", icon: DollarSign },
            { key: "CUTOFF_RADAR", label: "2. Radar de Plazos Cut-Off", icon: Clock },
            { key: "SI_STUDIO", label: "3. Instrucciones B/L (EDI 304)", icon: FileText },
            { key: "EQUIPMENT_RELEASE", label: "4. Pase de Equipo Vacío (Depot)", icon: QrCode },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                  isActive
                    ? "border-blue-500 text-blue-400 bg-blue-500/5"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: RATE LOCK & DISPATCH */}
        {activeTab === "RATE_LOCK" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  Comparador de Tarifas Spot en Tiempo Real
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    Garantía Rate Lock {formatCountdown(countdownSeconds)}
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Ruta: <strong>{activeBooking.originPort}</strong> → <strong>{activeBooking.destinationPort}</strong> | Equipo: <strong>{activeBooking.requestedEquipment.quantity}x {activeBooking.requestedEquipment.isoType}</strong>
                </p>
              </div>
            </div>

            {/* Carrier Rate Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rateLockQuotes.map((quote) => {
                const isSelectedCarrier = activeBooking.carrier === quote.carrier;
                return (
                  <div
                    key={quote.carrier}
                    className={`p-5 rounded-xl border transition-all space-y-4 ${
                      isSelectedCarrier
                        ? "bg-slate-800/90 border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/30"
                        : "bg-slate-800/40 border-slate-700/70 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-700/60">
                      <div>
                        <div className="font-bold text-white text-sm">{quote.carrierName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">SCAC: {quote.carrierScac}</div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 font-mono font-medium border border-blue-500/30">
                        {quote.transitTimeDays}d tránsito
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400">Flete Marítimo Base:</span>
                        <span className="font-mono">${quote.oceanFreightUsd.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400">Recargo BAF Combustible:</span>
                        <span className="font-mono">${quote.bafUsd.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400">THC Origen & Destino:</span>
                        <span className="font-mono">${(quote.thcOriginUsd + quote.thcDestUsd).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-700/50">
                        <span className="text-slate-400">Días Libres Free-Time:</span>
                        <span className="font-mono text-emerald-400 font-semibold">{quote.freeTimeDays} días garantizados</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Spot Garantizado</div>
                        <div className="text-xl font-bold font-mono text-emerald-400">${quote.totalSpotUsd.toLocaleString()} USD</div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => {
                          bookingMutation.mutate({
                            carrier: quote.carrier,
                            originPort: activeBooking.originPort,
                            destinationPort: activeBooking.destinationPort,
                            commodityDescription: activeBooking.commodityDescription,
                            isoType: activeBooking.requestedEquipment.isoType,
                            quantity: activeBooking.requestedEquipment.quantity,
                            rateLockToken: quote.rateLockToken,
                          });
                        }}
                        disabled={bookingMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                      >
                        {bookingMutation.isPending ? "Reservando..." : "Reservar Ahora"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DCSA & EDI 301 Live Payload Preview */}
            <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <h3 className="font-bold text-white text-sm">Transmisión Telemática DCSA v2.0 & EDI 301 Generada</h3>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCopyEdi(generateEDI301Transaction(activeBooking))}
                  className="text-xs flex items-center gap-1.5"
                >
                  {copiedEdi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedEdi ? "Copiado!" : "Copiar EDI 301"}
                </Button>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 font-mono text-xs text-slate-300 max-h-48 overflow-y-auto whitespace-pre leading-relaxed border border-slate-800">
                {generateEDI301Transaction(activeBooking)}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CUT-OFF RADAR */}
        {activeTab === "CUTOFF_RADAR" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Radar de Hitos y Fechas Límite (Cut-Off Milestones)</h2>
                <p className="text-xs text-slate-400">
                  Control en tiempo real de plazos críticos para evitar cargos por retraso de documentación o exclusión de carga.
                </p>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar reserva / booking..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Cut-Off Countdown Cards for Active Booking */}
            {activeBooking.cutOffs && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-white">SI Cut-Off (Instrucciones)</span>
                    <Clock className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-lg font-bold font-mono text-blue-400">
                    {cutOffEval?.siHoursRemaining ?? 24}h restantes
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate">
                    {activeBooking.cutOffs.siCutOff.replace("T", " ").replace("Z", "")}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setActiveTab("SI_STUDIO")}
                    className="w-full text-xs mt-1"
                  >
                    Editar Instrucciones <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-white">VGM Cut-Off (Peso Bruto)</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-lg font-bold font-mono text-emerald-400">
                    {cutOffEval?.vgmHoursRemaining ?? 36}h restantes
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate">
                    {activeBooking.cutOffs.vgmCutOff.replace("T", " ").replace("Z", "")}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-medium pt-1">
                    ✓ Báscula / SOLAS Certificada
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-white">Cargo Gate-In Cut-Off</span>
                    <Anchor className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-lg font-bold font-mono text-amber-400">
                    {cutOffEval?.cargoHoursRemaining ?? 48}h restantes
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate">
                    {activeBooking.cutOffs.cargoCutOff.replace("T", " ").replace("Z", "")}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setActiveTab("EQUIPMENT_RELEASE")}
                    className="w-full text-xs mt-1"
                  >
                    Ver Pase Depósito <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-white">Export Customs Cut-Off</span>
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-lg font-bold font-mono text-purple-400">
                    {cutOffEval?.customsHoursRemaining ?? 40}h restantes
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate">
                    {activeBooking.cutOffs.customsCutOff.replace("T", " ").replace("Z", "")}
                  </div>
                  <div className="text-[10px] text-purple-300 font-medium pt-1">
                    ✓ Levante DUA / Exportación
                  </div>
                </div>
              </div>
            )}

            {/* All Active Bookings Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-800/40">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/90 text-slate-400 border-b border-slate-700 font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Booking / Referencia</th>
                    <th className="py-3 px-4">Naviera / SCAC</th>
                    <th className="py-3 px-4">Buque & Viaje</th>
                    <th className="py-3 px-4">Ruta (POL → POD)</th>
                    <th className="py-3 px-4">Equipo Allotted</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {allBookings.map((bkg) => {
                    const isSelected = bkg.id === activeBooking.id;
                    return (
                      <tr
                        key={bkg.id}
                        className={`hover:bg-slate-800/60 transition-colors ${
                          isSelected ? "bg-blue-900/20" : ""
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-semibold text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{bkg.bookingNumber || bkg.referenceNumber}</span>
                            {isSelected && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                Activo
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-sans font-normal truncate max-w-[200px]">
                            {bkg.commodityDescription}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-white font-medium">{bkg.rateLock.carrierName}</div>
                          <div className="text-slate-400 text-[11px] font-mono">SCAC: {bkg.carrierScac}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-white font-medium">{bkg.vesselName}</div>
                          <div className="text-slate-400 text-[11px] font-mono">Viaje: {bkg.voyageNumber}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-200">
                          {bkg.originPort} → {bkg.destinationPort}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className="text-blue-300 font-semibold">
                            {bkg.requestedEquipment.quantity}x {bkg.requestedEquipment.isoType}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> {bkg.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setActiveBooking(bkg);
                              setActiveTab("SI_STUDIO");
                            }}
                            className="text-xs"
                          >
                            Gestionar B/L <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SHIPPING INSTRUCTIONS (EDI 304) */}
        {activeTab === "SI_STUDIO" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: SI Form & Manifest */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-white">Instrucciones de Embarque (Shipping Instructions)</h2>
                  <p className="text-xs text-slate-400">
                    Booking: <span className="font-mono text-blue-400">{activeBooking.bookingNumber}</span> | Naviera: <strong>{activeBooking.rateLock.carrierName}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleDownloadDraftBL}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar Draft B/L (PDF)
                  </Button>
                </div>
              </div>

              {/* Parties Details Card */}
              <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-medium">Shipper / Exportador</label>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-slate-200">
                      {activeBooking.shippingInstructions?.shipperName || "Atlas Logistics Enterprise Group"}
                      <div className="text-[11px] text-slate-400 mt-0.5">{activeBooking.shippingInstructions?.shipperAddress || "Zaragoza / Barcelona Logistics Park"}</div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 font-medium">Consignee / Importador</label>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-slate-200">
                      {activeBooking.shippingInstructions?.consigneeName || "Apex High-Tech Logistics Inc"}
                      <div className="text-[11px] text-slate-400 mt-0.5">{activeBooking.shippingInstructions?.consigneeAddress || "Port of Los Angeles Gate 3"}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-slate-400 font-medium">Tipo de Conocimiento (B/L Type)</label>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-white font-semibold">
                      {activeBooking.shippingInstructions?.blType || "WAYBILL"} (Express Sea Waybill)
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 font-medium">Condición de Flete</label>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-emerald-400 font-semibold">
                      {activeBooking.shippingInstructions?.freightPaymentTerm || "PREPAID"}
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 font-medium">Lugar de Emisión</label>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-white">
                      {activeBooking.shippingInstructions?.placeOfIssue || activeBooking.originPort}
                    </div>
                  </div>
                </div>
              </div>

              {/* Container List */}
              <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-400" />
                  Contenedores, Precintos y Masa Bruta Verificada (VGM)
                </h3>

                <div className="space-y-2">
                  {(activeBooking.shippingInstructions?.containerDetails || []).map((cont, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-mono font-bold text-white text-sm">{cont.containerNumber}</div>
                        <div className="text-slate-400 text-[11px]">Precinto: <strong className="font-mono text-slate-200">{cont.sealNumber}</strong></div>
                      </div>
                      <div className="font-mono">
                        <div className="text-emerald-400 font-bold">{cont.verifiedGrossMassKg.toLocaleString()} kg VGM</div>
                        <div className="text-slate-400 text-[11px]">Tara: {cont.tareWeightKg} kg</div>
                      </div>
                      <div>
                        <div className="text-slate-200">{cont.packagesCount} {cont.packageType}</div>
                        <div className="text-slate-400 text-[11px]">HS: {cont.hsCode}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: EDI 304 Transaction Payload Viewer */}
            <div className="p-5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-4 h-fit">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-white">EDI 304 Transmisión ANSI X12</h3>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (activeBooking.shippingInstructions) {
                      handleCopyEdi(generateEDI304ShippingInstruction(activeBooking.shippingInstructions));
                    }
                  }}
                  className="text-xs"
                >
                  {copiedEdi ? "Copiado!" : "Copiar"}
                </Button>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-300 max-h-72 overflow-y-auto whitespace-pre leading-relaxed border border-slate-800">
                {activeBooking.shippingInstructions
                  ? generateEDI304ShippingInstruction(activeBooking.shippingInstructions)
                  : "Generando transacción EDI 304..."}
              </div>

              <Button
                onClick={() => {
                  siMutation.mutate({
                    bookingId: activeBooking.id,
                    shipperName: "SAICA Paper España S.A. (Corredor Book 012)",
                    shipperAddress: "Can Tunis Ferroviaria, Barcelona",
                    consigneeName: "Atlantic Container Corp (New York)",
                    consigneeAddress: "Port Newark Container Terminal (PNCT)",
                    notifyPartyName: "Atlas Logistics Lead (Xavier Pallarès)",
                    blType: "ORIGINAL",
                    freightPaymentTerm: "PREPAID",
                    placeOfIssue: "Barcelona",
                    containerDetails: [
                      {
                        containerNumber: "SUDU4829103",
                        sealNumber: "SL-HLCU-482911",
                        tareWeightKg: 3900,
                        verifiedGrossMassKg: 26500,
                        packagesCount: 22,
                        packageType: "Coils / Reels",
                        cargoDescription: "Paper Reels for Corrugated Packaging (Book 012)",
                        hsCode: "48051100",
                      },
                    ],
                  });
                }}
                disabled={siMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 flex items-center justify-center gap-2 text-xs"
              >
                <Send className="w-4 h-4" />
                {siMutation.isPending ? "Transmitiendo..." : "Enviar Instrucciones a Naviera (EDI 304)"}
              </Button>
            </div>
          </div>
        )}

        {/* TAB 4: EQUIPMENT RELEASE ORDER */}
        {activeTab === "EQUIPMENT_RELEASE" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Equipment Release Details */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-white">Orden de Liberación de Equipo Vacío (Empty Release)</h2>
                  <p className="text-xs text-slate-400">
                    Autorización oficial para la recogida de contenedores vacíos en el depósito del puerto.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleDownloadDepotPass}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar Pase de Depósito (PDF)
                </Button>
              </div>

              {activeBooking.equipmentRelease ? (
                <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-4 text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                    <div>
                      <div className="text-slate-400">Número de Orden de Liberación:</div>
                      <div className="text-base font-bold font-mono text-emerald-400">
                        {activeBooking.equipmentRelease.releaseOrderNumber}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold font-mono">
                      ✓ ESTADO: {activeBooking.equipmentRelease.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-slate-400">Depósito Autorizado:</span>
                      <div className="font-bold text-white text-sm">{activeBooking.equipmentRelease.depotName}</div>
                      <div className="text-slate-400">{activeBooking.equipmentRelease.depotAddress}</div>
                      <div className="text-[11px] font-mono text-blue-400 pt-1">Código: {activeBooking.equipmentRelease.depotCode}</div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-slate-400">Equipo & Cantidad Autorizada:</span>
                      <div className="font-bold text-white text-sm">
                        {activeBooking.equipmentRelease.containerCount}x {activeBooking.equipmentRelease.isoType} High Cube
                      </div>
                      <div className="text-slate-400">Validez Hasta: <strong className="text-slate-200 font-mono">{activeBooking.equipmentRelease.validUntil}</strong></div>
                      <div className="text-[11px] text-emerald-400 font-mono pt-1">
                        Precintos Reservados: {activeBooking.equipmentRelease.sealNumbersAllocated.join(", ")}
                      </div>
                    </div>
                  </div>

                  {/* Driver PIN Box */}
                  <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-blue-300 font-bold text-sm">
                        <Key className="w-4 h-4 text-blue-400" /> PIN de Acceso de Transportista
                      </div>
                      <div className="text-slate-400 text-xs mt-0.5">
                        Introducir este PIN de 4 dígitos en el quiosco de entrada de la terminal para liberar los contenedores.
                      </div>
                    </div>
                    <div className="px-6 py-2 rounded-xl bg-blue-600 text-white font-mono font-bold text-2xl tracking-widest text-center shadow-lg shadow-blue-600/30">
                      {activeBooking.equipmentRelease.pickupPin}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-xl bg-slate-800/40 border border-slate-700/60 text-center space-y-3">
                  <QrCode className="w-10 h-10 text-slate-500 mx-auto" />
                  <div className="text-sm font-semibold text-white">No se ha emitido orden de liberación para esta reserva</div>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Haga clic en el botón a continuación para generar el pase de recogida en depósito con PIN y precintos autorizados.
                  </p>
                  <Button
                    onClick={() => {
                      releaseMutation.mutate({
                        bookingId: activeBooking.id,
                        depotCode: "ESBCN-CANTUNIS",
                        depotName: "Can Tunis Logistainer Intermodal Depot",
                        depotAddress: "Carrer del Port, Can Tunis Ferroviaria, Barcelona",
                      });
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                  >
                    Generar Orden de Liberación
                  </Button>
                </div>
              )}
            </div>

            {/* Right Column: QR Gate Pass Preview */}
            <div className="p-5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-4 h-fit text-xs text-center">
              <div className="flex items-center justify-center gap-2 pb-2 border-b border-slate-700">
                <QrCode className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Pase Digital de Acceso Gate</h3>
              </div>

              <div className="p-6 rounded-xl bg-white text-slate-900 inline-block mx-auto border-4 border-slate-800 shadow-xl">
                <QrCode className="w-32 h-32 text-slate-900" />
                <div className="font-mono font-bold text-xs mt-2 text-slate-700">
                  PIN: {activeBooking.equipmentRelease?.pickupPin || "8492"}
                </div>
              </div>

              <div className="text-slate-400 text-[11px] leading-relaxed">
                Escanee en la barrera OCR del depósito de contenedores para apertura automática de barrera y pesaje en báscula.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
