/**
 * @file useBookingManagement.ts
 * @description Custom React hook encapsulating state, queries, mutations, and AI handlers for Ocean Booking Management.
 * @module @atlas/frontend/components/bookings/hooks
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { validateCutOffDeadlines, type OceanBooking } from "@atlas/shared";
import { useApiMutation, useApiQuery } from "../../../hooks/useApiQuery";
import { authFetch } from "../../../lib/api";
import type {
  TabKey,
  BookingConfirmFormData,
  NewBookingFormData,
} from "../../../types/booking-management.types";
import {
  downloadDraftBLModalPdf,
  downloadShippingInstructionsPdf,
  downloadDepotGatePassPdf,
} from "../../../utils/booking-pdf.utils";
import {
  CANONICAL_FALLBACK_OCEAN_BOOKING,
  mapDbToOceanBooking,
  formatCountdown,
  buildRateLockQuotes,
} from "./bookingHelpers";

export function useBookingManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("RATE_LOCK");
  const [selectedBookingId, setSelectedBookingId] =
    useState<string>("bk_demo_01");
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedEdi, setCopiedEdi] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(882);
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);

  // ============================================================================
  // 1. LIVE SQLITE QUERIES
  // ============================================================================

  const {
    data: dbBookings = [],
    refetch: refetchDbBookings,
    isLoading: loadingDbBookings,
  } = useApiQuery<any[]>(["/api/bookings"], "/bookings");

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

  // ============================================================================
  // 2. MODAL & CONVERSION STATE
  // ============================================================================

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

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 900));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ============================================================================
  // 3. DERIVED BOOKING ENTITIES & MUTATIONS
  // ============================================================================

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

  const [isCheckingDcsaAi, setIsCheckingDcsaAi] = useState(false);
  const [dcsaAiAudit, setDcsaAiAudit] = useState<any | null>(null);
  const [isExtractingDocAi, setIsExtractingDocAi] = useState(false);
  const [extractedDocAi, setExtractedDocAi] = useState<any | null>(null);

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

  const rateLockQuotes = useMemo(() => {
    return buildRateLockQuotes(
      activeBooking.originPort,
      activeBooking.destinationPort,
      activeBooking.requestedEquipment.isoType,
      countdownSeconds,
    );
  }, [
    activeBooking.originPort,
    activeBooking.destinationPort,
    activeBooking.requestedEquipment.isoType,
    countdownSeconds,
  ]);

  const cutOffEval = useMemo(() => {
    if (!activeBooking.cutOffs) return null;
    return validateCutOffDeadlines(activeBooking.cutOffs);
  }, [activeBooking.cutOffs]);

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

  const handleDownloadDraftBL = () => {
    downloadShippingInstructionsPdf(activeBooking);
  };

  const handleDownloadDepotPass = () => {
    downloadDepotGatePassPdf(activeBooking);
  };

  const handleCopyEdi = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEdi(true);
    setTimeout(() => setCopiedEdi(false), 2000);
  };

  const handleOpenDrayage = (
    originId?: string,
    bkgRef?: string,
    containerNum?: string,
  ) => {
    setSelectedDrayageOriginId(originId);
    setDrayageBookingRef(bkgRef);
    setDrayageContainerNum(containerNum);
    setIsDrayageModalOpen(true);
  };

  const handleCreateNewBooking = async () => {
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
  };

  return {
    queryClient,
    activeTab,
    setActiveTab,
    selectedBookingId,
    setSelectedBookingId,
    searchTerm,
    setSearchTerm,
    copiedEdi,
    countdownSeconds,
    formatCountdown,
    showNewBookingModal,
    setShowNewBookingModal,
    dbBookings,
    loadingDbBookings,
    oceanBookingDetail,
    loadingOceanDetails,
    fetchDbBookings,
    confirmingBooking,
    setConfirmingBooking,
    confirmForm,
    setConfirmForm,
    isConfirmSubmitting,
    lastConversionResult,
    setLastConversionResult,
    isDrayageModalOpen,
    setIsDrayageModalOpen,
    selectedDrayageOriginId,
    setSelectedDrayageOriginId,
    drayageBookingRef,
    setDrayageBookingRef,
    drayageContainerNum,
    setDrayageContainerNum,
    newBookingForm,
    setNewBookingForm,
    handleOpenConfirmModal,
    handleConfirmBookingSubmit,
    handleCancelDbBooking,
    activeBooking,
    setActiveBooking,
    allBookings,
    siSuccessMsg,
    draftBlSuccessMsg,
    submitDcsSiMutation,
    generateDraftBlMutation,
    handleConfirmDcsSi,
    handleGenerateOfficialDraftBl,
    isCheckingDcsaAi,
    dcsaAiAudit,
    setDcsaAiAudit,
    isExtractingDocAi,
    extractedDocAi,
    setExtractedDocAi,
    handleRunDcsaCustomsCheck,
    handleRunMultimodalExtract,
    rateLockQuotes,
    cutOffEval,
    bookingMutation,
    releaseMutation,
    handleDownloadDraftBL,
    handleDownloadDepotPass,
    handleCopyEdi,
    handleOpenDrayage,
    handleCreateNewBooking,
  };
}
