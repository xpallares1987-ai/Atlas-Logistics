import { useState } from "react";
import {
  Flame,
  FileText,
  Download,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Zap,
  Truck,
  Ship,
  Plane,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";

interface DgShipmentRecord {
  id: string;
  shipmentReference: string;
  transportMode: string;
  carrierName: string;
  vesselOrFlightOrVehiclePlate: string;
  originPortOrLocation: string;
  destinationPortOrLocation: string;
  shipperName: string;
  consigneeName: string;
  emergencyContactPhone: string;
  aircraftType: string;
  totalPackages: number;
  totalNetQuantityKg: number;
  totalGrossMassKg: number;
  segregationStatus: string;
  status: string;
}

const UN_CATALOG_DATA = [
  {
    unNumber: "UN 1203",
    properShippingName: "GASOLINE",
    technicalName: "Gasolina Auto Octanaje 95",
    primaryClass: "3",
    packingGroup: "PG II",
    flashPoint: -45,
    isMarinePollutant: true,
    emsFire: "F-E",
    emsSpillage: "S-E",
    kemler: "33",
    tunnel: "D/E",
    adrCategory: 2,
    lqLimit: "1.0 L",
  },
  {
    unNumber: "UN 1789",
    properShippingName: "HYDROCHLORIC ACID",
    technicalName: "Ácido Clorhídrico 37%",
    primaryClass: "8",
    packingGroup: "PG II",
    flashPoint: null,
    isMarinePollutant: false,
    emsFire: "F-A",
    emsSpillage: "S-B",
    kemler: "80",
    tunnel: "E",
    adrCategory: 2,
    lqLimit: "1.0 L",
  },
  {
    unNumber: "UN 1993",
    properShippingName: "FLAMMABLE LIQUID, N.O.S.",
    technicalName: "Etanol e Isopropanol",
    primaryClass: "3",
    packingGroup: "PG III",
    flashPoint: 24,
    isMarinePollutant: false,
    emsFire: "F-E",
    emsSpillage: "S-E",
    kemler: "30",
    tunnel: "D/E",
    adrCategory: 3,
    lqLimit: "5.0 L",
  },
  {
    unNumber: "UN 3480",
    properShippingName: "LITHIUM ION BATTERIES",
    technicalName: "Baterías recargables Ion-Litio 150 Wh",
    primaryClass: "9",
    packingGroup: "NONE",
    flashPoint: null,
    isMarinePollutant: false,
    emsFire: "F-A",
    emsSpillage: "S-I",
    kemler: "90",
    tunnel: "E",
    adrCategory: 2,
    lqLimit: "0 (No permitida)",
  },
  {
    unNumber: "UN 3082",
    properShippingName: "ENVIRONMENTALLY HAZARDOUS SUBSTANCE, LIQUID, N.O.S.",
    technicalName: "Biocida industrial",
    primaryClass: "9",
    packingGroup: "PG III",
    flashPoint: null,
    isMarinePollutant: true,
    emsFire: "F-A",
    emsSpillage: "S-F",
    kemler: "90",
    tunnel: "-",
    adrCategory: 3,
    lqLimit: "5.0 L",
  },
  {
    unNumber: "UN 1072",
    properShippingName: "OXYGEN, COMPRESSED",
    technicalName: "Oxígeno medicinal comprimido",
    primaryClass: "2.2 (5.1)",
    packingGroup: "NONE",
    flashPoint: null,
    isMarinePollutant: false,
    emsFire: "F-C",
    emsSpillage: "S-W",
    kemler: "25",
    tunnel: "E",
    adrCategory: 3,
    lqLimit: "120 mL",
  },
];

export default function DangerousGoodsModule() {
  const [activeTab, setActiveTab] = useState<
    "catalog_segregation" | "exemptions_adr" | "declarations"
  >("catalog_segregation");

  const [shipments] = useState<DgShipmentRecord[]>([
    {
      id: "dg_ship_valencia_01",
      shipmentReference: "DGD-2026-VAL-0089",
      transportMode: "MARITIME_OCEAN",
      carrierName: "Maersk Line (Ocean Carrier)",
      vesselOrFlightOrVehiclePlate: "MV Valencia Bridge",
      originPortOrLocation: "Puerto de Valencia (ESVLC)",
      destinationPortOrLocation: "Puerto de Singapur (SGSIN)",
      shipperName: "Iberica Chemical Solutions SL",
      consigneeName: "Asia Pacific Polymers Ltd",
      emergencyContactPhone: "+34 91 562 04 20",
      aircraftType: "NOT_APPLICABLE",
      totalPackages: 6,
      totalNetQuantityKg: 2800.0,
      totalGrossMassKg: 3120.0,
      segregationStatus: "COMPLIANT_SEGREGATED",
      status: "CERTIFIED_READY",
    },
    {
      id: "dg_ship_frankfurt_02",
      shipmentReference: "DGD-2026-FRA-0142",
      transportMode: "AIR_CARGO",
      carrierName: "Lufthansa Cargo AG",
      vesselOrFlightOrVehiclePlate: "Boeing 777F (Flight LH8220)",
      originPortOrLocation: "Aeropuerto de Frankfurt (FRA)",
      destinationPortOrLocation: "Chicago O'Hare Intl (ORD)",
      shipperName: "Bavarian Energy Storage Systems GmbH",
      consigneeName: "Midwest EV Battery Assembly Corp",
      emergencyContactPhone: "+1 800 424 9300",
      aircraftType: "CARGO_AIRCRAFT_ONLY_CAO",
      totalPackages: 8,
      totalNetQuantityKg: 280.0,
      totalGrossMassKg: 340.0,
      segregationStatus: "COMPLIANT_SEGREGATED",
      status: "CERTIFIED_READY",
    },
  ]);

  const [selectedShipment, setSelectedShipment] = useState<DgShipmentRecord>(
    shipments[0],
  );

  // Segregation Simulator State
  const [selectedUnA, setSelectedUnA] = useState<string>("UN 1203");
  const [selectedUnB, setSelectedUnB] = useState<string>("UN 1789");

  // ADR Points Simulator State
  const [adrQtyCat1, setAdrQtyCat1] = useState<number>(0);
  const [adrQtyCat2, setAdrQtyCat2] = useState<number>(250);
  const [adrQtyCat3, setAdrQtyCat3] = useState<number>(200);

  // Lithium Battery Simulator State
  const [lithiumWh, setLithiumWh] = useState<number>(150);
  const [lithiumPkgs, setLithiumPkgs] = useState<number>(5);
  const [lithiumSoc, setLithiumSoc] = useState<number>(25);

  // Segregation Logic (Deterministic)
  const isConflict =
    (selectedUnA === "UN 1203" && selectedUnB === "UN 1789") ||
    (selectedUnA === "UN 1789" && selectedUnB === "UN 1203") ||
    (selectedUnA === "UN 1789" && selectedUnB === "UN 1993") ||
    (selectedUnA === "UN 1993" && selectedUnB === "UN 1789");

  // ADR Points Calculation Logic
  const totalAdrPoints = adrQtyCat1 * 50 + adrQtyCat2 * 3 + adrQtyCat3 * 1;
  const isAdrExempt = totalAdrPoints <= 1000;

  // Lithium Classification Logic
  const isLithiumSecIA = lithiumWh > 100;
  const isLithiumSecIB = lithiumWh <= 100 && lithiumPkgs > 2;
  const lithiumSection = isLithiumSecIA
    ? "Sección IA"
    : isLithiumSecIB
      ? "Sección IB"
      : "Sección II";
  const isSocValid = lithiumSoc <= 30;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <Flame className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Gestión Multimodal de Mercancías Peligrosas (Dangerous Goods &
              ADR)
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                IMDG 41-22 / IATA 66th / ADR 2025
              </span>
            </h1>
            <p className="text-sm text-slate-400">
              Validación de segregación química IMDG 7.2.4, cálculo de
              exenciones LQ/EQ y 1.000 puntos ADR 1.1.3.6, control IATA de
              baterías de litio y emisión de formularios DGD y certificados de
              estiba.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() =>
              window.open(
                `/api/dangerous-goods/shipments/${selectedShipment.id}/dgd-pdf`,
                "_blank",
              )
            }
            className="bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-2 text-xs"
          >
            <Download className="w-4 h-4" />
            Descargar Declaración IMO DGD PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">
                Expedientes DGR Activos
              </p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">2</h3>
              <p className="text-[11px] text-amber-400 mt-0.5">
                1 Marítimo / 1 Aéreo CAO
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
                Sustancias UN Catalogadas
              </p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">
                {UN_CATALOG_DATA.length}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Clases 1 a 9 con EmS & Kemler
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
                Auditoría de Segregación
              </p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                100% OK
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Conforme Cuadro IMDG 7.2.4
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">
                Puntos ADR Unidad
              </p>
              <h3 className="text-2xl font-bold text-indigo-400 mt-1">
                {totalAdrPoints} pts
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isAdrExempt
                  ? "Exento bajo 1.1.3.6 (≤ 1.000)"
                  : "Régimen Pleno (> 1.000)"}
              </p>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Truck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-800 space-x-4">
        {[
          {
            id: "catalog_segregation",
            label: "Catálogo UN & Matriz de Segregación (IMDG 7.2.4)",
            icon: ShieldCheck,
          },
          {
            id: "exemptions_adr",
            label: "Calculadora de Exenciones (LQ/EQ, ADR 1.1.3.6 & Baterías)",
            icon: Zap,
          },
          {
            id: "declarations",
            label: "Declaraciones Multimodales (DGD) & Emisión de PDFs",
            icon: FileText,
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

      {/* TAB 1: CATALOG & SEGREGATION */}
      {activeTab === "catalog_segregation" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm text-slate-200 flex items-center justify-between">
                  <span>
                    Catálogo Maestro de Sustancias Peligrosas (Nº ONU)
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {UN_CATALOG_DATA.length} Referencias
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-800/80 text-xs">
                  {UN_CATALOG_DATA.map((sub) => (
                    <div
                      key={sub.unNumber}
                      className="p-3 hover:bg-slate-800/30 flex justify-between items-center transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-400 font-mono">
                            {sub.unNumber}
                          </span>
                          <span className="font-semibold text-slate-200">
                            {sub.properShippingName}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                            Clase {sub.primaryClass}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {sub.technicalName}
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-slate-400">
                        <span className="block font-mono text-slate-300">
                          EmS: {sub.emsFire}, {sub.emsSpillage}
                        </span>
                        <span className="text-[10px]">
                          Kemler: {sub.kemler} | Túnel: {sub.tunnel}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Simulador de Segregación en Contenedor (IMDG 7.2.4)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-xs">
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-400 block text-[11px] mb-1">
                      Sustancia A en Contenedor:
                    </label>
                    <select
                      value={selectedUnA}
                      onChange={(e) => setSelectedUnA(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                    >
                      {UN_CATALOG_DATA.map((s) => (
                        <option key={s.unNumber} value={s.unNumber}>
                          {s.unNumber} - {s.properShippingName} (Clase{" "}
                          {s.primaryClass})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block text-[11px] mb-1">
                      Sustancia B en Contenedor:
                    </label>
                    <select
                      value={selectedUnB}
                      onChange={(e) => setSelectedUnB(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                    >
                      {UN_CATALOG_DATA.map((s) => (
                        <option key={s.unNumber} value={s.unNumber}>
                          {s.unNumber} - {s.properShippingName} (Clase{" "}
                          {s.primaryClass})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-xl border ${
                    isConflict
                      ? "bg-rose-500/10 border-rose-500/40 text-rose-300"
                      : "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {isConflict ? (
                      <>
                        <XCircle className="w-4 h-4 text-rose-400" />
                        INCOMPATIBLE — PROHIBIDA CO-CARGA (Código 'X')
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        COMPATIBLE — CO-CARGA AUTORIZADA
                      </>
                    )}
                  </div>
                  <p className="text-[11px] mt-1.5 leading-relaxed text-slate-300">
                    {isConflict
                      ? `La sustancia ${selectedUnA} y la sustancia ${selectedUnB} presentan incompatibilidad química severa (Clase 3 Líquido Inflamable vs Clase 8 Ácido Corrosivo). Prohibido cargar en el mismo contenedor cerrado bajo IMDG 7.2.4.`
                      : `Las sustancias seleccionadas no presentan incompatibilidad reglamentaria. Pueden estibarse en la misma unidad de transporte siempre que los envases estén certificados ONU.`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: EXEMPTIONS & ADR */}
      {activeTab === "exemptions_adr" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ADR 1.1.3.6 Calculator */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-400" />
                Calculadora de 1.000 Puntos ADR (Exención 1.1.3.6)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="text-slate-400 block text-[11px] mb-1">
                    Categoría de Transporte 1 (x50) — kg/L:
                  </label>
                  <input
                    type="number"
                    value={adrQtyCat1}
                    onChange={(e) => setAdrQtyCat1(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[11px] mb-1">
                    Categoría de Transporte 2 (x3) — ej. Gasolina UN 1203
                    (kg/L):
                  </label>
                  <input
                    type="number"
                    value={adrQtyCat2}
                    onChange={(e) => setAdrQtyCat2(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[11px] mb-1">
                    Categoría de Transporte 3 (x1) — ej. Biocidas UN 3082
                    (kg/L):
                  </label>
                  <input
                    type="number"
                    value={adrQtyCat3}
                    onChange={(e) => setAdrQtyCat3(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">
                    Puntos Totales Calculados:
                  </span>
                  <span
                    className={`text-lg font-bold font-mono ${isAdrExempt ? "text-indigo-400" : "text-rose-400"}`}
                  >
                    {totalAdrPoints} / 1.000 pts
                  </span>
                </div>
                <div className="text-[11px] text-slate-300">
                  {isAdrExempt ? (
                    <span className="text-emerald-400 font-semibold block">
                      ✔ EXENTO DE PANEL NARANJA & CARNET ADR: Requiere solo
                      extintor 2kg y carta de porte.
                    </span>
                  ) : (
                    <span className="text-rose-400 font-semibold block">
                      ⚠ RÉGIMEN PLENO ADR: Supera 1.000 puntos. Obligatorio
                      paneles naranja, conductor con carnet ADR y extintor 12kg.
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* IATA Lithium Battery Classifier */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Clasificador IATA DGR de Baterías de Litio (UN 3480)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="text-slate-400 block text-[11px] mb-1">
                    Capacidad de la Batería (Vatios-hora / Wh):
                  </label>
                  <input
                    type="number"
                    value={lithiumWh}
                    onChange={(e) => setLithiumWh(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[11px] mb-1">
                    Número de Bultos en la Expedición:
                  </label>
                  <input
                    type="number"
                    value={lithiumPkgs}
                    onChange={(e) => setLithiumPkgs(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[11px] mb-1">
                    Estado de Carga (State of Charge - SoC %):
                  </label>
                  <input
                    type="number"
                    value={lithiumSoc}
                    onChange={(e) => setLithiumSoc(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">
                    Clasificación IATA DGR:
                  </span>
                  <span className="font-bold text-amber-400 font-mono">
                    {lithiumSection} (PI 965)
                  </span>
                </div>
                <div className="text-[11px] space-y-1 text-slate-300">
                  <p>
                    • Avión Exclusivo de Carga (CAO):{" "}
                    <strong className="text-rose-400">OBLIGATORIO</strong>
                  </p>
                  <p>
                    • Estado de Carga (SoC ≤ 30%):{" "}
                    {isSocValid ? (
                      <strong className="text-emerald-400">
                        VÁLIDO ({lithiumSoc}%)
                      </strong>
                    ) : (
                      <strong className="text-rose-400">
                        NO CUMPLE ({lithiumSoc}%)
                      </strong>
                    )}
                  </p>
                  <p>
                    • DGD & Etiqueta Clase 9:{" "}
                    {isLithiumSecIA || isLithiumSecIB
                      ? "Requeridos"
                      : "Exento (Solo marca batería)"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: DECLARATIONS & PDFS */}
      {activeTab === "declarations" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">
              Expedientes de Mercancías Peligrosas
            </h3>
            <div className="space-y-3">
              {shipments.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedShipment(s)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedShipment.id === s.id
                      ? "bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5"
                      : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm text-slate-100">
                      {s.shipmentReference}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700 font-mono">
                      {s.transportMode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    {s.transportMode === "AIR_CARGO" ? (
                      <Plane className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Ship className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    {s.vesselOrFlightOrVehiclePlate}
                  </p>
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex justify-between text-xs text-slate-400">
                    <span>
                      {s.totalPackages} bultos ({s.totalGrossMassKg} kg)
                    </span>
                    <span className="font-semibold text-emerald-400">
                      {s.segregationStatus}
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
                    <Flame className="w-4 h-4 text-amber-400" />
                    Expedición: {selectedShipment.shipmentReference} (
                    {selectedShipment.transportMode})
                  </CardTitle>
                  <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {selectedShipment.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">
                      Expedidor / Shipper
                    </span>
                    <span className="font-semibold text-slate-200">
                      {selectedShipment.shipperName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      Destinatario / Consignee
                    </span>
                    <span className="font-semibold text-slate-200">
                      {selectedShipment.consigneeName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      Contacto Emergencia 24h
                    </span>
                    <span className="font-semibold text-amber-400">
                      {selectedShipment.emergencyContactPhone}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      Origen ➔ Destino
                    </span>
                    <span className="font-semibold text-slate-200">
                      {selectedShipment.originPortOrLocation} ➔{" "}
                      {selectedShipment.destinationPortOrLocation}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      Transportista & Vehículo
                    </span>
                    <span className="font-semibold text-slate-200">
                      {selectedShipment.carrierName} (
                      {selectedShipment.vesselOrFlightOrVehiclePlate})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Carga Total</span>
                    <span className="font-semibold text-slate-200">
                      {selectedShipment.totalPackages} bultos /{" "}
                      {selectedShipment.totalGrossMassKg} kg
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-300">
                    Descarga de Documentación Oficial de Mercancías Peligrosas
                    en PDF:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <Button
                      onClick={() =>
                        window.open(
                          `/api/dangerous-goods/shipments/${selectedShipment.id}/dgd-pdf`,
                          "_blank",
                        )
                      }
                      className="bg-amber-600 hover:bg-amber-500 text-white text-xs flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Declaración Multimodal IMO DGD PDF
                    </Button>
                    <Button
                      onClick={() =>
                        window.open(
                          `/api/dangerous-goods/shipments/${selectedShipment.id}/iata-dgd-pdf`,
                          "_blank",
                        )
                      }
                      className="bg-rose-600 hover:bg-rose-500 text-white text-xs flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Declaración Aérea IATA Shipper's DGD PDF
                    </Button>
                    <Button
                      onClick={() =>
                        window.open(
                          `/api/dangerous-goods/shipments/${selectedShipment.id}/emergency-card-pdf`,
                          "_blank",
                        )
                      }
                      className="bg-slate-800 hover:bg-slate-700 text-white text-xs flex items-center justify-center gap-1.5 border border-slate-700"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Ficha de Emergencia EmS PDF
                    </Button>
                    <Button
                      onClick={() =>
                        window.open(
                          `/api/dangerous-goods/shipments/${selectedShipment.id}/packing-cert-pdf`,
                          "_blank",
                        )
                      }
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Certificado de Estiba de Contenedor PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
