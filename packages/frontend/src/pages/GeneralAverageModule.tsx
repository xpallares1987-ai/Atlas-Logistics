import { useState } from "react";
import {
  ShieldAlert,
  Flame,
  Ship,
  FileText,
  DollarSign,
  Percent,
  Download,
  Play,
  Building2,
  CheckCircle2,
  Lock,
  Unlock,
  Scale,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";

interface GaCaseRecord {
  id: string;
  caseReference: string;
  vesselName: string;
  imoNumber: string;
  flagState: string;
  shipownerName: string;
  masterName: string;
  casualtyType: string;
  casualtyDate: string;
  casualtyLocation: string;
  voyageOrigin: string;
  voyageDestination: string;
  portOfRefuge: string;
  governingRules: string;
  salvageContractType: string;
  salvorName: string;
  averageAdjusterFirm: string;
  leadAdjusterName: string;
  estimatedLossUsd: number;
  estimatedContributionPercentage: number;
  declarationNarrative: string;
  status: string;
}

export default function GeneralAverageModule() {
  const [activeTab, setActiveTab] = useState<
    "cases" | "adjuster_simulator" | "securities"
  >("cases");

  const [cases] = useState<GaCaseRecord[]>([
    {
      id: "ga_case_valencia_01",
      caseReference: "GA-2026-VAL-0012",
      vesselName: "MV Valencia Bridge",
      imoNumber: "9751024",
      flagState: "Liberia",
      shipownerName: "Mediterranean Shipping Carriers SA",
      masterName: "Capt. Rodrigo Alarcón",
      casualtyType: "FIRE_EXPLOSION",
      casualtyDate: "2026-08-10",
      casualtyLocation: "Golfo de León (42° 15' N, 004° 20' E)",
      voyageOrigin: "Puerto de Valencia (ESVLC)",
      voyageDestination: "Puerto de Génova (ITGOA)",
      portOfRefuge: "Puerto de Marsella (FRMRS)",
      governingRules: "YAR_2016",
      salvageContractType: "LOF_2024_SCOPIC",
      salvorName: "Smit Salvage BV / Boluda Towage",
      averageAdjusterFirm: "Richards Hogg Lindley (RHL London & Madrid)",
      leadAdjusterName: "Senior Adjuster David Sterling",
      estimatedLossUsd: 1845000.0,
      estimatedContributionPercentage: 7.5,
      declarationNarrative:
        "Durante la travesía se declaró un incendio grave en la Bodega N° 2. Para salvar la aventura marítima común, el Capitán ordenó inundar con agua y espuma las bodegas adyacentes y solicitar asistencia de remolcadores de salvamento bajo contrato Lloyd's Open Form (LOF 2024 con cláusula SCOPIC), desviando el buque al puerto de refugio de Marsella.",
      status: "SECURITY_COLLECTION",
    },
    {
      id: "ga_case_cadiz_02",
      caseReference: "GA-2026-CDZ-0034",
      vesselName: "MV Atlantic Pioneer",
      imoNumber: "9642019",
      flagState: "Panama",
      shipownerName: "Iberian Bulk Carriers SL",
      masterName: "Capt. Manuel Barrientos",
      casualtyType: "GROUNDING_REFLOATING",
      casualtyDate: "2026-07-25",
      casualtyLocation: "Bajo de Las Puercas - Bahía de Cádiz",
      voyageOrigin: "Puerto de Santos (BRSSZ)",
      voyageDestination: "Puerto de Santander (ESSDR)",
      portOfRefuge: "Puerto de Cádiz (ESCAD)",
      governingRules: "YAR_2016",
      salvageContractType: "LOF_2024_SCOPIC",
      salvorName: "Boluda Towage Cadiz",
      averageAdjusterFirm: "Clyde & Co Average Adjusters",
      leadAdjusterName: "Adjuster Beatriz Fuentes",
      estimatedLossUsd: 920000.0,
      estimatedContributionPercentage: 4.8,
      declarationNarrative:
        "Varada involuntaria en bajo arenoso a la entrada del canal. Para evitar la pérdida del buque, se forzaron máquinas y calderas (Regla VII) y se efectuó alijo parcial de 3.500 MT de mineral en barcazas (Regla VIII).",
      status: "ADJUSTMENT_IN_PROGRESS",
    },
  ]);

  const [selectedCase, setSelectedCase] = useState<GaCaseRecord>(cases[0]);

  // Adjuster Simulator State
  const [simVesselSoundValue, setSimVesselSoundValue] =
    useState<number>(18500000);
  const [simVesselPartDamage, setSimVesselPartDamage] =
    useState<number>(600000);
  const [simVesselMadeGood, setSimVesselMadeGood] = useState<number>(250000);
  const [simFreightAtRisk, setSimFreightAtRisk] = useState<number>(650000);
  const [simCargoSoundValue, setSimCargoSoundValue] = useState<number>(5400000);
  const [simCargoMadeGood, setSimCargoMadeGood] = useState<number>(180000);

  const [simShipSacrifice, setSimShipSacrifice] = useState<number>(250000);
  const [simCargoSacrifice, setSimCargoSacrifice] = useState<number>(180000);
  const [simRefugeExpenses, setSimRefugeExpenses] = useState<number>(125000);
  const [simSalvageAward, setSimSalvageAward] = useState<number>(650000);
  const [simCmiInterestDays, setSimCmiInterestDays] = useState<number>(180);

  // Deterministic Calculation Logic
  const vesselCv = Math.max(
    0,
    simVesselSoundValue - simVesselPartDamage + simVesselMadeGood,
  );
  const freightCv = Math.max(0, simFreightAtRisk);
  const cargoCv = Math.max(0, simCargoSoundValue + simCargoMadeGood);
  const totalContributoryValue = vesselCv + freightCv + cargoCv;

  const ruleXxCommission = simRefugeExpenses * 0.025; // 2.5%
  const baseAllowances =
    simShipSacrifice +
    simCargoSacrifice +
    simRefugeExpenses +
    simSalvageAward +
    ruleXxCommission;
  const ruleXxiInterest = baseAllowances * 0.06 * (simCmiInterestDays / 365); // 6% annual CMI
  const totalAllowances = baseAllowances + ruleXxiInterest;

  const rateOfContribution =
    totalContributoryValue > 0
      ? (totalAllowances / totalContributoryValue) * 100
      : 0;

  // Individual Apportionment
  const vesselGrossContribution = (vesselCv * rateOfContribution) / 100;
  const vesselNetBalance = vesselGrossContribution - simVesselMadeGood;

  const freightGrossContribution = (freightCv * rateOfContribution) / 100;

  const cargoGrossContribution = (cargoCv * rateOfContribution) / 100;
  const cargoNetBalance = cargoGrossContribution - simCargoMadeGood;

  const recommendedCashDeposit = (cargoCv * (rateOfContribution + 10.0)) / 100;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Avería Gruesa Marítima & Salvamento (General Average & LOF)
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                York-Antwerp Rules 2016 / LOF 2024
              </span>
            </h1>
            <p className="text-sm text-slate-400">
              Declaración formal de avería gruesa, liquidación de masa activa y
              pasiva contributoria, prorrateo pericial y control de garantías
              Lloyd's Average Bond LAB 77.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() =>
              window.open(
                `/api/general-average/cases/${selectedCase.id}/declaration-pdf`,
                "_blank",
              )
            }
            className="bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-2 text-xs"
          >
            <Download className="w-4 h-4" />
            Descargar Declaración Notarial PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">
                Expedientes de Siniestro Activos
              </p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">2</h3>
              <p className="text-[11px] text-rose-400 mt-0.5">
                1 Incendio / 1 Varada con Alijo
              </p>
            </div>
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
              <Flame className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">
                Masa Activa Total Admisible
              </p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">
                $
                {totalAllowances.toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}{" "}
                USD
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Sacrificios, Refugio & Salvamento LOF
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">
                Masa Pasiva Contributoria
              </p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">
                $
                {totalContributoryValue.toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}{" "}
                USD
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Buque + Flete al Riesgo + Carga CIF
              </p>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Ship className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">
                Tasa de Contribución Global
              </p>
              <h3 className="text-2xl font-bold text-rose-400 mt-1">
                {rateOfContribution.toFixed(4)}%
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Cuota de Prorrateo YAR 2016
              </p>
            </div>
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
              <Percent className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-800 space-x-4">
        {[
          {
            id: "cases",
            label: "Expedientes de Siniestro & Protesta de Mar",
            icon: FileText,
          },
          {
            id: "adjuster_simulator",
            label: "Masa Activa & Pasiva (Simulador de Prorrateo)",
            icon: Scale,
          },
          {
            id: "securities",
            label: "Garantías de Carga, Bonos LAB 77 & Liquidación",
            icon: Lock,
          },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 pb-3 pt-1 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-rose-500 text-rose-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: CASES */}
      {activeTab === "cases" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">
              Expedientes de Avería Gruesa
            </h3>
            <div className="space-y-3">
              {cases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCase(c)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedCase.id === c.id
                      ? "bg-rose-500/10 border-rose-500/40 shadow-lg shadow-rose-500/5"
                      : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm text-slate-100">
                      {c.caseReference}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-rose-300 border border-slate-700 font-mono">
                      {c.casualtyType?.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <Ship className="w-3.5 h-3.5 text-rose-400" />
                    {c.vesselName} ({c.flagState})
                  </p>
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex justify-between text-xs text-slate-400">
                    <span>{c.portOfRefuge}</span>
                    <span className="font-semibold text-slate-300">
                      Cuota Est.: {c.estimatedContributionPercentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-800">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-rose-400" />
                    Expediente: {selectedCase.caseReference} —{" "}
                    {selectedCase.vesselName}
                  </CardTitle>
                  <span className="text-xs px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    {selectedCase.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">
                      Armador / Propietario
                    </span>
                    <span className="font-semibold text-slate-200">
                      {selectedCase.shipownerName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      Capitán al Mando
                    </span>
                    <span className="font-semibold text-slate-200">
                      {selectedCase.masterName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      Fecha y Lugar Siniestro
                    </span>
                    <span className="font-semibold text-slate-200">
                      {selectedCase.casualtyDate} (
                      {selectedCase.casualtyLocation})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      Viaje (Origen ➔ Destino)
                    </span>
                    <span className="font-semibold text-slate-200">
                      {selectedCase.voyageOrigin} ➔{" "}
                      {selectedCase.voyageDestination}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      Puerto de Refugio
                    </span>
                    <span className="font-semibold text-slate-200">
                      {selectedCase.portOfRefuge}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      Contrato de Salvamento
                    </span>
                    <span className="font-semibold text-slate-200">
                      {selectedCase.salvageContractType?.replace(/_/g, " ")} (
                      {selectedCase.salvorName})
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2.5">
                  <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" />
                    Relato de la Emergencia & Protesta de Mar Notarial
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedCase.declarationNarrative}
                  </p>
                </div>

                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-indigo-400" />
                    Liquidador de Averías Designado (Average Adjusters)
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">
                        Firma Ajustadora
                      </span>
                      <span className="font-semibold text-slate-200">
                        {selectedCase.averageAdjusterFirm}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">
                        Ajustador Principal
                      </span>
                      <span className="font-semibold text-slate-200">
                        {selectedCase.leadAdjusterName}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() =>
                      window.open(
                        `/api/general-average/cases/${selectedCase.id}/declaration-pdf`,
                        "_blank",
                      )
                    }
                    className="bg-rose-600 hover:bg-rose-500 text-white text-xs flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar Declaración Notarial de Avería Gruesa PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: ADJUSTER SIMULATOR */}
      {activeTab === "adjuster_simulator" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                  <Play className="w-4 h-4 text-rose-400" />
                  Simulador de Masa Activa & Pasiva (YAR 2016)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5 text-xs">
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
                  <span className="font-semibold text-rose-400 block text-xs">
                    1. Masa Activa Admisible (Sacrificios & Gastos):
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block text-[11px] mb-1">
                        Sacrificios Buque ($)
                      </label>
                      <input
                        type="number"
                        value={simShipSacrifice}
                        onChange={(e) =>
                          setSimShipSacrifice(Number(e.target.value))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block text-[11px] mb-1">
                        Sacrificios Carga ($)
                      </label>
                      <input
                        type="number"
                        value={simCargoSacrifice}
                        onChange={(e) =>
                          setSimCargoSacrifice(Number(e.target.value))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block text-[11px] mb-1">
                        Gastos Puerto Refugio ($)
                      </label>
                      <input
                        type="number"
                        value={simRefugeExpenses}
                        onChange={(e) =>
                          setSimRefugeExpenses(Number(e.target.value))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block text-[11px] mb-1">
                        Salvamento LOF ($)
                      </label>
                      <input
                        type="number"
                        value={simSalvageAward}
                        onChange={(e) =>
                          setSimSalvageAward(Number(e.target.value))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[11px] mb-1">
                      Días hasta Liquidación (Intereses CMI 6%)
                    </label>
                    <input
                      type="number"
                      value={simCmiInterestDays}
                      onChange={(e) =>
                        setSimCmiInterestDays(Number(e.target.value))
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
                  <span className="font-semibold text-indigo-400 block text-xs">
                    2. Masa Pasiva Contributoria en Destino:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block text-[11px] mb-1">
                        Valor Sano Buque ($)
                      </label>
                      <input
                        type="number"
                        value={simVesselSoundValue}
                        onChange={(e) =>
                          setSimVesselSoundValue(Number(e.target.value))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block text-[11px] mb-1">
                        Daño Particular Buque ($)
                      </label>
                      <input
                        type="number"
                        value={simVesselPartDamage}
                        onChange={(e) =>
                          setSimVesselPartDamage(Number(e.target.value))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block text-[11px] mb-1">
                        Flete al Riesgo ($)
                      </label>
                      <input
                        type="number"
                        value={simFreightAtRisk}
                        onChange={(e) =>
                          setSimFreightAtRisk(Number(e.target.value))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block text-[11px] mb-1">
                        Valor Carga CIF en Destino ($)
                      </label>
                      <input
                        type="number"
                        value={simCargoSoundValue}
                        onChange={(e) =>
                          setSimCargoSoundValue(Number(e.target.value))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block text-[11px] mb-1">
                        Made Good Buque ($)
                      </label>
                      <input
                        type="number"
                        value={simVesselMadeGood}
                        onChange={(e) =>
                          setSimVesselMadeGood(Number(e.target.value))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block text-[11px] mb-1">
                        Made Good Carga ($)
                      </label>
                      <input
                        type="number"
                        value={simCargoMadeGood}
                        onChange={(e) =>
                          setSimCargoMadeGood(Number(e.target.value))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm text-slate-200 flex items-center justify-between">
                  <span>Resultado del Ajuste & Cuota de Contribución</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    TASA GA: {rateOfContribution.toFixed(4)}%
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-xs">
                      Masa Activa Total
                    </span>
                    <span className="text-base font-bold text-rose-400">
                      $
                      {totalAllowances.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}{" "}
                      USD
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      incl. 2.5% comisión + CMI
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-xs">
                      Masa Pasiva Total
                    </span>
                    <span className="text-base font-bold text-indigo-400">
                      $
                      {totalContributoryValue.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}{" "}
                      USD
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Valores Contributivos
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-xs">
                      Depósito Recomendado
                    </span>
                    <span className="text-base font-bold text-amber-400">
                      $
                      {recommendedCashDeposit.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}{" "}
                      USD
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      (Tasa + 10% margen)
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300 block">
                    Cuadro de Prorrateo por Intereses:
                  </span>
                  <div className="space-y-1.5 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-slate-200 block">
                          Buque (Shipowner)
                        </span>
                        <span className="text-[11px] text-slate-400">
                          CV: ${vesselCv.toLocaleString()} USD (Made Good: $
                          {simVesselMadeGood.toLocaleString()})
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-rose-400 block">
                          Cuota: $
                          {vesselGrossContribution.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}{" "}
                          USD
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Saldo Neto: $
                          {vesselNetBalance.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}{" "}
                          USD
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-slate-200 block">
                          Flete al Riesgo (Freight at Risk)
                        </span>
                        <span className="text-[11px] text-slate-400">
                          CV: ${freightCv.toLocaleString()} USD
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-rose-400 block">
                          Cuota: $
                          {freightGrossContribution.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}{" "}
                          USD
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-slate-200 block">
                          Cargamento Comercial (Cargo Interests)
                        </span>
                        <span className="text-[11px] text-slate-400">
                          CV: ${cargoCv.toLocaleString()} USD (Made Good: $
                          {simCargoMadeGood.toLocaleString()})
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-rose-400 block">
                          Cuota: $
                          {cargoGrossContribution.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}{" "}
                          USD
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Saldo Neto: $
                          {cargoNetBalance.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}{" "}
                          USD
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() =>
                      window.open(
                        `/api/general-average/cases/${selectedCase.id}/adjustment-statement-pdf`,
                        "_blank",
                      )
                    }
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar Cuadro de Liquidación de Avería Gruesa PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: SECURITIES */}
      {activeTab === "securities" && (
        <div className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                Garantías de Avería Gruesa & Fianza de Liberación de Carga
                (Lloyd's LAB 77)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm text-slate-200">
                      SEC-2026-VAL-001 (Average Bond + Guarantee)
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <Unlock className="w-3 h-3" /> CARGO RELEASED
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <p>
                      <strong className="text-slate-300">Receptor:</strong>{" "}
                      TransMed Auto Parts Italia SRL
                    </p>
                    <p>
                      <strong className="text-slate-300">Aseguradora:</strong>{" "}
                      Mapfre Global Risks SA (POL-MAR-2026-99210)
                    </p>
                    <p>
                      <strong className="text-slate-300">
                        Importe Garantizado:
                      </strong>{" "}
                      $180,000.00 USD
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() =>
                        window.open(
                          "/api/general-average/securities/ga_sec_val_01/bond-pdf",
                          "_blank",
                        )
                      }
                      className="bg-slate-800 hover:bg-slate-700 text-white text-xs flex items-center gap-1 border border-slate-700"
                    >
                      <Download className="w-3 h-3" />
                      Lloyd's Average Bond (LAB 77 PDF)
                    </Button>
                    <Button
                      onClick={() =>
                        window.open(
                          "/api/general-average/securities/ga_sec_val_01/guarantee-pdf",
                          "_blank",
                        )
                      }
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Average Guarantee PDF
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm text-slate-200">
                      SEC-2026-VAL-002 (Cash Deposit Receipt)
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> ESCROW DEPOSIT
                      VERIFIED
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <p>
                      <strong className="text-slate-300">Receptor:</strong>{" "}
                      Iberica Chem Trading SL (Autoseguro)
                    </p>
                    <p>
                      <strong className="text-slate-300">
                        Cuenta Fiduciaria:
                      </strong>{" "}
                      Banco Santander (Joint Trust Account RHL)
                    </p>
                    <p>
                      <strong className="text-slate-300">
                        Depósito en Efectivo:
                      </strong>{" "}
                      $241,500.00 USD (Recibo CDR-2026-0089)
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() =>
                        window.open(
                          "/api/general-average/securities/ga_sec_val_02/bond-pdf",
                          "_blank",
                        )
                      }
                      className="bg-slate-800 hover:bg-slate-700 text-white text-xs flex items-center gap-1 border border-slate-700"
                    >
                      <Download className="w-3 h-3" />
                      Average Bond Signed PDF
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
