/**
 * @file AeoSecurityModule.tsx
 * @description Authorized Economic Operator (AEO/OEA) compliance, 7-point inspections, and partner risk module.
 * @module @atlas/frontend/pages
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import { motion, Variants } from "framer-motion";
import {
  useAeoSecurity,
  Header,
  CaeAudits,
  SevenPointSeals,
  PartnersRisk,
} from "../components/AeoSecurity";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
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

export default function AeoSecurityModule() {
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    selectedAudit,
    setSelectedAudit,
    loadingAudits,
    filteredAudits,
    inspections,
    seals,
    partners,
    inspEquipId,
    setInspEquipId,
    inspEquipType,
    setInspEquipType,
    inspInspector,
    setInspInspector,
    inspLocation,
    setInspLocation,
    p1,
    setP1,
    p2,
    setP2,
    p3,
    setP3,
    p4,
    setP4,
    p5,
    setP5,
    p6,
    setP6,
    p7,
    setP7,
    hasAgri,
    setHasAgri,
    hasTamper,
    setHasTamper,
    inspectionSimResult,
    handleSimulateInspection,
    partnerName,
    setPartnerName,
    partnerType,
    setPartnerType,
    hasAeo,
    setHasAeo,
    hasCtpat,
    setHasCtpat,
    hasIso28000,
    setHasIso28000,
    partnerScore,
    setPartnerScore,
    monthsAudit,
    setMonthsAudit,
    screeningResult,
    handleSimulateScreening,
  } = useAeoSecurity();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-12"
    >
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        inspectionsCount={inspections.length}
        sealsCount={seals.length}
        partnersCount={partners.length}
        itemVariants={itemVariants}
      />

      {activeTab === "CAE_AUDITS" && (
        <CaeAudits
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          loadingAudits={loadingAudits}
          filteredAudits={filteredAudits}
          selectedAudit={selectedAudit}
          onSelectAudit={setSelectedAudit}
          itemVariants={itemVariants}
        />
      )}

      {activeTab === "SEVEN_POINT_SEALS" && (
        <SevenPointSeals
          inspEquipId={inspEquipId}
          setInspEquipId={setInspEquipId}
          inspEquipType={inspEquipType}
          setInspEquipType={setInspEquipType}
          inspInspector={inspInspector}
          setInspInspector={setInspInspector}
          inspLocation={inspLocation}
          setInspLocation={setInspLocation}
          p1={p1}
          setP1={setP1}
          p2={p2}
          setP2={setP2}
          p3={p3}
          setP3={setP3}
          p4={p4}
          setP4={setP4}
          p5={p5}
          setP5={setP5}
          p6={p6}
          setP6={setP6}
          p7={p7}
          setP7={setP7}
          hasAgri={hasAgri}
          setHasAgri={setHasAgri}
          hasTamper={hasTamper}
          setHasTamper={setHasTamper}
          inspectionSimResult={inspectionSimResult}
          onSimulateInspection={handleSimulateInspection}
          inspections={inspections}
          seals={seals}
          itemVariants={itemVariants}
        />
      )}

      {activeTab === "PARTNERS_RISK" && (
        <PartnersRisk
          partnerName={partnerName}
          setPartnerName={setPartnerName}
          partnerType={partnerType}
          setPartnerType={setPartnerType}
          hasAeo={hasAeo}
          setHasAeo={setHasAeo}
          hasCtpat={hasCtpat}
          setHasCtpat={setHasCtpat}
          hasIso28000={hasIso28000}
          setHasIso28000={setHasIso28000}
          partnerScore={partnerScore}
          setPartnerScore={setPartnerScore}
          monthsAudit={monthsAudit}
          setMonthsAudit={setMonthsAudit}
          screeningResult={screeningResult}
          onSimulateScreening={handleSimulateScreening}
          partners={partners}
          itemVariants={itemVariants}
        />
      )}
    </motion.div>
  );
}
