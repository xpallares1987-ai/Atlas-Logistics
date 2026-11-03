import React, { useState, useEffect } from "react";
import {
  Truck,
  MapPin,
  Clock,
  Euro,
  Leaf,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Navigation,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { DrayageContainerType, DrayageQuoteResult } from "@atlas/shared";

export interface DrayageAddressOption {
  id: string;
  companyName: string;
  addressType: string;
  city: string;
  country: string;
  unLocode?: string | null;
  lat?: number | null;
  lon?: number | null;
}

export interface DrayageCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedOriginId?: string;
  preSelectedDestinationId?: string;
  bookingReference?: string;
  containerNumber?: string;
  defaultContainerType?: DrayageContainerType;
  defaultCargoWeightKg?: number;
  onOrderDispatched?: (order: any) => void;
}

export const DrayageCalculatorModal: React.FC<DrayageCalculatorModalProps> = ({
  isOpen,
  onClose,
  preSelectedOriginId,
  preSelectedDestinationId,
  bookingReference,
  containerNumber,
  defaultContainerType = "40HC",
  defaultCargoWeightKg = 18500,
  onOrderDispatched,
}) => {
  // Address selection state
  const [addressesList, setAddressesList] = useState<DrayageAddressOption[]>(
    [],
  );
  const [hauliersList, setHauliersList] = useState<any[]>([]);
  const [originId, setOriginId] = useState<string>(preSelectedOriginId || "");
  const [destinationId, setDestinationId] = useState<string>(
    preSelectedDestinationId || "",
  );

  // Parameters
  const [containerType, setContainerType] =
    useState<DrayageContainerType>(defaultContainerType);
  const [cargoWeightKg, setCargoWeightKg] =
    useState<number>(defaultCargoWeightKg);
  const [isDangerousGoods, setIsDangerousGoods] = useState<boolean>(false);
  const [requiresGenset, setRequiresGenset] = useState<boolean>(false);

  // Quote Result state
  const [quoteResult, setQuoteResult] = useState<DrayageQuoteResult | null>(
    null,
  );
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dispatching state
  const [selectedHaulierId, setSelectedHaulierId] = useState<string>("");
  const [appointmentDate, setAppointmentDate] = useState<string>("");
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchedOrder, setDispatchedOrder] = useState<any | null>(null);

  // Load addresses and hauliers
  useEffect(() => {
    if (!isOpen) return;

    async function fetchData() {
      try {
        const [addrRes, haulierRes] = await Promise.all([
          fetch("/api/addresses?limit=100"),
          fetch("/api/drayage/hauliers"),
        ]);

        if (addrRes.ok) {
          const addrData = await addrRes.json();
          const items = Array.isArray(addrData)
            ? addrData
            : addrData.items || [];
          setAddressesList(items);
        }

        if (haulierRes.ok) {
          const haulierData = await haulierRes.json();
          setHauliersList(Array.isArray(haulierData) ? haulierData : []);
          if (Array.isArray(haulierData) && haulierData.length > 0) {
            setSelectedHaulierId(haulierData[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load addresses for drayage modal:", err);
      }
    }

    fetchData();

    if (preSelectedOriginId) setOriginId(preSelectedOriginId);
    if (preSelectedDestinationId) setDestinationId(preSelectedDestinationId);
    setDispatchedOrder(null);
    setErrorMessage(null);
  }, [isOpen, preSelectedOriginId, preSelectedDestinationId]);

  // Auto-calculate quote when origin or destination changes
  useEffect(() => {
    if (originId && destinationId && originId !== destinationId) {
      handleCalculate();
    }
  }, [
    originId,
    destinationId,
    containerType,
    cargoWeightKg,
    isDangerousGoods,
    requiresGenset,
  ]);

  const handleCalculate = async () => {
    if (!originId || !destinationId) {
      setErrorMessage("Seleccione tanto el Origen como el Destino.");
      return;
    }

    try {
      setIsCalculating(true);
      setErrorMessage(null);

      const res = await fetch("/api/drayage/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originAddressId: originId,
          destinationAddressId: destinationId,
          containerType,
          cargoWeightKg,
          isDangerousGoods,
          requiresGenset,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(
          err.error || "Error al calcular cotización de acarreo.",
        );
      }

      const data: DrayageQuoteResult = await res.json();
      setQuoteResult(data);
    } catch (err: any) {
      setErrorMessage(err.message);
      setQuoteResult(null);
    } finally {
      setIsCalculating(false);
    }
  };

  // Find nearest terminal button
  const handleAutoSelectNearestTerminal = async () => {
    if (!originId) {
      setErrorMessage(
        "Seleccione primero la dirección de origen (Almacén / Fábrica).",
      );
      return;
    }

    try {
      setIsCalculating(true);
      const res = await fetch(
        `/api/drayage/nearest-terminals?addressId=${originId}&limit=1`,
      );
      if (res.ok) {
        const terminals = await res.json();
        if (Array.isArray(terminals) && terminals.length > 0) {
          setDestinationId(terminals[0].id);
        } else {
          setErrorMessage(
            "No se encontraron terminales con coordenadas en la base de datos.",
          );
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsCalculating(false);
    }
  };

  // Dispatch Haulier Transport Order
  const handleDispatchOrder = async () => {
    if (!selectedHaulierId || !originId || !destinationId) {
      setErrorMessage("Seleccione un transportista asignado.");
      return;
    }

    try {
      setIsDispatching(true);
      setErrorMessage(null);

      const res = await fetch("/api/drayage/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          haulierAddressId: selectedHaulierId,
          originAddressId: originId,
          destinationAddressId: destinationId,
          bookingReference,
          containerNumber,
          containerType,
          cargoWeightKg,
          appointmentWindowStart: appointmentDate || new Date().toISOString(),
          isDangerousGoods,
          requiresGenset,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al emitir orden de transporte.");
      }

      const order = await res.json();
      setDispatchedOrder(order);
      if (onOrderDispatched) onOrderDispatched(order);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Calculadora de Acarreo Terrestre (Container Drayage & Haulage)"
      size="lg"
    >
      <div className="space-y-6 text-slate-800 dark:text-slate-100">
        {/* Banner with standards */}
        <div className="p-3 bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-700/40 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-blue-200">
              Ruteo Terrestre OSRM + Tarifas Drayage + Huella CO2 GLEC v3.0 /
              ISO 14083
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
            Costo API: $0.00 (Open Source)
          </span>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Origin & Destination Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
              <span>Origen (Almacén / Fábrica / Depósito) *</span>
            </label>
            <select
              value={originId}
              onChange={(e) => setOriginId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Seleccionar Dirección de Origen --</option>
              {addressesList.map((a) => (
                <option key={`orig-${a.id}`} value={a.id}>
                  {a.companyName} ({a.city}, {a.country}){" "}
                  {a.unLocode ? `[${a.unLocode}]` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                <span>Destino (Terminal Portuaria / ICD) *</span>
              </label>
              <button
                type="button"
                onClick={handleAutoSelectNearestTerminal}
                className="text-[11px] text-indigo-500 hover:text-indigo-400 flex items-center gap-1 font-medium"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto-asignar puerto más cercano</span>
              </button>
            </div>
            <select
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Seleccionar Terminal de Destino --</option>
              {addressesList.map((a) => (
                <option key={`dest-${a.id}`} value={a.id}>
                  {a.companyName} ({a.city}, {a.country}){" "}
                  {a.unLocode ? `[${a.unLocode}]` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cargo & Equipment Parameters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Tipo Contenedor
            </label>
            <select
              value={containerType}
              onChange={(e) =>
                setContainerType(e.target.value as DrayageContainerType)
              }
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
            >
              <option value="20GP">20' Box Standard (20GP)</option>
              <option value="40GP">40' Box Standard (40GP)</option>
              <option value="40HC">40' High Cube (40HC)</option>
              <option value="40HR">40' Reefer Frigorífico (40HR)</option>
              <option value="45HC">45' High Cube (45HC)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Peso Carga (kg)
            </label>
            <input
              type="number"
              value={cargoWeightKg}
              onChange={(e) => setCargoWeightKg(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none font-mono"
            />
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <input
                type="checkbox"
                checked={requiresGenset}
                onChange={(e) => setRequiresGenset(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Generador Genset (+25%)</span>
            </label>
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <input
                type="checkbox"
                checked={isDangerousGoods}
                onChange={(e) => setIsDangerousGoods(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
              />
              <span className="text-rose-400 font-semibold flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>ADR / IMO (+20%)</span>
              </span>
            </label>
          </div>
        </div>

        {/* Loading Indicator */}
        {isCalculating && (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-indigo-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-xs">
              Calculando ruta por carretera OSRM y tarifas de acarreo...
            </span>
          </div>
        )}

        {/* Calculated Results Showcase */}
        {quoteResult && !isCalculating && (
          <div className="space-y-4">
            {/* Metric Cards Top */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Distance & Time */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-lg">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">
                    Distancia & Tránsito
                  </div>
                  <div className="text-lg font-bold text-white font-mono">
                    {quoteResult.distanceKm} km
                  </div>
                  <div className="text-xs text-blue-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>~{quoteResult.transitFormatted}</span>
                  </div>
                </div>
              </div>

              {/* Net Subtotal */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-lg">
                  <Euro className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">
                    Tarifa Neta Acarreo
                  </div>
                  <div className="text-lg font-bold text-white font-mono">
                    {quoteResult.costs.subtotalNet.toFixed(2)} €
                  </div>
                  <div className="text-xs text-slate-400">
                    IVA 21%: {quoteResult.costs.vatAmount.toFixed(2)} €
                  </div>
                </div>
              </div>

              {/* Total Gross */}
              <div className="bg-slate-900 border border-indigo-700/60 p-4 rounded-xl flex items-center gap-3 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">
                    Total con Impuestos
                  </div>
                  <div className="text-xl font-black text-emerald-400 font-mono">
                    {quoteResult.costs.totalGross.toFixed(2)} €
                  </div>
                  <div className="text-[10px] text-emerald-500 uppercase tracking-wider font-semibold">
                    Tarifa All-In Drayage
                  </div>
                </div>
              </div>
            </div>

            {/* Granular Cost Breakdown Table */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
              <div className="font-semibold text-slate-300 pb-2 border-b border-slate-800 flex items-center justify-between">
                <span>Desglose Detallado de Flete Terrestre</span>
                <span className="font-mono text-[11px] text-slate-400">
                  Ruta:{" "}
                  {quoteResult.routingEngine === "OSRM_ROAD_NETWORK"
                    ? "Red de Carreteras OSRM"
                    : "Haversine Geodésico"}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 font-mono text-slate-400">
                <div>
                  Base Fija:{" "}
                  <strong className="text-slate-200">
                    {quoteResult.costs.baseRate.toFixed(2)} €
                  </strong>
                </div>
                <div>
                  Kilometraje:{" "}
                  <strong className="text-slate-200">
                    {quoteResult.costs.distanceRate.toFixed(2)} €
                  </strong>
                </div>
                <div>
                  Fuel Surcharge (12%):{" "}
                  <strong className="text-slate-200">
                    {quoteResult.costs.fuelSurcharge.toFixed(2)} €
                  </strong>
                </div>
                <div>
                  Peajes/Eurovignette:{" "}
                  <strong className="text-slate-200">
                    {quoteResult.costs.tollsEurovignette.toFixed(2)} €
                  </strong>
                </div>
                {quoteResult.costs.equipmentSurcharge > 0 && (
                  <div>
                    Recargo Reefer/Genset:{" "}
                    <strong className="text-indigo-400">
                      +{quoteResult.costs.equipmentSurcharge.toFixed(2)} €
                    </strong>
                  </div>
                )}
                {quoteResult.costs.dangerousGoodsSurcharge > 0 && (
                  <div>
                    Recargo ADR/IMO:{" "}
                    <strong className="text-rose-400">
                      +{quoteResult.costs.dangerousGoodsSurcharge.toFixed(2)} €
                    </strong>
                  </div>
                )}
                {quoteResult.costs.heavyWeightSurcharge > 0 && (
                  <div>
                    Recargo Sobrepeso:{" "}
                    <strong className="text-amber-400">
                      +{quoteResult.costs.heavyWeightSurcharge.toFixed(2)} €
                    </strong>
                  </div>
                )}
              </div>
            </div>

            {/* GLEC Framework v3.0 / ISO 14083 Carbon Footprint Card */}
            <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/40 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <Leaf className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-emerald-300 flex items-center gap-2">
                    <span>Emisiones WTW (GLEC Framework v3.0 / ISO 14083)</span>
                    <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700">
                      Scope 3
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Diésel Convencional:{" "}
                    <strong className="text-slate-200">
                      {quoteResult.emissions.conventionalDieselKgCO2e} kg CO2e
                    </strong>{" "}
                    ({quoteResult.emissions.tonnesKm} t·km)
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] text-emerald-400 font-medium">
                  Con Biocombustible HVO100:{" "}
                  <strong className="font-mono">
                    {quoteResult.emissions.hvo100RenewableKgCO2e} kg CO2e
                  </strong>
                </div>
                <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                  Ahorro Neto: -{quoteResult.emissions.co2eSavingsKg} kg CO2e (
                  {quoteResult.emissions.savingsPercentage}%)
                </div>
              </div>
            </div>

            {/* Haulier Assignment & Dispatch Order Section */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
              <div className="font-semibold text-white text-xs flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-400" />
                <span>
                  Asignar Empresa de Transporte y Emitir Orden de Acarreo
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Transportista Autorizado (HAULIER) *
                  </label>
                  <select
                    value={selectedHaulierId}
                    onChange={(e) => setSelectedHaulierId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white outline-none"
                  >
                    {hauliersList.map((h) => (
                      <option key={`haul-${h.id}`} value={h.id}>
                        {h.companyName} ({h.city}){" "}
                        {h.primaryContact
                          ? `— Contacto: ${h.primaryContact.fullName}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Ventana de Cita / Carga
                  </label>
                  <input
                    type="datetime-local"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleDispatchOrder}
                  disabled={isDispatching || !selectedHaulierId}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2 flex items-center gap-1.5"
                >
                  {isDispatching ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" />
                  )}
                  <span>
                    Confirmar y Emitir Orden de Acarreo (Drayage Order)
                  </span>
                </Button>
              </div>

              {dispatchedOrder && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs flex items-center justify-between">
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Orden Emitida: {dispatchedOrder.orderNumber}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      Transportista: {dispatchedOrder.haulier?.companyName} |
                      Total: {dispatchedOrder.quote?.costs?.totalGross} €
                    </div>
                  </div>
                  <span className="font-mono text-[10px] bg-emerald-950 px-2 py-1 rounded border border-emerald-800">
                    HASH: {dispatchedOrder.qrDigest?.substring(0, 10)}...
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
