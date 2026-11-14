/**
 * @file useAeoSecurity.ts
 * @description Hook managing AEO/OEA certifications, 7-point inspection simulations, and ISO 28000 partner screenings.
 * @module @atlas/frontend/components/AeoSecurity/hooks
 */

import { useState } from "react";
import { useApiQuery } from "../../../hooks/useApiQuery";
import { AeoTabKey } from "../types/index";

export function useAeoSecurity() {
  const [activeTab, setActiveTab] = useState<AeoTabKey>("CAE_AUDITS");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAudit, setSelectedAudit] = useState<any>(null);

  // 7-Point Inspection Simulator State
  const [inspEquipId, setInspEquipId] = useState("MSKU-782910-3");
  const [inspEquipType, setInspEquipType] = useState("OCEAN_CONTAINER");
  const [inspInspector, setInspInspector] = useState("Marc Vilanova");
  const [inspLocation, setInspLocation] = useState(
    "Terminal BEST Muelle Prat BCN",
  );
  const [p1, setP1] = useState(true);
  const [p2, setP2] = useState(true);
  const [p3, setP3] = useState(true);
  const [p4, setP4] = useState(true);
  const [p5, setP5] = useState(true);
  const [p6, setP6] = useState(true);
  const [p7, setP7] = useState(true);
  const [hasAgri, setHasAgri] = useState(false);
  const [hasTamper, setHasTamper] = useState(false);
  const [inspectionSimResult, setInspectionSimResult] = useState<any>(null);

  // Partner Risk Screening Simulator State
  const [partnerName, setPartnerName] = useState(
    "Trans-Iberia Logistics Express SA",
  );
  const [partnerType, setPartnerType] = useState("HAULIER_CARRIER");
  const [hasAeo, setHasAeo] = useState(true);
  const [hasCtpat, setHasCtpat] = useState(true);
  const [hasIso28000, setHasIso28000] = useState(true);
  const [partnerScore, setPartnerScore] = useState(95);
  const [monthsAudit, setMonthsAudit] = useState(6);
  const [screeningResult, setScreeningResult] = useState<any>(null);

  // Fetch Audits
  const { data: auditsResponse, isLoading: loadingAudits } = useApiQuery<any>(
    ["aeo-audits"],
    `/aeo-security/audits`,
  );
  const audits = auditsResponse?.data || [];

  // Fetch Inspections
  const { data: inspectionsResponse } = useApiQuery<any>(
    ["aeo-inspections"],
    `/aeo-security/inspections`,
  );
  const inspections = inspectionsResponse?.data || [];

  // Fetch Seals
  const { data: sealsResponse } = useApiQuery<any>(
    ["aeo-seals"],
    `/aeo-security/seals`,
  );
  const seals = sealsResponse?.data || [];

  // Fetch Partners
  const { data: partnersResponse } = useApiQuery<any>(
    ["aeo-partners"],
    `/aeo-security/partners`,
  );
  const partners = partnersResponse?.data || [];

  const handleSimulateInspection = async () => {
    try {
      const res = await fetch("/api/aeo-security/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipmentType: inspEquipType,
          equipmentIdentifier: inspEquipId,
          inspectorName: inspInspector,
          facilityLocation: inspLocation,
          p1FrontWallPassed: p1,
          p2LeftSidePassed: p2,
          p3RightSidePassed: p3,
          p4FloorPassed: p4,
          p5RoofCeilingPassed: p5,
          p6DoorsLocksPassed: p6,
          p7UndercarriagePassed: p7,
          hasAgriculturalContamination: hasAgri,
          physicalTamperingDetected: hasTamper,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setInspectionSimResult(data.evaluation);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateScreening = async () => {
    try {
      const res = await fetch("/api/aeo-security/partners/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerName,
          partnerType,
          hasAeoCertification: hasAeo,
          hasCtpatCertification: hasCtpat,
          iso28000Certified: hasIso28000,
          securityQuestionnaireScore: partnerScore,
          monthsSinceLastAssessment: monthsAudit,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setScreeningResult(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredAudits = audits.filter(
    (a: any) =>
      a.auditReference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.leadAuditorName?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    selectedAudit,
    setSelectedAudit,
    loadingAudits,
    filteredAudits,
    audits,
    inspections,
    seals,
    partners,
    // 7-point form
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
    // Partner screening form
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
  };
}
