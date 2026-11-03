import React, { useState, useEffect } from "react";
import {
  X,
  Truck,
  ArrowRight,
  Anchor,
  Building,
  CheckCircle2,
  ShieldAlert,
  Zap,
  Leaf,
} from "lucide-react";
import { Button } from "@atlas/ui";
import { DrayageRouteMap, RoutePoint } from "./DrayageRouteMap";
import {
  DigitalGatePassModal,
  DrayageOrderDetails,
} from "./DigitalGatePassModal";

interface ShipmentDrayageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: any;
  onOrderCreated?: () => void;
}

export const ShipmentDrayageDrawer: React.FC<ShipmentDrayageDrawerProps> = ({
  isOpen,
  onClose,
  shipment,
  onOrderCreated,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [transportLeg, setTransportLeg] = useState<"LAST_MILE" | "FIRST_MILE">(
    "LAST_MILE",
  );
  const [selectedContainer, setSelectedContainer] = useState<string>("");
  const [containerType, setContainerType] = useState<string>("40HC");
  const [cargoWeightKg, setCargoWeightKg] = useState<number>(18500);
  const [isDangerousGoods, setIsDangerousGoods] = useState<boolean>(false);
  const [requiresGenset, setRequiresGenset] = useState<boolean>(false);

  // Address & Terminal State
  const [terminals, setTerminals] = useState<any[]>([]);
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>("");
  const [deliveryAddresses, setDeliveryAddresses] = useState<any[]>([]);
  const [selectedDeliveryAddressId, setSelectedDeliveryAddressId] =
    useState<string>("");

  // Hauliers & Quote State
  const [hauliers, setHauliers] = useState<any[]>([]);
  const [selectedHaulierId, setSelectedHaulierId] = useState<string>("");
  const [quote, setQuote] = useState<any | null>(null);
  const [appointmentStart, setAppointmentStart] = useState<string>(
    new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16),
  );
  const [appointmentEnd, setAppointmentEnd] = useState<string>(
    new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 16),
  );
  const [notes, setNotes] = useState<string>("");

  // Result pass modal
  const [createdOrder, setCreatedOrder] = useState<DrayageOrderDetails | null>(
    null,
  );
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setError(null);
      setQuote(null);
      return;
    }

    // Auto-detect Leg based on destination
    const isImport =
      shipment?.destinationPort?.includes("ES") ||
      shipment?.destinationPort?.includes("Valencia") ||
      shipment?.destinationPort?.includes("Barcelona") ||
      true;
    setTransportLeg(isImport ? "LAST_MILE" : "FIRST_MILE");

    // Pre-populate container
    if (shipment?.containers && shipment.containers.length > 0) {
      const c = shipment.containers[0];
      setSelectedContainer(c.containerNumber || c.id || "MSKU-908124-1");
      setContainerType(c.type || "40HC");
      setCargoWeightKg(c.grossWeightKg || 19200);
      setIsDangerousGoods(!!c.isHazardous);
      setRequiresGenset(c.type?.includes("R") || !!c.temperatureRequired);
    }

    // Fetch initial terminals & addresses
    loadTerminalsAndAddresses();
    loadHauliers();
  }, [isOpen, shipment]);

  const loadTerminalsAndAddresses = async () => {
    try {
      const [termRes, addrRes] = await Promise.all([
        fetch("/api/addresses?addressType=TERMINAL"),
        fetch("/api/addresses?addressType=CUSTOMER"),
      ]);

      if (termRes.ok && addrRes.ok) {
        const termData = await termRes.json();
        const addrData = await addrRes.json();
        const termList = termData.items || termData || [];
        const addrList = addrData.items || addrData || [];

        setTerminals(termList);
        setDeliveryAddresses(addrList);

        if (termList.length > 0) {
          setSelectedTerminalId(termList[0].id);
        }
        if (addrList.length > 0) {
          setSelectedDeliveryAddressId(addrList[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load terminals or addresses", err);
    }
  };

  const loadHauliers = async () => {
    try {
      const res = await fetch("/api/drayage/hauliers");
      if (res.ok) {
        const data = await res.json();
        setHauliers(data);
        if (data.length > 0) {
          setSelectedHaulierId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load hauliers", err);
    }
  };

  const handleCalculateQuote = async () => {
    setLoading(true);
    setError(null);
    try {
      const terminal = terminals.find((t) => t.id === selectedTerminalId);
      const delivery = deliveryAddresses.find(
        (d) => d.id === selectedDeliveryAddressId,
      );

      if (!terminal || !delivery) {
        throw new Error(
          "Both port terminal and delivery destination are required.",
        );
      }

      const originCoords =
        transportLeg === "LAST_MILE"
          ? { lat: terminal.lat || 39.4447, lon: terminal.lon || -0.3168 }
          : { lat: delivery.lat || 39.4699, lon: delivery.lon || -0.3763 };

      const destinationCoords =
        transportLeg === "LAST_MILE"
          ? { lat: delivery.lat || 39.4699, lon: delivery.lon || -0.3763 }
          : { lat: terminal.lat || 39.4447, lon: terminal.lon || -0.3168 };

      const res = await fetch("/api/drayage/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originCoords,
          destinationCoords,
          containerType,
          cargoWeightKg,
          isDangerousGoods,
          requiresGenset,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to calculate drayage quote");
      }

      const quoteData = await res.json();
      setQuote(quoteData);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDispatchOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const terminal = terminals.find((t) => t.id === selectedTerminalId);
      const delivery = deliveryAddresses.find(
        (d) => d.id === selectedDeliveryAddressId,
      );

      const originAddressId =
        transportLeg === "LAST_MILE" ? terminal.id : delivery.id;
      const destinationAddressId =
        transportLeg === "LAST_MILE" ? delivery.id : terminal.id;

      const res = await fetch("/api/drayage/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          haulierAddressId: selectedHaulierId,
          originAddressId,
          destinationAddressId,
          shipmentId: shipment?.id || null,
          bookingReference: shipment?.bookingReference || null,
          containerNumber: selectedContainer,
          containerType,
          cargoWeightKg,
          isDangerousGoods,
          requiresGenset,
          appointmentWindowStart: new Date(appointmentStart).toISOString(),
          appointmentWindowEnd: new Date(appointmentEnd).toISOString(),
          notes,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to dispatch drayage order");
      }

      const newOrder = await res.json();
      setCreatedOrder(newOrder);
      setIsPassModalOpen(true);
      if (onOrderCreated) {
        onOrderCreated();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentTerminal = terminals.find((t) => t.id === selectedTerminalId);
  const currentDelivery = deliveryAddresses.find(
    (d) => d.id === selectedDeliveryAddressId,
  );

  const originPoint: RoutePoint = {
    name:
      transportLeg === "LAST_MILE"
        ? currentTerminal?.companyName || "Port Container Terminal"
        : currentDelivery?.companyName || "Consignee Facility",
    lat:
      transportLeg === "LAST_MILE"
        ? currentTerminal?.lat || 39.4447
        : currentDelivery?.lat || 39.4699,
    lon:
      transportLeg === "LAST_MILE"
        ? currentTerminal?.lon || -0.3168
        : currentDelivery?.lon || -0.3763,
    city:
      transportLeg === "LAST_MILE"
        ? currentTerminal?.city
        : currentDelivery?.city,
    unLocode:
      transportLeg === "LAST_MILE"
        ? currentTerminal?.unLocode
        : currentDelivery?.unLocode,
  };

  const destPoint: RoutePoint = {
    name:
      transportLeg === "LAST_MILE"
        ? currentDelivery?.companyName || "Consignee Warehouse"
        : currentTerminal?.companyName || "Port Container Terminal",
    lat:
      transportLeg === "LAST_MILE"
        ? currentDelivery?.lat || 39.4699
        : currentTerminal?.lat || 39.4447,
    lon:
      transportLeg === "LAST_MILE"
        ? currentDelivery?.lon || -0.3763
        : currentTerminal?.lon || -0.3168,
    city:
      transportLeg === "LAST_MILE"
        ? currentDelivery?.city
        : currentTerminal?.city,
    unLocode:
      transportLeg === "LAST_MILE"
        ? currentDelivery?.unLocode
        : currentTerminal?.unLocode,
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
        <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col z-50">
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <Truck size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Dispatch Port Drayage
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Step {step} of 2
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {shipment?.shipmentNumber
                    ? `Shipment ${shipment.shipmentNumber}`
                    : "Container Haulage"}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300">
                {error}
              </div>
            )}

            {step === 1 ? (
              /* STEP 1: LEG & CONTAINER CONFIGURATION */
              <div className="space-y-5">
                {/* Leg Selector */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Transport Leg Orientation
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTransportLeg("LAST_MILE")}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        transportLeg === "LAST_MILE"
                          ? "bg-indigo-600/10 border-indigo-500 text-white shadow-md shadow-indigo-500/10"
                          : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 mb-1">
                        <Anchor size={14} />
                        Last Mile (Import)
                      </div>
                      <div className="text-[11px] text-slate-300">
                        Port Terminal &rarr; Consignee
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTransportLeg("FIRST_MILE")}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        transportLeg === "FIRST_MILE"
                          ? "bg-indigo-600/10 border-indigo-500 text-white shadow-md shadow-indigo-500/10"
                          : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 mb-1">
                        <Building size={14} />
                        First Mile (Export)
                      </div>
                      <div className="text-[11px] text-slate-300">
                        Shipper Facility &rarr; Port
                      </div>
                    </button>
                  </div>
                </div>

                {/* Container Selection */}
                <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                    <span>Container Equipment</span>
                    <span className="text-[11px] text-indigo-400 font-mono">
                      ISO 668
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                        Container ID
                      </label>
                      <input
                        type="text"
                        value={selectedContainer}
                        onChange={(e) => setSelectedContainer(e.target.value)}
                        placeholder="e.g. MSKU-908124-1"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                        Equipment Size / Type
                      </label>
                      <select
                        value={containerType}
                        onChange={(e) => setContainerType(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="20GP">20' Standard Dry (20GP)</option>
                        <option value="40GP">40' Standard Dry (40GP)</option>
                        <option value="40HC">40' High Cube Dry (40HC)</option>
                        <option value="45HC">
                          45' High Cube Palletwide (45HC)
                        </option>
                        <option value="20RF">
                          20' Reefer Temperature Control
                        </option>
                        <option value="40HR">40' High Cube Reefer</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                      Gross Cargo Weight (kg)
                    </label>
                    <input
                      type="number"
                      value={cargoWeightKg}
                      onChange={(e) => setCargoWeightKg(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Surcharge Flags */}
                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={isDangerousGoods}
                        onChange={(e) => setIsDangerousGoods(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-900 border-slate-700"
                      />
                      <span className="flex items-center gap-1 text-amber-400">
                        <ShieldAlert size={14} /> ADR Hazmat (+20%)
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={requiresGenset}
                        onChange={(e) => setRequiresGenset(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-900 border-slate-700"
                      />
                      <span className="flex items-center gap-1 text-cyan-400">
                        <Zap size={14} /> Reefer Genset (+25%)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Routing Parties */}
                <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Routing Locations
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                      Port Terminal (Maritime Gate)
                    </label>
                    <select
                      value={selectedTerminalId}
                      onChange={(e) => setSelectedTerminalId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {terminals.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.companyName} ({t.city} - {t.unLocode || "PORT"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                      Consignee / Warehouse Destination
                    </label>
                    <select
                      value={selectedDeliveryAddressId}
                      onChange={(e) =>
                        setSelectedDeliveryAddressId(e.target.value)
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {deliveryAddresses.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.companyName} ({d.city} - {d.street1})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              /* STEP 2: HAULIER, QUOTE REVIEW & ROUTE MAP */
              <div className="space-y-5">
                {/* Interactive Leaflet Map */}
                <DrayageRouteMap
                  origin={originPoint}
                  destination={destPoint}
                  distanceKm={quote?.distanceKm}
                  className="h-64 w-full rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative"
                />

                {/* Quote Breakdown Card */}
                {quote && (
                  <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-indigo-900/30 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Haulage Cost Breakdown
                      </span>
                      <span className="text-lg font-extrabold text-emerald-400">
                        {quote.costs.totalGross.toFixed(2)}{" "}
                        {quote.costs.currency}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-slate-400">Base Transport Rate:</div>
                      <div className="text-right font-medium text-slate-200">
                        {quote.costs.baseRate.toFixed(2)} EUR
                      </div>

                      <div className="text-slate-400">Fuel Surcharge:</div>
                      <div className="text-right font-medium text-slate-200">
                        {quote.costs.fuelSurcharge.toFixed(2)} EUR
                      </div>

                      <div className="text-slate-400">Highway Tolls:</div>
                      <div className="text-right font-medium text-slate-200">
                        {quote.costs.tollsCost.toFixed(2)} EUR
                      </div>

                      {quote.costs.extraSurcharges > 0 && (
                        <>
                          <div className="text-amber-400">
                            ADR / Genset Extras:
                          </div>
                          <div className="text-right font-medium text-amber-300">
                            +{quote.costs.extraSurcharges.toFixed(2)} EUR
                          </div>
                        </>
                      )}
                    </div>

                    {/* GLEC Emissions Footer */}
                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <Leaf size={14} />
                        <span>GLEC v3.0 Footprint:</span>
                      </div>
                      <div className="text-slate-300 font-mono">
                        {quote.emissions.co2WtwKg.toFixed(1)} kg CO2e (
                        {quote.emissions.emissionsIntensityFactor.toFixed(1)}{" "}
                        g/t-km)
                      </div>
                    </div>
                  </div>
                )}

                {/* Haulier Assignment */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Assigned Haulier Partner
                  </label>
                  <select
                    value={selectedHaulierId}
                    onChange={(e) => setSelectedHaulierId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {hauliers.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.companyName} ({h.city}) • Primary:{" "}
                        {h.primaryContact?.fullName || "Dispatch Desk"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Appointment Window */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                      Gate Window Start
                    </label>
                    <input
                      type="datetime-local"
                      value={appointmentStart}
                      onChange={(e) => setAppointmentStart(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                      Gate Window End
                    </label>
                    <input
                      type="datetime-local"
                      value={appointmentEnd}
                      onChange={(e) => setAppointmentEnd(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                    Gate Access & Driver Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Present PIN at North Terminal Gate. Verify customs seal number before departure."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
            {step === 2 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                className="text-slate-300 border-slate-700"
              >
                Back to Config
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-slate-400"
              >
                Cancel
              </Button>
            )}

            {step === 1 ? (
              <Button
                onClick={handleCalculateQuote}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
              >
                <span>Calculate & Review</span>
                <ArrowRight size={15} />
              </Button>
            ) : (
              <Button
                onClick={handleDispatchOrder}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle2 size={16} />
                <span>Confirm & Dispatch</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Digital Gate Pass Result Modal */}
      <DigitalGatePassModal
        order={createdOrder}
        isOpen={isPassModalOpen}
        onClose={() => {
          setIsPassModalOpen(false);
          onClose();
        }}
      />
    </>
  );
};
