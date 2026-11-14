/**
 * @file BulkOperationsModule.tsx
 * @description Maritime bulk terminal operations, draft surveys, and regulatory calculations module.
 * @module @atlas/frontend/pages
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import {
  useBulkOperations,
  Header,
  DraftSurveyTab,
  ImsbcGrainTab,
  TankerUllage,
} from "../components/BulkOperations";

export default function BulkOperationsModule() {
  const {
    activeTab,
    setActiveTab,
    vesselOps,
    selectedOp,
    setSelectedOp,
    draftInputs,
    setDraftInputs,
    imsbcGrainInputs,
    setImsbcGrainInputs,
    ullageInputs,
    setUllageInputs,
    draftCalculations,
    imsbcCalculations,
    grainCalculations,
    ullageCalculations,
  } = useBulkOperations();

  return (
    <div className="space-y-6">
      <Header
        vesselOps={vesselOps}
        selectedOp={selectedOp}
        onSelectOp={setSelectedOp}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === "draft_survey" && (
        <DraftSurveyTab
          selectedOp={selectedOp}
          draftInputs={draftInputs}
          setDraftInputs={setDraftInputs}
          calculations={draftCalculations}
        />
      )}

      {activeTab === "imsbc_grain" && (
        <ImsbcGrainTab
          inputs={imsbcGrainInputs}
          setInputs={setImsbcGrainInputs}
          imsbcCalculations={imsbcCalculations}
          grainCalculations={grainCalculations}
        />
      )}

      {activeTab === "tanker_ullage" && (
        <TankerUllage
          ullageInputs={ullageInputs}
          setUllageInputs={setUllageInputs}
          gov={ullageCalculations.gov}
          vcf={ullageCalculations.vcf}
          gsv={ullageCalculations.gsv}
          massAir={ullageCalculations.massAir}
        />
      )}
    </div>
  );
}
