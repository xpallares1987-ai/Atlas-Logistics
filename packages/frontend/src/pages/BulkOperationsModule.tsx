import { useState } from "react";
import {
  Anchor,
  Download,
  CheckCircle2,
  Ship,
  Droplets,
  Scale,
  Flame,
  Wheat,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";

interface VesselOperationRecord {
  id: string;
  vesselName: string;
  imoNumber: string;
  callSign: string;
  vesselType: string;
  portName: string;
  terminalName: string;
  berthNumber: string;
  cargoCategory: string;
  operationType: string;
  targetCargoTonnage: number;
  status: string;
}

export default function BulkOperationsModule() {
  const [activeTab, setActiveTab] = useState<
    "draft_survey" | "imsbc_grain" | "tanker_ullage"
  >("draft_survey");

  const [vesselOps] = useState<VesselOperationRecord[]>([
    {
      id: "bulk_op_capesize_01",
      vesselName: "MV Cape Finisterre",
      imoNumber: "9482012",
      callSign: "EABF",
      vesselType: "CAPESIZE_BULKER",
      portName: "Puerto de Gijón (ESGIJ)",
      terminalName: "Terminal de Graneles Sólidos El Musel",
      berthNumber: "Muelle de Graneles 1",
      cargoCategory: "SOLID_MINERAL_BULK",
      operationType: "LOADING",
      targetCargoTonnage: 120000.0,
      status: "OPERATIONS_IN_PROGRESS",
    },
    {
      id: "bulk_op_grain_01",
      vesselName: "MV Ceres Grain",
      imoNumber: "9321845",
      callSign: "C6XY8",
      vesselType: "PANAMAX_BULKER",
      portName: "Puerto de Valencia (ESVLC)",
      terminalName: "Terminal Agroalimentaria Silval",
      berthNumber: "Muelle de la Xitxarra",
      cargoCategory: "AGRICULTURAL_GRAIN_BULK",
      operationType: "LOADING",
      targetCargoTonnage: 65000.0,
      status: "OPERATIONS_IN_PROGRESS",
    },
    {
      id: "bulk_op_tanker_01",
      vesselName: "MT Atlantic Energy",
      imoNumber: "9610234",
      callSign: "IBEZ",
      vesselType: "PRODUCT_TANKER",
      portName: "Puerto de Huelva (ESHUV)",
      terminalName: "Terminal de Hidrocarburos Decal",
      berthNumber: "Muelle Petrolero Pantalán 2",
      cargoCategory: "CLEAN_LIQUID_BULK",
      operationType: "DISCHARGING",
      targetCargoTonnage: 35000.0,
      status: "OPERATIONS_IN_PROGRESS",
    },
  ]);

  const [selectedOp, setSelectedOp] = useState<VesselOperationRecord>(
    vesselOps[0],
  );

  // Tab 1: Draft Survey Calculator State
  const [fp, setFp] = useState<number>(15.6);
  const [fs, setFs] = useState<number>(15.64);
  const [ap, setAp] = useState<number>(16.1);
  const [asDraft, setAsDraft] = useState<number>(16.14);
  const [mp, setMp] = useState<number>(15.86);
  const [ms, setMs] = useState<number>(15.9);
  const [lbp, setLbp] = useState<number>(220.0);
  const [lcf, setLcf] = useState<number>(-0.8);
  const [tpc, setTpc] = useState<number>(82.0);
  const [mtc, setMtc] = useState<number>(1100.0);
  const [waterDensity, setWaterDensity] = useState<number>(1.022);
  const [hydroDisp, setHydroDisp] = useState<number>(137800.0);
  const [ballastDed, setBallastDed] = useState<number>(1200.0);
  const [fuelDed, setFuelDed] = useState<number>(1350.0);
  const [initialNetDisp, setInitialNetDisp] = useState<number>(14343.34);

  // Tab 2: IMSBC & Grain State
  const [imsbcCargoName, setImsbcCargoName] = useState<string>(
    "IRON ORE CONCENTRATE",
  );
  const [imsbcGroup, setImsbcGroup] = useState<string>("GROUP_A_LIQUEFACTION");
  const [imsbcMoisture, setImsbcMoisture] = useState<number>(8.5);
  const [imsbcFmp, setImsbcFmp] = useState<number>(11.0);
  const [grainType, setGrainType] = useState<string>("WHEAT");
  const [grainTonnage, setGrainTonnage] = useState<number>(65000);
  const [grainSf, setGrainSf] = useState<number>(1.35);
  const [grainVhm, setGrainVhm] = useState<number>(12500);
  const [grainDisp, setGrainDisp] = useState<number>(82000);
  const [grainGm0, setGrainGm0] = useState<number>(1.15);

  // Tab 3: Tanker Ullage ASTM State
  const [ullageProduct, setUllageProduct] = useState<string>(
    "AVIATION TURBINE FUEL JET A-1",
  );
  const [ullageObsTemp, setUllageObsTemp] = useState<number>(22.0);
  const [ullageDensity15, setUllageDensity15] = useState<number>(0.7985);
  const [ullageTov, setUllageTov] = useState<number>(44000.0);
  const [ullageFreeWater, setUllageFreeWater] = useState<number>(20.0);

  // Draft Survey Computations
  const fm = (fp + fs) / 2;
  const am = (ap + asDraft) / 2;
  const mm = (mp + ms) / 2;
  const apparentTrim = am - fm;
  const dqm = (fm + 6 * mm + am) / 8;
  const c1 = lbp > 0 ? (apparentTrim * lcf * tpc * 100) / lbp : 0;
  const c2 = lbp > 0 ? (50 * Math.pow(apparentTrim, 2) * 0.05) / lbp : 0;
  const densityFactor = waterDensity / 1.025;
  const correctedDisp =
    Math.round((hydroDisp + c1 + c2) * densityFactor * 100) / 100;
  const totalDeductibles = ballastDed + fuelDed + 180 + 250;
  const netDisp = Math.round((correctedDisp - totalDeductibles) * 100) / 100;
  const cargoLoaded =
    Math.round(Math.max(0, netDisp - initialNetDisp) * 100) / 100;

  // IMSBC Computations
  const tml = imsbcFmp > 0 ? Math.round(imsbcFmp * 0.9 * 100) / 100 : undefined;
  const isImsbcOk = tml !== undefined ? imsbcMoisture <= tml : true;

  // Grain Computations
  const grainHm = Math.round((grainVhm / (grainSf * grainDisp)) * 1000) / 1000;
  const grainTheta =
    Math.round(
      Math.atan(grainHm / Math.max(0.01, grainGm0)) * (180 / Math.PI) * 100,
    ) / 100;
  const isGrainOk = grainTheta <= 12.0 && grainGm0 >= 0.3;

  // Ullage Computations
  const gov = Math.max(0, ullageTov - ullageFreeWater);
  const deltaT = ullageObsTemp - 15.0;
  const alpha15 = 613.9723 / Math.pow(ullageDensity15 * 1000, 2);
  const vcf =
    Math.round(
      Math.exp(-alpha15 * deltaT * (1 + 0.8 * alpha15 * deltaT)) * 10000,
    ) / 10000;
  const gsv = Math.round(gov * vcf * 100) / 100;
  const massAir =
    Math.round(gsv * Math.max(0, ullageDensity15 - 0.0011) * 100) / 100;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <Anchor className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Logística de Graneles & Operaciones de Terminal Portuaria
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                IMSBC Code / BLU Code / IMO Grain Code / ASTM 54
              </span>
            </h1>
            <p className="text-sm text-slate-400">
              Cálculo hidrostático de calados (Draft Survey de 6 puntos),
              control de licuefacción de minerales TML/FMP, evaluación de
              estabilidad de grano y sondeo de tanques petroleros/quimiqueros.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedOp.id}
            onChange={(e) => {
              const op = vesselOps.find((v) => v.id === e.target.value);
              if (op) setSelectedOp(op);
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200"
          >
            {vesselOps.map((op) => (
              <option key={op.id} value={op.id}>
                {op.vesselName} ({op.vesselType})
              </option>
            ))}
          </select>
          <Button
            onClick={() =>
              window.open(
                `/api/bulk-operations/draft-surveys/draft_survey_final_01/report-pdf`,
                "_blank",
              )
            }
            className="bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-2 text-xs"
          >
            <Download className="w-4 h-4" />
            Descargar Draft Survey PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">
                Buques en Operación
              </p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">
                3 Escalas
              </h3>
              <p className="text-[11px] text-amber-400 mt-0.5">
                Capesize, Panamax & Tanker
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
              <Ship className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">
                Carga Certificada (Draft)
              </p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                120.059 t
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Mineral de Hierro El Musel
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Scale className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">
                Control Licuefacción TML
              </p>
              <h3 className="text-2xl font-bold text-sky-400 mt-1">
                100% Conforme
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Humedad 8.5% &lt; TML 9.9%
              </p>
            </div>
            <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl">
              <Flame className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">
                Estabilidad Grain Code
              </p>
              <h3 className="text-2xl font-bold text-amber-400 mt-1">
                θ = 5.62°
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Escora &lt; 12.0° | GM₀ 1.15m
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-800 space-x-4">
        {[
          {
            id: "draft_survey",
            label: "Draft Survey & Cálculo Hidrostático (6 Puntos & Densidad)",
            icon: Scale,
          },
          {
            id: "imsbc_grain",
            label: "Graneles Sólidos IMSBC & Estabilidad de Grano OMI",
            icon: Wheat,
          },
          {
            id: "tanker_ullage",
            label: "Sondeo de Tanques Ullage ASTM & Terminales BLU",
            icon: Droplets,
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
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: DRAFT SURVEY */}
      {activeTab === "draft_survey" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm text-slate-200 flex items-center justify-between">
                  <span>
                    Lecturas de Calados de 6 Puntos & Parámetros Hidrostáticos
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-mono">
                    Buque: {selectedOp.vesselName} ({selectedOp.vesselType})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-xs">
                {/* 6 Drafts Inputs */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                    <span className="font-bold text-slate-300 block text-[11px]">
                      Proa (Forward)
                    </span>
                    <div>
                      <label className="text-slate-400 block text-[10px]">
                        FP Babor (m):
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={fp}
                        onChange={(e) => setFp(Number(e.target.value))}
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block text-[10px]">
                        FS Estribor (m):
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={fs}
                        onChange={(e) => setFs(Number(e.target.value))}
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                    <span className="font-bold text-slate-300 block text-[11px]">
                      Centro (Midships)
                    </span>
                    <div>
                      <label className="text-slate-400 block text-[10px]">
                        MP Babor (m):
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={mp}
                        onChange={(e) => setMp(Number(e.target.value))}
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block text-[10px]">
                        MS Estribor (m):
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={ms}
                        onChange={(e) => setMs(Number(e.target.value))}
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                    <span className="font-bold text-slate-300 block text-[11px]">
                      Popa (Aft)
                    </span>
                    <div>
                      <label className="text-slate-400 block text-[10px]">
                        AP Babor (m):
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={ap}
                        onChange={(e) => setAp(Number(e.target.value))}
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block text-[10px]">
                        AS Estribor (m):
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={asDraft}
                        onChange={(e) => setAsDraft(Number(e.target.value))}
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Hydrostatic Params */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="text-slate-400 block text-[10px] mb-1">
                      Eslora LBP (m):
                    </label>
                    <input
                      type="number"
                      value={lbp}
                      onChange={(e) => setLbp(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[10px] mb-1">
                      Posición LCF (m):
                    </label>
                    <input
                      type="number"
                      value={lcf}
                      onChange={(e) => setLcf(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[10px] mb-1">
                      TPC (t/cm):
                    </label>
                    <input
                      type="number"
                      value={tpc}
                      onChange={(e) => setTpc(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[10px] mb-1">
                      MTC (t·m/cm):
                    </label>
                    <input
                      type="number"
                      value={mtc}
                      onChange={(e) => setMtc(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[10px] mb-1">
                      Densidad Agua Medida (t/m³):
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={waterDensity}
                      onChange={(e) => setWaterDensity(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[10px] mb-1">
                      Desplazamiento Tabla (t):
                    </label>
                    <input
                      type="number"
                      value={hydroDisp}
                      onChange={(e) => setHydroDisp(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Deductibles */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="text-slate-400 block text-[10px] mb-1">
                      Agua de Lastre (t):
                    </label>
                    <input
                      type="number"
                      value={ballastDed}
                      onChange={(e) => setBallastDed(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[10px] mb-1">
                      Combustibles Fuel/Diesel (t):
                    </label>
                    <input
                      type="number"
                      value={fuelDed}
                      onChange={(e) => setFuelDed(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[10px] mb-1">
                      Desp. Neto Inicial Rosca (t):
                    </label>
                    <input
                      type="number"
                      value={initialNetDisp}
                      onChange={(e) =>
                        setInitialNetDisp(Number(e.target.value))
                      }
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-amber-400" />
                  Resultados del Cálculo de Calados & Masa de Carga
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5 text-xs">
                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span className="text-slate-400">
                      Asiento Aparente (Trim):
                    </span>
                    <span className="font-mono text-slate-200 font-bold">
                      {apparentTrim > 0
                        ? `+${apparentTrim.toFixed(3)} m (Popa)`
                        : `${apparentTrim.toFixed(3)} m`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span className="text-slate-400">
                      Calado Medio de Medios (DQM):
                    </span>
                    <span className="font-mono text-amber-400 font-bold">
                      {dqm.toFixed(3)} m
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">
                      1ª Corrección de Asiento (C1):
                    </span>
                    <span className="font-mono text-slate-300">
                      {c1.toFixed(2)} t
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">
                      2ª Corrección de Asiento (C2):
                    </span>
                    <span className="font-mono text-slate-300">
                      +{c2.toFixed(2)} t
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">
                      Factor de Corrección por Densidad:
                    </span>
                    <span className="font-mono text-slate-300">
                      {densityFactor.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                    <span className="text-slate-300 font-bold">
                      Desplazamiento Corregido:
                    </span>
                    <span className="font-mono text-slate-100 font-bold">
                      {correctedDisp.toLocaleString("en-US")} t
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">
                      Total Deducibles (Lastre + Consumos):
                    </span>
                    <span className="font-mono text-rose-400">
                      -{totalDeductibles.toLocaleString("en-US")} t
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                    <span className="font-bold text-amber-300">
                      TONELAJE NETO DE CARGA EMBARCADA:
                    </span>
                    <span className="font-bold text-base font-mono text-emerald-400">
                      {cargoLoaded.toLocaleString("en-US")} t
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() =>
                      window.open(
                        `/api/bulk-operations/draft-surveys/draft_survey_final_01/report-pdf`,
                        "_blank",
                      )
                    }
                    className="bg-amber-600 hover:bg-amber-500 text-white text-xs flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar Certificado Draft Survey PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: IMSBC & GRAIN */}
      {activeTab === "imsbc_grain" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* IMSBC Evaluator */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-800">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400" />
                  Evaluador de Licuefacción IMSBC Code (Grupo A/B/C)
                </CardTitle>
                <Button
                  onClick={() =>
                    window.open(
                      `/api/bulk-operations/imsbc-declarations/imsbc_dec_01/declaration-pdf`,
                      "_blank",
                    )
                  }
                  className="bg-slate-800 hover:bg-slate-700 text-white text-[11px] flex items-center gap-1 border border-slate-700"
                >
                  <Download className="w-3 h-3" />
                  Declaración IMSBC PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block text-[11px] mb-1">
                    Nombre Carga a Granel (BCSN):
                  </label>
                  <input
                    type="text"
                    value={imsbcCargoName}
                    onChange={(e) => setImsbcCargoName(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[11px] mb-1">
                    Grupo IMSBC:
                  </label>
                  <select
                    value={imsbcGroup}
                    onChange={(e) => setImsbcGroup(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100"
                  >
                    <option value="GROUP_A_LIQUEFACTION">
                      Grupo A (Susceptible de Licuefacción)
                    </option>
                    <option value="GROUP_B_CHEMICAL_HAZARD">
                      Grupo B (Peligro Químico / MHB)
                    </option>
                    <option value="GROUP_C_NON_HAZARDOUS">
                      Grupo C (No Peligroso ni Licuable)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block text-[11px] mb-1">
                    Contenido de Humedad Real (%):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={imsbcMoisture}
                    onChange={(e) => setImsbcMoisture(Number(e.target.value))}
                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[11px] mb-1">
                    Punto de Fluidez FMP (%):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={imsbcFmp}
                    onChange={(e) => setImsbcFmp(Number(e.target.value))}
                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div
                className={`p-4 rounded-xl border ${isImsbcOk ? "bg-emerald-500/10 border-emerald-500/30" : "bg-rose-500/10 border-rose-500/30"} space-y-2`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-bold">
                    Límite de Humedad Transportable (TML):
                  </span>
                  <span className="font-mono text-base font-bold text-amber-400">
                    {tml}%
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">
                    Margen de Seguridad (TML - Humedad):
                  </span>
                  <span
                    className={`font-mono font-bold ${isImsbcOk ? "text-emerald-400" : "text-rose-400"}`}
                  >
                    {tml !== undefined
                      ? `${(tml - imsbcMoisture).toFixed(2)}%`
                      : "N/A"}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800/80">
                  <span
                    className={`font-bold block ${isImsbcOk ? "text-emerald-400" : "text-rose-400"}`}
                  >
                    {isImsbcOk
                      ? "✔ CARGAMENTO APTO PARA EMBARQUE"
                      : "❌ RECHAZO MANDATORIO: PROHIBIDO EMBARCAR"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* IMO Grain Code Evaluator */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-800">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                  <Wheat className="w-4 h-4 text-amber-400" />
                  Estabilidad de Cereales (IMO Grain Code / SOLAS Cap. VI)
                </CardTitle>
                <Button
                  onClick={() =>
                    window.open(
                      `/api/bulk-operations/grain-stability-plans/grain_plan_01/plan-pdf`,
                      "_blank",
                    )
                  }
                  className="bg-slate-800 hover:bg-slate-700 text-white text-[11px] flex items-center gap-1 border border-slate-700"
                >
                  <Download className="w-3 h-3" />
                  Plan Grain Code PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block text-[11px] mb-1">
                    Tipo de Cereal:
                  </label>
                  <input
                    type="text"
                    value={grainType}
                    onChange={(e) => setGrainType(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[11px] mb-1">
                    Masa Total de Grano (t):
                  </label>
                  <input
                    type="number"
                    value={grainTonnage}
                    onChange={(e) => setGrainTonnage(Number(e.target.value))}
                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[11px] mb-1">
                    Factor Estiba (m³/t):
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={grainSf}
                    onChange={(e) => setGrainSf(Number(e.target.value))}
                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[11px] mb-1">
                    Momento Volumétrico (m⁴):
                  </label>
                  <input
                    type="number"
                    value={grainVhm}
                    onChange={(e) => setGrainVhm(Number(e.target.value))}
                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[11px] mb-1">
                    Desplazamiento Salida (t):
                  </label>
                  <input
                    type="number"
                    value={grainDisp}
                    onChange={(e) => setGrainDisp(Number(e.target.value))}
                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[11px] mb-1">
                    GM₀ Inicial (m):
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={grainGm0}
                    onChange={(e) => setGrainGm0(Number(e.target.value))}
                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div
                className={`p-4 rounded-xl border ${isGrainOk ? "bg-emerald-500/10 border-emerald-500/30" : "bg-rose-500/10 border-rose-500/30"} space-y-2`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-bold">
                    Ángulo de Escora Residual (θ):
                  </span>
                  <span className="font-mono text-base font-bold text-amber-400">
                    {grainTheta}° (≤ 12.0°)
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">
                    Altura Metacéntrica GM₀:
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {grainGm0.toFixed(2)} m (≥ 0.30 m)
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800/80">
                  <span
                    className={`font-bold block ${isGrainOk ? "text-emerald-400" : "text-rose-400"}`}
                  >
                    {isGrainOk
                      ? "✔ ESTABILIDAD APROBADA CONFORME SOLAS CAP. VI"
                      : "❌ ESCORA EXCESIVA / NO CUMPLE GRAIN CODE"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: TANKER ULLAGE */}
      {activeTab === "tanker_ullage" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm text-slate-200 flex items-center justify-between">
                  <span>
                    Parámetros de Sondeo de Tanques (Tank Ullage & ASTM Table
                    54)
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-sky-300 font-mono">
                    Buque: MT Atlantic Energy (Decal Huelva)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block text-[11px] mb-1">
                      Producto Líquido:
                    </label>
                    <input
                      type="text"
                      value={ullageProduct}
                      onChange={(e) => setUllageProduct(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[11px] mb-1">
                      Temperatura Observada (°C):
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={ullageObsTemp}
                      onChange={(e) => setUllageObsTemp(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[11px] mb-1">
                      Densidad a 15°C (t/m³):
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={ullageDensity15}
                      onChange={(e) =>
                        setUllageDensity15(Number(e.target.value))
                      }
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[11px] mb-1">
                      Volumen Observado TOV (m³):
                    </label>
                    <input
                      type="number"
                      value={ullageTov}
                      onChange={(e) => setUllageTov(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[11px] mb-1">
                      Agua Libre Free Water (m³):
                    </label>
                    <input
                      type="number"
                      value={ullageFreeWater}
                      onChange={(e) =>
                        setUllageFreeWater(Number(e.target.value))
                      }
                      className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-sky-400" />
                  Liquidación de Volumen Estándar & Masa en Aire
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span className="text-slate-400">
                      Volumen Bruto Observado (GOV):
                    </span>
                    <span className="font-mono text-slate-200 font-bold">
                      {gov.toLocaleString("en-US")} m³
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span className="text-slate-400">
                      Factor VCF (ASTM 54B a {ullageObsTemp}°C):
                    </span>
                    <span className="font-mono text-sky-400 font-bold">
                      {vcf}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">
                      Volumen Estándar Neto (NSV a 15°C):
                    </span>
                    <span className="font-mono text-slate-200 font-bold">
                      {gsv.toLocaleString("en-US")} m³
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                    <span className="font-bold text-sky-300">
                      MASA COMERCIAL EN AIRE (FACTURACIÓN):
                    </span>
                    <span className="font-bold text-base font-mono text-emerald-400">
                      {massAir.toLocaleString("en-US")} t
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() =>
                      window.open(
                        `/api/bulk-operations/ullage-surveys/ullage_surv_01/survey-pdf`,
                        "_blank",
                      )
                    }
                    className="bg-sky-600 hover:bg-sky-500 text-white text-xs flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar Informe Ullage ASTM PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
