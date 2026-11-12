/**
 * @file BookingManagementModule.tsx
 * @description Orchestrator page for Ocean Booking & Equipment Control Tower (DCSA v2.0 / EDI 301 & 304).
 * @module @atlas/frontend/pages
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import React, { Suspense } from "react";
import { DrayageCalculatorModal } from "@atlas/ui";
import {
  Header,
  Navigation,
  KanbanSummary,
  RelationalContext,
  KpiStrip,
  BookingInbox,
  BookingRateLockTab,
  useBookingManagement,
} from "../components/bookings";

// ============================================================================
// 1. LAZY-LOADED SECONDARY TABS & MODALS
// ============================================================================

const BookingCutoffRadarTab = React.lazy(() =>
  import("../components/bookings/Tab/CutoffRadar").then((m) => ({
    default: m.BookingCutoffRadarTab,
  })),
);
const BookingSiStudioTab = React.lazy(() =>
  import("../components/bookings/Tab/SiStudio").then((m) => ({
    default: m.BookingSiStudioTab,
  })),
);
const BookingEquipmentReleaseTab = React.lazy(() =>
  import("../components/bookings/Tab/EquipmentRelease").then((m) => ({
    default: m.BookingEquipmentReleaseTab,
  })),
);
const BookingConfirmModal = React.lazy(() =>
  import("../components/bookings/Modal/Confirm").then((m) => ({
    default: m.BookingConfirmModal,
  })),
);
const NewBookingRequestModal = React.lazy(() =>
  import("../components/bookings/Modal/NewRequest").then((m) => ({
    default: m.NewBookingRequestModal,
  })),
);

// ============================================================================
// 2. MODULE ORCHESTRATOR
// ============================================================================

export default function BookingManagementModule() {
  const vm = useBookingManagement();

  return (
    <div className="w-full min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <Header
          onOpenNewBooking={() => vm.setShowNewBookingModal(true)}
          onRefreshInbox={() =>
            vm.queryClient.invalidateQueries({ queryKey: ["/api/bookings"] })
          }
        />

        <KanbanSummary dbBookings={vm.dbBookings} />

        <BookingInbox
          dbBookings={vm.dbBookings}
          loadingDbBookings={vm.loadingDbBookings}
          onRefresh={vm.fetchDbBookings}
          lastConversionResult={vm.lastConversionResult}
          onClearConversionResult={() => vm.setLastConversionResult(null)}
          onOpenDrayage={vm.handleOpenDrayage}
          onOpenConfirmModal={vm.handleOpenConfirmModal}
          onCancelBooking={vm.handleCancelDbBooking}
        />

        <RelationalContext
          activeBooking={vm.activeBooking}
          oceanBookingDetail={vm.oceanBookingDetail}
          selectedBookingId={vm.selectedBookingId}
          onSelectBookingId={vm.setSelectedBookingId}
          dbBookings={vm.dbBookings}
          onRefresh={vm.fetchDbBookings}
          isLoading={vm.loadingOceanDetails || vm.loadingDbBookings}
          siSuccessMsg={vm.siSuccessMsg}
          draftBlSuccessMsg={vm.draftBlSuccessMsg}
        />

        <KpiStrip
          activeBooking={vm.activeBooking}
          countdownSeconds={vm.countdownSeconds}
          formatCountdown={vm.formatCountdown}
          cutOffEval={vm.cutOffEval}
        />

        <Navigation activeTab={vm.activeTab} onSelectTab={vm.setActiveTab} />

        {vm.activeTab === "RATE_LOCK" && (
          <BookingRateLockTab
            activeBooking={vm.activeBooking}
            rateLockQuotes={vm.rateLockQuotes}
            countdownSeconds={vm.countdownSeconds}
            formatCountdown={vm.formatCountdown}
            onBookRate={(quote: any) => {
              vm.bookingMutation.mutate({
                carrier: quote.carrier,
                originPort: vm.activeBooking.originPort,
                destinationPort: vm.activeBooking.destinationPort,
                commodityDescription: vm.activeBooking.commodityDescription,
                isoType: vm.activeBooking.requestedEquipment.isoType,
                quantity: vm.activeBooking.requestedEquipment.quantity,
                rateLockToken: quote.rateLockToken,
              });
            }}
            isBookingPending={vm.bookingMutation.isPending}
            copiedEdi={vm.copiedEdi}
            onCopyEdi={vm.handleCopyEdi}
          />
        )}

        <Suspense
          fallback={
            <div className="p-8 text-center text-xs text-slate-400">
              Cargando módulo DCSA...
            </div>
          }
        >
          {vm.activeTab === "CUTOFF_RADAR" && (
            <BookingCutoffRadarTab
              activeBooking={vm.activeBooking}
              allBookings={vm.allBookings}
              cutOffEval={vm.cutOffEval}
              searchTerm={vm.searchTerm}
              setSearchTerm={vm.setSearchTerm}
              onSelectBooking={(bkg: any) => vm.setActiveBooking(bkg)}
              onNavigateTab={(tab: any) => vm.setActiveTab(tab)}
            />
          )}

          {vm.activeTab === "SI_STUDIO" && (
            <BookingSiStudioTab
              activeBooking={vm.activeBooking}
              oceanBookingDetail={vm.oceanBookingDetail}
              dcsaAiAudit={vm.dcsaAiAudit}
              setDcsaAiAudit={vm.setDcsaAiAudit}
              isCheckingDcsaAi={vm.isCheckingDcsaAi}
              onRunDcsaCustomsCheck={vm.handleRunDcsaCustomsCheck}
              extractedDocAi={vm.extractedDocAi}
              setExtractedDocAi={vm.setExtractedDocAi}
              isExtractingDocAi={vm.isExtractingDocAi}
              onRunMultimodalExtract={vm.handleRunMultimodalExtract}
              onConfirmDcsSi={vm.handleConfirmDcsSi}
              isSubmittingDcsSi={vm.submitDcsSiMutation.isPending}
              onGenerateOfficialDraftBl={vm.handleGenerateOfficialDraftBl}
              isGeneratingDraftBl={vm.generateDraftBlMutation.isPending}
              onDownloadDraftBL={vm.handleDownloadDraftBL}
              copiedEdi={vm.copiedEdi}
              onCopyEdi={vm.handleCopyEdi}
            />
          )}

          {vm.activeTab === "EQUIPMENT_RELEASE" && (
            <BookingEquipmentReleaseTab
              activeBooking={vm.activeBooking}
              onDownloadDepotPass={vm.handleDownloadDepotPass}
              onOpenDrayageModal={(bookingRef: any) => {
                vm.setDrayageBookingRef(bookingRef);
                vm.setIsDrayageModalOpen(true);
              }}
              onGenerateRelease={(payload: any) => {
                vm.releaseMutation.mutate(payload);
              }}
              isReleasePending={vm.releaseMutation.isPending}
            />
          )}

          {vm.confirmingBooking && (
            <BookingConfirmModal
              confirmingBooking={vm.confirmingBooking}
              onClose={() => vm.setConfirmingBooking(null)}
              confirmForm={vm.confirmForm}
              setConfirmForm={vm.setConfirmForm}
              onSubmit={vm.handleConfirmBookingSubmit}
              isSubmitting={vm.isConfirmSubmitting}
              onOpenDrayage={vm.handleOpenDrayage}
            />
          )}

          {vm.showNewBookingModal && (
            <NewBookingRequestModal
              isOpen={vm.showNewBookingModal}
              onClose={() => vm.setShowNewBookingModal(false)}
              newBookingForm={vm.newBookingForm}
              setNewBookingForm={vm.setNewBookingForm}
              onSubmit={vm.handleCreateNewBooking}
            />
          )}
        </Suspense>

        <DrayageCalculatorModal
          isOpen={vm.isDrayageModalOpen}
          onClose={() => {
            vm.setIsDrayageModalOpen(false);
            vm.setSelectedDrayageOriginId(undefined);
            vm.setDrayageBookingRef(undefined);
            vm.setDrayageContainerNum(undefined);
          }}
          preSelectedOriginId={vm.selectedDrayageOriginId}
          bookingReference={vm.drayageBookingRef}
          containerNumber={vm.drayageContainerNum}
        />
      </div>
    </div>
  );
}
