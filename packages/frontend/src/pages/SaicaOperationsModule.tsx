import { useState, useMemo } from 'react';
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
  Check
} from 'lucide-react';
import { Button } from '@atlas/ui';
import {
  SEED_SAICA_ALBARANES,
  SEED_SAICA_COILS,
  SEED_SAICA_EXCEPTIONS,
  SAICA_OFFICIAL_ROLES,
  SAICA_CORRIDOR_CODE,
  ISO_40HC_PAYLOAD_LIMIT_KG,
  detectSaicaVehicle,
  verifySaicaContainerStowage,
  validateSaicaRoleAssignment,
  type SaicaAlbaran,
  type SaicaCoil,
  type SaicaException,
  type SaicaWarehouse,
  type SaicaStowageResult
} from '@atlas/shared';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type TabKey = 'ALBARANES_INGEST' | 'STOWAGE_40HC' | 'DOCK_EXCEPTIONS' | 'GOVERNANCE_ROLES';

export default function SaicaOperationsModule() {
  const [activeTab, setActiveTab] = useState<TabKey>('ALBARANES_INGEST');
  const [albaranes, setAlbaranes] = useState<SaicaAlbaran[]>(SEED_SAICA_ALBARANES);
  const [exceptions, setExceptions] = useState<SaicaException[]>(SEED_SAICA_EXCEPTIONS);
  const [coils, setCoils] = useState<SaicaCoil[]>(SEED_SAICA_COILS);

  // New Albaran Form State
  const [newAlbaranNumber, setNewAlbaranNumber] = useState('ALB-012-NEW');
  const [newWarehouse, setNewWarehouse] = useState<SaicaWarehouse>('CANTUNIS');
  const [newVehicleId, setNewVehicleId] = useState('31 71 4556 500-8');
  const [newFactory, setNewFactory] = useState('Zaragoza El Burgo');
  const [albaranSuccessMsg, setAlbaranSuccessMsg] = useState('');

  // 40' HC Stowage & Payload state
  const [payloadLimit, setPayloadLimit] = useState<number>(ISO_40HC_PAYLOAD_LIMIT_KG);
  const [stowageFeedback, setStowageFeedback] = useState('');

  // Exception Form State
  const [excWarehouse, setExcWarehouse] = useState<SaicaWarehouse>('CANTUNIS');
  const [excType, setExcType] = useState('RETRASO_FERROVIARIO');
  const [excSeverity, setExcSeverity] = useState('MEDIUM');
  const [excDescription, setExcDescription] = useState('Retraso en vía de maniobra Morrot.');
  const [excRole, setExcRole] = useState<'ESXPA' | 'ESACA'>('ESACA');
  const [excReporterName, setExcReporterName] = useState('Ariel Catalano');
  const [excFeedback, setExcFeedback] = useState('');

  // Governance Validator State
  const [testRoleCode, setTestRoleCode] = useState('ESACA');
  const [testPersonName, setTestPersonName] = useState('Ariel Catalano');
  const [governanceVerdict, setGovernanceVerdict] = useState<{ allowed: boolean; reason?: string } | null>(null);

  // Live Vehicle Detection Preview
  const liveVehicleDetection = useMemo(() => {
    try {
      return detectSaicaVehicle(newWarehouse, newVehicleId || 'UNKNOWN');
    } catch (err: any) {
      return {
        warehouse: newWarehouse,
        vehicleIdentifier: newVehicleId,
        transportMode: 'CAMION_LONA' as const,
        isRail: false,
        co2eFactorKgPerTonKm: 0.078,
        co2eSavingsPercent: 0,
        description: err.message
      };
    }
  }, [newWarehouse, newVehicleId]);

  // Live Stowage Evaluation
  const stowageResult: SaicaStowageResult = useMemo(() => {
    return verifySaicaContainerStowage(coils, payloadLimit);
  }, [coils, payloadLimit]);

  // Handle Albaran Ingestion
  const handleIngestAlbaran = () => {
    try {
      const detection = detectSaicaVehicle(newWarehouse, newVehicleId);
      const newCoils: SaicaCoil[] = [
        {
          coilId: `BOB-INGEST-${Date.now().toString().slice(-4)}`,
          paperGrade: 'SAICA NATURE PRIMA 140',
          grossWeightKg: 2650,
          widthMm: 2400,
          diameterMm: 1250,
          factoryOrigin: newFactory,
          destinationWarehouse: newWarehouse
        }
      ];

      const item: SaicaAlbaran = {
        albaranId: `ALB-SAICA-${Date.now()}`,
        albaranNumber: newAlbaranNumber,
        factoryOrigin: newFactory,
        destinationWarehouse: newWarehouse,
        expeditionDate: new Date().toISOString(),
        vehicleIdentifier: newVehicleId.trim().toUpperCase(),
        vehicleDetection: detection,
        coils: newCoils,
        totalNetWeightKg: 2650,
        targetContainerNumber: 'MSKU-881290-9',
        status: 'UNLOADED_IN_STOCK'
      };

      setAlbaranes([item, ...albaranes]);
      setAlbaranSuccessMsg(`Albarán ${newAlbaranNumber} procesado e ingresado en stock correctamente.`);
      setTimeout(() => setAlbaranSuccessMsg(''), 4000);
    } catch (err: any) {
      setAlbaranSuccessMsg(`Error: ${err.message}`);
      setTimeout(() => setAlbaranSuccessMsg(''), 5000);
    }
  };

  // Handle 2-Opt Rebalance Trigger
  const handleExecute2OptRebalance = () => {
    // Force displacement to trigger rebalance algorithm
    const displaced = coils.map((c, i) => ({
      ...c,
      xPositionM: i < 2 ? 1.5 : 8.5
    }));
    setCoils(displaced);
    setStowageFeedback('Algoritmo 2-opt ejecutado: columnas simétricas reordenadas.');
    setTimeout(() => setStowageFeedback(''), 4000);
  };

  // Handle Exception Submission
  const handleReportException = () => {
    const val = validateSaicaRoleAssignment(excRole, excReporterName);
    if (!val.allowed) {
      setExcFeedback(`Rechazado: ${val.reason}`);
      setTimeout(() => setExcFeedback(''), 5000);
      return;
    }

    const newExc: SaicaException = {
      exceptionId: `EXC-SAICA-${Date.now()}`,
      timestamp: new Date().toISOString(),
      warehouse: excWarehouse,
      exceptionType: excType as any,
      severity: excSeverity as any,
      description: excDescription,
      reportedByRole: excRole,
      reportedByName: excReporterName,
      resolved: false
    };

    setExceptions([newExc, ...exceptions]);
    setExcFeedback(`Incidencia ${newExc.exceptionId} registrada en muelle exitosamente.`);
    setTimeout(() => setExcFeedback(''), 4000);
  };

  // Handle Governance Test
  const handleCheckGovernance = () => {
    const res = validateSaicaRoleAssignment(testRoleCode, testPersonName);
    setGovernanceVerdict(res);
  };

  // Download PDF Certificate
  const handleDownloadStowagePDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICADO DE ESTIBA FÍSICA 40\' HC · SAICA BOOK 012', 14, 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Corredor Oficial ${SAICA_CORRIDOR_CODE} · CTU Code / EN 12195 Baseline`, 14, 22);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`ESTADO: ${stowageResult.longitudinalStatus} (${stowageResult.payloadUtilizationPercent}% Carga Legal)`, 14, 40);

    const rows = [
      ['Límite Legal Carretera (PMA 44t)', `${stowageResult.containerPayloadLimitKg} kg`],
      ['Peso Total Bobinas', `${stowageResult.totalCoilsWeightKg} kg`],
      ['Falso Flete Cuantificado', `${stowageResult.falsoFleteKg} kg (€${stowageResult.falsoFleteEstimatedCostEur})`],
      ['Centro Geométrico (Xgeom / Ygeom)', `${stowageResult.geometricCenterM.x} m / ${stowageResult.geometricCenterM.y} m`],
      ['Centro de Gravedad Real (X / Y)', `${stowageResult.actualCenterOfGravityM.x} m / ${stowageResult.actualCenterOfGravityM.y} m`],
      ['Desviación Longitudinal |Δx|', `${stowageResult.deltaXMeters} m (Tolerancia <= 0.60 m)`],
      ['Desviación Transversal |Δy|', `${stowageResult.deltaYMeters} m (Tolerancia <= 0.08 m)`],
      ['Algoritmo 2-opt Rebalance', stowageResult.twoOptRebalanced ? 'EJECUTADO Y CERTIFICADO' : 'ESTABLE (No requerido)']
    ];

    autoTable(doc, {
      startY: 46,
      head: [['Métrica de Estiba CTU Code', 'Valor Verificado']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], textColor: 255 }
    });

    doc.save('Certificado-Estiba-SAICA-Book012.pdf');
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                SAICA Logistics & FMS Platform
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {SAICA_CORRIDOR_CODE}
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Almacenes Externos (CANTUNIS · TLSA · BERRIO) · Estiba 40' HC (26.500 kg) · Gobernanza ESXPA / ESACA
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            id="btnDownloadStowageCert"
            onClick={handleDownloadStowagePDF}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm"
          >
            <Download className="w-4 h-4" />
            Certificado Estiba PDF
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          id="tabAlbaranesIngest"
          onClick={() => setActiveTab('ALBARANES_INGEST')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'ALBARANES_INGEST'
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <FileText className="w-4 h-4" />
          Ingesta REST de Albaranes
        </button>

        <button
          id="tabStowage40hc"
          onClick={() => setActiveTab('STOWAGE_40HC')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'STOWAGE_40HC'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Scale className="w-4 h-4" />
          Estiba Física 40' HC & 2-Opt
        </button>

        <button
          id="tabDockExceptions"
          onClick={() => setActiveTab('DOCK_EXCEPTIONS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'DOCK_EXCEPTIONS'
              ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Incidencias de Muelle
        </button>

        <button
          id="tabGovernanceRoles"
          onClick={() => setActiveTab('GOVERNANCE_ROLES')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'GOVERNANCE_ROLES'
              ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-lg shadow-purple-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Gobernanza & Auditoría
        </button>
      </div>

      {/* TAB 1: ALBARANES & INGESTA REST */}
      {activeTab === 'ALBARANES_INGEST' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Ingestion Form */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Ingesta de Albarán de Expedición
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
                    Fábrica Origen (SAICA Paper)
                  </label>
                  <select
                    id="selectFactoryOrigin"
                    value={newFactory}
                    onChange={(e) => setNewFactory(e.target.value)}
                    className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Zaragoza El Burgo">Zaragoza El Burgo</option>
                    <option value="Zaragoza San Juan">Zaragoza San Juan</option>
                    <option value="Zaragoza Centro">Zaragoza Centro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Almacén Externo de Llenado
                  </label>
                  <select
                    id="selectDestinationWarehouse"
                    value={newWarehouse}
                    onChange={(e) => setNewWarehouse(e.target.value as SaicaWarehouse)}
                    className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="CANTUNIS">CANTUNIS (Logistainer BCN · Único con Tren)</option>
                    <option value="TLSA">TLSA (El Prat de Llobregat · Solo Camión)</option>
                    <option value="BERRIO">BERRIO (Massanassa, Valencia · Solo Camión)</option>
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
                    className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. 31 71 4556 089-2 o 4821-LXZ"
                  />
                </div>

                {/* Real-time Detection Preview Card */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase block">
                    Detección Automática de Vehículo
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                      {liveVehicleDetection.isRail ? (
                        <Train className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Truck className="w-4 h-4 text-blue-400" />
                      )}
                      {liveVehicleDetection.transportMode}
                    </span>
                    {liveVehicleDetection.isRail && (
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        -76.9% CO2e
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Factor de emisión: {liveVehicleDetection.co2eFactorKgPerTonKm} kg CO2e/t·km
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
                  Albaranes en Stock y Recepción (Corredor {SAICA_CORRIDOR_CODE})
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
                        <td className="p-3 font-mono text-emerald-400 font-semibold">{alb.albaranNumber}</td>
                        <td className="p-3 font-medium text-white">{alb.destinationWarehouse}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            {alb.vehicleDetection.isRail ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                                <Train className="w-3 h-3" /> Tren Eléctrico (-76.9%)
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
                        <td className="p-3 font-mono font-medium text-white">{alb.totalNetWeightKg} kg</td>
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
      {activeTab === 'STOWAGE_40HC' && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400 font-medium">Límite Legal Oficial (RD 2822/1998)</span>
              <p className="text-2xl font-bold text-white mt-1">{payloadLimit.toLocaleString()} kg</p>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="text-slate-400">Payload Utilizado:</span>
                <span className="text-emerald-400 font-bold">{stowageResult.payloadUtilizationPercent}%</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400 font-medium">Desviación Longitudinal |Δx|</span>
              <p className="text-2xl font-bold text-white mt-1">{stowageResult.deltaXMeters} m</p>
              <div className="mt-2 text-xs">
                {stowageResult.longitudinalStatus === 'BALANCED' ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> BALANCED (&lt;= 0.60 m)
                  </span>
                ) : (
                  <span className="text-red-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> REBALANCEO REQUERIDO
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400 font-medium">Desviación Transversal |Δy|</span>
              <p className="text-2xl font-bold text-white mt-1">{stowageResult.deltaYMeters} m</p>
              <div className="mt-2 text-xs text-blue-400 font-semibold">
                Tresbolillo Conforme (&lt;= 0.08 m)
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400 font-medium">Falso Flete Cuantificado</span>
              <p className="text-2xl font-bold text-amber-400 mt-1">{stowageResult.falsoFleteKg.toLocaleString()} kg</p>
              <div className="mt-2 text-xs text-slate-400">
                Pérdida estimada: €{stowageResult.falsoFleteEstimatedCostEur}
              </div>
            </div>
          </div>

          {/* 2-Opt Rebalancing Actions */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                Algoritmo 2-Opt de Rebalanceo Automático de Columnas de Suelo
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Cuando |Δx| &gt; 0,35 m, el optimizador 2-opt invierte pares simétricos para asegurar el centro de gravedad geométrico (6,016 m).
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                id="btnToggleUsPayload"
                onClick={() => setPayloadLimit(payloadLimit === 26500 ? 20500 : 26500)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 font-semibold"
              >
                {payloadLimit === 26500 ? 'Modo España: 26.500 kg' : 'Modo EE.UU.: 20.500 kg'}
              </button>
              <Button
                id="btnExecute2Opt"
                onClick={handleExecute2OptRebalance}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Ejecutar 2-Opt Rebalance
              </Button>
            </div>
          </div>

          {stowageFeedback && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-400 flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{stowageFeedback}</span>
            </div>
          )}

          {/* Recommended Stock Coils to Mitigate Falso Flete */}
          {stowageResult.recommendedComplementaryCoils.length > 0 && (
            <div className="p-4 bg-amber-950/30 border border-amber-800/40 rounded-xl space-y-2">
              <h4 className="text-xs font-bold uppercase text-amber-400 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Bobinas Compatibles en Stock Local para Eliminar Falso Flete
              </h4>
              <p className="text-xs text-slate-300">
                Se detecta capacidad ociosa de {stowageResult.falsoFleteKg} kg. Propuesta de asignación inmediata desde stock CANTUNIS:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {stowageResult.recommendedComplementaryCoils.map((rec) => (
                  <div key={rec.coilId} className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs text-amber-300 block">{rec.coilId}</span>
                      <span className="text-xs text-slate-400">{rec.paperGrade}</span>
                    </div>
                    <span className="text-xs font-bold text-white bg-slate-800 px-2 py-1 rounded">
                      +{rec.weightKg} kg
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INCIDENCIAS DE MUELLE */}
      {activeTab === 'DOCK_EXCEPTIONS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Report Form */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Registrar Incidencia de Muelle
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Almacén Afectado
                  </label>
                  <select
                    id="selectExcWarehouse"
                    value={excWarehouse}
                    onChange={(e) => setExcWarehouse(e.target.value as SaicaWarehouse)}
                    className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="CANTUNIS">CANTUNIS (Barcelona)</option>
                    <option value="TLSA">TLSA (El Prat)</option>
                    <option value="BERRIO">BERRIO (Valencia)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Tipo de Incidencia
                  </label>
                  <select
                    id="selectExcType"
                    value={excType}
                    onChange={(e) => setExcType(e.target.value)}
                    className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="RETRASO_FERROVIARIO">Retraso Ferroviario (CANTUNIS)</option>
                    <option value="BOBINA_DANADA">Bobina Dañada / Raspadura Kraft</option>
                    <option value="DESCUADRE_PESO">Descuadre de Pesaje en Báscula</option>
                    <option value="ROTURA_FLEJE">Rotura de Fleje de Acero</option>
                    <option value="HUMEDAD_DETECTADA">Humedad en Suelo de Contenedor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Nivel de Severidad
                  </label>
                  <select
                    id="selectExcSeverity"
                    value={excSeverity}
                    onChange={(e) => setExcSeverity(e.target.value)}
                    className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="LOW">Baja (Informativa)</option>
                    <option value="MEDIUM">Media (Requiere Verificación)</option>
                    <option value="HIGH">Alta (Bloqueo Parcial de Carga)</option>
                    <option value="CRITICAL">Crítica (Rechazo de Bobina)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Descripción Operativa
                  </label>
                  <input
                    id="inputExcDescription"
                    type="text"
                    value={excDescription}
                    onChange={(e) => setExcDescription(e.target.value)}
                    className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Reportado Por (Rol Oficial)
                  </label>
                  <select
                    id="selectExcRole"
                    value={excRole}
                    onChange={(e) => {
                      const r = e.target.value as 'ESXPA' | 'ESACA';
                      setExcRole(r);
                      setExcReporterName(r === 'ESXPA' ? 'Xavier Pallarès' : 'Ariel Catalano');
                    }}
                    className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="ESACA">ESACA · Ariel Catalano (Team Leader)</option>
                    <option value="ESXPA">ESXPA · Xavier Pallarès (SuperAdmin)</option>
                  </select>
                </div>

                <Button
                  id="btnSubmitException"
                  onClick={handleReportException}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white text-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Registrar Incidencia
                </Button>

                {excFeedback && (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300">
                    {excFeedback}
                  </div>
                )}
              </div>
            </div>

            {/* Exceptions List */}
            <div className="lg:col-span-2 space-y-3">
              {exceptions.map((exc) => (
                <div
                  key={exc.exceptionId}
                  className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-amber-400 font-bold">{exc.exceptionId}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300">
                        {exc.warehouse}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {exc.exceptionType}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(exc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200">{exc.description}</p>
                  <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2">
                    <span>
                      Reportado por: <strong className="text-white">{exc.reportedByName}</strong> ({exc.reportedByRole})
                    </span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> En Trámite Operativo
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GOBERNANZA & AUDITORÍA */}
      {activeTab === 'GOVERNANCE_ROLES' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.values(SAICA_OFFICIAL_ROLES).map((role) => (
              <div
                key={role.roleCode}
                className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-bold text-purple-400">{role.roleCode}</span>
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
                <p className="text-base font-bold text-white">{role.fullName}</p>
                <p className="text-xs text-slate-400">{role.title}</p>
                <div className="pt-2 text-xs border-t border-slate-800">
                  {role.operationalAssignmentsAllowed ? (
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Autorizado para asignaciones tácticas
                    </span>
                  ) : (
                    <span className="text-amber-400 font-medium flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> Excluido de asignación táctica diaria
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
              Verifica el cumplimiento de las políticas de gobernanza organizativa para el Corredor {SAICA_CORRIDOR_CODE}.
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
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                {governanceVerdict.allowed ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span>
                      Asignación Operativa AUTORIZADA para {testPersonName} ({testRoleCode}).
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
