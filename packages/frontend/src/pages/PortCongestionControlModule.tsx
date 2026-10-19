import { useState, useMemo } from 'react';
import {
  Ship,
  Anchor,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  Compass,
  MapPin,
  Truck,
  Train,
  RefreshCw,
  Navigation,
  Layers,
  FileCheck
} from 'lucide-react';
import { Button } from '@atlas/ui';
import {
  IBERIAN_PORT_HUBS,
  SEED_AIS_VESSELS,
  SEED_BERTH_CALLS,
  SEED_DRAYAGE_APPOINTMENTS,
  detectBerthWindowCollisions,
  recalculateDrayageAppointments,
  generateDDSuspensionCertificate,
  type VesselAisPosition,
  type ScheduledBerthCall,
  type DrayageAppointment,
  type DDSuspensionCertificate
} from '@atlas/shared';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type TabKey = 'GEOSPATIAL_MAP' | 'BERTH_RADAR' | 'LANDSIDE_DRAYAGE' | 'DD_SUSPENSION';

export default function PortCongestionControlModule() {
  const [activeTab, setActiveTab] = useState<TabKey>('GEOSPATIAL_MAP');
  const [selectedPortCode, setSelectedPortCode] = useState<string>('ESBCN');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedVessel, setSelectedVessel] = useState<VesselAisPosition | null>(null);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // Dynamic state
  const [berthCalls, setBerthCalls] = useState<ScheduledBerthCall[]>(SEED_BERTH_CALLS);
  const [drayageAppointments, setDrayageAppointments] = useState<DrayageAppointment[]>(SEED_DRAYAGE_APPOINTMENTS);
  const [certificates, setCertificates] = useState<DDSuspensionCertificate[]>([
    generateDDSuspensionCertificate({
      portCode: 'ESBCN',
      terminalName: 'BEST',
      vesselName: 'MSC ISABELLA',
      containerNo: 'MSCU7821903',
      reason: 'PORT_CONGESTION_ANCHORAGE_DWELL',
      dwellOrDelayHours: 52.0,
      issuer: 'ADMIN (SuperAdmin / Systems Lead)'
    })
  ]);

  // Form state for generating new D&D certificate
  const [certForm, setCertForm] = useState({
    portCode: 'ESBCN',
    terminalName: 'BEST',
    vesselName: 'MADRID MAERSK',
    containerNo: 'TCLU9283710',
    reason: 'PORT_CONGESTION_ANCHORAGE_DWELL' as const,
    dwellOrDelayHours: 36.5,
    issuer: 'ADMIN (SuperAdmin / Systems Lead)' as const
  });

  const activeHub = useMemo(
    () => IBERIAN_PORT_HUBS.find((h) => h.portCode === selectedPortCode) || IBERIAN_PORT_HUBS[0],
    [selectedPortCode]
  );

  const activeVessels = useMemo(
    () =>
      SEED_AIS_VESSELS.filter((v) => v.destinationPortCode === selectedPortCode).filter(
        (v) =>
          v.vesselName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.imo.includes(searchTerm) ||
          v.carrier.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [selectedPortCode, searchTerm]
  );

  const activeCollisions = useMemo(
    () => detectBerthWindowCollisions(berthCalls, 120).filter((c) => c.portCode === selectedPortCode),
    [berthCalls, selectedPortCode]
  );

  const activeDrayage = useMemo(
    () => drayageAppointments.filter((a) => a.targetPortCode === selectedPortCode),
    [drayageAppointments, selectedPortCode]
  );

  // Handlers
  const handleResolveCollision = (colId: string) => {
    const col = activeCollisions.find((c) => c.collisionId === colId);
    if (!col) return;

    setBerthCalls((prev) =>
      prev.map((c) => {
        if (c.callId === col.vesselB.callId) {
          const delayMs = col.projectedDelayHours * 60 * 60 * 1000;
          return {
            ...c,
            etaPlanned: new Date(new Date(c.etaPlanned).getTime() + delayMs).toISOString(),
            etdPlanned: new Date(new Date(c.etdPlanned).getTime() + delayMs).toISOString()
          };
        }
        return c;
      })
    );
  };

  const handleRebalanceDrayage = () => {
    const collisions = detectBerthWindowCollisions(berthCalls, 120);
    const updated = recalculateDrayageAppointments(drayageAppointments, collisions);
    setDrayageAppointments(updated);
  };

  const handleGenerateCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    const newCert = generateDDSuspensionCertificate(certForm);
    setCertificates((prev) => [newCert, ...prev]);
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleDownloadPDF = (cert: DDSuspensionCertificate) => {
    const doc = new jsPDF();

    // Header
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('ATLAS LOGISTICS · CERTIFICACIÓN FMC / OSRA', 14, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('D&D Free-Time Tolling & Port Congestion Unavailability Certificate', 14, 28);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Certificado N°: ${cert.certificateId}`, 14, 52);

    autoTable(doc, {
      startY: 58,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], textColor: 255 },
      body: [
        ['Puerto Marítimo', `${cert.portName} (${cert.portCode})`],
        ['Terminal de Atraque', cert.terminalName],
        ['Buque Portacontenedores', cert.vesselName],
        ['Contenedor Afectado', cert.containerNo],
        ['Causa de Congestión', cert.reason],
        ['Tiempo de Paralización', `${cert.dwellOrDelayHours} horas`],
        ['Estatus Reloj D&D', 'TOLLED / SUSPENDED (Plazo Congelado)'],
        ['Base Regulatoria', cert.regulatoryBasis],
        ['Autoridad Emisora', cert.issuer],
        ['Fecha / Hora Certificación', new Date(cert.timestamp).toLocaleString('es-ES')],
        ['Firma Digital (SHA-256)', cert.digitalSignatureHash]
      ]
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const splitText = doc.splitTextToSize(cert.legalNoticeText, 180);
    doc.text(splitText, 14, finalY);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Código de Verificación QR: ${cert.qrCodeDigest}`, 14, finalY + 35);
    doc.text('Atlas-Logistics Autonomous Maritime Control Platform · Book TEST01 Corredor Barcelona', 14, finalY + 42);

    doc.save(`Certificado_DD_${cert.containerNo}_${cert.portCode}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono uppercase tracking-widest">
            <Compass className="w-4 h-4 animate-spin-slow" />
            <span>Atlas Maritime Control Tower · AIS Telemetry</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">
            <span>Predictive Port Congestion & AIS Berth Delay Early Warning Engine</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Geofenced Anchorage Dwell Times · Deterministic Berth Collision Forecasting · Landside Drayage Interlock
          </p>
        </div>

        {/* Port Hub Switcher */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
          {IBERIAN_PORT_HUBS.map((hub) => (
            <button
              key={hub.portCode}
              onClick={() => {
                setSelectedPortCode(hub.portCode);
                setSelectedVessel(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                selectedPortCode === hub.portCode
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{hub.portCode}</span>
              <span className="hidden sm:inline">({hub.name.replace('Port de ', '').replace('Puerto de ', '')})</span>
            </button>
          ))}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Índice de Congestión</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                activeHub.congestionIndex >= 75
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : activeHub.congestionIndex >= 50
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {activeHub.congestionIndex >= 75 ? 'CRITICAL' : activeHub.congestionIndex >= 50 ? 'URGENT' : 'OPTIMAL'}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{activeHub.congestionIndex}%</span>
            <span className="text-xs text-slate-400">saturación dársena</span>
          </div>
          <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full ${
                activeHub.congestionIndex >= 75 ? 'bg-red-500' : activeHub.congestionIndex >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${activeHub.congestionIndex}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Espera Media Fondeadero</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400">{activeHub.anchorageDwellAvgHours}h</span>
            <span className="text-xs text-slate-400">dwell time medio</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Umbral crítico FMC: &gt;24h (warning) / &gt;48h (tolling)</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Buques en Espera / Fondeo</span>
            <Anchor className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-cyan-400">{activeHub.vesselsAtAnchorage}</span>
            <span className="text-xs text-slate-400">portacontenedores</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">SOG &lt; 0.5 kn telemétrico verificado</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Tiempo Giro Puerta (Gate)</span>
            <Truck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400">{activeHub.gateTurnTimeMinutesAvg} min</span>
            <span className="text-xs text-slate-400">drayage turnaround</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Enlaces: {activeHub.landsideFacilities.join(', ') || 'Carretera Directa'}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('GEOSPATIAL_MAP')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'GEOSPATIAL_MAP'
              ? 'bg-slate-800 text-cyan-400 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Radar Geoespacial AIS & Zonas</span>
          <span className="bg-cyan-900/60 text-cyan-300 text-xs px-1.5 py-0.5 rounded-full font-mono">
            {activeVessels.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('BERTH_RADAR')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'BERTH_RADAR'
              ? 'bg-slate-800 text-cyan-400 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Cronograma de Atraques & Colisiones</span>
          {activeCollisions.length > 0 && (
            <span className="bg-red-900/60 text-red-300 text-xs px-1.5 py-0.5 rounded-full font-mono animate-pulse">
              {activeCollisions.length} conf
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('LANDSIDE_DRAYAGE')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'LANDSIDE_DRAYAGE'
              ? 'bg-slate-800 text-cyan-400 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Acarreo Terrestre & Intermodal</span>
          <span className="bg-slate-700 text-slate-300 text-xs px-1.5 py-0.5 rounded-full font-mono">
            {activeDrayage.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('DD_SUSPENSION')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'DD_SUSPENSION'
              ? 'bg-slate-800 text-cyan-400 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Suspensión Reloj D&D (FMC/OSRA)</span>
          <span className="bg-emerald-900/60 text-emerald-300 text-xs px-1.5 py-0.5 rounded-full font-mono">
            {certificates.length} certs
          </span>
        </button>
      </div>

      {/* TAB 1: GEOSPATIAL MAP & AIS RADAR */}
      {activeTab === 'GEOSPATIAL_MAP' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interactive Geospatial Harbor Canvas / SVG */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-slate-200">
                  Carta Náutica Telemétrica: {activeHub.name} ({activeHub.portCode})
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500 inline-block" /> Fondeadero
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-cyan-500/30 border border-cyan-500 inline-block" /> Canal
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500 inline-block" /> Muelle
                </span>
              </div>
            </div>

            {/* SVG Visualizer */}
            <div className="relative w-full aspect-[16/10] bg-slate-950 rounded-xl border border-slate-800/80 overflow-hidden flex items-center justify-center p-2">
              <svg viewBox="0 0 800 500" className="w-full h-full select-none">
                {/* Background Grid */}
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(51, 65, 85, 0.25)" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="800" height="500" fill="url(#grid)" />

                {/* Simulated Coastline */}
                <path
                  d="M 0 50 Q 200 80 350 140 T 500 240 T 800 280 L 800 0 L 0 0 Z"
                  fill="#090d16"
                  stroke="#1e293b"
                  strokeWidth="2"
                />

                {/* Geofence Polygons */}
                {/* Anchorage Zone */}
                <polygon
                  points="450,320 720,320 720,460 450,460"
                  fill="rgba(245, 158, 11, 0.12)"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <text x="460" y="340" fill="#f59e0b" fontSize="12" fontWeight="bold">
                  FONDEADERO EXTERIOR ({activeHub.zones.find((z) => z.type === 'ANCHORAGE')?.capacityVessels} max)
                </text>

                {/* Entry Fairway / Channel */}
                <polygon
                  points="360,200 440,200 440,330 360,330"
                  fill="rgba(6, 182, 212, 0.12)"
                  stroke="#06b6d4"
                  strokeWidth="2"
                  strokeDasharray="2 2"
                />
                <text x="365" y="270" fill="#06b6d4" fontSize="11" fontWeight="bold">
                  CANAL
                </text>

                {/* Terminal Berths */}
                <polygon
                  points="220,130 350,130 350,195 220,195"
                  fill="rgba(16, 185, 129, 0.15)"
                  stroke="#10b981"
                  strokeWidth="2"
                />
                <text x="230" y="150" fill="#10b981" fontSize="12" fontWeight="bold">
                  MUELLES DE CONTENEDORES
                </text>
                <text x="230" y="170" fill="#94a3b8" fontSize="10">
                  {activeHub.terminals.join(' · ')}
                </text>

                {/* Vessels rendered as interactive pins */}
                {activeVessels.map((v, i) => {
                  let x = 520 + (i % 3) * 70;
                  let y = 370 + Math.floor(i / 3) * 45;

                  if (v.operationalStatus === 'AT_BERTH') {
                    x = 260 + i * 40;
                    y = 160;
                  } else if (v.operationalStatus === 'UNDERWAY_CHANNEL') {
                    x = 400;
                    y = 250;
                  }

                  const isSelected = selectedVessel?.imo === v.imo;

                  return (
                    <g
                      key={v.imo}
                      onClick={() => setSelectedVessel(v)}
                      className="cursor-pointer transition-transform hover:scale-125"
                    >
                      <circle
                        cx={x}
                        cy={y}
                        r={isSelected ? 14 : 9}
                        fill={
                          v.operationalStatus === 'AT_BERTH'
                            ? '#10b981'
                            : v.isDwellCritical
                            ? '#ef4444'
                            : v.isDwellWarning
                            ? '#f59e0b'
                            : '#06b6d4'
                        }
                        stroke="#0f172a"
                        strokeWidth="2"
                        className={v.isDwellCritical ? 'animate-pulse' : ''}
                      />
                      <path
                        d={`M ${x} ${y - 4} L ${x + 3} ${y + 3} L ${x - 3} ${y + 3} Z`}
                        fill="#ffffff"
                        transform={`rotate(${v.headingDegrees}, ${x}, ${y})`}
                      />
                      <text x={x + 12} y={y + 4} fill="#e2e8f0" fontSize="10" fontWeight="bold">
                        {v.vesselName.slice(0, 14)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Geofence Zones Legend & Coordinates List */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {activeHub.zones.map((zone) => (
                <div key={zone.id} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-300">
                    <span>{zone.name.split('(')[0]}</span>
                    <span className="text-[10px] text-cyan-400 font-mono">{zone.type}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{zone.description}</p>
                  <div className="mt-2 text-[10px] text-slate-500 font-mono">
                    Capacidad: {zone.capacityVessels} buques
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vessel Detail Inspector & AIS List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                <Ship className="w-4 h-4 text-cyan-400" />
                <span>Buques en Radar ({activeVessels.length})</span>
              </h3>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filtrar buque / IMO..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-36"
                />
              </div>
            </div>

            {/* Selected Vessel Inspector Card */}
            {selectedVessel ? (
              <div className="bg-slate-950 border border-cyan-500/40 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800">
                      {selectedVessel.carrier} · IMO {selectedVessel.imo}
                    </span>
                    <h4 className="text-base font-bold text-white mt-1">{selectedVessel.vesselName}</h4>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      selectedVessel.operationalStatus === 'AT_BERTH'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : selectedVessel.isDwellCritical
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                        : selectedVessel.isDwellWarning
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    }`}
                  >
                    {selectedVessel.operationalStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Speed Over Ground (SOG)</span>
                    <span className="font-mono font-bold text-slate-200">{selectedVessel.sogKnots} knots</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Dwell Time Fondeo</span>
                    <span
                      className={`font-mono font-bold ${
                        selectedVessel.isDwellCritical
                          ? 'text-red-400'
                          : selectedVessel.isDwellWarning
                          ? 'text-amber-400'
                          : 'text-slate-200'
                      }`}
                    >
                      {selectedVessel.dwellHours} horas
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Terminal Asignada</span>
                    <span className="font-semibold text-slate-200">
                      {selectedVessel.assignedTerminal || 'Sin asignar'}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">ETA Prevista</span>
                    <span className="font-mono text-slate-200">
                      {new Date(selectedVessel.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {selectedVessel.isDwellWarning && (
                  <Button
                    onClick={() => {
                      setCertForm({
                        portCode: selectedVessel.destinationPortCode,
                        terminalName: selectedVessel.assignedTerminal || 'BEST',
                        vesselName: selectedVessel.vesselName,
                        containerNo: 'MSCU7821903',
                        reason: 'PORT_CONGESTION_ANCHORAGE_DWELL',
                        dwellOrDelayHours: selectedVessel.dwellHours,
                        issuer: 'ADMIN (SuperAdmin / Systems Lead)'
                      });
                      setActiveTab('DD_SUSPENSION');
                    }}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs py-2 rounded-lg font-bold flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Emitir Suspensión Reloj D&D</span>
                  </Button>
                )}
              </div>
            ) : (
              <div className="p-4 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                Selecciona un buque en la carta náutica o en el listado inferior para inspeccionar telemetría AIS.
              </div>
            )}

            {/* Vessel List Scrollable */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-80 pr-1">
              {activeVessels.map((v) => (
                <div
                  key={v.imo}
                  onClick={() => setSelectedVessel(v)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                    selectedVessel?.imo === v.imo
                      ? 'bg-slate-800 border-cyan-500 text-white'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white">{v.vesselName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({v.carrier})</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      SOG: {v.sogKnots} kn · {v.assignedTerminal || 'Fondeo'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded block ${
                        v.isDwellCritical
                          ? 'bg-red-500/20 text-red-400'
                          : v.isDwellWarning
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {v.dwellHours > 0 ? `${v.dwellHours}h dwell` : 'En tránsito'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BERTH TIMELINE & COLLISION RADAR */}
      {activeTab === 'BERTH_RADAR' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                <span>Radar Determinista de Colisiones de Atraque (Buffer: 120 min)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Monitorea ventanas de ocupación de muelle y solapamientos operativos que provocan desvíos en cadena y
                demoras.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Total conflictos detectados:</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-red-900/60 text-red-300 border border-red-700">
                {activeCollisions.length}
              </span>
            </div>
          </div>

          {/* Active Collision Alert Banners */}
          {activeCollisions.length > 0 ? (
            <div className="space-y-4">
              {activeCollisions.map((col) => (
                <div
                  key={col.collisionId}
                  className="bg-red-950/30 border border-red-800/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="font-bold text-red-300 text-sm">
                        Conflicto en {col.terminalName} ({col.berthId}) · Solapamiento: {col.overlapMinutes} min (+
                        {col.projectedDelayHours}h demora)
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Buque Precedente: <strong className="text-white">{col.vesselA.vesselName}</strong> (ETD:{' '}
                      {new Date(col.vesselA.etdPlanned).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      vs Buque Entrante: <strong className="text-white">{col.vesselB.vesselName}</strong> (ETA:{' '}
                      {new Date(col.vesselB.etaPlanned).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                    </p>
                    <p className="text-[11px] text-amber-300 font-mono">
                      Recomendación: {col.resolutionRecommendation}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleResolveCollision(col.collisionId)}
                    className="bg-red-600 hover:bg-red-500 text-white text-xs px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap self-start md:self-center"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Resolver y Reasignar</span>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-emerald-950/20 border border-emerald-800/50 rounded-xl p-4 flex items-center gap-3 text-emerald-400 text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>No existen colisiones de atraque activas en {activeHub.name}. La operativa transcurre dentro de los márgenes de seguridad.</span>
            </div>
          )}

          {/* Scheduled Berth Calls Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-3">Terminal / Muelle</th>
                  <th className="p-3">Buque & Naviera</th>
                  <th className="p-3">ETA Prevista</th>
                  <th className="p-3">ETD Prevista</th>
                  <th className="p-3">Movimientos TEU</th>
                  <th className="p-3">Grúas (Gangs)</th>
                  <th className="p-3">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {berthCalls
                  .filter((c) => c.portCode === selectedPortCode)
                  .map((call) => (
                    <tr key={call.callId} className="hover:bg-slate-800/50">
                      <td className="p-3 font-semibold text-white">
                        {call.terminalName} · {call.berthId}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-200">{call.vesselName}</span>{' '}
                        <span className="text-slate-500 font-mono text-[10px]">({call.carrier})</span>
                      </td>
                      <td className="p-3 font-mono">
                        {new Date(call.etaPlanned).toLocaleDateString()}{' '}
                        {new Date(call.etaPlanned).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3 font-mono">
                        {new Date(call.etdPlanned).toLocaleDateString()}{' '}
                        {new Date(call.etdPlanned).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3 font-mono">{call.movesEstimatedTeu} TEUs</td>
                      <td className="p-3 font-mono">{call.craneGangs} grúas STS</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-900/60 text-cyan-300 border border-cyan-800">
                          CONFIRMED
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LANDSIDE DRAYAGE & INTERMODAL ADVISORIES */}
      {activeTab === 'LANDSIDE_DRAYAGE' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-cyan-400" />
                <span>Avisos de Acarreo Terrestre & Enlaces Ferroviarios (CANTUNIS / TLSA / BERRIO)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Sincronización desatendida entre atraques marítimos y acarreos de carretera/tren para suprimir colas en
                terminal.
              </p>
            </div>
            <Button
              onClick={handleRebalanceDrayage}
              className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 self-start sm:self-center"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Rebalancear Citas de Entrada</span>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-3">ID Cita</th>
                  <th className="p-3">Hub & Modalidad</th>
                  <th className="p-3">Transportista / Conductor</th>
                  <th className="p-3">Contenedor</th>
                  <th className="p-3">Buque Destino</th>
                  <th className="p-3">Ventana Original</th>
                  <th className="p-3">Ventana Ajustada</th>
                  <th className="p-3">Espera Puerta</th>
                  <th className="p-3">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {activeDrayage.map((apt) => (
                  <tr key={apt.appointmentId} className="hover:bg-slate-800/50">
                    <td className="p-3 font-mono font-bold text-slate-400">{apt.appointmentId}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 font-bold text-white">
                        {apt.transportMode === 'TREN' ? (
                          <Train className="w-3.5 h-3.5 text-cyan-400" />
                        ) : (
                          <Truck className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span>{apt.corridorHub}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {apt.transportMode === 'TREN' ? 'Ferrocarril UIC/Ibérico' : 'Camión-Lona Carretera'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-semibold text-slate-200">{apt.truckingCompany}</span>
                      <span className="block text-[10px] text-slate-500 font-mono">
                        {apt.licensePlate} ({apt.driverName})
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-cyan-300">{apt.containerNo}</td>
                    <td className="p-3 text-slate-200">{apt.vesselName}</td>
                    <td className="p-3 font-mono text-slate-400">
                      {new Date(apt.originalSlotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                      {new Date(apt.originalSlotEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3 font-mono font-bold text-amber-400">
                      {new Date(apt.adjustedSlotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                      {new Date(apt.adjustedSlotEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3 font-mono">~{apt.terminalGateWaitMinutesEstimate} min</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          apt.status === 'ADJUSTED_WARNING'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {apt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: FMC/OSRA D&D FREE-TIME SUSPENSION NOTICE GENERATOR */}
      {activeTab === 'DD_SUSPENSION' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Certificate Generator Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">Generar Certificación de Suspensión D&D</h3>
            </div>
            <p className="text-xs text-slate-400">
              Emite certificados válidos ante la FMC (46 CFR Part 541 / OSRA 2022) para paralizar el reloj de días libres
              durante congestiones portuarias.
            </p>

            <form onSubmit={handleGenerateCertificate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Puerto de Escala</label>
                <select
                  value={certForm.portCode}
                  onChange={(e) => setCertForm({ ...certForm, portCode: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ESBCN">Port de Barcelona (ESBCN)</option>
                  <option value="ESVLC">Port de València (ESVLC)</option>
                  <option value="ESALG">Puerto de Algeciras (ESALG)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Terminal de Muelle</label>
                <input
                  type="text"
                  value={certForm.terminalName}
                  onChange={(e) => setCertForm({ ...certForm, terminalName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Buque Afectado</label>
                <input
                  type="text"
                  value={certForm.vesselName}
                  onChange={(e) => setCertForm({ ...certForm, vesselName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Matrícula Contenedor ISO</label>
                <input
                  type="text"
                  value={certForm.containerNo}
                  onChange={(e) => setCertForm({ ...certForm, containerNo: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Causa de Congestión Telemétrica</label>
                <select
                  value={certForm.reason}
                  onChange={(e) => setCertForm({ ...certForm, reason: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="PORT_CONGESTION_ANCHORAGE_DWELL">Paralización en Fondeo Exterior (&gt;24h)</option>
                  <option value="BERTH_COLLISION_DELAY">Solapamiento y Retraso de Atraque en Muelle</option>
                  <option value="TERMINAL_GATE_APPOINTMENT_UNAVAILABLE">Puerta Inaccesible / Sin Ventanas de Cita</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Horas de Paralización Verificadas</label>
                <input
                  type="number"
                  step="0.5"
                  value={certForm.dwellOrDelayHours}
                  onChange={(e) => setCertForm({ ...certForm, dwellOrDelayHours: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Autoridad Emisora Oficial</label>
                <input
                  type="text"
                  value={certForm.issuer}
                  disabled
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg p-2 text-slate-400 font-mono text-[11px]"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 mt-2"
              >
                <FileCheck className="w-4 h-4" />
                <span>Firmar Digitalmente & Expedir Certificado</span>
              </Button>
            </form>
          </div>

          {/* Certificate Dossier List */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Certificados Emitidos & Sellos Criptográficos ({certificates.length})</span>
              </h3>
            </div>

            <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
              {certificates.map((cert) => (
                <div
                  key={cert.certificateId}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850 pb-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800">
                        {cert.certificateId}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1">
                        Contenedor: {cert.containerNo} · {cert.vesselName} ({cert.portName})
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleDownloadPDF(cert)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        <span>PDF Oficial</span>
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans">{cert.legalNoticeText}</p>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 font-mono pt-1">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-3.5 h-3.5 text-slate-400" />
                      <span>{cert.qrCodeDigest}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-bold">{cert.digitalSignatureHash}</span>
                      <button
                        onClick={() => handleCopyHash(cert.digitalSignatureHash)}
                        className="hover:text-white"
                        title="Copiar Hash"
                      >
                        {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
