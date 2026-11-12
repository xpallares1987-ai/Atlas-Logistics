import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Ship,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  ShieldCheck,
  DollarSign,
  AlertCircle,
  Package,
  Plus,
  Truck,
  X,
  RefreshCw,
  Database,
  QrCode,
  FileText,
} from "lucide-react";
import { Button, DrayageCalculatorModal } from "@atlas/ui";
import {
  CARRIER_METADATA,
  validateCutOffDeadlines,
  type OceanBooking,
  type RateLockQuote,
  type CarrierCode,
} from "@atlas/shared";
import { useApiMutation, useApiQuery } from "../hooks/useApiQuery";
import { authFetch } from "../lib/api";
import type {
  TabKey,
  BookingConfirmFormData,
  NewBookingFormData,
} from "../types/booking-management.types";
import {
  downloadDraftBLModalPdf,
  downloadShippingInstructionsPdf,
  downloadDepotGatePassPdf,
} from "../utils/booking-pdf.utils";
import { BookingRateLockTab } from "../components/bookings/BookingRateLockTab";
import { BookingCutoffRadarTab } from "../components/bookings/BookingCutoffRadarTab";
import { BookingSiStudioTab } from "../components/bookings/BookingSiStudioTab";
import { BookingEquipmentReleaseTab } from "../components/bookings/BookingEquipmentReleaseTab";
import { BookingConfirmModal } from "../components/bookings/modals/BookingConfirmModal";
import { NewBookingRequestModal } from "../components/bookings/modals/NewBookingRequestModal";

const CANONICAL_FALLBACK_OCEAN_BOOKING: OceanBooking = {
  id: "bk_demo_01",
  bookingNumber: "BK-2026-67116",
  referenceNumber: "BK-2026-67116",
  carrier: "MSC",
  carrierScac: "MSCU",
  originPort: "ESVLC",
  destinationPort: "USNYC",
  vesselName: "MSC ISABELLA",
  voyageNumber: "VOY-2026-88",
  commodityDescription: "Industrial Robotics & Tooling",
  status: "CONFIRMED",
  requestedEquipment: {
    isoType: "40HC",
    quantity: 1,
  },
  rateLock: {
    quoteId: "QTE-MSCU-ESVLC-USNYC",
    carrier: "MSC",
    carrierName: "Mediterranean Shipping Company (MSC)",
    carrierScac: "MSCU",
    originPort: "ESVLC",
    destPort: "USNYC",
    containerType: "40HC",
    oceanFreightUsd: 2080,
    bafUsd: 340,
    thcOriginUsd: 140,
    thcDestUsd: 280,
    totalSpotUsd: 2840,
    validityExpiresAt: "2026-11-20T23:59:59Z",
    rateLockToken: "RL-MSCU-2026-LOCK",
    freeTimeDays: 6,
    transitTimeDays: 15,
  },
  cutOffs: {
    cargoCutOff: "2026-11-12T18:00:00Z",
    vgmCutOff: "2026-11-13T12:00:00Z",
    customsCutOff: "2026-11-13T16:00:00Z",
    siCutOff: "2026-11-14T10:00:00Z",
    estimatedDeparture: "2026-11-15T08:00:00Z",
    estimatedArrival: "2026-11-30T14:00:00Z",
  },
  shippingInstructions: {
    bookingReference: "BK-2026-67116",
    carrierScac: "MSCU",
    shipperName: "Atlas Global Imports S.L.",
    shipperAddress: "Zaragoza / Barcelona Logistics Park",
    consigneeName: "European Distribution Hub B.V.",
    consigneeAddress: "Port Newark Container Terminal (PNCT), Gate 3",
    notifyPartyName: "System Admin (Global Systems & Logistics Lead)",
    blType: "WAYBILL",
    freightPaymentTerm: "PREPAID",
    placeOfIssue: "Valencia",
    siStatus: "ACCEPTED",
    containerDetails: [
      {
        containerNumber: "MSKU9284712",
        sealNumber: "ISO-17712-H-881920",
        tareWeightKg: 3880,
        verifiedGrossMassKg: 28450,
        packagesCount: 48,
        packageType: "Industrial Crates",
        cargoDescription: "Industrial Robotics & Tooling",
        hsCode: "8479.89",
      },
    ],
  },
  equipmentRelease: {
    releaseOrderNumber: "REL-MSCU-2026-0912",
    bookingNumber: "BK-2026-67116",
    carrier: "MSC",
    carrierScac: "MSCU",
    depotCode: "DEPOT-VLC-01",
    depotName: "Terminal de Contenedores de Valencia (TCV)",
    depotAddress: "Muelle de Levante s/n, 46024 Valencia",
    containerCount: 1,
    isoType: "40HC",
    validUntil: "2026-11-12",
    pickupPin: "8819",
    qrDigest: "SHA256:881920-REL-MSCU-VALID",
    status: "ISSUED",
    sealNumbersAllocated: ["ISO-17712-H-881920"],
  },
  createdAt: "2026-11-01T08:00:00Z",
  updatedAt: "2026-11-05T12:00:00Z",
};

function mapDbToOceanBooking(detail: any, parentBooking: any): OceanBooking {
  if (!detail && !parentBooking) return CANONICAL_FALLBACK_OCEAN_BOOKING;

  const bkg = parentBooking || detail?.booking || {};
  let parsedCargo: any = {};
  try {
    parsedCargo =
      typeof bkg.cargoDetails === "string"
        ? JSON.parse(bkg.cargoDetails)
        : bkg.cargoDetails || {};
  } catch {}

  const carrierScac = detail?.carrierScac || "MSCU";
  const carrierCode: CarrierCode =
    carrierScac === "MAEU"
      ? "MAERSK"
      : carrierScac === "MSCU"
        ? "MSC"
        : carrierScac === "CMACGM"
          ? "CMA_CGM"
          : carrierScac === "HLCU"
            ? "HAPAG_LLOYD"
            : "MSC";

  const meta = CARRIER_METADATA[carrierCode] || {
    name: "Mediterranean Shipping Company (MSC)",
    scac: "MSCU",
  };

  const cargoCutOff = detail?.cargoCutOff || "2026-11-12T18:00:00Z";
  const vcsCutOff = detail?.vcsCutOff || "2026-11-13T12:00:00Z";
  const docCutOff = detail?.docCutOff || "2026-11-13T16:00:00Z";
  const siCutOff = detail?.siCutOff || "2026-11-14T10:00:00Z";

  const vgmData =
    detail?.vgm || (detail?.vgmJson ? JSON.parse(detail.vgmJson) : null);
  const containerNum = parsedCargo.containerNumber || "MSKU9284712";
  const sealNum = vgmData?.sealNumber || "ISO-17712-H-881920";
  const vgmKg =
    vgmData?.verifiedGrossMassKg || Number(parsedCargo.weight) || 28450;

  return {
    id: detail?.bookingId || bkg.id || "bk_demo_01",
    bookingNumber: bkg.referenceNumber || "BK-2026-67116",
    referenceNumber: bkg.referenceNumber || "BK-2026-67116",
    carrier: carrierCode,
    carrierScac,
    originPort: bkg.origin || "ESVLC",
    destinationPort: bkg.destination || "USNYC",
    vesselName: bkg.vessel || "MSC ISABELLA",
    voyageNumber: bkg.voyage || "VOY-2026-88",
    commodityDescription:
      parsedCargo.description || "Industrial Robotics & Tooling",
    status: (detail?.siStatus === "CONFIRMED"
      ? "CONFIRMED"
      : bkg.status?.toUpperCase() || "CONFIRMED") as any,
    requestedEquipment: {
      isoType: bkg.equipment || "40HC",
      quantity: 1,
    },
    rateLock: {
      quoteId: `QTE-${carrierScac}-${bkg.origin || "ESVLC"}-${bkg.destination || "USNYC"}`,
      carrier: carrierCode,
      carrierName: meta.name,
      carrierScac,
      originPort: bkg.origin || "ESVLC",
      destPort: bkg.destination || "USNYC",
      containerType: bkg.equipment || "40HC",
      oceanFreightUsd: 2080,
      bafUsd: 340,
      thcOriginUsd: 140,
      thcDestUsd: 280,
      totalSpotUsd: 2840,
      validityExpiresAt: "2026-11-20T23:59:59Z",
      rateLockToken: `RL-${carrierScac}-2026-LOCK`,
      freeTimeDays: 6,
      transitTimeDays: 15,
    },
    cutOffs: {
      cargoCutOff,
      vgmCutOff: vcsCutOff,
      customsCutOff: docCutOff,
      siCutOff,
      estimatedDeparture: "2026-11-15T08:00:00Z",
      estimatedArrival: "2026-11-30T14:00:00Z",
    },
    shippingInstructions: {
      bookingReference: bkg.referenceNumber || "BK-2026-67116",
      carrierScac,
      shipperName: bkg.shipperName || "Atlas Global Imports S.L.",
      shipperAddress: "Zaragoza / Barcelona Logistics Park",
      consigneeName: bkg.consigneeName || "European Distribution Hub B.V.",
      consigneeAddress: "Port Newark Container Terminal (PNCT), Gate 3",
      notifyPartyName: "System Admin (Global Systems & Logistics Lead)",
      blType: "WAYBILL",
      freightPaymentTerm: "PREPAID",
      placeOfIssue: (bkg.origin || "Valencia").split(" ")[0],
      siStatus: detail?.siStatus === "CONFIRMED" ? "ACCEPTED" : "DRAFT",
      containerDetails: [
        {
          containerNumber: containerNum,
          sealNumber: sealNum,
          tareWeightKg: 3880,
          verifiedGrossMassKg: vgmKg,
          packagesCount: 48,
          packageType: "Industrial Crates",
          cargoDescription:
            parsedCargo.description || "Industrial Robotics & Tooling",
          hsCode: "8479.89",
        },
      ],
    },
    equipmentRelease: {
      releaseOrderNumber: `REL-${carrierScac}-2026-0912`,
      bookingNumber: bkg.referenceNumber || "BK-2026-67116",
      carrier: carrierCode,
      carrierScac,
      depotCode: "DEPOT-VLC-01",
      depotName: "Terminal de Contenedores de Valencia (TCV)",
      depotAddress: "Muelle de Levante s/n, 46024 Valencia",
      containerCount: 1,
      isoType: bkg.equipment || "40HC",
      validUntil: cargoCutOff.split("T")[0],
      pickupPin: "8819",
      qrDigest: `SHA256:${sealNum}-REL-VALID`,
      status: "ISSUED",
      sealNumbersAllocated: [sealNum],
    },
    createdAt: bkg.createdAt || detail?.createdAt || new Date().toISOString(),
    updatedAt: detail?.updatedAt || bkg.updatedAt || new Date().toISOString(),
  };
}

export default function BookingManagementModule() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("RATE_LOCK");
  const [selectedBookingId, setSelectedBookingId] =
    useState<string>("bk_demo_01");
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedEdi, setCopiedEdi] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(882); // ~14m 42s
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);

  // Live DB Bookings state (2-Phase Booking-to-Shipment Lifecycle)
  const {
    data: dbBookings = [],
    refetch: refetchDbBookings,
    isLoading: loadingDbBookings,
  } = useApiQuery<any[]>(["/api/bookings"], "/bookings");

  // Live DCSA Ocean Booking details from SQLite via useApiQuery
  const {
    data: oceanBookingDetail,
    refetch: refetchOceanBookingDetails,
    isLoading: loadingOceanDetails,
  } = useApiQuery<any>(
    ["ocean-booking-details", selectedBookingId],
    selectedBookingId
      ? `/ocean-booking/details?bookingId=${selectedBookingId}`
      : "/ocean-booking/details",
  );

  const fetchDbBookings = () => {
    refetchDbBookings();
    refetchOceanBookingDetails();
  };

  const [confirmingBooking, setConfirmingBooking] = useState<any | null>(null);
  const [confirmForm, setConfirmForm] = useState<BookingConfirmFormData>({
    carrierBookingNumber: "",
    vesselName: "MV ATLAS HORIZON",
    voyageNumber: "VY-2026E",
    containerNumber: "ATLU4928174",
    sealNumber: "SL-ATLS-90124",
    shipperName: "Atlas Global Imports S.L.",
    consigneeName: "European Distribution Hub B.V.",
    autoDownloadPdf: true,
    shipperAddressId: "",
    consigneeAddressId: "",
    notifyAddressId: "",
    dischargeAgentAddressId: "",
    isToOrder: false,
    orderOf: "THE SHIPPER",
  });
  const [isConfirmSubmitting, setIsConfirmSubmitting] = useState(false);
  const [lastConversionResult, setLastConversionResult] = useState<any | null>(
    null,
  );
  // Drayage Road Haulage Calculator Modal State
  const [isDrayageModalOpen, setIsDrayageModalOpen] = useState(false);
  const [selectedDrayageOriginId, setSelectedDrayageOriginId] = useState<
    string | undefined
  >(undefined);
  const [drayageBookingRef, setDrayageBookingRef] = useState<
    string | undefined
  >(undefined);
  const [drayageContainerNum, setDrayageContainerNum] = useState<
    string | undefined
  >(undefined);
  const [newBookingForm, setNewBookingForm] = useState<NewBookingFormData>({
    customerName: "Atlas Global Imports S.L.",
    carrier: "Maersk",
    origin: "CNSHA (Shanghai)",
    destination: "ESBCN (Barcelona)",
    equipment: "40HC",
    incoterm: "FOB",
    commodity: "Electronic Components",
    weight: 18500,
    totalCost: 2650,
  });

  const handleOpenConfirmModal = (bkg: any) => {
    const details = bkg.parsedCargoDetails || {};
    setConfirmingBooking(bkg);
    setConfirmForm({
      carrierBookingNumber: `CR-${Math.floor(100000 + Math.random() * 900000)}`,
      vesselName: bkg.vessel || "MV ATLAS HORIZON",
      voyageNumber: bkg.voyage || "VY-2026E",
      containerNumber: `ATLU${Math.floor(1000000 + Math.random() * 8999999)}`,
      sealNumber: `SL-${Math.floor(10000 + Math.random() * 89999)}`,
      shipperName: details.customerName || "Atlas Global Imports S.L.",
      consigneeName: details.consigneeName || "European Distribution Hub B.V.",
      autoDownloadPdf: true,
      shipperAddressId: bkg.shipperAddressId || "",
      consigneeAddressId: bkg.consigneeAddressId || "",
      notifyAddressId: bkg.notifyAddressId || "",
      dischargeAgentAddressId: bkg.dischargeAgentAddressId || "",
      isToOrder: !!bkg.isToOrder,
      orderOf: bkg.orderOf || "THE SHIPPER",
    });
  };

  const handleConfirmBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingBooking) return;
    setIsConfirmSubmitting(true);
    try {
      const res = await authFetch(
        `/api/bookings/${confirmingBooking.id}/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(confirmForm),
        },
      );
      if (res.ok) {
        const result = await res.json();
        setLastConversionResult(result);
        const details = confirmingBooking.parsedCargoDetails || {};
        if (confirmForm.autoDownloadPdf) {
          downloadDraftBLModalPdf({
            blReference:
              result.blDocument?.documentReference ||
              `BL-${result.shipment?.trackingNumber}`,
            bookingReference: confirmingBooking.referenceNumber,
            carrierBookingNumber: confirmForm.carrierBookingNumber,
            trackingNumber: result.shipment?.trackingNumber,
            carrier: details.carrier || "Ocean Carrier",
            shipperName: confirmForm.shipperName,
            consigneeName: confirmForm.consigneeName,
            vesselName: confirmForm.vesselName,
            voyageNumber: confirmForm.voyageNumber,
            origin: confirmingBooking.origin,
            destination: confirmingBooking.destination,
            equipment: confirmingBooking.equipment || "40HC",
            containerNumber:
              result.container?.containerNumber || confirmForm.containerNumber,
            sealNumber: confirmForm.sealNumber,
            commodity: details.commodity || "General Cargo",
            weightKg: Number(details.weight) || 18000,
            incoterm: details.incoterm || "FOB",
            sha256Hash: result.blDocument?.sha256Hash,
          });
        }
        setConfirmingBooking(null);
        await fetchDbBookings();
      }
    } catch (err) {
      console.error("Failed to confirm booking:", err);
    } finally {
      setIsConfirmSubmitting(false);
    }
  };

  const handleCancelDbBooking = async (bookingId: string) => {
    try {
      const res = await authFetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Cancelled by operator in Control Tower",
        }),
      });
      if (res.ok) {
        await fetchDbBookings();
      }
    } catch (err) {
      console.error("Failed to cancel booking:", err);
    }
  };

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

  const selectedDbBooking = useMemo(() => {
    return (
      dbBookings.find(
        (b) =>
          b.id === selectedBookingId || b.referenceNumber === selectedBookingId,
      ) ||
      dbBookings[0] ||
      null
    );
  }, [dbBookings, selectedBookingId]);

  const [customActiveBooking, setCustomActiveBooking] =
    useState<OceanBooking | null>(null);

  const activeBooking = useMemo<OceanBooking>(() => {
    if (customActiveBooking && customActiveBooking.id === selectedBookingId) {
      return customActiveBooking;
    }
    return mapDbToOceanBooking(oceanBookingDetail, selectedDbBooking);
  }, [
    customActiveBooking,
    selectedBookingId,
    oceanBookingDetail,
    selectedDbBooking,
  ]);

  const setActiveBooking = (bkg: OceanBooking) => {
    setCustomActiveBooking(bkg);
    if (bkg.id) setSelectedBookingId(bkg.id);
  };

  const allBookings = useMemo<OceanBooking[]>(() => {
    if (dbBookings.length === 0) return [CANONICAL_FALLBACK_OCEAN_BOOKING];
    return dbBookings.map((b) => mapDbToOceanBooking(null, b));
  }, [dbBookings]);

  // Operational Fastify mutations for DCSA SI and Draft B/L
  const [siSuccessMsg, setSiSuccessMsg] = useState<string | null>(null);
  const [draftBlSuccessMsg, setDraftBlSuccessMsg] = useState<string | null>(
    null,
  );

  const detailId = oceanBookingDetail?.id || "bkg_sh_demo_01";

  const submitDcsSiMutation = useApiMutation<
    { success: boolean; details: any },
    { vgmKg?: number; sealNumber?: string; certifiedBy?: string }
  >(`/ocean-booking/${detailId}/shipping-instructions`, "POST", {
    onSuccess: () => {
      refetchOceanBookingDetails();
      setSiSuccessMsg(
        "Instrucciones DCSA SI confirmadas y VGM certificado en SQLite.",
      );
      setTimeout(() => setSiSuccessMsg(null), 8000);
    },
  });

  const generateDraftBlMutation = useApiMutation<
    { success: boolean; details: any },
    void
  >(`/ocean-booking/${detailId}/generate-draft-bl`, "POST", {
    onSuccess: () => {
      refetchOceanBookingDetails();
      setDraftBlSuccessMsg("Borrador Oficial B/L emitido con éxito en SQLite.");
      setTimeout(() => setDraftBlSuccessMsg(null), 8000);
    },
  });

  const handleConfirmDcsSi = () => {
    submitDcsSiMutation.mutate({
      vgmKg: 28450,
      sealNumber: "ISO-17712-H-881920",
      certifiedBy: "Atlas Weighing Station ESVLC-01",
    });
  };

  const handleGenerateOfficialDraftBl = () => {
    generateDraftBlMutation.mutate();
  };

  // On-Demand Gemini AI DCSA & HS/CBAM Audit + Multimodal Document Extractor State
  const [isCheckingDcsaAi, setIsCheckingDcsaAi] = useState(false);
  const [dcsaAiAudit, setDcsaAiAudit] = useState<{
    audit: {
      suggestedHsCode: string;
      hsDescription: string;
      cbamApplicable: boolean;
      cbamCategory: string;
      usmcaEligible: boolean;
      dcsaValidationStatus: string;
      missingFields: string[];
      complianceRecommendations: string[];
    };
    source: string;
    model: string;
    latencyMs: number;
    quotaRemainingRpm: number;
  } | null>(null);

  const [isExtractingDocAi, setIsExtractingDocAi] = useState(false);
  const [extractedDocAi, setExtractedDocAi] = useState<{
    extracted: {
      documentType: string;
      bookingReference: string;
      containerNumber: string;
      vesselVoyage: string;
      grossWeightKg: number;
      packageCount: number;
      suggestedHsCode: string;
      invoiceAmountUsd: number;
      currency: string;
      incoterm: string;
      extractedNotes: string;
    };
    source: string;
    model: string;
    latencyMs: number;
    quotaRemainingRpm: number;
  } | null>(null);

  const handleRunDcsaCustomsCheck = async () => {
    setIsCheckingDcsaAi(true);
    try {
      const res = await fetch("/api/ai/dcsa-customs-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBookingId || "bk_demo_01",
          shipmentId: "sh_demo_01",
          commodityDescription: activeBooking.commodityDescription,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDcsaAiAudit(data);
      }
    } catch (err) {
      console.error("Failed to run DCSA & Customs AI check:", err);
    } finally {
      setIsCheckingDcsaAi(false);
    }
  };

  const handleRunMultimodalExtract = async () => {
    setIsExtractingDocAi(true);
    try {
      const res = await fetch("/api/ai/extract-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: `COMMERCIAL PACKING LIST & SHIPPING INSTRUCTIONS - Booking: ${activeBooking.bookingNumber || "BK-2026-67116"} - Vessel: ${activeBooking.vesselName} / ${activeBooking.voyageNumber} - Container: MSKU9284712 - Commodity: ${activeBooking.commodityDescription}`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setExtractedDocAi(data);
      }
    } catch (err) {
      console.error("Failed to run multimodal document extractor:", err);
    } finally {
      setIsExtractingDocAi(false);
    }
  };

  // Multi-carrier spot rates list
  const rateLockQuotes = useMemo<RateLockQuote[]>(() => {
    const carriers: CarrierCode[] = [
      "MAERSK",
      "MSC",
      "CMA_CGM",
      "HAPAG_LLOYD",
      "ONE",
    ];
    return carriers.map((code) => {
      const meta = CARRIER_METADATA[code];
      const baseMap: Record<
        CarrierCode,
        { freight: number; baf: number; free: number; transit: number }
      > = {
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
        validityExpiresAt: new Date(
          Date.now() + countdownSeconds * 1000,
        ).toISOString(),
        rateLockToken: `RL-${meta.scac}-2026-LOCK`,
        freeTimeDays: base.free,
        transitTimeDays: base.transit,
      };
    });
  }, [
    activeBooking.originPort,
    activeBooking.destinationPort,
    activeBooking.requestedEquipment.isoType,
    countdownSeconds,
  ]);

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
        refetchDbBookings();
        refetchOceanBookingDetails();
        setActiveBooking(newBkg);
        setActiveTab("CUTOFF_RADAR");
      },
    },
  );

  const releaseMutation = useApiMutation<any, any>(
    "/ocean-booking/release-equipment",
    "POST",
    {
      onSuccess: (res) => {
        refetchDbBookings();
        refetchOceanBookingDetails();
        setActiveBooking(res.booking);
      },
    },
  );

  // PDF Draft Bill of Lading Download
  const handleDownloadDraftBL = () => {
    downloadShippingInstructionsPdf(activeBooking);
  };

  // PDF Depot Release Gate Pass Download
  const handleDownloadDepotPass = () => {
    downloadDepotGatePassPdf(activeBooking);
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
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex flex-wrap items-center gap-2">
                  <span>Ocean Booking & Equipment Control Tower</span>
                  <span className="text-slate-400 font-normal text-base">
                    | Booking & B/L Management
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-medium">
                    DCSA v2.0 / EDI 301 & 304
                  </span>
                </h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  Motor de Reserva Multi-Naviera Autónomo, Bloqueo de Tarifa
                  Spot y Despacho de Instrucciones B/L
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={() => setShowNewBookingModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 py-1.5 px-3"
            >
              <Plus className="w-3.5 h-3.5" />
              New Booking
            </Button>
            <Button
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["/api/bookings"] })
              }
              variant="outline"
              className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800 flex items-center gap-1.5 py-1.5 px-3"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Actualizar Bandeja
            </Button>
          </div>
        </div>

        {/* Kanban Board Columns Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Pending
            </h3>
            <div className="text-sm font-semibold text-white mt-1">
              {dbBookings.filter((b) => b.status === "PENDING").length || 1} En
              Asignación
            </div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
            </h3>
            <div className="text-sm font-semibold text-white mt-1">
              {dbBookings.filter((b) => b.status === "CONFIRMED").length + 3}{" "}
              Reservas DCSA
            </div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Ship className="w-3.5 h-3.5" /> In Transit
            </h3>
            <div className="text-sm font-semibold text-white mt-1">
              2 Buques en Navegación
            </div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3">
            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Delivered
            </h3>
            <div className="text-sm font-semibold text-white mt-1">
              Completadas
            </div>
          </div>
        </div>

        {/* Live Operational Booking Inbox (2-Phase Conversion: Booking -> Shipment + B/L) */}
        <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-400" />
                Bandeja Operativa de Reservas (Booking-to-Shipment Pipeline)
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono">
                  {dbBookings.length} registros
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Fase 1: Solicitudes creadas desde Cotizaciones/Pricing (PENDING)
                → Fase 2: Confirmación Naviera, creación atómica de Expedición
                (Shipment + Hitos) y emisión de Borrador B/L.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={fetchDbBookings}
                className="text-xs py-1.5 px-3"
              >
                {loadingDbBookings ? "Actualizando..." : "Actualizar Bandeja"}
              </Button>
            </div>
          </div>

          {lastConversionResult && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-emerald-300">
                    ¡Conversión Operativa Completada!
                  </span>{" "}
                  Reserva{" "}
                  <span className="font-mono font-bold text-white">
                    {lastConversionResult.booking?.referenceNumber}
                  </span>{" "}
                  → Expedición Activa{" "}
                  <span className="font-mono font-bold text-emerald-400">
                    {lastConversionResult.shipment?.trackingNumber}
                  </span>{" "}
                  ({lastConversionResult.milestones?.length || 3} hitos creados)
                  y Borrador B/L{" "}
                  <span className="font-mono font-bold text-indigo-300">
                    {lastConversionResult.blDocument?.documentReference}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setLastConversionResult(null)}
                className="text-xs text-slate-400 hover:text-white self-end sm:self-center"
              >
                Cerrar
              </button>
            </div>
          )}

          {dbBookings.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400 bg-slate-950/50 rounded-xl border border-slate-800/80">
              No hay solicitudes de reserva en la base de datos. Cree una desde{" "}
              <strong className="text-indigo-400">/quotes</strong>,{" "}
              <strong className="text-indigo-400">/pricing</strong> o con el
              botón <strong className="text-white">New Booking</strong> arriba.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Booking Ref</th>
                    <th className="py-2.5 px-3">Cliente / Naviera</th>
                    <th className="py-2.5 px-3">Ruta (POL → POD)</th>
                    <th className="py-2.5 px-3">Equipo & Carga</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3">Expedición / B/L</th>
                    <th className="py-2.5 px-3 text-right">Acción Operativa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {dbBookings.slice(0, 12).map((bkg) => {
                    const details = bkg.parsedCargoDetails || {};
                    const isPending = bkg.status === "PENDING";
                    const isConfirmed = bkg.status === "CONFIRMED";
                    return (
                      <tr
                        key={bkg.id}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-3 font-mono font-bold text-indigo-400">
                          {bkg.referenceNumber}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-white">
                            {details.customerName || "Corporate Client"}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {details.carrier || "Ocean Carrier"} ·{" "}
                            {details.incoterm || "FOB"}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-slate-200">
                            {bkg.origin}
                          </span>
                          <span className="text-emerald-400 mx-1.5">→</span>
                          <span className="font-mono text-slate-200">
                            {bkg.destination}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono mr-1.5">
                            {bkg.equipment || "40HC"}
                          </span>
                          <span className="text-slate-400">
                            {details.commodity || "General Cargo"} (
                            {Number(details.weight || 18000).toLocaleString()}{" "}
                            kg)
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              isConfirmed
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : isPending
                                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                  : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                            }`}
                          >
                            {bkg.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {details.shipmentTrackingNumber ? (
                            <div>
                              <div className="text-emerald-400 font-bold">
                                {details.shipmentTrackingNumber}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                B/L:{" "}
                                {details.blReference ||
                                  `BL-${details.shipmentTrackingNumber}`}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500">
                              Pendiente confirmación
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {isPending && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDrayageOriginId(
                                    bkg.shipperAddressId || undefined,
                                  );
                                  setDrayageBookingRef(bkg.referenceNumber);
                                  setDrayageContainerNum(
                                    details.containerNumber || undefined,
                                  );
                                  setIsDrayageModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-700/50 text-xs transition-colors flex items-center gap-1"
                                title="Cotizar Acarreo Terrestre (Drayage)"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                Acarreo
                              </button>
                              <button
                                onClick={() => handleOpenConfirmModal(bkg)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-colors flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Confirmar y Generar Expedición
                              </button>
                              <button
                                onClick={() => handleCancelDbBooking(bkg.id)}
                                className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/30 text-slate-400 hover:text-rose-300 text-xs transition-colors"
                                title="Cancelar Reserva"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          {isConfirmed && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDrayageOriginId(
                                    bkg.shipperAddressId || undefined,
                                  );
                                  setDrayageBookingRef(bkg.referenceNumber);
                                  setDrayageContainerNum(
                                    details.containerNumber || undefined,
                                  );
                                  setIsDrayageModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-700/50 text-xs transition-colors flex items-center gap-1"
                                title="Cotizar Acarreo Terrestre (Drayage)"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                Acarreo
                              </button>
                              <button
                                onClick={() =>
                                  downloadDraftBLModalPdf({
                                    blReference:
                                      details.blReference ||
                                      `BL-${details.shipmentTrackingNumber || bkg.referenceNumber}`,
                                    bookingReference: bkg.referenceNumber,
                                    carrierBookingNumber:
                                      details.carrierBookingNumber ||
                                      `CR-${bkg.referenceNumber}`,
                                    trackingNumber:
                                      details.shipmentTrackingNumber ||
                                      "ATLS-BOOKED",
                                    carrier: details.carrier || "Ocean Carrier",
                                    shipperName:
                                      details.customerName ||
                                      "Atlas Global Imports S.L.",
                                    consigneeName:
                                      "European Distribution Hub B.V.",
                                    vesselName:
                                      bkg.vessel || "MV ATLAS HORIZON",
                                    voyageNumber: bkg.voyage || "VY-2026E",
                                    origin: bkg.origin,
                                    destination: bkg.destination,
                                    equipment: bkg.equipment || "40HC",
                                    containerNumber:
                                      details.containerNumber || "ATLU4928174",
                                    sealNumber:
                                      details.sealNumber || "SL-ATLS-90124",
                                    commodity:
                                      details.commodity || "General Cargo",
                                    weightKg: Number(details.weight) || 18000,
                                    incoterm: details.incoterm || "FOB",
                                  })
                                }
                                className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 font-semibold text-xs transition-colors inline-flex items-center gap-1"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Descargar B/L (PDF)
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Relational Booking Selector & SQLite Context Banner */}
        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider block">
                  Reserva Relacional Activa (SQLite dev.db)
                </span>
                {oceanBookingDetail ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Detalle DCSA: {oceanBookingDetail.id}
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Sin Detalle DCSA Específico
                  </span>
                )}
                {oceanBookingDetail?.siStatus === "CONFIRMED" && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    DCSA SI Confirmadas
                  </span>
                )}
                {oceanBookingDetail?.draftBlStatus === "ISSUED" && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Draft B/L Emitido
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeBooking.bookingNumber} ({activeBooking.originPort} →{" "}
                {activeBooking.destinationPort}) | Buque:{" "}
                {activeBooking.vesselName} | Contrato:{" "}
                {oceanBookingDetail?.serviceContractNumber ||
                  "SC-MED-2026-88192"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 font-medium">
                Reserva:
              </label>
              <select
                value={selectedBookingId}
                onChange={(e) => setSelectedBookingId(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              >
                {dbBookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.referenceNumber || b.id} ({b.origin} → {b.destination})
                  </option>
                ))}
              </select>
            </div>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                refetchOceanBookingDetails();
                refetchDbBookings();
              }}
              disabled={loadingOceanDetails || loadingDbBookings}
              className="text-xs flex items-center gap-1.5"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  loadingOceanDetails || loadingDbBookings ? "animate-spin" : ""
                }`}
              />
              Refrescar DB
            </Button>
          </div>
        </div>

        {/* Success Alert Banners */}
        {siSuccessMsg && (
          <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{siSuccessMsg}</span>
          </div>
        )}
        {draftBlSuccessMsg && (
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
            <span>{draftBlSuccessMsg}</span>
          </div>
        )}

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
            {
              key: "RATE_LOCK",
              label: "1. Tarifas Spot & Despacho DCSA",
              icon: DollarSign,
            },
            {
              key: "CUTOFF_RADAR",
              label: "2. Radar de Plazos Cut-Off",
              icon: Clock,
            },
            {
              key: "SI_STUDIO",
              label: "3. Instrucciones B/L (EDI 304)",
              icon: FileText,
            },
            {
              key: "EQUIPMENT_RELEASE",
              label: "4. Pase de Equipo Vacío (Depot)",
              icon: QrCode,
            },
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
          <BookingRateLockTab
            activeBooking={activeBooking}
            rateLockQuotes={rateLockQuotes}
            countdownSeconds={countdownSeconds}
            formatCountdown={formatCountdown}
            onBookRate={(quote) => {
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
            isBookingPending={bookingMutation.isPending}
            copiedEdi={copiedEdi}
            onCopyEdi={handleCopyEdi}
          />
        )}

        {/* TAB 2: CUT-OFF RADAR */}
        {activeTab === "CUTOFF_RADAR" && (
          <BookingCutoffRadarTab
            activeBooking={activeBooking}
            allBookings={allBookings}
            cutOffEval={cutOffEval}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onSelectBooking={(bkg) => setActiveBooking(bkg)}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {/* TAB 3: SHIPPING INSTRUCTIONS (EDI 304) */}
        {activeTab === "SI_STUDIO" && (
          <BookingSiStudioTab
            activeBooking={activeBooking}
            oceanBookingDetail={oceanBookingDetail}
            dcsaAiAudit={dcsaAiAudit}
            setDcsaAiAudit={setDcsaAiAudit}
            isCheckingDcsaAi={isCheckingDcsaAi}
            onRunDcsaCustomsCheck={handleRunDcsaCustomsCheck}
            extractedDocAi={extractedDocAi}
            setExtractedDocAi={setExtractedDocAi}
            isExtractingDocAi={isExtractingDocAi}
            onRunMultimodalExtract={handleRunMultimodalExtract}
            onConfirmDcsSi={handleConfirmDcsSi}
            isSubmittingDcsSi={submitDcsSiMutation.isPending}
            onGenerateOfficialDraftBl={handleGenerateOfficialDraftBl}
            isGeneratingDraftBl={generateDraftBlMutation.isPending}
            onDownloadDraftBL={handleDownloadDraftBL}
            copiedEdi={copiedEdi}
            onCopyEdi={handleCopyEdi}
          />
        )}

        {/* TAB 4: EQUIPMENT RELEASE ORDER */}
        {activeTab === "EQUIPMENT_RELEASE" && (
          <BookingEquipmentReleaseTab
            activeBooking={activeBooking}
            onDownloadDepotPass={handleDownloadDepotPass}
            onOpenDrayageModal={(bookingRef) => {
              setDrayageBookingRef(bookingRef);
              setIsDrayageModalOpen(true);
            }}
            onGenerateRelease={(payload) => {
              releaseMutation.mutate(payload);
            }}
            isReleasePending={releaseMutation.isPending}
          />
        )}

        {/* Confirm Booking -> Active Shipment + Draft B/L Modal (Phase 2) */}
        <BookingConfirmModal
          confirmingBooking={confirmingBooking}
          onClose={() => setConfirmingBooking(null)}
          confirmForm={confirmForm}
          setConfirmForm={setConfirmForm}
          onSubmit={handleConfirmBookingSubmit}
          isSubmitting={isConfirmSubmitting}
          onOpenDrayage={(originId, bkgRef, containerNum) => {
            setSelectedDrayageOriginId(originId);
            setDrayageBookingRef(bkgRef);
            setDrayageContainerNum(containerNum);
            setIsDrayageModalOpen(true);
          }}
        />

        {/* New Booking Request Modal (Phase 1) */}
        <NewBookingRequestModal
          isOpen={showNewBookingModal}
          onClose={() => setShowNewBookingModal(false)}
          newBookingForm={newBookingForm}
          setNewBookingForm={setNewBookingForm}
          onSubmit={async () => {
            try {
              const res = await authFetch("/api/bookings", {
                method: "POST",
                body: JSON.stringify(newBookingForm),
              });
              if (res.ok) {
                setShowNewBookingModal(false);
                await fetchDbBookings();
              }
            } catch (err) {
              console.error("Error creating booking:", err);
            }
          }}
        />
        {/* Drayage Road Haulage Calculator Modal */}
        <DrayageCalculatorModal
          isOpen={isDrayageModalOpen}
          onClose={() => {
            setIsDrayageModalOpen(false);
            setSelectedDrayageOriginId(undefined);
            setDrayageBookingRef(undefined);
            setDrayageContainerNum(undefined);
          }}
          preSelectedOriginId={selectedDrayageOriginId}
          bookingReference={drayageBookingRef}
          containerNumber={drayageContainerNum}
        />
      </div>
    </div>
  );
}
