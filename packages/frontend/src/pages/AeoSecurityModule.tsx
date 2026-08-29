import { useState } from "react";
import { motion, Variants } from "framer-motion";
import {
  ShieldCheck,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Truck,
  Building2,
  Lock,
  FileText,
  ClipboardList,
} from "lucide-react";
import { useApiQuery } from "../hooks/useApiQuery";
import { Input } from "@atlas/ui";

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
  const [activeTab, setActiveTab] = useState<
    "CAE_AUDITS" | "SEVEN_POINT_SEALS" | "PARTNERS_RISK"
  >("CAE_AUDITS");
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
      a.auditReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.leadAuditorName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-12"
    >
      {/* Top Banner */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-sky-950 to-blue-900 p-6 rounded-2xl border border-sky-800/40 shadow-xl shadow-sky-950/20 text-white"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 border border-sky-400/30 rounded-xl text-sky-300">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Operador Económico Autorizado (OEA / AEO) & Seguridad
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 font-medium">
                  CAU Art. 38-39 / C-TPAT / ISO 28000
                </span>
              </h1>
              <p className="text-sm text-slate-300">
                Auditoría continua CAE (AEAT / DG TAXUD), protocolo de
                inspección en 7 puntos, precintos ISO 17712 y homologación de
                cadena logística
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/api/aeo-security/partners/risk-matrix-pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-lg shadow-teal-900/30 transition-all border border-teal-400/30"
          >
            <Download className="w-4 h-4" />
            Matriz de Riesgo Socios PDF
          </a>
        </div>
      </motion.div>

      {/* Top KPI Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Score Global OEA (% CAE)
            </span>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              94.5%
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Estatuto OEAF Plenamente Acreditado
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Inspecciones 7 Puntos
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {inspections.length} Unidades
            </div>
            <p className="text-xs text-sky-600 dark:text-sky-400 mt-1 flex items-center gap-1 font-medium">
              C-TPAT / OEAS Protocolo Activo
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Precintos ISO 17712 (Clase H)
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {seals.length} Precintos
            </div>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 flex items-center gap-1 font-medium">
              100% Mecánicos de Alta Seguridad
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Socios Homologados ISO 28000
            </span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {partners.length} Socios
            </div>
            <p className="text-xs text-teal-600 dark:text-teal-400 mt-1 flex items-center gap-1 font-medium">
              Cadena de Custodia Segura
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tabs Navigation */}
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2"
      >
        <button
          onClick={() => setActiveTab("CAE_AUDITS")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "CAE_AUDITS"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <FileText className="w-4 h-4" />
          Auditoría OEA & Cuestionario CAE (6 Bloques)
        </button>

        <button
          onClick={() => setActiveTab("SEVEN_POINT_SEALS")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "SEVEN_POINT_SEALS"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Lock className="w-4 h-4" />
          Inspección en 7 Puntos & Precintos ISO 17712
        </button>

        <button
          onClick={() => setActiveTab("PARTNERS_RISK")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "PARTNERS_RISK"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Truck className="w-4 h-4" />
          Homologación de Socios & Riesgo ISO 28000
        </button>
      </motion.div>

      {/* TAB 1: CAE AUDITS */}
      {activeTab === "CAE_AUDITS" && (
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por referencia de auditoría o auditor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {loadingAudits ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Cargando expedientes de auditoría OEA...
                </div>
              ) : filteredAudits.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No se encontraron auditorías con los criterios indicados.
                </div>
              ) : (
                filteredAudits.map((audit: any) => (
                  <div
                    key={audit.id}
                    onClick={() => setSelectedAudit(audit)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                      selectedAudit?.id === audit.id
                        ? "bg-sky-50/50 dark:bg-sky-950/20 border-sky-500 dark:border-sky-500/50 shadow-md"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold text-xs">
                          {audit.aeoModality.split("_")[0]}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {audit.auditReference}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {audit.leadAuditorName} • Fecha: {audit.auditDate}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-bold text-sky-600 dark:text-sky-400">
                          {audit.overallReadinessScore}%
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            audit.complianceStatus === "CERTIFIED_APPROVED"
                              ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                              : audit.complianceStatus === "AUDIT_READY"
                                ? "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
                                : "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {audit.complianceStatus}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                      <span>Estándar: {audit.targetStandard}</span>
                      <a
                        href={`/api/aeo-security/audits/${audit.id}/cae-report-pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-sky-600 hover:text-sky-700 font-medium"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Dossier CAE PDF
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Audit Detail Panel */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-sky-500" />
                Desglose CAE por Bloques CAU Art. 39
              </h3>

              {selectedAudit ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Expediente:</span>
                      <span className="font-semibold">
                        {selectedAudit.auditReference}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Certificado OEA:</span>
                      <span className="font-semibold text-emerald-600">
                        {selectedAudit.aeoOfficialCertificateNumber ||
                          "En Tramitación"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        Próxima Reevaluación:
                      </span>
                      <span className="font-semibold">
                        {selectedAudit.nextReviewDate}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[
                      { name: "B1: Información General", score: 100, ok: true },
                      {
                        name: "B2: Cumplimiento Aduanero (Art. 39a)",
                        score: selectedAudit.customsComplianceScore,
                        ok: selectedAudit.customsComplianceScore >= 90,
                      },
                      {
                        name: "B3: Registros Comerciales (Art. 39b)",
                        score: selectedAudit.commercialRecordsScore,
                        ok: selectedAudit.commercialRecordsScore >= 85,
                      },
                      {
                        name: "B4: Solvencia Financiera (Art. 39c)",
                        score: selectedAudit.financialSolvencyScore,
                        ok: selectedAudit.financialSolvencyScore >= 80,
                      },
                      {
                        name: "B5: Cualificación Profesional (Art. 39d)",
                        score: selectedAudit.competenceScore,
                        ok: selectedAudit.competenceScore >= 80,
                      },
                      {
                        name: "B6: Seguridad & Protección (Art. 39e)",
                        score: selectedAudit.securitySafetyScore,
                        ok: selectedAudit.securitySafetyScore >= 85,
                      },
                    ].map((b, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 text-xs"
                      >
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {b.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sky-600 dark:text-sky-400">
                            {b.score}%
                          </span>
                          {b.ok ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <a
                      href={`/api/aeo-security/audits/${selectedAudit.id}/cae-report-pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/20 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Descargar Informe Oficial CAE PDF
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500">
                  Selecciona una auditoría del listado para ver su desglose
                  oficial de bloques.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 2: SEVEN POINT INSPECTIONS & SEALS */}
      {activeTab === "SEVEN_POINT_SEALS" && (
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 7-Point Simulator */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-sky-500" />
                Registrar Inspección en 7 Puntos (C-TPAT / OEAS)
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-500 block mb-1 font-medium">
                    Identificador de Unidad (Contenedor / Semirremolque)
                  </label>
                  <Input
                    value={inspEquipId}
                    onChange={(e) => setInspEquipId(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-500 block mb-1 font-medium">
                      Tipo Unidad
                    </label>
                    <select
                      value={inspEquipType}
                      onChange={(e) => setInspEquipType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <option value="OCEAN_CONTAINER">
                        Contenedor Marítimo
                      </option>
                      <option value="ROAD_TRAILER">
                        Semirremolque Carretera
                      </option>
                      <option value="REEFER_BOX">Contenedor Frigorífico</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1 font-medium">
                      Inspector
                    </label>
                    <Input
                      value={inspInspector}
                      onChange={(e) => setInspInspector(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 block mb-1 font-medium">
                    Instalación / Muelle
                  </label>
                  <Input
                    value={inspLocation}
                    onChange={(e) => setInspLocation(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                    Checklist de los 7 Puntos Obligatorios:
                  </span>

                  {[
                    {
                      label: "P1: Pared Frontal / Mamparo",
                      val: p1,
                      set: setP1,
                    },
                    { label: "P2: Lateral Izquierdo", val: p2, set: setP2 },
                    { label: "P3: Lateral Derecho", val: p3, set: setP3 },
                    { label: "P4: Suelo & Travesaños", val: p4, set: setP4 },
                    {
                      label: "P5: Techo & Estructura Superior",
                      val: p5,
                      set: setP5,
                    },
                    {
                      label: "P6: Puertas, Bisagras & Cierres",
                      val: p6,
                      set: setP6,
                    },
                    {
                      label: "P7: Tren de Rodaje & Chasis",
                      val: p7,
                      set: setP7,
                    },
                  ].map((pt, idx) => (
                    <label
                      key={idx}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={pt.val}
                        onChange={(e) => pt.set(e.target.checked)}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      <span className="text-slate-600 dark:text-slate-400">
                        {pt.label}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                    Alertas Críticas:
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasAgri}
                      onChange={(e) => setHasAgri(e.target.checked)}
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-red-600 dark:text-red-400">
                      Contaminación Agrícola / Plagas (WDO)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasTamper}
                      onChange={(e) => setHasTamper(e.target.checked)}
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-red-600 dark:text-red-400">
                      Manipulación Física / Doble Fondo
                    </span>
                  </label>
                </div>

                <button
                  onClick={handleSimulateInspection}
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-md shadow-sky-600/20 transition-all text-xs"
                >
                  Evaluar & Guardar Inspección
                </button>

                {inspectionSimResult && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-2 border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Resultado:</span>
                      <span
                        className={`font-bold ${
                          inspectionSimResult.overallPassed
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {inspectionSimResult.inspectionResult}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      {inspectionSimResult.actionRequired}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Inspections and Seals Lists */}
            <div className="lg:col-span-2 space-y-6">
              {/* Inspections Table */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-sky-500" />
                  Registro de Inspecciones en 7 Puntos Realizadas
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                        <th className="pb-2">Referencia</th>
                        <th className="pb-2">Unidad</th>
                        <th className="pb-2">Inspector</th>
                        <th className="pb-2">Resultado</th>
                        <th className="pb-2 text-right">Certificado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {inspections.map((insp: any) => (
                        <tr
                          key={insp.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                        >
                          <td className="py-2.5 font-semibold">
                            {insp.inspectionReference}
                          </td>
                          <td className="py-2.5">{insp.equipmentIdentifier}</td>
                          <td className="py-2.5">{insp.inspectorName}</td>
                          <td className="py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                insp.overallPassed
                                  ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                                  : "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300"
                              }`}
                            >
                              {insp.inspectionResult}
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            <a
                              href={`/api/aeo-security/inspections/${insp.id}/seven-point-pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sky-600 hover:text-sky-700 inline-flex items-center gap-1 font-medium"
                            >
                              <Download className="w-3.5 h-3.5" /> PDF
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Seals Table */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-500" />
                  Libro Registro de Precintos ISO 17712 (Clase 'H')
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                        <th className="pb-2">Nº Precinto</th>
                        <th className="pb-2">Tipo</th>
                        <th className="pb-2">Unidad Asignada</th>
                        <th className="pb-2">Estado</th>
                        <th className="pb-2 text-right">Custodia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {seals.map((seal: any) => (
                        <tr
                          key={seal.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                        >
                          <td className="py-2.5 font-bold text-indigo-600 dark:text-indigo-400">
                            {seal.sealNumber}
                          </td>
                          <td className="py-2.5">
                            {seal.sealType.replace(/_/g, " ")}
                          </td>
                          <td className="py-2.5">
                            {seal.associatedEquipmentIdentifier || "En Stock"}
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                seal.sealStatus === "VERIFIED_INTACT" ||
                                seal.sealStatus === "AFFIXED_TRANSIT"
                                  ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                                  : seal.sealStatus === "TAMPERED_BROKEN"
                                    ? "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              {seal.sealStatus}
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            <a
                              href={`/api/aeo-security/seals/${seal.id}/custody-pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 font-medium"
                            >
                              <Download className="w-3.5 h-3.5" /> PDF
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 3: PARTNERS RISK SCREENING */}
      {activeTab === "PARTNERS_RISK" && (
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Screening Simulator */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-500" />
                Cribado & Evaluación de Riesgo de Proveedor (ISO 28000)
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-500 block mb-1 font-medium">
                    Nombre de la Empresa
                  </label>
                  <Input
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-500 block mb-1 font-medium">
                    Tipo de Actividad
                  </label>
                  <select
                    value={partnerType}
                    onChange={(e) => setPartnerType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    <option value="HAULIER_CARRIER">
                      Transportista por Carretera
                    </option>
                    <option value="CUSTOMS_BROKER">Agencia de Aduanas</option>
                    <option value="WAREHOUSE_KEEPER">
                      Operador de Almacén
                    </option>
                    <option value="SUPPLIER_PACKER">
                      Empacador / Proveedor
                    </option>
                  </select>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                    Acreditaciones de Seguridad:
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasAeo}
                      onChange={(e) => setHasAeo(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span>Certificado OEA (AEOF / AEOS / AEOC) (+35 pts)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasCtpat}
                      onChange={(e) => setHasCtpat(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span>Certificación US C-TPAT (+15 pts)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasIso28000}
                      onChange={(e) => setHasIso28000(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span>Norma ISO 28000 Cadena de Suministro (+10 pts)</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="text-slate-500 block mb-1 font-medium">
                      Score Cuestionario (%)
                    </label>
                    <Input
                      type="number"
                      value={partnerScore}
                      onChange={(e) => setPartnerScore(Number(e.target.value))}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1 font-medium">
                      Meses desde Auditoría
                    </label>
                    <Input
                      type="number"
                      value={monthsAudit}
                      onChange={(e) => setMonthsAudit(Number(e.target.value))}
                      className="text-xs"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSimulateScreening}
                  className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold shadow-md shadow-teal-600/20 transition-all text-xs"
                >
                  Calcular Nivel de Riesgo & Homologación
                </button>

                {screeningResult && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-2 border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">
                        Puntuación Calculada:
                      </span>
                      <span className="font-bold text-teal-600">
                        {screeningResult.calculatedRiskScore} / 100
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Nivel de Riesgo:</span>
                      <span
                        className={`font-bold ${
                          screeningResult.riskLevel === "LOW_RISK"
                            ? "text-emerald-600"
                            : screeningResult.riskLevel === "MEDIUM_RISK"
                              ? "text-amber-600"
                              : "text-red-600"
                        }`}
                      >
                        {screeningResult.riskLevel}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Estado:</span>
                      <span className="font-semibold">
                        {screeningResult.recommendedStatus}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Partners Master Table */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-500" />
                  Censo de Socios Comerciales & Cadena de Custodia
                </h3>
                <a
                  href="/api/aeo-security/partners/risk-matrix-pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar Matriz PDF
                </a>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                      <th className="pb-2">Empresa</th>
                      <th className="pb-2">Tipo</th>
                      <th className="pb-2">Acreditación OEA</th>
                      <th className="pb-2">Puntuación</th>
                      <th className="pb-2">Riesgo</th>
                      <th className="pb-2 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {partners.map((p: any) => (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                      >
                        <td className="py-2.5 font-semibold">
                          {p.partnerName}
                        </td>
                        <td className="py-2.5">
                          {p.partnerType.replace(/_/g, " ")}
                        </td>
                        <td className="py-2.5">
                          {p.hasAeoCertification ? (
                            <span className="text-emerald-600 font-medium">
                              {p.aeoCertificateNumber || "Sí"}
                            </span>
                          ) : (
                            <span className="text-slate-400">No OEA</span>
                          )}
                        </td>
                        <td className="py-2.5 font-bold text-teal-600">
                          {p.securityQuestionnaireScore}%
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              p.riskLevel === "LOW_RISK"
                                ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                                : p.riskLevel === "MEDIUM_RISK"
                                  ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300"
                                  : "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300"
                            }`}
                          >
                            {p.riskLevel}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-medium">
                          {p.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
