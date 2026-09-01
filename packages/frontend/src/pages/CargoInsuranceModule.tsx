import { useState } from "react";
import {
  ShieldCheck,
  Download,
  CheckCircle2,
  DollarSign,
  Ship,
  Plane,
  Building2,
  Scale,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";

interface OpenPolicyRecord {
  id: string;
  policyNumber: string;
  insurerName: string;
  brokerName: string;
  policyHolderName: string;
  currency: string;
  startDate: string;
  endDate: string;
  conveyanceLimitAmount: number;
  annualEstimatedTurnover: number;
  baseRatePercentage: number;
  warStrikeRatePercentage: number;
  defaultDeductibleAmount: number;
  status: string;
}

interface InsuranceCertificateRecord {
  id: string;
  certificateNumber: string;
  shipmentReference: string;
  transportMode: string;
  carrierName: string;
  vesselOrFlightOrVehiclePlate: string;
  originPortOrCountry: string;
  destinationPortOrCountry: string;
  insuredPartyName: string;
  consigneeOrToOrderName: string;
  claimSurveyAgentNameAddress: string;
  goodsDescription: string;
  commercialInvoiceValue: number;
  commercialCurrency: string;
  markupPercentage: number;
  totalInsuredValue: number;
  coverageClause: string;
  appliedRatePercentage: number;
  netPremiumAmount: number;
  grossPremiumPayable: number;
  deductibleAmount: number;
  issueDate: string;
  status: string;
}

export default function CargoInsuranceModule() {
  const [activeTab, setActiveTab] = useState<
    "calculator_quote" | "open_policies" | "certificates_claims"
  >("calculator_quote");

  const [openPolicies] = useState<OpenPolicyRecord[]>([
    {
      id: "open_pol_zurich_01",
      policyNumber: "POL-MAR-2026-VAL-0089",
      insurerName: "Zurich Insurance plc / Lloyd's Syndicate 1861",
      brokerName: "Aon Marine & Global Logistics Risk SL",
      policyHolderName: "Atlas Logistics Global Forwarding SL",
      currency: "EUR",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      conveyanceLimitAmount: 2500000.0,
      annualEstimatedTurnover: 15000000.0,
      baseRatePercentage: 0.2,
      warStrikeRatePercentage: 0.04,
      defaultDeductibleAmount: 500.0,
      status: "ACTIVE",
    },
  ]);

  const [certificates] = useState<InsuranceCertificateRecord[]>([
    {
      id: "ins_cert_01",
      certificateNumber: "INS-CERT-2026-VAL-0042",
      shipmentReference: "SH-2026-VAL-0089",
      transportMode: "MARITIME_OCEAN",
      carrierName: "Maersk Line",
      vesselOrFlightOrVehiclePlate: "MV Valencia Bridge",
      originPortOrCountry: "Puerto de Valencia (ESVLC)",
      destinationPortOrCountry: "Puerto de Singapur (SGSIN)",
      insuredPartyName: "Iberica Export Solutions SL",
      consigneeOrToOrderName: "TO THE ORDER OF DBS BANK SINGAPORE (L/C 45209)",
      claimSurveyAgentNameAddress:
        "Lloyd's Agency / SGS Marine Surveyors Singapore Ltd, 10 Anson Road, Singapore",
      goodsDescription:
        "Componentes electrónicos y microcontroladores de precisión",
      commercialInvoiceValue: 115000.0,
      commercialCurrency: "EUR",
      markupPercentage: 10.0,
      totalInsuredValue: 132000.0,
      coverageClause: "ICC_A_ALL_RISKS_2009",
      appliedRatePercentage: 0.29,
      netPremiumAmount: 382.8,
      grossPremiumPayable: 405.77,
      deductibleAmount: 500.0,
      issueDate: "2026-09-01",
      status: "ISSUED_CERTIFIED",
    },
    {
      id: "ins_cert_02",
      certificateNumber: "INS-CERT-2026-FRA-0088",
      shipmentReference: "SH-2026-FRA-0142",
      transportMode: "AIR_CARGO",
      carrierName: "Lufthansa Cargo AG",
      vesselOrFlightOrVehiclePlate: "Boeing 777F (Flight LH8220)",
      originPortOrCountry: "Frankfurt Airport (FRA)",
      destinationPortOrCountry: "Chicago O'Hare Intl (ORD)",
      insuredPartyName: "Bavarian Energy Systems GmbH",
      consigneeOrToOrderName: "Midwest EV Battery Assembly Corp",
      claimSurveyAgentNameAddress:
        "Crawford & Company Marine Surveyors, Chicago O'Hare Cargo Center, IL, USA",
      goodsDescription:
        "Baterías de tracción y ensambles de celda de Litio para automoción",
      commercialInvoiceValue: 380000.0,
      commercialCurrency: "EUR",
      markupPercentage: 10.0,
      totalInsuredValue: 440000.0,
      coverageClause: "ICC_AIR_ALL_RISKS",
      appliedRatePercentage: 0.2865,
      netPremiumAmount: 1260.6,
      grossPremiumPayable: 1336.24,
      deductibleAmount: 1000.0,
      issueDate: "2026-09-01",
      status: "ISSUED_CERTIFIED",
    },
  ]);

  const [selectedCert, setSelectedCert] = useState<InsuranceCertificateRecord>(
    certificates[0],
  );

  // Quote Calculator State
  const [calcInvoiceVal, setCalcInvoiceVal] = useState<number>(100000);
  const [calcFreightVal, setCalcFreightVal] = useState<number>(8000);
  const [calcInsuranceEst, setCalcInsuranceEst] = useState<number>(500);
  const [calcMarkupPct, setCalcMarkupPct] = useState<number>(10);
  const [calcClause, setCalcClause] = useState<string>("ICC_A_ALL_RISKS_2009");
  const [calcCommodity, setCalcCommodity] = useState<string>("GENERAL_CARGO");
  const [calcMode, setCalcMode] = useState<string>("MARITIME_OCEAN_FCL");
  const [calcWarCover, setCalcWarCover] = useState<boolean>(true);

  // Claim Settlement Simulator State
  const [claimSoundVal, setClaimSoundVal] = useState<number>(120000);
  const [claimSalvageVal, setClaimSalvageVal] = useState<number>(30000);
  const [claimDeductible, setClaimDeductible] = useState<number>(500);

  // Deterministic Insured Value (110% CIF)
  const cifBase = calcInvoiceVal + calcFreightVal + calcInsuranceEst;
  const calculatedInsuredSum =
    Math.round(cifBase * (1 + calcMarkupPct / 100) * 100) / 100;

  // Deterministic Actuarial Rating
  let baseClauseRate = 0.25;
  if (calcClause === "ICC_B_MAJOR_PERILS_2009") baseClauseRate = 0.18;
  if (calcClause === "ICC_C_BASIC_PERILS_2009") baseClauseRate = 0.12;
  if (calcClause === "ICC_AIR_ALL_RISKS") baseClauseRate = 0.2;

  let commFactor = 1.0;
  if (calcCommodity === "INDUSTRIAL_MACHINERY") commFactor = 1.15;
  if (calcCommodity === "CHEMICALS_DANGEROUS") commFactor = 1.3;
  if (calcCommodity === "ELECTRONICS_HIGH_TECH") commFactor = 1.45;
  if (calcCommodity === "PHARMA_TEMPERATURE_CONTROLLED") commFactor = 1.5;

  let modeFactor = 1.0;
  if (calcMode === "MARITIME_OCEAN_LCL") modeFactor = 1.25;
  if (calcMode === "AIR_CARGO") modeFactor = 0.85;
  if (calcMode === "ROAD_FREIGHT") modeFactor = 1.1;

  const warRate = calcWarCover ? 0.04 : 0.0;
  const totalAppliedRate =
    Math.round((baseClauseRate * commFactor * modeFactor + warRate) * 10000) /
    10000;
  const netPremiumCalculated =
    Math.round(((calculatedInsuredSum * totalAppliedRate) / 100) * 100) / 100;
  const finalNetPrem = Math.max(50.0, netPremiumCalculated);
  const ipsTax = Math.round(finalNetPrem * 0.06 * 100) / 100;
  const ccsTax = Math.round(finalNetPrem * 0.00005 * 100) / 100;
  const grossPayable = Math.round((finalNetPrem + ipsTax + ccsTax) * 100) / 100;

  // Claim Settlement Calculation
  const soundLoss = Math.max(0, claimSoundVal - claimSalvageVal);
  const deprecPct =
    claimSoundVal > 0
      ? Math.round((soundLoss / claimSoundVal) * 100 * 100) / 100
      : 0;
  const grossClaimAssessment =
    Math.round(((selectedCert.totalInsuredValue * deprecPct) / 100) * 100) /
    100;
  const netIndemnityPayable = Math.max(
    0,
    Math.round((grossClaimAssessment - claimDeductible) * 100) / 100,
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Seguro de Transporte de Mercancías & Pólizas de Carga (Cargo
              Insurance)
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
                Institute Cargo Clauses 2009 / UCP 600 / LMA
              </span>
            </h1>
            <p className="text-sm text-slate-400">
              Suscripción actuarial, emisión de certificados individuales al
              110% CIF bajo UCP 600 Art. 28, gestión de pólizas flotantes (Open
              Cover), bordereau mensual y liquidación pericial de siniestros.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() =>
              window.open(
                `/api/cargo-insurance/certificates/${selectedCert.id}/certificate-pdf`,
                "_blank",
              )
            }
            className="bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-2 text-xs"
          >
            <Download className="w-4 h-4" />
            Descargar Certificado UCP 600 PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">
                Pólizas Flotantes Activas
              </p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">
                1 Open Cover
              </h3>
              <p className="text-[11px] text-sky-400 mt-0.5">
                Límite $2.5M / embarque
              </p>
            </div>
            <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">
                Suma Asegurada en Riesgo
              </p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                $572.000 €
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Base 110% CIF / CIP
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">
                Primas & Recargos Fiscales
              </p>
              <h3 className="text-2xl font-bold text-indigo-400 mt-1">
                1.742,08 €
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Inc. IPS 6% + Consorcio CCS
              </p>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Scale className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">
                Ratio Siniestralidad
              </p>
              <h3 className="text-2xl font-bold text-amber-400 mt-1">17.2%</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Cartera Rentable (&lt; 65%)
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
            id: "calculator_quote",
            label: "Cotizador Actuarial & Emisión 110% CIF (ICC A/B/C)",
            icon: DollarSign,
          },
          {
            id: "open_policies",
            label: "Pólizas Flotantes (Open Cover) & Bordereau Mensual",
            icon: Building2,
          },
          {
            id: "certificates_claims",
            label: "Certificados Emitidos & Liquidación de Siniestros",
            icon: Scale,
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
                  ? "border-sky-500 text-sky-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: ACTUARIAL CALCULATOR */}
      {activeTab === "calculator_quote" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm text-slate-200 flex items-center justify-between">
                  <span>Parámetros de Suscripción & Valor Comercial</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-sky-300 font-mono">
                    UCP 600 Art. 28 Compliant
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block text-[11px] mb-1">
                      Valor Factura Comercial (€/$):
                    </label>
                    <input
                      type="number"
                      value={calcInvoiceVal}
                      onChange={(e) =>
                        setCalcInvoiceVal(Number(e.target.value))
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[11px] mb-1">
                      Flete Principal (€/$):
                    </label>
                    <input
                      type="number"
                      value={calcFreightVal}
                      onChange={(e) =>
                        setCalcFreightVal(Number(e.target.value))
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[11px] mb-1">
                      Recargo Estatutario (%):
                    </label>
                    <input
                      type="number"
                      value={calcMarkupPct}
                      onChange={(e) => setCalcMarkupPct(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[11px] mb-1">
                      Seguro Estimado Base (€/$):
                    </label>
                    <input
                      type="number"
                      value={calcInsuranceEst}
                      onChange={(e) =>
                        setCalcInsuranceEst(Number(e.target.value))
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="text-slate-400 block text-[11px] mb-1">
                      Cláusula Institute Cargo Clauses:
                    </label>
                    <select
                      value={calcClause}
                      onChange={(e) => setCalcClause(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                    >
                      <option value="ICC_A_ALL_RISKS_2009">
                        ICC (A) All Risks 2009 (0.25%)
                      </option>
                      <option value="ICC_B_MAJOR_PERILS_2009">
                        ICC (B) Major Perils 2009 (0.18%)
                      </option>
                      <option value="ICC_C_BASIC_PERILS_2009">
                        ICC (C) Basic Perils 2009 (0.12%)
                      </option>
                      <option value="ICC_AIR_ALL_RISKS">
                        ICC (Air) All Risks (0.20%)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[11px] mb-1">
                      Categoría de Mercancía:
                    </label>
                    <select
                      value={calcCommodity}
                      onChange={(e) => setCalcCommodity(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                    >
                      <option value="GENERAL_CARGO">
                        Carga General (1.0x)
                      </option>
                      <option value="INDUSTRIAL_MACHINERY">
                        Maquinaria Industrial (1.15x)
                      </option>
                      <option value="CHEMICALS_DANGEROUS">
                        Químicos / DGR (1.30x)
                      </option>
                      <option value="ELECTRONICS_HIGH_TECH">
                        Electrónica / High-Tech (1.45x)
                      </option>
                      <option value="PHARMA_TEMPERATURE_CONTROLLED">
                        Farma / Reefer (1.50x)
                      </option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-slate-400 block text-[11px] mb-1">
                      Modo de Transporte:
                    </label>
                    <select
                      value={calcMode}
                      onChange={(e) => setCalcMode(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                    >
                      <option value="MARITIME_OCEAN_FCL">
                        Marítimo FCL (1.0x)
                      </option>
                      <option value="MARITIME_OCEAN_LCL">
                        Marítimo LCL / Grupaje (1.25x)
                      </option>
                      <option value="AIR_CARGO">Carga Aérea (0.85x)</option>
                      <option value="ROAD_FREIGHT">
                        Transporte Terrestre Carretera (1.10x)
                      </option>
                    </select>
                  </div>
                  <div className="flex items-end pb-1.5">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={calcWarCover}
                        onChange={(e) => setCalcWarCover(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-sky-500"
                      />
                      <span>Cobertura Guerra/Huelgas (+0.04%)</span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  Liquidación Actuarial de la Prima & Suma Asegurada
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-xs">
                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span className="text-slate-400">Base CIF:</span>
                    <span className="font-mono text-slate-200">
                      $
                      {cifBase.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span className="text-slate-400">
                      Suma Total Asegurada ({100 + calcMarkupPct}% CIF):
                    </span>
                    <span className="font-bold text-base font-mono text-emerald-400">
                      $
                      {calculatedInsuredSum.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Tasa Total Aplicada:</span>
                    <span className="font-mono text-sky-400">
                      {totalAppliedRate}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">
                      Prima Neta de Seguro:
                    </span>
                    <span className="font-mono text-slate-200">
                      $
                      {finalNetPrem.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Impuesto IPS (6.0%):</span>
                    <span className="font-mono text-slate-400">
                      $
                      {ipsTax.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">
                      Recargo Consorcio CCS (0.005%):
                    </span>
                    <span className="font-mono text-slate-400">
                      $
                      {ccsTax.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                    <span className="font-bold text-slate-200">
                      TOTAL PRIMA BRUTA A PAGAR:
                    </span>
                    <span className="font-bold text-lg font-mono text-sky-400">
                      $
                      {grossPayable.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 text-[11px]">
                  <p>
                    ✔ Certificado apto para negociación bancaria bajo UCP 600
                    Art. 28 (amparo mínimo 110% en la misma moneda del crédito
                    comercial).
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: OPEN POLICIES */}
      {activeTab === "open_policies" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">
              Pólizas Flotantes Registradas
            </h3>
            {openPolicies.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl border border-sky-500/40 bg-sky-500/10 shadow-lg shadow-sky-500/5 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-sm text-slate-100">
                    {p.policyNumber}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{p.insurerName}</p>
                <p className="text-[11px] text-slate-400">
                  Corredor: {p.brokerName}
                </p>
                <div className="pt-2 border-t border-slate-800/80 flex justify-between text-xs text-slate-400">
                  <span>Límite Embarque:</span>
                  <span className="font-bold text-slate-200">
                    ${p.conveyanceLimitAmount.toLocaleString("en-US")}{" "}
                    {p.currency}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-800">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-sky-400" />
                    Condiciones de Póliza & Bordereau Mensual de Declaraciones
                  </CardTitle>
                  <Button
                    onClick={() =>
                      window.open(
                        `/api/cargo-insurance/open-policies/open_pol_zurich_01/policy-pdf`,
                        "_blank",
                      )
                    }
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs flex items-center gap-1.5 border border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Póliza Schedule PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="text-slate-500 block">
                      Tomador de Seguro
                    </span>
                    <span className="font-semibold text-slate-200">
                      Atlas Logistics Global Forwarding SL
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Vigencia Anual</span>
                    <span className="font-semibold text-slate-200">
                      2026-01-01 ➔ 2026-12-31
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      Facturación Estimada
                    </span>
                    <span className="font-semibold text-slate-200">
                      $15.000.000 EUR
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      Tasa Base Acordada
                    </span>
                    <span className="font-semibold text-sky-400">
                      0.20% + 0.04% Guerra
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      Franquicia General
                    </span>
                    <span className="font-semibold text-slate-200">
                      $500 EUR fija / siniestro
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Prima Mínima</span>
                    <span className="font-semibold text-slate-200">
                      $50.00 EUR / expedición
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-300">
                      Bordereau Mensual Activo (Periodo 2026-08):
                    </h4>
                    <Button
                      onClick={() =>
                        window.open(
                          `/api/cargo-insurance/bordereaux/ins_bdx_01/bordereau-pdf`,
                          "_blank",
                        )
                      }
                      className="bg-sky-600 hover:bg-sky-500 text-white text-xs flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar Bordereau Mensual PDF
                    </Button>
                  </div>
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-mono text-slate-200 font-bold block">
                        BDX-2026-08
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        2 expediciones declaradas ($572.000 asegurados)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-emerald-400 font-bold block">
                        1.742,08 EUR
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        Liquidado a Zurich
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: CERTIFICATES & CLAIMS */}
      {activeTab === "certificates_claims" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">
              Certificados de Seguro Emitidos
            </h3>
            <div className="space-y-3">
              {certificates.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCert(c)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedCert.id === c.id
                      ? "bg-sky-500/10 border-sky-500/40 shadow-lg shadow-sky-500/5"
                      : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm text-slate-100">
                      {c.certificateNumber}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-sky-300 border border-slate-700 font-mono">
                      {c.transportMode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    {c.transportMode === "AIR_CARGO" ? (
                      <Plane className="w-3.5 h-3.5 text-sky-400" />
                    ) : (
                      <Ship className="w-3.5 h-3.5 text-sky-400" />
                    )}
                    {c.vesselOrFlightOrVehiclePlate}
                  </p>
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex justify-between text-xs text-slate-400">
                    <span>Suma Asegurada:</span>
                    <span className="font-bold text-emerald-400">
                      ${c.totalInsuredValue.toLocaleString("en-US")}{" "}
                      {c.commercialCurrency}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-800">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    Certificado: {selectedCert.certificateNumber} (110% CIF: $
                    {selectedCert.totalInsuredValue.toLocaleString("en-US")}{" "}
                    {selectedCert.commercialCurrency})
                  </CardTitle>
                  <Button
                    onClick={() =>
                      window.open(
                        `/api/cargo-insurance/certificates/${selectedCert.id}/certificate-pdf`,
                        "_blank",
                      )
                    }
                    className="bg-sky-600 hover:bg-sky-500 text-white text-xs flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar Certificado PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 block">
                      Asegurado / Tomador
                    </span>
                    <span className="font-semibold text-slate-200">
                      {selectedCert.insuredPartyName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      Consignatario (Beneficiario L/C)
                    </span>
                    <span className="font-semibold text-slate-200">
                      {selectedCert.consigneeOrToOrderName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      Comisario de Averías en Destino
                    </span>
                    <span className="font-semibold text-amber-400">
                      {selectedCert.claimSurveyAgentNameAddress}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      Cláusula de Cobertura
                    </span>
                    <span className="font-semibold text-sky-400">
                      {selectedCert.coverageClause.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* Claim Adjustment Simulator */}
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <h4 className="font-bold text-slate-300 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-rose-400" />
                    Simulador & Liquidación Pericial de Siniestro (Avería
                    Particular):
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-slate-400 block text-[11px] mb-1">
                        Valor Sano Destino (€/$):
                      </label>
                      <input
                        type="number"
                        value={claimSoundVal}
                        onChange={(e) =>
                          setClaimSoundVal(Number(e.target.value))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block text-[11px] mb-1">
                        Valor Averiado/Salvamento (€/$):
                      </label>
                      <input
                        type="number"
                        value={claimSalvageVal}
                        onChange={(e) =>
                          setClaimSalvageVal(Number(e.target.value))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block text-[11px] mb-1">
                        Franquicia Deducible (€/$):
                      </label>
                      <input
                        type="number"
                        value={claimDeductible}
                        onChange={(e) =>
                          setClaimDeductible(Number(e.target.value))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">
                        Depreciación Acreditada:
                      </span>
                      <span className="font-mono font-bold text-rose-400">
                        {deprecPct}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">
                        Evaluación Bruta del Daño:
                      </span>
                      <span className="font-mono text-slate-200">
                        $
                        {grossClaimAssessment.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">
                        Franquicia Deducible:
                      </span>
                      <span className="font-mono text-rose-400">
                        -$
                        {claimDeductible.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs">
                      <span className="font-bold text-emerald-400">
                        INDEMNIZACIÓN NETA AUTORIZADA:
                      </span>
                      <span className="font-bold text-base font-mono text-emerald-400">
                        $
                        {netIndemnityPayable.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      onClick={() =>
                        window.open(
                          `/api/cargo-insurance/claims/ins_claim_01/adjustment-pdf`,
                          "_blank",
                        )
                      }
                      className="bg-rose-700 hover:bg-rose-600 text-white text-xs flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar Dictamen Pericial de Siniestro PDF
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
