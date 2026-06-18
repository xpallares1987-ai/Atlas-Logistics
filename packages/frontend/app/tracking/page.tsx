"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Ship,
  Search,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Package,
  Upload,
  Share2,
  Globe,
  Info,
  AlertTriangle,
  Leaf,
  ShieldCheck,
  Scale,
} from "lucide-react";
import { fetchShipments } from "@/app/actions/actions";
import { Shipment } from "@/types/scm";
import { MilestonesView } from "./MilestonesView";
import { AuditLogView } from "./AuditLogView";

interface SCMDetailsProps {
  shipment: Shipment;
  onUpdate: (updates: Partial<Shipment>) => void;
}

const INCOTERMS_DETAILS: Record<string, string> = {
  EXW: "Ex Works: El comprador asume todo el flete y riesgo desde la fábrica del vendedor.",
  FCA: "Free Carrier: El vendedor entrega la carga despachada de exportación al transportista designado.",
  FAS: "Free Alongside Ship: El vendedor coloca la mercancía al costado del buque en el puerto de origen.",
  FOB: "Free On Board: El riesgo se transfiere del vendedor al comprador al sobrepasar la borda del buque.",
  CFR: "Cost and Freight: El flete primario pagado por vendedor hasta destino; riesgo es del comprador.",
  CIF: "Cost, Insurance & Freight: Flete pagado con cobertura mínima de seguro marítimo a cargo del vendedor.",
  CPT: "Carriage Paid To: Vendedor paga transporte terrestre o aéreo principal hasta destino acordado.",
  CIP: "Carriage & Insurance Paid: Costo, flete y seguro cubiertos por vendedor hasta el punto establecido.",
  DAP: "Delivered At Place: Entregado por el vendedor listo para descarga en el lugar de destino pactado.",
  DPU: "Delivered At Place Unloaded: El vendedor descarga y entrega la carga en la terminal acordada.",
  DDP: "Delivered Duty Paid: Vendedor cubre impuestos locales, arancel de aduana y entrega final puerta a puerta.",
};

const CARGO_TYPES = ["GENERAL", "HAZMAT", "PERISHABLE", "OVERSIZED", "RO_RO"];
const CUSTOMS_STATUSES = [
  { value: "PENDING", label: "Pendiente de Aduana", desc: "No presentado o documentación en revisión preliminar." },
  { value: "CLEARED", label: "Liberado / Despachado", desc: "Autorización de levante otorgado. Listo para reparto terminal." },
  { value: "HELD_FOR_INSPECTION", label: "Retenido por Alerta", desc: "Inspección exhaustiva o aforo documental requerido." },
  { value: "IN_BOND", label: "Régimen de Tránsito", desc: "Tránsito legal interno garantizado hacia depósito o puerto seco." },
];

function SCMDetails({ shipment, onUpdate }: SCMDetailsProps) {
  const incoterm = shipment.incoterm || "FOB";
  const customsStatus = shipment.customsStatus || "PENDING";
  const hsCode = shipment.cargoDetails?.hsCode || "";
  const descCargo = shipment.cargoDetails?.description || "";
  const weight = shipment.cargoDetails?.weightKg || 18500;
  const volume = shipment.cargoDetails?.volumeCbm || 54;
  const cargoType = shipment.cargoDetails?.cargoType || "GENERAL";

  // State to simulate local checklist validation without needing database schemas
  const [checklist, setChecklist] = React.useState<Record<string, boolean>>({
    invoice: true,
    packing: true,
    hsClass: customsStatus === "CLEARED",
    customsTax: customsStatus === "CLEARED",
    physicalCheck: customsStatus === "CLEARED" || customsStatus === "IN_BOND",
  });

  const handleCustomsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as any;
    onUpdate({ customsStatus: newStatus });
    if (newStatus === "CLEARED") {
      setChecklist({ invoice: true, packing: true, hsClass: true, customsTax: true, physicalCheck: true });
      try {
        const { triggerScmNotification } = require('@/lib/notifications');
        triggerScmNotification(
          'CUSTOMS',
          'Aduana Liberada / Cleared',
          `El aforo aduanero del embarque ${shipment.reference} ha concluido con éxito. Levamiento concedido.`,
          shipment.id
        );
      } catch (err) {}
    } else if (newStatus === "PENDING") {
      setChecklist({ invoice: true, packing: true, hsClass: false, customsTax: false, physicalCheck: false });
    } else if (newStatus === "HELD_FOR_INSPECTION") {
      try {
        const { triggerScmNotification } = require('@/lib/notifications');
        triggerScmNotification(
          'CUSTOMS',
          'Alerta Aduanera: Retenido / Held',
          `ATENCIÓN: El embarque ${shipment.reference} ha sido marcado como RETENIDO para inspección física adicional.`,
          shipment.id
        );
      } catch (err) {}
    }
  };

  const handleIncotermChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ incoterm: e.target.value as any });
  };

  const handleCargoChange = (field: string, val: any) => {
    onUpdate({
      cargoDetails: {
        hsCode,
        description: descCargo,
        weightKg: weight,
        volumeCbm: volume,
        cargoType,
        [field]: val
      }
    });
  };

  const currentCustomsInfo = CUSTOMS_STATUSES.find(c => c.value === customsStatus);

  // Carbon Footprint Calculations
  // Air standard: ~500g, LCL/FCL Sea: ~15g, Road/default: ~80g
  const distanceKm = 10500; // estimated CNSHA to USLAX route distance
  const weightTons = weight / 1000;
  const emissionFactor = shipment.mode === "AIR" ? 500 : 15;
  const currentCO2Emissions = (weightTons * distanceKm * emissionFactor) / 1000000; // tons of CO2
  const airCompCO2Emissions = (weightTons * distanceKm * 500) / 1000000; // if it had gone by Air
  const rawSavedCO2 = airCompCO2Emissions - currentCO2Emissions;
  const savedCO2 = rawSavedCO2 > 0 ? rawSavedCO2 : 0;
  const treesEquivalent = Math.round(savedCO2 * 45); // Roughly 45 trees per ton of CO2 offset annually

  // Dynamic Incoterm Responsibilities
  const getResponsibilities = (term: string) => {
    switch (term) {
      case "EXW":
        return { seller: [false, false, false, false, false], buyer: [true, true, true, true, true] };
      case "FCA":
        return { seller: [true, false, false, false, false], buyer: [false, true, true, true, true] };
      case "FOB":
        return { seller: [true, true, false, false, false], buyer: [false, false, true, true, true] };
      case "CIF":
      case "CFR":
        return { seller: [true, true, true, false, false], buyer: [false, false, false, true, true] };
      case "DAP":
      case "CPT":
      case "CIP":
        return { seller: [true, true, true, true, false], buyer: [false, false, false, false, true] };
      case "DDP":
        return { seller: [true, true, true, true, true], buyer: [false, false, false, false, false] };
      default:
        return { seller: [true, true, false, false, false], buyer: [false, false, true, true, true] };
    }
  };

  const resp = getResponsibilities(incoterm);
  const stages = [
    "Carga Fábrica",
    "Aduana Export",
    "Flete Internac.",
    "Aduana Import",
    "Puerta Destino"
  ];

  const totalCompletedChecklist = Object.values(checklist).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-bold text-gray-300 flex items-center">
        <Globe className="w-4 h-4 mr-2 text-blue-400" />
        Comercio Exterior & Despacho Aduanero
      </h4>
      <div className="bg-[#111114] p-4 rounded-lg border border-gray-800/80 space-y-4">
        {/* Row 1: Incoterm & Customs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={`select-incoterm-${shipment.id}`} className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center">
              Incoterm Pactado
              <span className="ml-1 text-gray-500 hover:text-gray-300 cursor-help" title={INCOTERMS_DETAILS[incoterm]}>
                <Info className="w-3 h-3" />
              </span>
            </label>
            <select
              id={`select-incoterm-${shipment.id}`}
              name="incoterm"
              value={incoterm}
              onChange={handleIncotermChange}
              className="w-full bg-[#0A0A0B] border border-gray-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              {Object.keys(INCOTERMS_DETAILS).map((term) => (
                <option key={term} value={term}>
                  {term} - {term === "FOB" ? "FOB (Free On Board)" : term === "EXW" ? "EXW (Ex Works)" : term === "DDP" ? "DDP (Delivered Duty Paid)" : term === "CIF" ? "CIF (Cost, Insurance & Freight)" : term}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-gray-500 mt-1.5 italic min-h-[30px] leading-relaxed">
              {INCOTERMS_DETAILS[incoterm]}
            </p>
          </div>

          <div>
            <label htmlFor={`select-customs-${shipment.id}`} className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center">
              Estado de Aduana
              {customsStatus === "HELD_FOR_INSPECTION" && (
                <span className="ml-1 text-red-400 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </span>
              )}
            </label>
            <select
              id={`select-customs-${shipment.id}`}
              name="customsStatus"
              value={customsStatus}
              onChange={handleCustomsChange}
              className={`w-full bg-[#0A0A0B] border rounded px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 ${
                customsStatus === "CLEARED" 
                  ? "border-emerald-500/30 text-emerald-400 focus:border-emerald-500" 
                  : customsStatus === "HELD_FOR_INSPECTION" 
                    ? "border-red-500/30 text-red-400 focus:border-red-500" 
                    : customsStatus === "IN_BOND" 
                      ? "border-blue-500/30 text-blue-400 focus:border-blue-500" 
                      : "border-amber-500/30 text-amber-400 focus:border-amber-500"
              }`}
            >
              {CUSTOMS_STATUSES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-gray-500 mt-1.5 italic min-h-[30px] leading-relaxed">
              {currentCustomsInfo?.desc}
            </p>
          </div>
        </div>

        {/* Incoterms Responsibility Chart */}
        <div className="pt-2 border-t border-gray-800/40">
          <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-2 flex justify-between">
            <span>Matriz de Responsabilidad del Flete ({incoterm})</span>
            <span className="text-[9px] text-blue-400">Vendedor vs. Comprador</span>
          </label>
          <div className="grid grid-cols-5 gap-1.5 text-center">
            {stages.map((stg, i) => {
              const isSeller = resp.seller[i];
              return (
                <div key={i} className="flex flex-col items-center">
                  <div className={`w-full h-2 rounded-full mb-1 ${isSeller ? "bg-emerald-500" : "bg-blue-500"}`} />
                  <span className="text-[8px] text-gray-400 font-medium truncate w-full" title={stg}>
                    {stg}
                  </span>
                  <span className={`text-[7px] font-bold ${isSeller ? "text-emerald-400" : "text-blue-400"}`}>
                    {isSeller ? "VENTA" : "COMPRA"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Row 2: Cargo HS Code, Details & Type */}
        <div className="pt-3 border-t border-gray-800/40 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label htmlFor={`input-hscode-${shipment.id}`} className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1">
              HS Code
            </label>
            <input
              id={`input-hscode-${shipment.id}`}
              type="text"
              name="hsCode"
              placeholder="e.g. 8517.18"
              value={hsCode}
              onChange={(e) => handleCargoChange("hsCode", e.target.value)}
              className="w-full bg-[#0A0A0B] border border-gray-800 rounded px-2 py-1 text-xs text-white uppercase font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor={`select-cargotype-${shipment.id}`} className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1">
              Tipo Carga
            </label>
            <select
              id={`select-cargotype-${shipment.id}`}
              name="cargoType"
              value={cargoType}
              onChange={(e) => handleCargoChange("cargoType", e.target.value)}
              className="w-full bg-[#0A0A0B] border border-gray-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              {CARGO_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={`input-cargo-weight-${shipment.id}`} className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1">
              Peso (KG)
            </label>
            <input
              id={`input-cargo-weight-${shipment.id}`}
              type="number"
              name="weightKg"
              value={weight}
              onChange={(e) => handleCargoChange("weightKg", parseFloat(e.target.value) || 0)}
              className="w-full bg-[#0A0A0B] border border-gray-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor={`input-cargo-vol-${shipment.id}`} className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1">
              Vol (CBM)
            </label>
            <input
              id={`input-cargo-vol-${shipment.id}`}
              type="number"
              name="volumeCbm"
              value={volume}
              onChange={(e) => handleCargoChange("volumeCbm", parseFloat(e.target.value) || 0)}
              className="w-full bg-[#0A0A0B] border border-gray-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Goods Desc */}
        <div>
          <label htmlFor={`input-descgoods-${shipment.id}`} className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1">
            Descripción Comercial de Carga
          </label>
          <input
            id={`input-descgoods-${shipment.id}`}
            type="text"
            name="cargoDescription"
            placeholder="Descripción detallada de mercancías..."
            value={descCargo}
            onChange={(e) => handleCargoChange("description", e.target.value)}
            className="w-full bg-[#0A0A0B] border border-gray-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Customs Checklist */}
        <div className="pt-3 border-t border-gray-800/40 space-y-2">
          <div className="flex justify-between items-center text-[10px] text-gray-400 uppercase tracking-wider">
            <span className="flex items-center text-blue-400 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Requisitos de Despacho ({totalCompletedChecklist}/5)
            </span>
            <span className={totalCompletedChecklist === 5 ? "text-emerald-400 font-bold" : "text-amber-400"}>
              {totalCompletedChecklist === 5 ? "EXPEDIENTE COMPLETO" : "PENDIENTE"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-300">
            <label className="flex items-center space-x-2 bg-[#0A0A0B] px-2 py-1.5 rounded border border-gray-800/50 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.invoice}
                onChange={() => setChecklist(prev => ({ ...prev, invoice: !prev.invoice }))}
                className="rounded text-blue-500 focus:ring-0"
              />
              <span className="truncate">Comercial Invoice & PL</span>
            </label>
            <label className="flex items-center space-x-2 bg-[#0A0A0B] px-2 py-1.5 rounded border border-gray-800/50 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.packing}
                onChange={() => setChecklist(prev => ({ ...prev, packing: !prev.packing }))}
                className="rounded text-blue-500 focus:ring-0"
              />
              <span className="truncate">Bill of Lading / HBL</span>
            </label>
            <label className="flex items-center space-x-2 bg-[#0A0A0B] px-2 py-1.5 rounded border border-gray-800/50 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.hsClass}
                onChange={() => setChecklist(prev => ({ ...prev, hsClass: !prev.hsClass }))}
                className="rounded text-blue-500 focus:ring-0"
              />
              <span className="truncate">Clasificación de HS Code</span>
            </label>
            <label className="flex items-center space-x-2 bg-[#0A0A0B] px-2 py-1.5 rounded border border-gray-800/50 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.customsTax}
                onChange={() => setChecklist(prev => ({ ...prev, customsTax: !prev.customsTax }))}
                className="rounded text-blue-500 focus:ring-0"
              />
              <span className="truncate">Pago de Tasas / Aranceles</span>
            </label>
          </div>
        </div>

        {/* Sustainability Carbon Footprint Assesment Category */}
        <div className="pt-3 border-t border-gray-800/40 bg-emerald-950/10 rounded p-3 border border-emerald-900/20">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center">
              <Leaf className="w-3.5 h-3.5 mr-1" /> ESG & Huella de Carbono del Embarque
            </span>
            <span className="text-[10px] text-emerald-500 font-mono bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
              Clase {shipment.mode === "AIR" ? "D - Alta Emisión" : "A+ Ecológico"}
            </span>
          </div>
          <p className="text-[11px] text-gray-300">
            Huella de Carbono Estimada: <span className="font-mono text-white font-bold">{currentCO2Emissions.toFixed(2)} tCO₂e</span>
          </p>
          {savedCO2 > 0 && (
            <div className="mt-1.5 space-y-1">
              <div className="w-full bg-gray-950 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: "97%" }} />
              </div>
              <p className="text-[9.5px] text-emerald-400 italic">
                ¡Transporte marítimo ahorró <span className="font-semibold">{savedCO2.toFixed(1)} toneladas de CO₂</span> vs. vía Aérea equivalente (equivale a {treesEquivalent} árboles maduros cultivados al año).
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ShipmentDocuments({ shipment }: { shipment: Shipment }) {
  const [docs, setDocs] = useState([
    { name: "Commercial_Invoice.pdf", size: "245 KB" },
    { name: "Packing_List.pdf", size: "120 KB" },
    { name: `Draft_BL_${shipment.hblNumber}.pdf`, size: "512 KB" },
  ]);

  const handleUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf";
    input.onchange = (e: any) => {
      const fileList = e.target.files;
      if (fileList && fileList.length > 0) {
        const file = fileList[0];
        const newDoc = {
          name: file.name,
          size: `${(file.size / 1024).toFixed(0)} KB`,
        };
        setDocs((prev) => [...prev, newDoc]);
      }
    };
    input.click();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-bold text-gray-300 flex items-center">
          <FileText className="w-4 h-4 mr-2" />
          Documentos Adjuntos
        </h4>
        <button
          onClick={handleUpload}
          className="bg-gray-800 hover:bg-gray-700 text-xs text-white px-2 py-1 rounded transition flex items-center"
        >
          <Upload className="w-3 h-3 mr-1" /> Subir
        </button>
      </div>
      <div className="bg-[#16161A] p-3 rounded-md border border-gray-800 space-y-2">
        {docs.map((doc, i) => (
          <div key={i} className="flex justify-between items-center text-xs">
            <div className="text-blue-400 hover:text-blue-300 cursor-pointer underline flex items-center">
              <FileText className="w-3 h-3 mr-1" />
              {doc.name}
            </div>
            <span className="text-gray-500">{doc.size}</span>
          </div>
        ))}
        {docs.length === 0 && (
          <div className="text-xs text-gray-500">No hay documentos</div>
        )}
      </div>
    </div>
  );
}

function TrackingContent() {
  const searchParams = useSearchParams();
  const search = searchParams?.get("search") || "";
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filtered, setFiltered] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const updateShipmentSCM = (shipmentId: string, updates: Partial<Shipment>) => {
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id === shipmentId) {
          const mergedCargo = s.cargoDetails || updates.cargoDetails
            ? { ...(s.cargoDetails || {}), ...(updates.cargoDetails || {}) }
            : undefined;
          return {
            ...s,
            ...updates,
            cargoDetails: mergedCargo,
          } as Shipment;
        }
        return s;
      })
    );
  };

  const handleCopyLink = (e: React.MouseEvent, shipmentId: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/public/tracking/${shipmentId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopyFeedback(shipmentId);
      setTimeout(() => setCopyFeedback(null), 2000);
    });
  };

  useEffect(() => {
    fetchShipments().then((data) => {
      setShipments(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!search) {
      setFiltered(shipments);
      return;
    }
    const term = search.toLowerCase();
    const result = shipments.filter(
      (s) =>
        s.hblNumber.toLowerCase().includes(term) ||
        s.mblNumber.toLowerCase().includes(term) ||
        s.reference.toLowerCase().includes(term) ||
        s.containers.some((c) =>
          c.containerNumber.toLowerCase().includes(term),
        ),
    );
    setFiltered(result);
  }, [shipments, search]);

  return (
    <>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
            Tracking & Operaciones
          </h1>
          <p className="text-gray-400">
            Control de embarques, hitos y contenedores.
          </p>
        </div>
        {search && (
          <div className="bg-blue-600/10 text-blue-500 px-4 py-2 rounded-lg text-sm font-medium border border-blue-500/20 inline-flex items-center">
            <Search className="w-4 h-4 mr-2" />
            Mostrando resultados para:{" "}
            <span className="text-white ml-2">&quot;{search}&quot;</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20 text-gray-500">
          Cargando...
        </div>
      ) : (
        <div className="bg-[#16161A] border border-gray-800/40 rounded-xl overflow-hidden shadow-2xl">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No hay embarques que coincidan con la búsqueda.
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-[#111114] text-gray-400 border-b border-gray-800/40">
                <tr>
                  <th className="px-6 py-4 font-bold tracking-wider">
                    Referencia
                  </th>
                  <th className="px-6 py-4 font-bold tracking-wider">
                    MBL / HBL
                  </th>
                  <th className="px-6 py-4 font-bold tracking-wider">
                    Origen / Destino
                  </th>
                  <th className="px-6 py-4 font-bold tracking-wider">
                    ETD / ETA
                  </th>
                  <th className="px-6 py-4 font-bold tracking-wider text-right">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((shp) => {
                  const now = new Date();
                  const etaDate = new Date(shp.eta);
                  const daysDelta = Math.ceil(
                    (etaDate.getTime() - now.getTime()) / (1000 * 3600 * 24),
                  );
                  const isDelayed =
                    daysDelta < 0 &&
                    shp.status !== "DELIVERED" &&
                    shp.status !== "ARRIVED";
                  const rowBg =
                    shp.status === "DELIVERED"
                      ? "bg-emerald-900/5"
                      : isDelayed
                        ? "bg-red-900/10"
                        : "hover:bg-gray-800/20";

                  return (
                    <React.Fragment key={shp.id}>
                      <tr
                        className={`border-b border-gray-800/40 transition-colors ${rowBg}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-white">
                              {shp.reference}
                            </div>
                            <button
                              onClick={(e) => handleCopyLink(e, shp.id)}
                              className="text-gray-500 hover:text-white transition-colors"
                              title="Copiar Link Público"
                            >
                              {copyFeedback === shp.id ? (
                                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                              ) : (
                                <Share2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div className="text-xs text-gray-500 uppercase">
                            {shp.carrier}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-300">
                          <div>
                            M:{" "}
                            <span className="text-blue-400 font-bold">
                              {shp.mblNumber}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            H:
                            <button
                              onClick={() => toggleExpand(shp.id)}
                              className="inline-flex items-center hover:text-white underline cursor-pointer text-blue-400 transition-colors"
                            >
                              {shp.hblNumber}
                              {expandedRowId === shp.id ? (
                                <ChevronUp className="w-3 h-3 ml-1" />
                              ) : (
                                <ChevronDown className="w-3 h-3 ml-1" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-300 font-medium">
                          <div className="mb-1">
                            {shp.origin} &rarr; {shp.destination}
                          </div>
                          <div className="text-xs text-gray-500 font-normal">
                            {shp.containers.length} Contenedor(es) |{" "}
                            {shp.containers
                              .reduce((acc, c) => acc + c.grossWeightKg, 0)
                              .toLocaleString()}{" "}
                            kg
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          <div>
                            <span className="text-gray-500 text-xs">ETD:</span>{" "}
                            {shp.etd}
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">ETA:</span>{" "}
                            {shp.eta}
                          </div>
                          {shp.status !== "DELIVERED" && (() => {
                            let chipClasses = "";
                            let chipText = "";
                            if (shp.status === "ARRIVED") {
                              chipClasses = "bg-blue-500/15 border-blue-500/30 text-blue-400";
                              chipText = "Arribado";
                            } else if (isDelayed) {
                              chipClasses = "bg-red-500/15 border-red-500/30 text-red-400 font-bold animate-pulse";
                              chipText = `Retrasado ${Math.abs(daysDelta)} días`;
                            } else if (daysDelta <= 2) {
                              chipClasses = "bg-orange-500/15 border-orange-500/30 text-orange-400 font-semibold";
                              chipText = daysDelta === 0 ? "Hoy" : daysDelta === 1 ? "Mañana" : `En ${daysDelta} d`;
                            } else if (daysDelta <= 7) {
                              chipClasses = "bg-amber-500/15 border-amber-500/30 text-amber-400";
                              chipText = `En ${daysDelta} días`;
                            } else {
                              chipClasses = "bg-[#111114] border-gray-800 text-gray-400";
                              chipText = `En ${daysDelta} días`;
                            }
                            return (
                              <div className="mt-1.5 flex">
                                <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded border font-medium ${chipClasses}`}>
                                  <Clock className="w-2.5 h-2.5 mr-1 flex-shrink-0" />
                                  {chipText}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {shp.status === "DELIVERED" ? (
                            <span className="inline-flex items-center text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-500/20">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              ENTREGADO
                            </span>
                          ) : shp.status === "ARRIVED" ? (
                            <span className="inline-flex items-center text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full text-xs font-bold border border-blue-500/20">
                              <Ship className="w-3 h-3 mr-1" />
                              LLEGADO
                            </span>
                          ) : isDelayed ? (
                            <span className="inline-flex items-center text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full text-xs font-bold border border-red-500/20">
                              <Clock className="w-3 h-3 mr-1" />
                              RETRASADO
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full text-xs font-bold border border-amber-500/20">
                              <Clock className="w-3 h-3 mr-1" />
                              EN TRÁNSITO
                            </span>
                          )}
                        </td>
                      </tr>
                      {expandedRowId === shp.id && (
                        <tr className="bg-[#111114] border-b border-gray-800/40">
                          <td colSpan={5} className="px-6 py-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              <div>
                                <h4 className="text-sm font-bold text-gray-300 flex items-center mb-4">
                                  <Package className="w-4 h-4 mr-2" />
                                  Packing List y Contenedores
                                </h4>
                                <div className="space-y-2">
                                  {shp.containers.map((container, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-[#16161A] p-3 rounded-md border border-gray-800 flex justify-between items-center text-xs"
                                    >
                                      <div className="font-mono text-gray-300">
                                        <span className="text-gray-500 mr-2">
                                          C#:
                                        </span>
                                        {container.containerNumber}
                                      </div>
                                      <div className="text-gray-400 text-right">
                                        <span className="inline-block px-2 py-0.5 bg-gray-800 rounded mr-3">
                                          {container.type}
                                        </span>
                                        <span className="text-gray-500 mr-1">
                                          Gross:
                                        </span>
                                        {container.grossWeightKg.toLocaleString()}{" "}
                                        kg
                                      </div>
                                    </div>
                                  ))}
                                  {shp.containers.length === 0 && (
                                    <div className="text-xs text-gray-500 italic">
                                      No hay información de contenedores.
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <ShipmentDocuments shipment={shp} />
                              </div>
                              <div>
                                <SCMDetails
                                  shipment={shp}
                                  onUpdate={(updates) => updateShipmentSCM(shp.id, updates)}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 border-t border-gray-800 pt-6">
                              <div>
                                <MilestonesView shipmentId={shp.id} />
                              </div>
                              <div>
                                <AuditLogView shipmentId={shp.id} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}

export default function TrackingPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <Suspense
        fallback={
          <div className="p-20 text-center text-gray-500">
            Cargando módulos...
          </div>
        }
      >
        <TrackingContent />
      </Suspense>
    </div>
  );
}
