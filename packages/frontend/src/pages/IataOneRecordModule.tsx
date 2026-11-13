/**
 * @file IataOneRecordModule.tsx
 * @description Orchestrator for the IATA ONE Record Hub, Cargo iQ SLA Milestones, e-DGD Dangerous Goods Studio, and e-AWB Digital Pouch.
 * @module @atlas/frontend/pages/IataOneRecordModule
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import {
  Header,
  JsonLdExplorer,
  CargoIqTimeline,
  EdgdStudio,
  EawbDigitalPouch,
  useIataOneRecord,
} from "../components/IataOneRecord";

export default function IataOneRecordModule() {
  const {
    activeTab,
    setActiveTab,
    waybills,
    selectedWaybillId,
    setSelectedWaybillId,
    selectedWaybill,
    milestones,
    copiedJson,
    eventCode,
    setEventCode,
    eventRemarks,
    setEventRemarks,
    milestoneFeedback,
    dgItem,
    setDgItem,
    dgdFeedback,
    liveDgValidation,
    copyJsonLd,
    handleRecordMilestoneEvent,
    handleDownloadEawbPDF,
    handleDownloadEdgdPDF,
  } = useIataOneRecord();

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <Header
        waybills={waybills}
        selectedWaybillId={selectedWaybillId}
        setSelectedWaybillId={setSelectedWaybillId}
        selectedWaybill={selectedWaybill}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onDownloadEawbPDF={handleDownloadEawbPDF}
      />

      {activeTab === "JSON_LD_EXPLORER" && (
        <JsonLdExplorer
          selectedWaybill={selectedWaybill}
          copiedJson={copiedJson}
          onCopyJsonLd={copyJsonLd}
        />
      )}

      {activeTab === "CARGO_IQ_TIMELINE" && (
        <CargoIqTimeline
          selectedWaybill={selectedWaybill}
          milestones={milestones}
          eventCode={eventCode}
          setEventCode={setEventCode}
          eventRemarks={eventRemarks}
          setEventRemarks={setEventRemarks}
          milestoneFeedback={milestoneFeedback}
          onRecordMilestoneEvent={handleRecordMilestoneEvent}
        />
      )}

      {activeTab === "EDGD_STUDIO" && (
        <EdgdStudio
          dgItem={dgItem}
          setDgItem={setDgItem}
          dgdFeedback={dgdFeedback}
          liveDgValidation={liveDgValidation}
          onDownloadEdgdPDF={handleDownloadEdgdPDF}
        />
      )}

      {activeTab === "EAWB_DIGITAL_POUCH" && (
        <EawbDigitalPouch
          selectedWaybill={selectedWaybill}
          onDownloadEawbPDF={handleDownloadEawbPDF}
        />
      )}
    </div>
  );
}
