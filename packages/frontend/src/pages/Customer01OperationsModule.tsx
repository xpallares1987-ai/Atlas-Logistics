import { useState, useMemo } from "react";
import {
  Train,
  Truck,
  ShieldCheck,
  AlertTriangle,
  Scale,
  CheckCircle2,
  Box,
  FileText,
  UserCheck,
  ShieldAlert,
  Sparkles,
  Download,
  Info,
  Check,
} from "lucide-react";
import { Button } from "@atlas/ui";
import {
  SEED_CUSTOMER01_ALBARANES,
  SEED_CUSTOMER01_COILS,
  SEED_CUSTOMER01_EXCEPTIONS,
  CUSTOMER01_OFFICIAL_ROLES,
  CUSTOMER01_CORRIDOR_CODE,
  ISO_40HC_PAYLOAD_LIMIT_KG,
  calculateAxleLoadsAndHeatmap,
  detectCustomer01Vehicle,
  verifyCustomer01ContainerStowage,
  validateCustomer01RoleAssignment,
  type Customer01Albaran,
  type Customer01Coil,
  type Customer01Exception,
  type Customer01Warehouse,
  type Customer01StowageResult,
} from "@atlas/shared";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type TabKey =
  "ALBARANES_INGEST" | "STOWAGE_40HC" | "DOCK_EXCEPTIONS" | "GOVERNANCE_ROLES";

export default function Customer01OperationsModule() {
  const [activeTab, setActiveTab] = useState<TabKey>("ALBARANES_INGEST");
  const [albaranes, setAlbaranes] = useState<Customer01Albaran[]>(
    SEED_CUSTOMER01_ALBARANES,
  );
  const [exceptions, setExceptions] = useState<Customer01Exception[]>(
    SEED_CUSTOMER01_EXCEPTIONS,
  );
  const [coils, setCoils] = useState<Customer01Coil[]>(SEED_CUSTOMER01_COILS);

  // New Albaran Form State
  const [newAlbaranNumber, setNewAlbaranNumber] = useState("ALB-TEST01-NEW");
  const [newWarehouse, setNewWarehouse] =
    useState<Customer01Warehouse>("CANTUNIS");
  const [newVehicleId, setNewVehicleId] = useState("31 71 4556 500-8");
  const [newFactory, setNewFactory] = useState("Plant North");
  const [albaranSuccessMsg, setAlbaranSuccessMsg] = useState("");

  // 40' HC Stowage & Payload state
  const payloadLimit = ISO_40HC_PAYLOAD_LIMIT_KG;
  const [stowageFeedback, setStowageFeedback] = useState("");

  // Exception Form State
  const [excWarehouse, setExcWarehouse] =
    useState<Customer01Warehouse>("CANTUNIS");
  const [excType, setExcType] = useState("RETRASO_FERROVIARIO");
  const [excSeverity, setExcSeverity] = useState("MEDIUM");
  const [excDescription, setExcDescription] = useState(
    "Retraso en vía de maniobra Morrot.",
  );
  const [excRole, setExcRole] = useState<"ADMIN" | "TEST01">("TEST01");
  const [excReporterName, setExcReporterName] = useState("Operator Lead");
  const [excFeedback, setExcFeedback] = useState("");

  // Governance Validator State
  const [testRoleCode, setTestRoleCode] = useState("TEST01");
  const [testPersonName, setTestPersonName] = useState("Operator Lead");
  const [governanceVerdict, setGovernanceVerdict] = useState<{
    allowed: boolean;
    reason?: string;
  } | null>(null);

  // Live Vehicle Detection Preview
  const liveVehicleDetection = useMemo(() => {
    try {
      return detectCustomer01Vehicle(newWarehouse, newVehicleId || "UNKNOWN");
    } catch (err: any) {
      return {
        warehouse: newWarehouse,
        vehicleIdentifier: newVehicleId,
        transportMode: "CAMION_LONA" as const,
        isRail: false,
        co2eFactorKgPerTonKm: 0.078,
        co2eSavingsPercent: 0,
        description: err.message,
      };
    }
  }, [newWarehouse, newVehicleId]);

  // Live Stowage Evaluation
  const stowageResult: Customer01StowageResult = useMemo(() => {
    return verifyCustomer01ContainerStowage(coils, payloadLimit);
  }, [coils, payloadLimit]);

  // Live Axle Load & Heatmap Evaluation
  const axleResult = useMemo(() => {
    const inputs = coils.map((c) => ({
      coilId: c.coilId,
      weightKg: c.grossWeightKg,
      xPositionM: c.xPositionM ?? 6.016,
      yPositionM: c.yPositionM ?? 1.176,
    }));
    return calculateAxleLoadsAndHeatmap(inputs, false);
  }, [coils]);

  // Handle Albaran Ingestion
  const handleIngestAlbaran = () => {
    try {
      const detection = detectCustomer01Vehicle(newWarehouse, newVehicleId);
      const newCoils: Customer01Coil[] = [
        {
          coilId: `BOB-INGEST-${Date.now().toString().slice(-4)}`,
          paperGrade: "PRIMA 140",
          grossWeightKg: 2650,
          widthMm: 2400,
          diameterMm: 1250,
          factoryOrigin: newFactory,
          destinationWarehouse: newWarehouse,
        },
      ];

      const item: Customer01Albaran = {
        albaranId: `ALB-CUST01-${Date.now()}`,
        albaranNumber: newAlbaranNumber,
        factoryOrigin: newFactory,
        destinationWarehouse: newWarehouse,
        expeditionDate: new Date().toISOString(),
        vehicleIdentifier: newVehicleId.trim().toUpperCase(),
        vehicleDetection: detection,
        coils: newCoils,
        totalNetWeightKg: 2650,
        targetContainerNumber: "MSKU-881290-9",
        status: "UNLOADED_IN_STOCK",
      };

      setAlbaranes([item, ...albaranes]);
      setAlbaranSuccessMsg(
        `Albarán ${newAlbaranNumber} procesado e ingresado en stock correctamente.`,
      );
      setTimeout(() => setAlbaranSuccessMsg(""), 4000);
    } catch (err: any) {
      setAlbaranSuccessMsg(`Error: ${err.message}`);
      setTimeout(() => setAlbaranSuccessMsg(""), 5000);
    }
  };

  // Handle 2-Opt Rebalance Trigger
  const handleExecute2OptRebalance = () => {
    const displaced = coils.map((c, i) => ({
      ...c,
      xPositionM: i < 2 ? 1.5 : 8.5,
    }));
    setCoils(displaced);
    setStowageFeedback(
      "Algoritmo 2-opt ejecutado: columnas simétricas reordenadas.",
    );
    setTimeout(() => setStowageFeedback(""), 4000);
  };

  // Handle Exception Submission
  const handleReportException = () => {
    const val = validateCustomer01RoleAssignment(excRole, excReporterName);
    if (!val.allowed) {
      setExcFeedback(`Rechazado: ${val.reason}`);
      setTimeout(() => setExcFeedback(""), 5000);
      return;
    }

    const newExc: Customer01Exception = {
      exceptionId: `EXC-CUST01-${Date.now()}`,
      timestamp: new Date().toISOString(),
      warehouse: excWarehouse,
      exceptionType: excType as any,
      severity: excSeverity as any,
      description: excDescription,
      reportedByRole: excRole,
      reportedByName: excReporterName,
      resolved: false,
    };

    setExceptions([newExc, ...exceptions]);
    setExcFeedback(
      `Incidencia ${newExc.exceptionId} registrada en muelle exitosamente.`,
    );
    setTimeout(() => setExcFeedback(""), 4000);
  };

  // Handle Governance Test
  const handleCheckGovernance = () => {
    const res = validateCustomer01RoleAssignment(testRoleCode, testPersonName);
    setGovernanceVerdict(res);
  };

  // Download PDF Certificate
  const handleDownloadStowagePDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text("CERTIFICADO DE ESTIBA FÍSICA 40' HC · BOOK TEST01", 14, 15);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Corredor Oficial ${CUSTOMER01_CORRIDOR_CODE} · CTU Code / EN 12195 Baseline`,
      14,
      22,
    );

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(
      `ESTADO: ${stowageResult.longitudinalStatus} (${stowageResult.payloadUtilizationPercent}% Carga Legal)`,
      14,
      40,
    );

    const rows = [
      [
        "Límite Legal Carretera (PMA 44t)",
        `${stowageResult.containerPayloadLimitKg} kg`,
      ],
      ["Peso Total Bobinas", `${stowageResult.totalCoilsWeightKg} kg`],
      [
        "Falso Flete Cuantificado",
        `${stowageResult.falsoFleteKg} kg (€${stowageResult.falsoFleteEstimatedCostEur})`,
      ],
      [
        "Centro Geométrico (Xgeom / Ygeom)",
        `${stowageResult.geometricCenterM.x} m / ${stowageResult.geometricCenterM.y} m`,
      ],
      [
        "Centro de Gravedad Real (X / Y)",
        `${stowageResult.actualCenterOfGravityM.x} m / ${stowageResult.actualCenterOfGravityM.y} m`,
      ],
      [
        "Desviación Longitudinal |Δx|",
        `${stowageResult.deltaXMeters} m (Tolerancia <= 0.60 m)`,
      ],
      [
        "Desviación Transversal |Δy|",
        `${stowageResult.deltaYMeters} m (Tresbolillo <= 0.08 m)`,
      ],
      [
        "Rebalanceo 2-Opt Ejecutado",
        stowageResult.twoOptRebalanced
          ? `SÍ (${stowageResult.twoOptSwapsExecuted} swaps)`
          : "NO (Equilibrado)",
      ],
    ];

    autoTable(doc, {
      startY: 46,
      head: [["Parámetro Físico / Legal", "Valor Certificado"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 9 },
    });

    doc.save(`Certificado-Estiba-40HC-${CUSTOMER01_CORRIDOR_CODE}.pdf`);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">
                Corredor Oficial Book TEST01
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-slate-800 text-slate-300">
                {CUSTOMER01_CORRIDOR_CODE}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Customer01 Logistics Platform & Operations Engine
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Almacenes Externos (CANTUNIS · TLSA · BERRIO) · Estiba 40' HC
              (26.500 kg) · Gobernanza ADMIN / TEST01
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleDownloadStowagePDF}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Certificado Estiba PDF</span>
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pt-6 mt-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("ALBARANES_INGEST")}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 transition-all relative ${
              activeTab === "ALBARANES_INGEST"
                ? "text-emerald-400 border-b-2 border-emerald-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            Ingesta Albaranes
          </button>
          <button
            onClick={() => setActiveTab("STOWAGE_40HC")}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 transition-all relative ${
              activeTab === "STOWAGE_40HC"
                ? "text-blue-400 border-b-2 border-blue-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Scale className="w-4 h-4" />
            Estiba 40' HC & 2-Opt CoG
          </button>
          <button
            onClick={() => setActiveTab("DOCK_EXCEPTIONS")}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 transition-all relative ${
              activeTab === "DOCK_EXCEPTIONS"
                ? "text-amber-400 border-b-2 border-amber-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Incidencias de Muelle
          </button>
          <button
            onClick={() => setActiveTab("GOVERNANCE_ROLES")}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 transition-all relative ${
              activeTab === "GOVERNANCE_ROLES"
                ? "text-purple-400 border-b-2 border-purple-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Gobernanza & Auditoría
          </button>
        </div>
      </div>

      {/* TAB 1: INGESTA ALBARANES */}
      {activeTab === "ALBARANES_INGEST" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Form */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-xl space-y-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Registrar Albarán de Expedición
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Número de Albarán
                  </label>
                  <input
                    id="inputAlbaranNumber"
                    type="text"
                    value={newAlbaranNumber}
                    onChange={(e) => setNewAlbaranNumber(e.target.value)}
                    className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Almacén Externo Destino
                  </label>
                  <select
                    id="selectWarehouse"
                    value={newWarehouse}
                    onChange={(e) =>
                      setNewWarehouse(e.target.value as Customer01Warehouse)
                    }
                    className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="CANTUNIS">
                      CANTUNIS (Logistainer BCN - Tren & Camión)
                    </option>
                    <option value="TLSA">
                      TLSA (El Prat de Llobregat - Solo Camión)
                    </option>
                    <option value="BERRIO">
                      BERRIO (Massanassa, Valencia - Solo Camión)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Identificador de Vehículo (Vagón UIC o Matrícula)
                  </label>
                  <input
                    id="inputVehicleId"
                    type="text"
                    value={newVehicleId}
                    onChange={(e) => setNewVehicleId(e.target.value)}
                    placeholder="e.g. 31 71 4556 089-2 o 4821-LXZ"
                    className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Fábrica Origen
                  </label>
                  <input
                    type="text"
                    value={newFactory}
                    onChange={(e) => setNewFactory(e.target.value)}
                    className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Auto Detection Preview */}
                <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-lg space-y-1.5">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-400" />
                    Detección Automática de Vehículo & CO2e:
                  </span>
                  <div className="flex items-center gap-2">
                    {liveVehicleDetection.isRail ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        <Train className="w-3.5 h-3.5" /> Tren de Vagones UIC
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                        <Truck className="w-3.5 h-3.5" /> Camión-Lona Carretera
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {liveVehicleDetection.co2eSavingsPercent > 0
                        ? `Ahorro CO2e: ${liveVehicleDetection.co2eSavingsPercent}%`
                        : "Euro VI Standard"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {liveVehicleDetection.description}
                  </p>
                </div>

                <Button
                  id="btnSubmitAlbaran"
                  onClick={handleIngestAlbaran}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Ingresar Albarán Desacoplado
                </Button>

                {albaranSuccessMsg && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>{albaranSuccessMsg}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Ingested Albaranes Table */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Box className="w-4 h-4 text-emerald-400" />
                  Albaranes en Stock y Recepción (Corredor{" "}
                  {CUSTOMER01_CORRIDOR_CODE})
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {albaranes.length} expediciones registradas
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/70 text-xs uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Albarán</th>
                      <th className="p-3">Almacén Destino</th>
                      <th className="p-3">Vehículo & Modo</th>
                      <th className="p-3">Bobinas</th>
                      <th className="p-3">Peso Neto</th>
                      <th className="p-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {albaranes.map((alb) => (
                      <tr key={alb.albaranId} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono text-emerald-400 font-semibold">
                          {alb.albaranNumber}
                        </td>
                        <td className="p-3 font-medium text-white">
                          {alb.destinationWarehouse}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            {alb.vehicleDetection.isRail ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                                <Train className="w-3 h-3" /> Tren Eléctrico
                                (-76.9%)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                                <Truck className="w-3 h-3" /> Camión-Lona
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                            {alb.vehicleIdentifier}
                          </span>
                        </td>
                        <td className="p-3">{alb.coils.length} bobinas</td>
                        <td className="p-3 font-mono font-medium text-white">
                          {alb.totalNetWeightKg} kg
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300">
                            {alb.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ESTIBA 40' HC & 2-OPT */}
      {activeTab === "STOWAGE_40HC" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400 font-medium">
                Límite Legal Oficial (RD 2822/1998)
              </span>
              <p className="text-2xl font-bold text-white mt-1">
                {payloadLimit.toLocaleString()} kg
              </p>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="text-slate-400">Payload Utilizado:</span>
                <span className="text-emerald-400 font-bold">
                  {stowageResult.payloadUtilizationPercent}%
                </span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400 font-medium">
                Desviación Longitudinal |Δx|
              </span>
              <p className="text-2xl font-bold text-white mt-1">
                {stowageResult.deltaXMeters} m
              </p>
              <div className="mt-2 text-xs">
                {stowageResult.longitudinalStatus === "BALANCED" ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> BALANCED
                    (&le;0.60m)
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> DESVIADO
                    (&gt;0.60m)
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400 font-medium">
                Falso Flete Cuantificado
              </span>
              <p className="text-2xl font-bold text-white mt-1">
                {stowageResult.falsoFleteKg.toLocaleString()} kg
              </p>
              <span className="text-xs text-red-400 font-bold mt-2 block">
                Pérdida Estimada: €{stowageResult.falsoFleteEstimatedCostEur}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400 font-medium">
                Algoritmo 2-Opt Rebalancing
              </span>
              <p className="text-2xl font-bold text-white mt-1">
                {stowageResult.twoOptRebalanced ? "ACTIVADO" : "EN ESPERA"}
              </p>
              <span className="text-xs text-slate-400 mt-2 block">
                Trigger: |Δx| &gt; 0.35m
              </span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-400" />
                Simulador Dinámico de Distribución de Bobinas en Contenedor 40'
                HC
              </h3>
              <Button
                id="btnTrigger2Opt"
                onClick={handleExecute2OptRebalance}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simular Desequilibrio & Ejecutar 2-Opt</span>
              </Button>
            </div>

            {stowageFeedback && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-blue-400">
                {stowageFeedback}
              </div>
            )}

            {/* 5-Axle Kinematic Load Distribution */}
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Reparto Cinemático sobre Ejes del Vehículo (RD 2822/1998 · 44
                  t PMA)
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    axleResult.isFullyLegal
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  {axleResult.isFullyLegal
                    ? "VIALMENTE LEGAL"
                    : "INFRACCIÓN DE PESO"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {axleResult.axles.map((ax) => (
                  <div
                    key={ax.axleNumber}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold truncate">
                        {ax.name}
                      </span>
                      <p className="text-lg font-black text-white mt-1">
                        {ax.actualLoadKg.toLocaleString()}{" "}
                        <span className="text-xs font-normal text-slate-400">
                          kg
                        </span>
                      </p>
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>Máx: {ax.maxAllowedKg.toLocaleString()} kg</span>
                        <span
                          className={
                            ax.status === "OVERLOAD"
                              ? "text-rose-400 font-bold"
                              : "text-slate-400"
                          }
                        >
                          {ax.utilizationPercent}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            ax.status === "OVERLOAD"
                              ? "bg-rose-500"
                              : ax.status === "WARNING"
                                ? "bg-amber-400"
                                : "bg-emerald-500"
                          }`}
                          style={{
                            width: `${Math.min(100, ax.utilizationPercent)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 2D Floor Thermal Stress Heatmap */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">
                    Matriz de Estrés Dinámico del Suelo 40' HC (10 segmentos x 3
                    carriles)
                  </span>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-slate-800 border border-slate-700" />{" "}
                      Vacío (&lt;30%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600/70" />{" "}
                      Óptimo (30-75%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />{" "}
                      Elevado (75-100%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-rose-600" />{" "}
                      Crítico (&gt;100%)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-10 gap-1.5 p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                  {axleResult.heatmapGrid.map((column, colIdx) => (
                    <div key={colIdx} className="space-y-1.5">
                      {column.map((cell) => {
                        const bg =
                          cell.stressLevel === "CRITICAL"
                            ? "bg-rose-600 text-white"
                            : cell.stressLevel === "ELEVATED"
                              ? "bg-amber-500 text-slate-950 font-bold"
                              : cell.stressLevel === "OPTIMAL"
                                ? "bg-emerald-600/80 text-white"
                                : "bg-slate-800/80 text-slate-400";
                        return (
                          <div
                            key={`${cell.xIndex}-${cell.yIndex}`}
                            title={`Segmento ${cell.xRangeM[0]}m-${cell.xRangeM[1]}m: ${cell.weightKg} kg (${Math.round(cell.stressFactor * 100)}% estrés)`}
                            className={`h-9 rounded flex flex-col items-center justify-center text-[9px] font-mono transition-transform hover:scale-105 cursor-help ${bg}`}
                          >
                            <span>
                              {cell.weightKg > 0 ? `${cell.weightKg}k` : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono px-1">
                  <span>Frontal (Testero Kingpin)</span>
                  <span>Centro Geom. (6.016 m)</span>
                  <span>Puertas Posteriores (Trídem)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INCIDENCIAS DE MUELLE */}
      {activeTab === "DOCK_EXCEPTIONS" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-xl space-y-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Registrar Incidencia de Muelle
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Almacén
                  </label>
                  <select
                    value={excWarehouse}
                    onChange={(e) =>
                      setExcWarehouse(e.target.value as Customer01Warehouse)
                    }
                    className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="CANTUNIS">CANTUNIS</option>
                    <option value="TLSA">TLSA</option>
                    <option value="BERRIO">BERRIO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Tipo de Incidencia
                  </label>
                  <select
                    value={excType}
                    onChange={(e) => setExcType(e.target.value)}
                    className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="RETRASO_FERROVIARIO">
                      Retraso Ferroviario
                    </option>
                    <option value="BOBINA_DANADA">Bobina Dañada</option>
                    <option value="DESCUADRE_PESO">Descuadre de Peso</option>
                    <option value="HUMEDAD_DETECTADA">Humedad Detectada</option>
                    <option value="ROTURA_FLEJE">Rotura de Fleje</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Severidad
                  </label>
                  <select
                    value={excSeverity}
                    onChange={(e) => setExcSeverity(e.target.value)}
                    className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="LOW">Baja</option>
                    <option value="MEDIUM">Media</option>
                    <option value="HIGH">Alta</option>
                    <option value="CRITICAL">Crítica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={excDescription}
                    onChange={(e) => setExcDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Rol Reportador (Gobernanza)
                  </label>
                  <select
                    value={excRole}
                    onChange={(e) => {
                      const r = e.target.value as "ADMIN" | "TEST01";
                      setExcRole(r);
                      setExcReporterName(
                        r === "ADMIN" ? "System Admin" : "Operator Lead",
                      );
                    }}
                    className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="TEST01">
                      TEST01 · Operator Lead (Team Leader)
                    </option>
                    <option value="ADMIN">
                      ADMIN · System Admin (SuperAdmin)
                    </option>
                  </select>
                </div>

                <Button
                  onClick={handleReportException}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white text-sm"
                >
                  Registrar Incidencia
                </Button>

                {excFeedback && (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-400">
                    {excFeedback}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-3">
              {exceptions.map((exc) => (
                <div
                  key={exc.exceptionId}
                  className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-amber-400 font-bold">
                        {exc.exceptionId}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300">
                        {exc.warehouse}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {exc.exceptionType}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(exc.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200">{exc.description}</p>
                  <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2">
                    <span>
                      Reportado por:{" "}
                      <strong className="text-white">
                        {exc.reportedByName}
                      </strong>{" "}
                      ({exc.reportedByRole})
                    </span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> En Trámite
                      Operativo
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GOBERNANZA & AUDITORÍA */}
      {activeTab === "GOVERNANCE_ROLES" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.values(CUSTOMER01_OFFICIAL_ROLES)
              .filter((r) => ["ADMIN", "TEST01", "TEST02"].includes(r.roleCode))
              .map((role) => (
                <div
                  key={role.roleCode}
                  className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-bold text-purple-400">
                      {role.roleCode}
                    </span>
                    {role.superAdminPrivileges ? (
                      <span className="text-xs px-2 py-0.5 rounded font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        SUPERADMIN
                      </span>
                    ) : role.operationalAssignmentsAllowed ? (
                      <span className="text-xs px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        TEAM LEADER
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        SUPERVISIÓN GERENCIAL
                      </span>
                    )}
                  </div>
                  <p className="text-base font-bold text-white">
                    {role.fullName}
                  </p>
                  <p className="text-xs text-slate-400">{role.title}</p>
                  <div className="pt-2 text-xs border-t border-slate-800">
                    {role.operationalAssignmentsAllowed ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Autorizado para
                        asignaciones tácticas
                      </span>
                    ) : (
                      <span className="text-amber-400 font-medium flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" /> Excluido de
                        asignación táctica diaria
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {/* Interactive Governance Validator */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              Verificador de Integridad de Asignaciones Operativas (Rule 5)
            </h3>
            <p className="text-xs text-slate-400">
              Verifica el cumplimiento de las políticas de gobernanza
              organizativa para el Corredor {CUSTOMER01_CORRIDOR_CODE}.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Código de Rol
                </label>
                <input
                  id="inputTestRoleCode"
                  type="text"
                  value={testRoleCode}
                  onChange={(e) => setTestRoleCode(e.target.value)}
                  className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Nombre Completo
                </label>
                <input
                  id="inputTestPersonName"
                  type="text"
                  value={testPersonName}
                  onChange={(e) => setTestPersonName(e.target.value)}
                  className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <Button
                  id="btnVerifyGovernance"
                  onClick={handleCheckGovernance}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white text-sm flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Validar Asignación
                </Button>
              </div>
            </div>

            {governanceVerdict !== null && (
              <div
                id="governanceVerdictResult"
                className={`p-4 rounded-xl border text-sm flex items-center gap-3 ${
                  governanceVerdict.allowed
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/10 border-red-500/30 text-red-300"
                }`}
              >
                {governanceVerdict.allowed ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span>
                      Asignación Operativa AUTORIZADA para {testPersonName} (
                      {testRoleCode}).
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span>{governanceVerdict.reason}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
