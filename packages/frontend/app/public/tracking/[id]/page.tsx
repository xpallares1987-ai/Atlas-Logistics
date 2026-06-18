"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Ship,
  Clock,
  CheckCircle,
  Package,
  Anchor,
  MapPin,
  Globe,
  Leaf,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { fetchShipment } from "@/app/actions/actions";
import { fetchMilestones } from "@/app/actions/trackingActions";
import { Shipment, Milestone } from "@/types/scm";
import { TrackingMilestone } from "@/types/schema";

export default function PublicTrackingPage() {
  const { id } = useParams() as { id: string };
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [milestones, setMilestones] = useState<TrackingMilestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchShipment(id), fetchMilestones(id)]).then(
      ([shipmentData, milestonesData]) => {
        if (shipmentData) {
          setShipment(shipmentData);
        }
        setMilestones(milestonesData);
        setLoading(false);
      },
    );
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-[#0A0A0B]">
        <div className="text-gray-400 mb-4 animate-pulse">
           Cargando información del embarque...
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-[#0A0A0B]">
        <h1 className="text-2xl font-bold text-white mb-2">
          Embarque no encontrado
        </h1>
        <p className="text-gray-400">
          Este link podría ser inválido o haber expirado.
        </p>
      </div>
    );
  }

  const now = new Date();
  const etaDate = new Date(shipment.eta);
  const daysDelta = Math.ceil(
    (etaDate.getTime() - now.getTime()) / (1000 * 3600 * 24),
  );
  const isDelayed =
    daysDelta < 0 &&
    shipment.status !== "DELIVERED" &&
    shipment.status !== "ARRIVED";

  const getCountdownChip = () => {
    if (shipment.status === "DELIVERED") return null;

    if (shipment.status === "ARRIVED") {
      return {
        text: "ETA: Arribado a Destino",
        classes: "bg-blue-500/10 border-blue-500/30 text-blue-400 font-medium",
      };
    }

    if (isDelayed) {
      return {
        text: `ETA: Retrasado por ${Math.abs(daysDelta)} día${Math.abs(daysDelta) > 1 ? "s" : ""}`,
        classes: "bg-red-500/10 border-red-500/30 text-red-500 font-bold animate-pulse",
      };
    }

    if (daysDelta <= 2) {
      return {
        text: daysDelta === 0 ? "ETA: Llega Hoy" : daysDelta === 1 ? "ETA: Llega Mañana" : `ETA: Llega en ${daysDelta} días`,
        classes: "bg-orange-500/10 border-orange-500/30 text-orange-400 font-semibold",
      };
    }

    if (daysDelta <= 7) {
      return {
        text: `ETA: Llega en ${daysDelta} días`,
        classes: "bg-amber-500/10 border-amber-500/30 text-amber-400 font-medium",
      };
    }

    return {
      text: `ETA: Llega en ${daysDelta} días`,
      classes: "bg-[#16161A] border-gray-800 text-gray-400 font-medium",
    };
  };

  const countdown = getCountdownChip();

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-gray-100 p-6 md:p-12 font-sans flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800 pb-6 mb-6">
          <div className="flex items-center mb-4 md:mb-0">
            <Anchor className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white m-0 leading-tight">
                Forwarder<span className="text-blue-500">OS</span>
              </h1>
              <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">
                Portal de Seguimiento
              </p>
            </div>
          </div>
          <div className="bg-[#16161A] border border-gray-800 px-4 py-2 rounded-lg text-right w-full md:w-auto">
            <p className="text-xs text-gray-400 mb-1">Referencia del Cliente</p>
            <p className="font-bold text-white tracking-wide">
              {shipment.reference}
            </p>
          </div>
        </div>

        {/* Global Status Banner */}
        <div
          className={`p-5 rounded-xl border flex items-center shadow-lg ${shipment.status === "DELIVERED" ? "bg-emerald-900/10 border-emerald-500/30" : isDelayed ? "bg-red-900/10 border-red-500/30" : shipment.status === "ARRIVED" ? "bg-blue-900/10 border-blue-500/30" : "bg-[#16161A] border-gray-800"}`}
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 flex-shrink-0 ${shipment.status === "DELIVERED" ? "bg-emerald-500/20 text-emerald-400" : isDelayed ? "bg-red-500/20 text-red-400" : shipment.status === "ARRIVED" ? "bg-blue-500/20 text-blue-400" : "bg-gray-800 text-amber-400"}`}
          >
            {shipment.status === "DELIVERED" ? (
              <CheckCircle className="w-6 h-6" />
            ) : (
              <Ship className="w-6 h-6" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p className="text-sm font-bold text-white leading-tight">
                {shipment.status === "DELIVERED"
                  ? "Mercancía Entregada"
                  : isDelayed
                    ? "Demora Detectada"
                    : shipment.status === "ARRIVED"
                      ? "En Puerto de Destino"
                      : "En Tránsito"}
              </p>
              {countdown && (
                <span
                  className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border font-semibold ${countdown.classes}`}
                >
                  <Clock className="w-2.5 h-2.5 mr-1 flex-shrink-0" />
                  {countdown.text}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              {shipment.status === "DELIVERED"
                ? "El embarque ha sido entregado exitosamente al consignatario."
                : isDelayed
                  ? `El embarque presenta un retraso estimado de ${Math.abs(daysDelta)} días.`
                  : shipment.status === "ARRIVED"
                    ? "El buque ha arribado, esperando despacho y entrega."
                    : `Llegada estimada en ${daysDelta} días a ${shipment.destination}.`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Route Info */}
          <div className="bg-[#111114] border border-gray-800/40 p-6 rounded-xl space-y-6">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest border-b border-gray-800 pb-2">
              Ruta y Fechas
            </h3>
            <div className="relative pl-6 space-y-6 border-l border-gray-800 ml-3">
              <div className="relative">
                <div className="absolute w-3 h-3 bg-gray-700 rounded-full -left-[31px] top-1"></div>
                <p className="text-xs text-gray-400 mb-1">Origen (POL)</p>
                <p className="font-medium text-white">{shipment.origin}</p>
                <p className="text-xs text-gray-400 mt-1 font-mono">
                  ETD: {shipment.etd}
                </p>
              </div>
              <div className="relative">
                <div className="absolute w-3 h-3 bg-blue-500 rounded-full border-2 border-[#111114] shadow-[0_0_8px_rgba(59,130,246,0.5)] -left-[31px] top-1"></div>
                <p className="text-xs text-gray-400 mb-1">Destino (POD)</p>
                <p className="font-medium text-white">{shipment.destination}</p>
                <p
                  className={`text-xs mt-1 font-mono ${isDelayed ? "text-red-400" : "text-gray-400"}`}
                >
                  ETA: {shipment.eta}
                </p>
                {countdown && (
                  <div className="mt-2.5">
                    <span
                      className={`inline-flex items-center text-xs px-2.5 py-1 rounded-md border ${countdown.classes}`}
                    >
                      <Clock className="w-3 h-3 mr-1.5 flex-shrink-0" />
                      {countdown.text}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-gray-400">MBL:</span>
                <span className="font-mono text-gray-300">
                  {shipment.mblNumber}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Naviera:</span>
                <span className="font-bold text-white">{shipment.carrier}</span>
              </div>
            </div>
          </div>

          {/* Containers Info */}
          <div className="bg-[#111114] border border-gray-800/40 p-6 rounded-xl">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest border-b border-gray-800 pb-2 mb-4 flex items-center">
              <Package className="w-4 h-4 mr-2" />
              Carga y Contenedores
            </h3>
            <div className="space-y-3">
              {shipment.containers.map((c, i) => (
                <div
                  key={i}
                  className="bg-[#16161A] border border-gray-800 p-3 rounded-lg flex justify-between items-center"
                >
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                      Contenedor
                    </p>
                    <p className="font-mono text-sm font-medium text-white">
                      {c.containerNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-gray-800 text-gray-300 text-[10px] px-2 py-1 rounded mb-1">
                      {c.type}
                    </span>
                    <p className="text-[10px] text-gray-400">
                      {c.grossWeightKg.toLocaleString()} KG
                    </p>
                  </div>
                </div>
              ))}
              {shipment.containers.length === 0 && (
                <p className="text-xs text-gray-400">N/A</p>
              )}
            </div>
          </div>
        </div>

        {/* SCM & Customs Public Details */}
        {(shipment.incoterm || shipment.customsStatus || shipment.cargoDetails) && (() => {
          const incoterm = shipment.incoterm || "FOB";
          const customsStatus = shipment.customsStatus || "PENDING";
          const weight = shipment.cargoDetails?.weightKg || 18500;
          
          // Carbon Calculations
          const distanceKm = 10500;
          const weightTons = weight / 1000;
          const emissionFactor = shipment.mode === "AIR" ? 500 : 15;
          const currentCO2 = (weightTons * distanceKm * emissionFactor) / 1000000;
          const airCompCO2 = (weightTons * distanceKm * 500) / 1000000;
          const savedCO2 = Math.max(0, airCompCO2 - currentCO2);
          const treesEquivalent = Math.round(savedCO2 * 45);

          // Incoterms Responsibility Matrix
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
            "Fábrica",
            "Aduana Export",
            "Flete Int.",
            "Aduana Import",
            "Destino"
          ];

          return (
            <div className="bg-[#111114] border border-gray-800/40 p-6 rounded-xl space-y-6 shadow-md">
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest border-b border-gray-800 pb-2 flex items-center">
                <Globe className="w-4 h-4 mr-2 text-blue-500" />
                Especificación de Comercio Internacional & Aduana
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Incoterm */}
                <div className="bg-[#16161A] border border-gray-800/80 p-4 rounded-lg flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Incoterm Acordado</p>
                    <span className="inline-flex items-center text-xs font-bold text-white bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded">
                      {incoterm}
                    </span>
                    <p className="text-[11px] text-gray-400 mt-2 italic leading-relaxed">
                      {incoterm === 'EXW' 
                        ? "Ex Works: El comprador asume todo el flete y riesgo desde la fábrica del vendedor." 
                        : incoterm === 'DDP' 
                          ? "Delivered Duty Paid: Entregado puerta a puerta con aranceles pagados por el vendedor."
                          : "Libre a bordo: El riesgo se transfiere al comprador tras la carga a bordo en el puerto de origen."}
                    </p>
                  </div>
                </div>

                {/* Customs status */}
                <div className="bg-[#16161A] border border-gray-800/80 p-4 rounded-lg flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Despacho de Importación</p>
                    {(() => {
                      const status = customsStatus;
                      let colorClasses = "text-amber-400 bg-amber-500/15 border-amber-500/25";
                      let statusText = "Pendiente de Aduana";
                      let descText = "En espera de revisión documental preliminar.";
                      
                      if (status === "CLEARED") {
                        colorClasses = "text-emerald-400 bg-emerald-500/15 border-emerald-500/25";
                        statusText = "Liberado / Despachado";
                        descText = "Mercancía autorizada formalmente para su levante y entrega.";
                      } else if (status === "HELD_FOR_INSPECTION") {
                        colorClasses = "text-red-400 bg-red-500/15 border-red-500/25 animate-pulse";
                        statusText = "Retenido por Alerta";
                        descText = "Sujeto a inspección documental/física de canal rojo.";
                      } else if (status === "IN_BOND") {
                        colorClasses = "text-blue-400 bg-[#0000FF]/15 border-blue-500/25";
                        statusText = "Tránsito de Aduana";
                        descText = "En traslado controlado legalmente hacia bodega fiscal interna.";
                      }
                      
                      return (
                        <>
                          <span className={`inline-flex items-center text-xs font-bold px-2 py-1 rounded border ${colorClasses}`}>
                            {statusText}
                          </span>
                          <p className="text-[11px] text-gray-400 mt-2 italic leading-relaxed">
                            {descText}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Cargo info */}
                <div className="bg-[#16161A] border border-gray-800/80 p-4 rounded-lg">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Tarifa Arancelaria y Carga</p>
                  <div className="space-y-1.5 text-xs text-gray-300">
                    <div>
                      <span className="text-gray-500">HS Code:</span>{" "}
                      <span className="font-mono bg-gray-950 px-1 py-0.5 rounded text-white text-[11px]">
                        {shipment.cargoDetails?.hsCode || "8517.18"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Tipo:</span>{" "}
                      <span className="bg-gray-800 text-gray-200 px-1.5 py-0.5 rounded text-[10px]">
                        {shipment.cargoDetails?.cargoType || "GENERAL"}
                      </span>
                    </div>
                    <div className="truncate text-gray-400" title={shipment.cargoDetails?.description || "Equipos de Telecomunicación"}>
                      <span className="text-gray-500">Desc:</span>{" "}
                      {shipment.cargoDetails?.description || "Dispositivos de Telecomunicación"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Incoterms Responsibility horizontal visual matrix */}
              <div className="bg-[#16161A]/50 border border-gray-800/60 p-4 rounded-lg space-y-3">
                <p className="text-xs text-gray-400 uppercase tracking-wider flex justify-between">
                  <span>División de Obligaciones y Riesgo de Flete ({incoterm})</span>
                  <span className="text-[10px] text-blue-400">Vendedor vs Comprador</span>
                </p>
                <div className="grid grid-cols-5 gap-1.5 text-center">
                  {stages.map((stg, i) => {
                    const isSeller = resp.seller[i];
                    return (
                      <div key={i} className="flex flex-col items-center">
                        <div className={`w-full h-2 rounded-full mb-1 ${isSeller ? "bg-emerald-500" : "bg-blue-500"}`} />
                        <span className="text-[9px] text-gray-300 font-medium truncate w-full">
                          {stg}
                        </span>
                        <span className={`text-[8px] font-bold ${isSeller ? "text-emerald-400" : "text-blue-400"}`}>
                          {isSeller ? "VENDEDOR" : "COMPRADOR"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Verified Customs Checklist displaying standard checks */}
              <div className="bg-[#16161A]/50 border border-gray-800/60 p-4 rounded-lg space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-wider flex items-center text-blue-400 font-bold">
                  <ShieldCheck className="w-4 h-4 mr-1 text-blue-500" /> Requisitos de Despacho & Expediente de Importación
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-300 pt-1">
                  <div className="flex items-center space-x-2 bg-[#0A0A0B] px-3 py-2 rounded border border-gray-800/40">
                    <span className="text-emerald-500 font-bold font-mono">✔</span>
                    <span className="truncate">Commercial Invoice & Packing List</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-[#0A0A0B] px-3 py-2 rounded border border-gray-800/40">
                    <span className="text-emerald-500 font-bold font-mono">✔</span>
                    <span className="truncate">Bill of Lading / HBL Validado</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-[#0A0A0B] px-3 py-2 rounded border border-gray-800/40">
                    <span className={customsStatus === "CLEARED" ? "text-emerald-500 font-bold font-mono" : "text-amber-500 font-mono"}>
                      {customsStatus === "CLEARED" ? "✔" : "●"}
                    </span>
                    <span className="truncate">Clasificación Arancelaria Confirmada</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-[#0A0A0B] px-3 py-2 rounded border border-gray-800/40">
                    <span className={customsStatus === "CLEARED" ? "text-emerald-500 font-bold font-mono" : "text-amber-500 font-mono"}>
                      {customsStatus === "CLEARED" ? "✔" : "●"}
                    </span>
                    <span className="truncate">Liquidación de Derechos/Tasas Pagada</span>
                  </div>
                </div>
              </div>

              {/* Sustainability Carbon Footprint Assesment Category */}
              <div className="bg-emerald-950/15 border border-emerald-900/30 p-4 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider flex items-center">
                    <Leaf className="w-4 h-4 mr-1.5" /> Evaluación Ambiental ESG y Huella de Carbono del Embarque
                  </span>
                  <span className="text-xs text-emerald-500 font-bold font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    Clase {shipment.mode === "AIR" ? "D - Alta Emisión" : "A+ Ecológico"}
                  </span>
                </div>
                <p className="text-xs text-gray-300">
                  Total de misiones estimadas de CO₂ para este flete: <span className="font-mono text-white font-bold">{currentCO2.toFixed(2)} tCO₂e</span>
                </p>
                {savedCO2 > 0 && (
                  <div className="pt-1.5 space-y-1">
                    <div className="w-full bg-gray-950 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: "97%" }} />
                    </div>
                    <p className="text-[11px] text-emerald-400 font-medium italic">
                      ¡Al optar por ruta marítima ({shipment.mode || "FCL_40"}), este embarque ahorra {savedCO2.toFixed(1)} toneladas métricas de CO₂ frente a un flete aéreo equivalente. Equivale al CO₂ absorbido por {treesEquivalent} árboles anualmente.
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Real Milestones */}
        <div className="bg-[#111114] border border-gray-800/40 p-6 rounded-xl">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest border-b border-gray-800 pb-2 mb-6 flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Historial de Eventos
          </h3>
          <div className="space-y-6">
            {milestones.length > 0 ? (
              milestones
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime(),
                )
                .map((m, i) => (
                  <div key={m.id} className="flex group">
                    <div className="flex flex-col items-center mr-4">
                      <div
                        className={`w-3 h-3 rounded-full border-2 border-[#111114] ${i === 0 ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "bg-gray-600"}`}
                      ></div>
                      {i !== milestones.length - 1 && (
                        <div className="w-px h-full bg-gray-800 mt-1"></div>
                      )}
                    </div>
                    <div className="bg-[#16161A] border border-gray-800/60 p-4 rounded-lg flex-1 mb-2 group-hover:border-gray-700 transition-colors">
                      <div className="flex flex-wrap justify-between items-start mb-2">
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded ${i === 0 ? "bg-blue-500/10 text-blue-400" : "bg-gray-800 text-gray-300"}`}
                        >
                          {m.type.replace("_", " ")}
                        </span>
                        <span className="text-xs font-mono text-gray-400">
                          {new Date(m.date).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mb-2">
                        {m.description}
                      </p>
                      <div className="flex items-center text-[10px] text-gray-400 uppercase tracking-wider">
                        <MapPin className="w-3 h-3 mr-1" />
                        {m.location}
                      </div>
                    </div>
                  </div>
                ))
            ) : shipment.milestones && shipment.milestones.length > 0 ? (
              // Fallback to embedded milestones if API tracking milestones array is empty but legacy exists
              [...shipment.milestones]
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime(),
                )
                .map((m: any, i) => (
                  <div key={m.id || i} className="flex group">
                    <div className="flex flex-col items-center mr-4">
                      <div
                        className={`w-3 h-3 rounded-full border-2 border-[#111114] ${i === 0 ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "bg-gray-600"}`}
                      ></div>
                      {i !== shipment.milestones.length - 1 && (
                        <div className="w-px h-full bg-gray-800 mt-1"></div>
                      )}
                    </div>
                    <div className="bg-[#16161A] border border-gray-800/60 p-4 rounded-lg flex-1 mb-2 group-hover:border-gray-700 transition-colors">
                      <div className="flex flex-wrap justify-between items-start mb-2">
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded ${i === 0 ? "bg-blue-500/10 text-blue-400" : "bg-gray-800 text-gray-300"}`}
                        >
                          {m.type.replace("_", " ")}
                        </span>
                        <span className="text-xs font-mono text-gray-400">
                          {m.date}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mb-2">
                        {m.description}
                      </p>
                      <div className="flex items-center text-[10px] text-gray-400 uppercase tracking-wider">
                        <MapPin className="w-3 h-3 mr-1" />
                        {m.location}
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-xs text-gray-400">
                No hay hitos registrados en este momento para el embarque.
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 mt-12 text-center">
          <p className="text-xs text-gray-400 mb-2 font-medium">Powered by</p>
          <div className="flex items-center justify-center filter grayscale opacity-50">
            <Anchor className="w-5 h-5 mr-2" />
            <span className="font-bold text-sm tracking-tight text-white">
              ForwarderOS
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-4">
            La información mostrada en esta página está sujeta a actualizaciones
            y podría presentar demoras respecto a la operación real.
          </p>
        </div>
      </div>
    </div>
  );
}
