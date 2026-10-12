import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck,
  ShieldCheck,
  FileText,
  QrCode,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  ArrowRight,
  Percent,
  DollarSign,
  Compass,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Zap,
  Building,
  User,
  Scale,
  Calendar,
  Layers,
} from "lucide-react";
import { Button, Input } from "@atlas/ui";
import { useApiMutation } from "../hooks/useApiQuery";
import type {
  CartaPorteInput,
  CartaPorteStampingResult,
  UsmcaRvcInput,
  UsmcaRvcResult,
  ImmexTariffOptimizationInput,
  ImmexTariffOptimizationResult,
  CustomsDwellPredictionInput,
  CustomsDwellPredictionResult,
} from "@atlas/shared";
import {
  USMCA_DEMO_PRESETS,
  buildAndStampCartaPorte31,
  calculateUsmcaRegionalValueContent,
  calculateImmexTariffOptimization,
  predictCustomsDwellTime,
} from "@atlas/shared";

type PresetKey = "laredo_automotive_immex" | "manzanillo_electronics_inbound" | "veracruz_reefer_perishable";

export default function CrossBorderUsmcaModule() {
  const [activeTab, setActiveTab] = useState<"CARTA_PORTE" | "USMCA_IMMEX" | "CUSTOMS_ML">("CARTA_PORTE");
  const [selectedPresetKey, setSelectedPresetKey] = useState<PresetKey>("laredo_automotive_immex");
  const [copiedXml, setCopiedXml] = useState(false);
  const [copiedIdCCP, setCopiedIdCCP] = useState(false);

  // Active state initialized from the first preset
  const currentPreset = USMCA_DEMO_PRESETS[selectedPresetKey];
  const [cartaPorteData, setCartaPorteData] = useState<CartaPorteInput>(currentPreset.cartaPorteInput as CartaPorteInput);
  const [stampingResult, setStampingResult] = useState<CartaPorteStampingResult>(
    buildAndStampCartaPorte31(currentPreset.cartaPorteInput as CartaPorteInput)
  );

  const [rvcInputData, setRvcInputData] = useState<UsmcaRvcInput>(currentPreset.rvcInput as UsmcaRvcInput);
  const [rvcResult, setRvcResult] = useState<UsmcaRvcResult>(
    calculateUsmcaRegionalValueContent(currentPreset.rvcInput as UsmcaRvcInput)
  );

  const [immexInputData, setImmexInputData] = useState<ImmexTariffOptimizationInput>(currentPreset.immexInput as ImmexTariffOptimizationInput);
  const [immexResult, setImmexResult] = useState<ImmexTariffOptimizationResult>(
    calculateImmexTariffOptimization(currentPreset.immexInput as ImmexTariffOptimizationInput)
  );

  const [dwellInputData, setDwellInputData] = useState<CustomsDwellPredictionInput>(currentPreset.dwellInput as CustomsDwellPredictionInput);
  const [dwellResult, setDwellResult] = useState<CustomsDwellPredictionResult>(
    predictCustomsDwellTime(currentPreset.dwellInput as CustomsDwellPredictionInput)
  );

  // Mutations
  const stampMutation = useApiMutation<{ success: boolean; data: CartaPorteStampingResult }, CartaPorteInput>(
    "/cross-border/carta-porte/stamp",
    "POST",
    {
      onSuccess: (res) => setStampingResult(res.data),
    }
  );

  const rvcMutation = useApiMutation<{ success: boolean; data: UsmcaRvcResult }, UsmcaRvcInput>(
    "/cross-border/usmca/rvc",
    "POST",
    {
      onSuccess: (res) => setRvcResult(res.data),
    }
  );

  const immexMutation = useApiMutation<{ success: boolean; data: ImmexTariffOptimizationResult }, ImmexTariffOptimizationInput>(
    "/cross-border/immex/optimize",
    "POST",
    {
      onSuccess: (res) => setImmexResult(res.data),
    }
  );

  const customsMutation = useApiMutation<{ success: boolean; data: CustomsDwellPredictionResult }, CustomsDwellPredictionInput>(
    "/cross-border/customs/predict",
    "POST",
    {
      onSuccess: (res) => setDwellResult(res.data),
    }
  );

  // Handler for preset selection
  const handleSelectPreset = (key: PresetKey) => {
    setSelectedPresetKey(key);
    const p = USMCA_DEMO_PRESETS[key];
    setCartaPorteData(p.cartaPorteInput as CartaPorteInput);
    setStampingResult(buildAndStampCartaPorte31(p.cartaPorteInput as CartaPorteInput));
    setRvcInputData(p.rvcInput as UsmcaRvcInput);
    setRvcResult(calculateUsmcaRegionalValueContent(p.rvcInput as UsmcaRvcInput));
    setImmexInputData(p.immexInput as ImmexTariffOptimizationInput);
    setImmexResult(calculateImmexTariffOptimization(p.immexInput as ImmexTariffOptimizationInput));
    setDwellInputData(p.dwellInput as CustomsDwellPredictionInput);
    setDwellResult(predictCustomsDwellTime(p.dwellInput as CustomsDwellPredictionInput));
  };

  const handleCopyXml = () => {
    if (stampingResult?.stampedXml) {
      navigator.clipboard.writeText(stampingResult.stampedXml);
      setCopiedXml(true);
      setTimeout(() => setCopiedXml(false), 2000);
    }
  };

  const handleCopyIdCCP = () => {
    if (stampingResult?.idCCP) {
      navigator.clipboard.writeText(stampingResult.idCCP);
      setCopiedIdCCP(true);
      setTimeout(() => setCopiedIdCCP(false), 2000);
    }
  };

  const handleExecuteStamping = () => {
    stampMutation.mutate(cartaPorteData);
  };

  const handleExecuteRvc = () => {
    rvcMutation.mutate(rvcInputData);
  };

  const handleExecuteImmex = () => {
    immexMutation.mutate(immexInputData);
  };

  const handleExecuteCustomsPrediction = () => {
    customsMutation.mutate(dwellInputData);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      {/* Top Header & Context Badges */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Corredor Transfronterizo Norteamérica
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  T-MEC / USMCA
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  SAT CP 3.1
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Autotransporte Federal SCT, CFDI 4.0 con IdCCP universal, Reglas de Origen VCR (Art. 4.5), Exención IMMEX y Predictor ML Aduanal
              </p>
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400">PAC Diverza SAT:</span>
            <span className="font-semibold text-emerald-400">En Línea (5819)</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Programa IMMEX:</span>
            <span className="font-semibold text-cyan-400">Certificado IVA/IEPS</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">ML Aduanas:</span>
            <span className="font-semibold text-amber-400">94% Precisión</span>
          </div>
        </div>
      </div>

      {/* Preset Scenario Selector Banner */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Compass className="w-5 h-5 text-indigo-400 flex-shrink-0" />
          <div>
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block">
              Escenarios Transfronterizos Demostrativos
            </span>
            <span className="text-sm text-slate-300 font-medium">
              {currentPreset.title}: {currentPreset.description}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["laredo_automotive_immex", "manzanillo_electronics_inbound", "veracruz_reefer_perishable"] as PresetKey[]).map((key) => {
            const p = USMCA_DEMO_PRESETS[key];
            const isSelected = selectedPresetKey === key;
            return (
              <button
                key={key}
                onClick={() => handleSelectPreset(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {p.title.split(". ")[1]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab("CARTA_PORTE")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${
            activeTab === "CARTA_PORTE"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          SAT Carta Porte 3.1 & CFDI 4.0
        </button>

        <button
          onClick={() => setActiveTab("USMCA_IMMEX")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${
            activeTab === "USMCA_IMMEX"
              ? "border-cyan-500 text-cyan-400 bg-cyan-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Percent className="w-4 h-4" />
          Reglas de Origen T-MEC & IMMEX
        </button>

        <button
          onClick={() => setActiveTab("CUSTOMS_ML")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${
            activeTab === "CUSTOMS_ML"
              ? "border-amber-500 text-amber-400 bg-amber-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Clock className="w-4 h-4" />
          Predictor ML de Permanencia y Aforo
        </button>
      </div>

      {/* Tab 1: Carta Porte 3.1 Studio */}
      <AnimatePresence mode="wait">
        {activeTab === "CARTA_PORTE" && (
          <motion.div
            key="carta-porte"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Form Left Side */}
            <div className="lg:col-span-7 space-y-6">
              {/* Emisor / Receptor Card */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Building className="w-4 h-4 text-emerald-400" />
                    CFDI 4.0 Comprobante & Figuras Fiscales
                  </h3>
                  <span className="text-xs text-slate-400">Ref: {cartaPorteData.shipmentRef}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Emisor (Transportista SCT)
                    </span>
                    <p className="font-semibold text-slate-200">{cartaPorteData.razonSocialEmisor}</p>
                    <p className="text-emerald-400 font-mono">RFC: {cartaPorteData.rfcEmisor}</p>
                    <p className="text-slate-400">Régimen: {cartaPorteData.regimenFiscalEmisor || "601"}</p>
                    <p className="text-slate-400">CP Origen: {cartaPorteData.origen.codigoPostal}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Receptor (Destinatario Internacional)
                    </span>
                    <p className="font-semibold text-slate-200">{cartaPorteData.razonSocialReceptor}</p>
                    <p className="text-cyan-400 font-mono">RFC / Tax ID: {cartaPorteData.rfcReceptor}</p>
                    <p className="text-slate-400">Uso CFDI: S01 (Sin efectos fiscales)</p>
                    <p className="text-slate-400">CP Destino: {cartaPorteData.destino.codigoPostal}</p>
                  </div>
                </div>

                {/* Ruta y Distancia */}
                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/40 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500">Origen:</span> {cartaPorteData.origen.nombre}
                  </div>
                  <div className="flex items-center gap-2 text-indigo-400 font-medium">
                    <ArrowRight className="w-3.5 h-3.5" />
                    {cartaPorteData.distanciaRecorridaKm} km
                  </div>
                  <div>
                    <span className="text-slate-500">Destino:</span> {cartaPorteData.destino.nombre}
                  </div>
                </div>
              </div>

              {/* Autotransporte Federal SCT & Operador */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Truck className="w-4 h-4 text-cyan-400" />
                    Identificación Vehicular SCT & Póliza Civil
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono">
                    {cartaPorteData.autotransporte.configVehicular}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-slate-500 block text-[10px]">Placa Federal</span>
                    <span className="font-semibold text-white font-mono">{cartaPorteData.autotransporte.placa}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-slate-500 block text-[10px]">Año Modelo</span>
                    <span className="font-semibold text-white">{cartaPorteData.autotransporte.anioModelo}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-slate-500 block text-[10px]">Permiso SCT</span>
                    <span className="font-semibold text-white">{cartaPorteData.autotransporte.permisoSct}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-slate-500 block text-[10px]">Póliza RC</span>
                    <span className="font-semibold text-emerald-400 truncate block">
                      {cartaPorteData.autotransporte.polizaRespCivil}
                    </span>
                  </div>
                </div>

                {/* Operador Card */}
                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <div>
                      <span className="text-slate-300 font-semibold">{cartaPorteData.operador.nombre}</span>
                      <span className="text-slate-500 ml-2 font-mono">({cartaPorteData.operador.rfc})</span>
                    </div>
                  </div>
                  <div className="font-mono text-cyan-400">
                    Lic: {cartaPorteData.operador.numLicencia}
                  </div>
                </div>
              </div>

              {/* Mercancías en Tránsito */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    Mercancías Transportadas ({cartaPorteData.mercancias.length})
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">
                    Peso Total: {cartaPorteData.mercancias.reduce((a, m) => a + m.pesoKg, 0).toLocaleString()} kg
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-medium">
                        <th className="pb-2">Clave SAT</th>
                        <th className="pb-2">Descripción</th>
                        <th className="pb-2">Fracción</th>
                        <th className="pb-2 text-right">Peso (kg)</th>
                        <th className="pb-2 text-right">HazMat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {cartaPorteData.mercancias.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="py-2.5 font-mono text-emerald-400">{m.claveProdServ}</td>
                          <td className="py-2.5 max-w-[200px] truncate">{m.descripcion}</td>
                          <td className="py-2.5 font-mono text-cyan-400">{m.fraccionArancelaria || "N/A"}</td>
                          <td className="py-2.5 text-right font-medium">{m.pesoKg.toLocaleString()}</td>
                          <td className="py-2.5 text-right">
                            {m.materialPeligroso ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                                {m.claveMaterialPeligroso || "UN HAZMAT"}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[10px]">NO</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Subtotales y Total Flete */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between text-xs">
                  <div className="text-slate-400">
                    Subtotal: <span className="font-semibold text-white font-mono">${cartaPorteData.subtotalMxn.toLocaleString()} MXN</span> | IVA 16%: <span className="font-mono">${cartaPorteData.ivaMxn.toLocaleString()} MXN</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Total Flete Facturado</span>
                    <span className="text-base font-bold text-emerald-400 font-mono">
                      ${cartaPorteData.totalMxn.toLocaleString()} MXN
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleExecuteStamping}
                    disabled={stampMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2"
                  >
                    {stampMutation.isPending ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    Timbrar Carta Porte 3.1 (Diverza PAC)
                  </Button>
                </div>
              </div>
            </div>

            {/* Output Right Side: Stamped Result & QR & XML */}
            <div className="lg:col-span-5 space-y-6">
              {/* IdCCP Hero Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Identificador Universal SAT CP 3.1
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                    TIMBRADO VÁLIDO
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">IdCCP (36 Caracteres)</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-sm md:text-base font-bold text-white break-all bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex-1">
                      {stampingResult?.idCCP}
                    </span>
                    <button
                      onClick={handleCopyIdCCP}
                      className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Copiar IdCCP"
                    >
                      {copiedIdCCP ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80">
                    <span className="text-slate-500 text-[10px] block">UUID Fiscal</span>
                    <span className="font-mono text-slate-300 text-[11px] truncate block">
                      {stampingResult?.uuid}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80">
                    <span className="text-slate-500 text-[10px] block">PAC Autorizado</span>
                    <span className="text-slate-300 text-[11px] truncate block font-medium">
                      {stampingResult?.pacProvider}
                    </span>
                  </div>
                </div>

                {/* QR SAT Viewer */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-4">
                  <div className="p-3 bg-white rounded-lg flex-shrink-0 flex items-center justify-center">
                    <QrCode className="w-14 h-14 text-slate-950" />
                  </div>
                  <div className="space-y-1 text-xs">
                    <span className="text-slate-300 font-semibold block">Código QR de Verificación SAT</span>
                    <p className="text-[11px] text-slate-400">
                      Escaneo para verificación inmediata de transportación federal en retenes aduanales y Guardia Nacional.
                    </p>
                    <a
                      href={stampingResult?.qrCodeSatUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px] font-mono mt-1"
                    >
                      Verificar en Portal SAT <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* XML Stamped Viewer */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    XML CFDI 4.0 con Complemento CP 3.1
                  </h4>
                  <button
                    onClick={handleCopyXml}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
                  >
                    {copiedXml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedXml ? "Copiado" : "Copiar XML"}
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400 max-h-72 overflow-y-auto whitespace-pre leading-relaxed">
                  {stampingResult?.stampedXml}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 2: USMCA RVC & IMMEX Optimizer */}
        {activeTab === "USMCA_IMMEX" && (
          <motion.div
            key="usmca-immex"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Left Col: RVC Calculator (Art 4.5) */}
            <div className="lg:col-span-6 space-y-6">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Percent className="w-4 h-4 text-cyan-400" />
                      Calculadora de Valor de Contenido Regional (VCR)
                    </h3>
                    <p className="text-xs text-slate-400">T-MEC / USMCA Reglas de Origen (Artículo 4.5)</p>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                    Art. 4.5
                  </span>
                </div>

                {/* Form Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">Fracción Arancelaria (HS Code)</label>
                    <Input
                      value={rvcInputData.hsCode}
                      onChange={(e) => setRvcInputData({ ...rvcInputData, hsCode: e.target.value })}
                      className="bg-slate-950 border-slate-800 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">Método de Cálculo</label>
                    <select
                      value={rvcInputData.method}
                      onChange={(e) => setRvcInputData({ ...rvcInputData, method: e.target.value as any })}
                      className="w-full h-9 rounded-md bg-slate-950 border border-slate-800 px-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="NET_COST">Costo Neto (CN) - Umbral 50%/75%</option>
                      <option value="TRANSACTION_VALUE">Valor de Transacción (VT) - Umbral 60%</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">
                      {rvcInputData.method === "TRANSACTION_VALUE" ? "Valor de Transacción (VT USD)" : "Costo Neto Total (CN USD)"}
                    </label>
                    <Input
                      type="number"
                      value={rvcInputData.method === "TRANSACTION_VALUE" ? rvcInputData.transactionValueUsd : rvcInputData.netCostUsd}
                      onChange={(e) =>
                        rvcInputData.method === "TRANSACTION_VALUE"
                          ? setRvcInputData({ ...rvcInputData, transactionValueUsd: parseFloat(e.target.value) || 0 })
                          : setRvcInputData({ ...rvcInputData, netCostUsd: parseFloat(e.target.value) || 0 })
                      }
                      className="bg-slate-950 border-slate-800 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">
                      Materiales No Originarios (VMO USD)
                    </label>
                    <Input
                      type="number"
                      value={rvcInputData.nonOriginatingMaterialsCostUsd}
                      onChange={(e) =>
                        setRvcInputData({
                          ...rvcInputData,
                          nonOriginatingMaterialsCostUsd: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="bg-slate-950 border-slate-800 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleExecuteRvc}
                    disabled={rvcMutation.isPending}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-2"
                  >
                    {rvcMutation.isPending ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Scale className="w-3.5 h-3.5" />
                    )}
                    Recalcular VCR T-MEC
                  </Button>
                </div>

                {/* RVC Result Card */}
                {rvcResult && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                          Porcentaje VCR Obtenido
                        </span>
                        <div className="text-3xl font-bold font-mono text-cyan-400">
                          {rvcResult.rvcPercentage}%
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                          Umbral Requerido
                        </span>
                        <span className="text-lg font-mono font-semibold text-slate-300">
                          {rvcResult.thresholdRequiredPercentage}%
                        </span>
                      </div>
                    </div>

                    {/* Gauge Bar */}
                    <div className="space-y-1">
                      <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full transition-all duration-500 ${
                            rvcResult.qualifiesForUsmca ? "bg-emerald-500" : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(100, rvcResult.rvcPercentage)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>0%</span>
                        <span className="text-cyan-400 font-semibold font-mono">
                          Umbral: {rvcResult.thresholdRequiredPercentage}%
                        </span>
                        <span>100%</span>
                      </div>
                    </div>

                    {/* Qualification Badge */}
                    <div
                      className={`p-3 rounded-xl border flex items-center gap-3 ${
                        rvcResult.qualifiesForUsmca
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-red-500/10 border-red-500/30 text-red-300"
                      }`}
                    >
                      {rvcResult.qualifiesForUsmca ? (
                        <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      )}
                      <div className="text-xs">
                        <span className="font-bold block">
                          {rvcResult.qualifiesForUsmca
                            ? "CALIFICA PARA ARANCEL PREFERENCIAL T-MEC (0%)"
                            : "NO CALIFICA PARA PREFERENCIA ARANCELARIA"}
                        </span>
                        <span className="text-[11px] opacity-80">{rvcResult.ruleAppliedDescription}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: IMMEX & Pedimento Optimizer */}
            <div className="lg:col-span-6 space-y-6">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      Optimizador Arancelario & Programa IMMEX
                    </h3>
                    <p className="text-xs text-slate-400">Exención de Impuesto General de Importación (IGI)</p>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                    IMMEX AF
                  </span>
                </div>

                {/* Form Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">Valor Declarado (USD)</label>
                    <Input
                      type="number"
                      value={immexInputData.declaredValueUsd}
                      onChange={(e) =>
                        setImmexInputData({
                          ...immexInputData,
                          declaredValueUsd: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="bg-slate-950 border-slate-800 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">País de Origen</label>
                    <select
                      value={immexInputData.originCountry}
                      onChange={(e) =>
                        setImmexInputData({ ...immexInputData, originCountry: e.target.value as any })
                      }
                      className="w-full h-9 rounded-md bg-slate-950 border border-slate-800 px-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="US">Estados Unidos (US - T-MEC)</option>
                      <option value="CA">Canadá (CA - T-MEC)</option>
                      <option value="MX">México (MX)</option>
                      <option value="CN">China (CN - Tercer País MFN)</option>
                      <option value="DE">Alemania (DE)</option>
                      <option value="OTHER">Otro País</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
                    <div>
                      <span className="text-slate-200 font-medium block">Programa IMMEX Habilitado</span>
                      <span className="text-slate-500 text-[11px]">
                        Importación temporal para transformación, elaboración o ensamble
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={immexInputData.isImmexProgramActive !== false}
                      onChange={(e) =>
                        setImmexInputData({ ...immexInputData, isImmexProgramActive: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleExecuteImmex}
                    disabled={immexMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2"
                  >
                    {immexMutation.isPending ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <DollarSign className="w-3.5 h-3.5" />
                    )}
                    Optimizar Régimen Arancelario
                  </Button>
                </div>

                {/* IMMEX Result Breakdown */}
                {immexResult && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-emerald-400 font-medium block">
                          Ahorro Arancelario Total (IGI Exento)
                        </span>
                        <div className="text-2xl font-bold font-mono text-emerald-300">
                          ${immexResult.dutySavingsUsd.toLocaleString()} USD
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">Pedimento Sugerido</span>
                        <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs">
                          {immexResult.recommendedPedimentoType}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                        <span className="text-slate-500 text-[10px] block">Arancel General MFN</span>
                        <span className="font-mono text-slate-300 font-semibold">
                          {immexResult.standardMfnDutyRatePercent}% (${immexResult.standardDutyPayableUsd.toLocaleString()} USD)
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                        <span className="text-slate-500 text-[10px] block">Arancel Aplicado</span>
                        <span className="font-mono text-emerald-400 font-semibold">
                          {immexResult.immexDutyRatePercent}% (${immexResult.immexDutyPayableUsd.toLocaleString()} USD)
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                        <span className="text-slate-500 text-[10px] block">Permanencia Máxima</span>
                        <span className="font-semibold text-slate-300">
                          {immexResult.maxPermanenceMonths} meses
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                        <span className="text-slate-500 text-[10px] block">Crédito Fiscal IVA</span>
                        <span className="font-semibold text-cyan-400">
                          {immexResult.vatCreditEligible ? "16% Exento / Diferido" : "16% Causado"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 3: Machine Learning Customs Dwell & Red Channel Predictor */}
        {activeTab === "CUSTOMS_ML" && (
          <motion.div
            key="customs-ml"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Left Col: Prediction Configuration */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Parámetros de Aforo Aduanal
                  </h3>
                  <span className="text-xs text-amber-400 font-mono">IA Predictor</span>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">Número de Pedimento Aduanal</label>
                    <Input
                      value={dwellInputData.pedimentoNumber}
                      onChange={(e) => setDwellInputData({ ...dwellInputData, pedimentoNumber: e.target.value })}
                      className="bg-slate-950 border-slate-800 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">Aduana de Despacho</label>
                    <select
                      value={dwellInputData.customsPortCode}
                      onChange={(e) =>
                        setDwellInputData({ ...dwellInputData, customsPortCode: e.target.value as any })
                      }
                      className="w-full h-9 rounded-md bg-slate-950 border border-slate-800 px-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="MXNLD">Nuevo Laredo (MXNLD - Puente Comercio Mundial)</option>
                      <option value="MXZLO">Manzanillo (MXZLO - SSA / Contecon)</option>
                      <option value="MXVER">Veracruz (MXVER - Terminal ICAVE)</option>
                      <option value="MXATM">Altamira (MXATM - Terminal ATP)</option>
                      <option value="MXMEX">CDMX / AIFA Carga Aérea (MXMEX)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">
                      Mecanismo de Selección Automatizada (Semáforo)
                    </label>
                    <select
                      value={dwellInputData.trafficLightOutcome}
                      onChange={(e) =>
                        setDwellInputData({ ...dwellInputData, trafficLightOutcome: e.target.value as any })
                      }
                      className="w-full h-9 rounded-md bg-slate-950 border border-slate-800 px-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="GREEN_CLEARANCE">Canal Verde (Despacho Libre Inmediato)</option>
                      <option value="RED_INSPECTION">Aforo Rojo (Reconocimiento Físico & Rayos Gamma)</option>
                      <option value="PENDING_SELECTION">Pendiente de Selección en Muelle</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
                    <div>
                      <span className="text-slate-200 font-medium block">Contenedor Refrigerado (Reefer)</span>
                      <span className="text-slate-500 text-[11px]">
                        Protocolo expedito para perecederos (-15% de tiempo de espera)
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={dwellInputData.hasReeferCargo}
                      onChange={(e) =>
                        setDwellInputData({ ...dwellInputData, hasReeferCargo: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleExecuteCustomsPrediction}
                    disabled={customsMutation.isPending}
                    className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2"
                  >
                    {customsMutation.isPending ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    Predecir Permanencia con IA
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Col: Prediction Dashboard */}
            <div className="lg:col-span-7 space-y-6">
              {dwellResult && (
                <>
                  {/* Hero Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-slate-500 text-xs font-semibold uppercase block">
                        Tiempo Estimado (Dwell)
                      </span>
                      <div className="text-3xl font-bold font-mono text-amber-400">
                        {dwellResult.estimatedDwellHours}h
                      </div>
                      <span className="text-[11px] text-slate-400">En patio aduanero</span>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-slate-500 text-xs font-semibold uppercase block">
                        Categoría de Riesgo
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                            dwellResult.riskCategory === "HIGH_RISK"
                              ? "bg-red-500/20 text-red-300 border border-red-500/30"
                              : dwellResult.riskCategory === "MEDIUM_RISK"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {dwellResult.riskCategory}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Confianza del modelo: {dwellResult.confidenceScorePercent}%
                      </span>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-slate-500 text-xs font-semibold uppercase block">
                        Prob. Canal Rojo
                      </span>
                      <div className="text-3xl font-bold font-mono text-rose-400">
                        {dwellResult.redChannelProbabilityPercent}%
                      </div>
                      <span className="text-[11px] text-slate-400">Por fracción arancelaria</span>
                    </div>
                  </div>

                  {/* Gate-Out Prediction Card */}
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-cyan-400" />
                        Fecha y Hora Prevista de Salida de Garita (Gate-Out)
                      </h4>
                      <span className="text-xs font-mono text-cyan-400">
                        {dwellResult.portName}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div className="font-mono text-base font-bold text-white">
                        {new Date(dwellResult.predictedGateOutTimestamp).toLocaleString()}
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300">
                        Hora Centro (UTC-6)
                      </span>
                    </div>
                  </div>

                  {/* Key Predictors Breakdown */}
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      Factores Predictivos Clave (Explainable AI)
                    </h4>

                    <div className="space-y-2">
                      {dwellResult.keyPredictors.map((p, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-start justify-between gap-4 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-200 block">{p.feature}</span>
                            <span className="text-slate-400 text-[11px]">{p.description}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold flex-shrink-0 ${
                              p.impact === "INCREMENTAL_DELAY"
                                ? "bg-red-500/20 text-red-300"
                                : p.impact === "FASTER_CLEARANCE"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {p.impact}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Recommended Actions */}
                    {dwellResult.recommendedActions.length > 0 && (
                      <div className="pt-3 border-t border-slate-800 space-y-2">
                        <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
                          Recomendaciones Operativas
                        </span>
                        <ul className="space-y-1 text-xs text-slate-300">
                          {dwellResult.recommendedActions.map((act, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              {act}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
