/**
 * @file booking-management.types.ts
 * @description Types and component interfaces for Ocean Booking Management & Equipment Control Tower
 */

import type {
  OceanBooking,
  RateLockQuote,
  validateCutOffDeadlines,
} from "@atlas/shared";

export type TabKey =
  "RATE_LOCK" | "CUTOFF_RADAR" | "SI_STUDIO" | "EQUIPMENT_RELEASE";

export interface DraftBLPayload {
  blReference: string;
  trackingNumber: string;
  bookingReference: string;
  carrierBookingNumber: string;
  shipperName: string;
  consigneeName: string;
  carrier: string;
  vesselName: string;
  voyageNumber: string;
  origin: string;
  destination: string;
  containerNumber: string;
  sealNumber: string;
  commodity: string;
  weightKg: number;
  equipment: string;
  incoterm?: string;
  sha256Hash?: string;
}

export interface NewBookingFormData {
  customerName: string;
  carrier: string;
  origin: string;
  destination: string;
  equipment: string;
  incoterm: string;
  commodity: string;
  weight: number;
  totalCost: number;
}

export interface BookingConfirmFormData {
  carrierBookingNumber: string;
  vesselName: string;
  voyageNumber: string;
  containerNumber: string;
  sealNumber: string;
  shipperName: string;
  consigneeName: string;
  autoDownloadPdf: boolean;
  shipperAddressId: string;
  consigneeAddressId: string;
  notifyAddressId: string;
  dischargeAgentAddressId: string;
  isToOrder: boolean;
  orderOf: string;
}

// ============================================================================
// TAB PROPS INTERFACES
// ============================================================================

export interface BookingRateLockTabProps {
  activeBooking: OceanBooking;
  rateLockQuotes: RateLockQuote[];
  countdownSeconds: number;
  formatCountdown: (seconds: number) => string;
  onBookRate: (quote: RateLockQuote) => void;
  isBookingPending: boolean;
  copiedEdi: boolean;
  onCopyEdi: (text: string) => void;
}

export interface BookingCutoffRadarTabProps {
  activeBooking: OceanBooking;
  allBookings: OceanBooking[];
  cutOffEval: ReturnType<typeof validateCutOffDeadlines> | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSelectBooking: (bkg: OceanBooking) => void;
  onNavigateTab: (tab: TabKey) => void;
}

export interface BookingSiStudioTabProps {
  activeBooking: OceanBooking;
  oceanBookingDetail: any;
  dcsaAiAudit: {
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
  } | null;
  setDcsaAiAudit: (audit: any) => void;
  isCheckingDcsaAi: boolean;
  onRunDcsaCustomsCheck: () => void;
  extractedDocAi: {
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
  } | null;
  setExtractedDocAi: (doc: any) => void;
  isExtractingDocAi: boolean;
  onRunMultimodalExtract: () => void;
  onConfirmDcsSi: () => void;
  isSubmittingDcsSi: boolean;
  onGenerateOfficialDraftBl: () => void;
  isGeneratingDraftBl: boolean;
  onDownloadDraftBL: () => void;
  copiedEdi: boolean;
  onCopyEdi: (text: string) => void;
}

export interface BookingEquipmentReleaseTabProps {
  activeBooking: OceanBooking;
  onDownloadDepotPass: () => void;
  onOpenDrayageModal: (bookingRef: string) => void;
  onGenerateRelease: (payload: {
    bookingId: string;
    depotCode: string;
    depotName: string;
    depotAddress: string;
  }) => void;
  isReleasePending: boolean;
}

// ============================================================================
// MODAL PROPS INTERFACES
// ============================================================================

export interface BookingConfirmModalProps {
  confirmingBooking: any;
  onClose: () => void;
  confirmForm: BookingConfirmFormData;
  setConfirmForm: React.Dispatch<React.SetStateAction<BookingConfirmFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  onOpenDrayage: (
    originId?: string,
    bkgRef?: string,
    containerNum?: string,
  ) => void;
}

export interface NewBookingRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  newBookingForm: NewBookingFormData;
  setNewBookingForm: React.Dispatch<React.SetStateAction<NewBookingFormData>>;
  onSubmit: () => Promise<void>;
  isSubmitting?: boolean;
}
