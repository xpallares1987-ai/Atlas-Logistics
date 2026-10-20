import { useState, useMemo } from 'react';
import {
  Leaf,
  ShieldCheck,
  Award,
  Download,
  Ship,
  Truck,
  Train,
  Sparkles,
  Flame,
  RefreshCw,
  Coins
} from 'lucide-react';
import { Button } from '@atlas/ui';
import {
  CERTIFIED_FUELS_CATALOG,
  SEED_INSETTING_TOKENS,
  SEED_FUELEU_POOL_VESSELS,
  calculateGhgInsettingAbatement,
  issueInsettingToken,
  executeFuelEuPooling,
  type FuelType,
  type TransportMode,
  type InsettingToken,
  type FuelEuPoolResult
} from '@atlas/shared';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type TabKey = 'TOKENS_LEDGER' | 'ALLOCATION_STUDIO' | 'FUELEU_POOLING' | 'SUSTAINABILITY_AUDIT';

export default function CarbonInsettingModule() {
  const [activeTab, setActiveTab] = useState<TabKey>('TOKENS_LEDGER');
  const [tokens, setTokens] = useState<InsettingToken[]>(SEED_INSETTING_TOKENS);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Form State for Insetting Allocation
  const [allocForm, setAllocForm] = useState({
    fuelType: 'B100_BIODIESEL' as FuelType,
    fuelVolumeMT: 100,
    bunkerLocation: 'Port de Barcelona - Muelle de la Energía',
    bdnReference: 'BDN-BCN-2026-8812',
    sustainabilityCertificateNumber: 'ISCC-EU-Cert-DE105-829104',
    allocatedShipmentRef: 'SHP-BCN-CUST01-BOOK01',
    beneficiaryCompany: 'Customer01 Paper (Corredor DEPT-TEST01)',
    transportMode: 'MARITIME_OCEAN' as TransportMode
  });

  // FuelEU Pooling State
  const [poolResult, setPoolResult] = useState<FuelEuPoolResult>(() =>
    executeFuelEuPooling(SEED_FUELEU_POOL_VESSELS, 2026)
  );

  // Real-time calculated abatement preview
  const liveAbatement = useMemo(
    () => calculateGhgInsettingAbatement(allocForm.fuelType, allocForm.fuelVolumeMT || 0),
    [allocForm.fuelType, allocForm.fuelVolumeMT]
  );

  // Aggregate KPI metrics
  const totalAvoidedCO2e = useMemo(
    () => Number(tokens.reduce((acc, t) => acc + t.ghgAbatementTonsCO2e, 0).toFixed(2)),
    [tokens]
  );

  const totalFuelVolumeMT = useMemo(
    () => tokens.reduce((acc, t) => acc + t.fuelVolumeMT, 0),
    [tokens]
  );

  const filteredTokens = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return tokens;
    return tokens.filter(
      (t) =>
        t.tokenId.toLowerCase().includes(q) ||
        t.allocatedShipmentRef.toLowerCase().includes(q) ||
        t.beneficiaryCompany.toLowerCase().includes(q) ||
        t.fuelType.toLowerCase().includes(q)
    );
  }, [tokens, searchTerm]);

  // Handlers
  const handleIssueToken = (e: React.FormEvent) => {
    e.preventDefault();
    const newToken = issueInsettingToken(allocForm);
    setTokens((prev) => [newToken, ...prev]);
    setActiveTab('TOKENS_LEDGER');
  };

  const handleExecutePool = () => {
    const freshPool = executeFuelEuPooling(SEED_FUELEU_POOL_VESSELS, 2026);
    setPoolResult(freshPool);
  };

  const handleDownloadPDF = (token: InsettingToken) => {
    const doc = new jsPDF();

    // Top Brand Bar
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('ATLAS LOGISTICS · CERTIFICADO DE INSETTING SCOPE 3', 14, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Tokenized Book-and-Claim Ledger · ISO 14083 / GLEC Framework v3.0 Compliant', 14, 28);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Token N°: ${token.tokenId}`, 14, 52);

    autoTable(doc, {
      startY: 58,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255 },
      body: [
        ['Beneficiario Acreditado', token.beneficiaryCompany],
        ['Expedición / Albarán Asignado', token.allocatedShipmentRef],
        ['Combustible Sostenible Utilizado', CERTIFIED_FUELS_CATALOG[token.fuelType]?.displayName || token.fuelType],
        ['Masa de Combustible Bunkered', `${token.fuelVolumeMT} Toneladas Métricas`],
        ['Contenido Energético Total', `${token.energyContentMJ.toLocaleString()} MJ`],
        ['Emisiones Scope 3 Evitadas', `${token.ghgAbatementTonsCO2e} tCO2e`],
        ['Lugar de Bunkering / Suministro', token.bunkerLocation],
        ['Referencia Albarán BDN', token.bdnReference],
        ['Certificado de Sostenibilidad', token.sustainabilityCertificateNumber],
        ['Estándar de Verificación', token.verificationStandard],
        ['Fecha de Retiro en Ledger', new Date(token.issueDate).toLocaleString('es-ES')],
        ['Firma Digital (SHA-256)', token.digitalSignatureHash]
      ]
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(
      'DECLARACIÓN OFICIAL: El presente token certifica de forma irrevocable el insetting y reducción efectiva de ' +
      'huella de carbono de Alcance 3 conforme al principio de custodia Mass Balance Book-and-Claim. ' +
      'Los atributos de sostenibilidad han sido retirados exclusivamente para la entidad beneficiaria.',
      14,
      finalY,
      { maxWidth: 180 }
    );

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Código QR de Validación: ${token.qrCodeDigest}`, 14, finalY + 28);
    doc.text('Atlas-Logistics Scope 3 Digital Twin Registry · Corredor Oficial Book TEST01 Barcelona', 14, finalY + 34);

    doc.save(`Certificado_Insetting_${token.tokenId}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-widest">
            <Leaf className="w-4 h-4 animate-pulse" />
            <span>Digital Twin Registry · Scope 3 Decarbonization</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">
            <span>Supply Chain Digital Twin & Scope 3 Carbon Insetting</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Tokenized Book-and-Claim Ledger · ISO 14083 / GLEC v3.0 · FuelEU Maritime Compliance Pooling (Reg EU 2023/1805)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setActiveTab('ALLOCATION_STUDIO')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-900/30"
          >
            <Coins className="w-4 h-4" />
            <span>Asignar Insetting & Emitir Token</span>
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Emisiones Scope 3 Evitadas</span>
            <Leaf className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400">{totalAvoidedCO2e}</span>
            <span className="text-xs text-slate-400">tCO2e abated</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Certificado ISO 14083 / GLEC v3.0</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Combustible Verde Asignado</span>
            <Flame className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-cyan-400">{totalFuelVolumeMT}</span>
            <span className="text-xs text-slate-400">toneladas métricas</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">B100, e-Metanol, Bio-LNG (ISCC EU)</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Balance Pool FuelEU Maritime</span>
            <Ship className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-indigo-300">
              +{poolResult.netPoolBalanceGCO2e.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">gCO2e</span>
          </div>
          <p className="text-[11px] text-emerald-400 mt-2">
            Superávit flota: {poolResult.isCompliant ? '100% CUMPLE EU 2023/1805' : 'DÉFICIT'}
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Penalizaciones Evitadas (Pool)</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400">
              €{poolResult.totalPenaltyAvoidedEur.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">ahorro multas</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Ahorro frente a multas de €2.400/t VLSFO</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('TOKENS_LEDGER')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'TOKENS_LEDGER'
              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Ledger Tokenizado Book-and-Claim</span>
          <span className="bg-emerald-900/60 text-emerald-300 text-xs px-1.5 py-0.5 rounded-full font-mono">
            {tokens.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ALLOCATION_STUDIO')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'ALLOCATION_STUDIO'
              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Asignación & Mass Balance Studio</span>
        </button>

        <button
          onClick={() => setActiveTab('FUELEU_POOLING')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'FUELEU_POOLING'
              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Ship className="w-4 h-4" />
          <span>Simulador de Pooling FuelEU Maritime</span>
          <span className="bg-cyan-900/60 text-cyan-300 text-xs px-1.5 py-0.5 rounded-full font-mono">
            {SEED_FUELEU_POOL_VESSELS.length} buques
          </span>
        </button>

        <button
          onClick={() => setActiveTab('SUSTAINABILITY_AUDIT')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'SUSTAINABILITY_AUDIT'
              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Dossier de Sostenibilidad & ISCC</span>
        </button>
      </div>

      {/* TAB 1: TOKENS LEDGER */}
      {activeTab === 'TOKENS_LEDGER' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-400" />
                <span>Libro Mayor Tokenizado de Insetting (Book-and-Claim)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Certificados de descarbonización Scope 3 emitidos y retirados en favor de clientes y embarques
                acreditados.
              </p>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar token / expedición..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-56"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-3">ID Token</th>
                  <th className="p-3">Combustible & Modalidad</th>
                  <th className="p-3">Beneficiario & Expedición</th>
                  <th className="p-3">Masa / Energía</th>
                  <th className="p-3">Reducción Scope 3</th>
                  <th className="p-3">Suministro BDN</th>
                  <th className="p-3">Certificación</th>
                  <th className="p-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredTokens.map((token) => (
                  <tr key={token.tokenId} className="hover:bg-slate-800/50">
                    <td className="p-3">
                      <span className="font-mono font-bold text-emerald-400 block">{token.tokenId}</span>
                      <span className="text-[10px] text-slate-500">{new Date(token.issueDate).toLocaleDateString()}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 font-bold text-white">
                        {token.transportMode === 'MARITIME_OCEAN' ? (
                          <Ship className="w-3.5 h-3.5 text-cyan-400" />
                        ) : token.transportMode === 'ROAD_DRAYAGE' ? (
                          <Truck className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Train className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span>{CERTIFIED_FUELS_CATALOG[token.fuelType]?.displayName.split('(')[0]}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">{token.transportMode}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-semibold text-slate-200 block">{token.beneficiaryCompany}</span>
                      <span className="text-[10px] text-cyan-300 font-mono">{token.allocatedShipmentRef}</span>
                    </td>
                    <td className="p-3 font-mono">
                      <span className="text-white font-bold">{token.fuelVolumeMT} MT</span>
                      <span className="text-[10px] text-slate-500 block">{(token.energyContentMJ / 1000000).toFixed(2)} GJ</span>
                    </td>
                    <td className="p-3 font-mono">
                      <span className="text-emerald-400 font-extrabold text-sm">
                        -{token.ghgAbatementTonsCO2e} tCO2e
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {CERTIFIED_FUELS_CATALOG[token.fuelType]?.ghgReductionPercentage}% ahorro
                      </span>
                    </td>
                    <td className="p-3 text-[11px] text-slate-300">
                      <span>{token.bunkerLocation.split('-')[0]}</span>
                      <span className="text-[10px] text-slate-500 block font-mono">{token.bdnReference}</span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 block w-max">
                        RETIRED
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono mt-0.5 block truncate max-w-[120px]">
                        {token.sustainabilityCertificateNumber}
                      </span>
                    </td>
                    <td className="p-3">
                      <Button
                        onClick={() => handleDownloadPDF(token)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Certificado PDF</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ALLOCATION STUDIO */}
      {activeTab === 'ALLOCATION_STUDIO' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Allocation Form */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">Asignación de Combustible Verde & Mass Balance</h3>
            </div>
            <p className="text-xs text-slate-400">
              Asigna de forma vinculante masa de combustible renovable bunkered bajo esquema Book-and-Claim a un
              embarque específico para transferir el derecho de cómputo Scope 3 al cliente.
            </p>

            <form onSubmit={handleIssueToken} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Tipo de Combustible Sostenible</label>
                  <select
                    value={allocForm.fuelType}
                    onChange={(e) => setAllocForm({ ...allocForm, fuelType: e.target.value as FuelType })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    {Object.values(CERTIFIED_FUELS_CATALOG).map((f) => (
                      <option key={f.fuelType} value={f.fuelType}>
                        {f.displayName} ({f.ghgReductionPercentage}% ahorro)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Masa de Combustible Asignada (MT)</label>
                  <input
                    type="number"
                    step="5"
                    min="1"
                    value={allocForm.fuelVolumeMT}
                    onChange={(e) => setAllocForm({ ...allocForm, fuelVolumeMT: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Modalidad de Transporte</label>
                  <select
                    value={allocForm.transportMode}
                    onChange={(e) => setAllocForm({ ...allocForm, transportMode: e.target.value as TransportMode })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="MARITIME_OCEAN">Marítimo Oceánico (Portacontenedores)</option>
                    <option value="ROAD_DRAYAGE">Carretera (Camión Acarreo Can Tunis / TLSA)</option>
                    <option value="INTERMODAL_RAIL">Ferroviario Intermodal (Lanzadera Tren)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Lugar de Suministro / Bunkering</label>
                  <input
                    type="text"
                    value={allocForm.bunkerLocation}
                    onChange={(e) => setAllocForm({ ...allocForm, bunkerLocation: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Referencia Albarán Bunkering (BDN)</label>
                  <input
                    type="text"
                    value={allocForm.bdnReference}
                    onChange={(e) => setAllocForm({ ...allocForm, bdnReference: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">N° Certificación de Sostenibilidad</label>
                  <input
                    type="text"
                    value={allocForm.sustainabilityCertificateNumber}
                    onChange={(e) => setAllocForm({ ...allocForm, sustainabilityCertificateNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="allocatedShipmentRef" className="block text-slate-400 mb-1">Referencia Expedición / Embarque</label>
                  <input
                    id="allocatedShipmentRef"
                    data-testid="allocatedShipmentRef"
                    type="text"
                    value={allocForm.allocatedShipmentRef}
                    onChange={(e) => setAllocForm({ ...allocForm, allocatedShipmentRef: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Entidad Beneficiaria (Cliente)</label>
                  <input
                    type="text"
                    value={allocForm.beneficiaryCompany}
                    onChange={(e) => setAllocForm({ ...allocForm, beneficiaryCompany: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                onClick={handleIssueToken}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 mt-4 text-sm cursor-pointer"
              >
                <Coins className="w-4 h-4" />
                <span>Firmar Digitalmente & Expedir Token de Insetting</span>
              </button>
            </form>
          </div>

          {/* Real-time Abatement Calculator Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4" />
                <span>Auditoría Telemétrica ISO 14083</span>
              </div>
              <h3 className="font-bold text-base text-white mt-1">Cálculo de Descarbonización en Tiempo Real</h3>
              <p className="text-xs text-slate-400 mt-1">
                Parámetros de ciclo de vida Well-to-Wake aplicados conforme al estándar oficial GLEC v3.0.
              </p>

              <div className="mt-4 space-y-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Contenido Energético Asignado</span>
                  <span className="text-xl font-bold font-mono text-white">
                    {(liveAbatement.energyContentMJ / 1000000).toFixed(2)} GJ
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    ({liveAbatement.energyContentMJ.toLocaleString()} MJ)
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Línea Base Fósil (VLSFO/Diesel)</span>
                  <span className="text-base font-bold font-mono text-slate-300">
                    {liveAbatement.baselineEmissionsMTCO2e} tCO2e
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Emisiones Reales Combustible Verde</span>
                  <span className="text-base font-bold font-mono text-cyan-400">
                    {liveAbatement.actualEmissionsMTCO2e} tCO2e
                  </span>
                </div>

                <div className="bg-emerald-950/40 p-4 rounded-xl border border-emerald-500/40">
                  <span className="text-emerald-300 font-bold block text-xs">Reducción Scope 3 Acreditada</span>
                  <span className="text-3xl font-extrabold font-mono text-emerald-400 block mt-1">
                    -{liveAbatement.abatedEmissionsMTCO2e} tCO2e
                  </span>
                  <span className="text-[11px] text-emerald-300 mt-1 block">
                    {liveAbatement.reductionPercentage}% de reducción neta de emisiones
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-3">
              Certificación vinculante RED II · Custodia Mass Balance Book-and-Claim
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FUELEU POOLING SIMULATOR */}
      {activeTab === 'FUELEU_POOLING' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Ship className="w-5 h-5 text-indigo-400" />
                <span>Simulador de Pooling de Flota FuelEU Maritime (Reglamento UE 2023/1805)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Transfiere excedentes de intensidad de GEI desde buques alimentados con biocombustibles/e-metanol hacia
                buques convencionales en déficit, anulando multas comunitarias.
              </p>
            </div>
            <Button
              onClick={handleExecutePool}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-900/40"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Ejecutar & Sellar Pool de Cumplimiento</span>
            </Button>
          </div>

          {/* Pool Summary Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <span className="text-slate-400 text-xs block">Superávit Bruto Generado (Buques Verdes)</span>
              <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
                +{(poolResult.grossSurplusGCO2e / 1000000).toFixed(2)} MtCO2e
              </span>
              <span className="text-[10px] text-slate-500">e-Metanol & Bio-LNG blends</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <span className="text-slate-400 text-xs block">Déficit Bruto Compensado (Buques Fósiles)</span>
              <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">
                -{(poolResult.grossDeficitGCO2e / 1000000).toFixed(2)} MtCO2e
              </span>
              <span className="text-[10px] text-slate-500">VLSFO convencional en rutas UE</span>
            </div>

            <div className="bg-slate-950 border border-indigo-500/40 rounded-xl p-4">
              <span className="text-slate-400 text-xs block">Multas FuelEU Evitadas en Flota</span>
              <span className="text-2xl font-extrabold font-mono text-indigo-400 mt-1 block">
                €{poolResult.totalPenaltyAvoidedEur.toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-400">Tasa sancionadora €2.400 / ton VLSFO equiv</span>
            </div>
          </div>

          {/* Vessel Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-3">Buque & IMO</th>
                  <th className="p-3">Combustible Bunkered</th>
                  <th className="p-3">Intensidad GEI</th>
                  <th className="p-3">Balance Pre-Pool</th>
                  <th className="p-3">Multa Pre-Pool</th>
                  <th className="p-3">Compensación del Pool</th>
                  <th className="p-3">Balance Post-Pool</th>
                  <th className="p-3">Estatus Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {poolResult.vessels.map((v) => {
                  const vesselInput = SEED_FUELEU_POOL_VESSELS.find((iv) => iv.imo === v.imo);
                  return (
                    <tr key={v.imo} className="hover:bg-slate-800/50">
                      <td className="p-3">
                        <span className="font-bold text-white block">{v.vesselName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">IMO {v.imo}</span>
                      </td>
                      <td className="p-3 font-semibold text-slate-200">
                        {vesselInput?.fuelType || 'CONVENTIONAL_VLSFO'}
                      </td>
                      <td className="p-3 font-mono">
                        <span className="text-white font-bold">{vesselInput?.actualGhgIntensity}</span>
                        <span className="text-[10px] text-slate-500 block">vs meta 89.34 g/MJ</span>
                      </td>
                      <td className="p-3 font-mono">
                        <span
                          className={`font-bold ${
                            v.prePoolBalanceMJ >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {v.prePoolBalanceMJ >= 0 ? '+' : ''}
                          {(v.prePoolBalanceMJ / 1000000).toFixed(2)} Mt
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-400">
                        {v.penaltyPrePoolEur > 0 ? (
                          <span className="text-red-400 font-bold">€{v.penaltyPrePoolEur.toLocaleString()}</span>
                        ) : (
                          '€0'
                        )}
                      </td>
                      <td className="p-3 font-mono text-cyan-300">
                        {v.allocatedFromPoolGCO2e > 0
                          ? `+${(v.allocatedFromPoolGCO2e / 1000000).toFixed(2)} Mt transferidos`
                          : 'Aportador neto'}
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-400">
                        {(v.postPoolBalanceGCO2e / 1000000).toFixed(2)} Mt
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                          {v.penaltyPostPoolEur === 0 ? 'COMPLIANT (0 MULTA)' : 'DEFICIT'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-slate-400">
            <span>Sello Criptográfico del Contrato de Pooling:</span>
            <span className="text-indigo-400 font-bold">{poolResult.contractSealHash}</span>
          </div>
        </div>
      )}

      {/* TAB 4: SUSTAINABILITY AUDIT */}
      {activeTab === 'SUSTAINABILITY_AUDIT' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-400" />
              <span>Dossier Técnico de Combustibles Sostenibles & Esquemas de Certificación</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Catálogo auditado de combustibles marinos y terrestres conforme a la Directiva RED II y el Código ISM /
              MARPOL Anexo VI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(CERTIFIED_FUELS_CATALOG).map((fuel) => (
              <div key={fuel.fuelType} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                      {fuel.certificationScheme}
                    </span>
                    <h4 className="text-base font-bold text-white mt-1">{fuel.displayName}</h4>
                  </div>
                  <span className="text-emerald-400 font-extrabold text-sm font-mono">
                    {fuel.ghgReductionPercentage}% GHG Abatement
                  </span>
                </div>

                <p className="text-xs text-slate-300">
                  <strong>Materia Prima (Feedstock):</strong> {fuel.feedstock}
                </p>

                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">Factor WtW</span>
                    <span className="font-bold text-slate-200">{fuel.wtwFactorGCO2ePerMJ} g/MJ</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">Densidad Energía</span>
                    <span className="font-bold text-slate-200">{fuel.energyDensityMJPerKg} MJ/kg</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">Línea Fósil</span>
                    <span className="font-bold text-slate-200">{fuel.baselineFossilWtwFactorGCO2ePerMJ} g/MJ</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
