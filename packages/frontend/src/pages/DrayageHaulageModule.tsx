import { useState, useEffect } from "react";
import {
  Truck,
  Calculator,
  ClipboardList,
  Building2,
  Anchor,
  Building,
  Navigation,
  ShieldAlert,
  Zap,
  Leaf,
  QrCode,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@atlas/ui";
import {
  DrayageRouteMap,
  RoutePoint,
} from "../components/drayage/DrayageRouteMap";
import {
  DigitalGatePassModal,
  DrayageOrderDetails,
} from "../components/drayage/DigitalGatePassModal";

export default function DrayageHaulageModule() {
  const [activeTab, setActiveTab] = useState<
    "CALCULATOR" | "BOARD" | "HAULIERS"
  >("CALCULATOR");

  // Loading & Error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Address Data
  const [terminals, setTerminals] = useState<any[]>([]);
  const [deliveryAddresses, setDeliveryAddresses] = useState<any[]>([]);
  const [hauliers, setHauliers] = useState<any[]>([]);

  // Calculator State
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>("");
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string>("");
  const [containerNumber, setContainerNumber] =
    useState<string>("MSKU-908124-1");
  const [containerType, setContainerType] = useState<string>("40HC");
  const [cargoWeightKg, setCargoWeightKg] = useState<number>(19500);
  const [isDangerousGoods, setIsDangerousGoods] = useState<boolean>(false);
  const [requiresGenset, setRequiresGenset] = useState<boolean>(false);
  const [selectedHaulierId, setSelectedHaulierId] = useState<string>("");
  const [quote, setQuote] = useState<any | null>(null);

  // Dispatch Board State
  const [orders, setOrders] = useState<DrayageOrderDetails[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedOrderForPass, setSelectedOrderForPass] =
    useState<DrayageOrderDetails | null>(null);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);

  useEffect(() => {
    loadMasterData();
    loadOrders();
  }, []);

  const loadMasterData = async () => {
    try {
      const [termRes, addrRes, haulRes] = await Promise.all([
        fetch("/api/addresses?addressType=TRM"),
        fetch("/api/addresses?addressType=CUS,WH"),
        fetch("/api/drayage/hauliers"),
      ]);

      if (termRes.ok && addrRes.ok && haulRes.ok) {
        const termData = await termRes.json();
        const addrData = await addrRes.json();
        const haulData = await haulRes.json();

        const termList = termData.items || termData || [];
        const addrList = addrData.items || addrData || [];

        setTerminals(termList);
        setDeliveryAddresses(addrList);
        setHauliers(haulData);

        if (termList.length > 0) setSelectedTerminalId(termList[0].id);
        if (addrList.length > 0) setSelectedDeliveryId(addrList[0].id);
        if (haulData.length > 0) setSelectedHaulierId(haulData[0].id);
      }
    } catch (err) {
      console.error("Failed to load master directory", err);
    }
  };

  const loadOrders = async () => {
    try {
      const res = await fetch("/api/drayage/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error("Failed to load drayage orders", err);
    }
  };

  const handleCalculateQuote = async () => {
    setLoading(true);
    setError(null);
    try {
      const term = terminals.find((t) => t.id === selectedTerminalId);
      const dest = deliveryAddresses.find((d) => d.id === selectedDeliveryId);

      if (!term || !dest) {
        throw new Error("Select both port terminal and delivery destination.");
      }

      const res = await fetch("/api/drayage/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originCoords: { lat: term.lat || 39.4447, lon: term.lon || -0.3168 },
          destinationCoords: {
            lat: dest.lat || 39.4699,
            lon: dest.lon || -0.3763,
          },
          containerType,
          cargoWeightKg,
          isDangerousGoods,
          requiresGenset,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to calculate quote");
      }

      const data = await res.json();
      setQuote(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/drayage/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          haulierAddressId: selectedHaulierId,
          originAddressId: selectedTerminalId,
          destinationAddressId: selectedDeliveryId,
          containerNumber,
          containerType,
          cargoWeightKg,
          isDangerousGoods,
          requiresGenset,
          notes: "Generated from Drayage Dispatch Board.",
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(
          errJson.error || "Failed to create drayage transport order",
        );
      }

      const newOrder = await res.json();
      setSelectedOrderForPass(newOrder);
      setIsPassModalOpen(true);
      loadOrders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/drayage/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        await loadOrders();
        if (selectedOrderForPass && selectedOrderForPass.id === orderId) {
          setSelectedOrderForPass({
            ...selectedOrderForPass,
            status: newStatus,
          });
        }
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const activeTerminal = terminals.find((t) => t.id === selectedTerminalId);
  const activeDelivery = deliveryAddresses.find(
    (d) => d.id === selectedDeliveryId,
  );

  const originPoint: RoutePoint = {
    name: activeTerminal?.companyName || "Port Container Terminal",
    lat: activeTerminal?.lat || 39.4447,
    lon: activeTerminal?.lon || -0.3168,
    city: activeTerminal?.city || "Port Gate",
    unLocode: activeTerminal?.unLocode || "PORT",
  };

  const destPoint: RoutePoint = {
    name: activeDelivery?.companyName || "Consignee Warehouse",
    lat: activeDelivery?.lat || 39.4699,
    lon: activeDelivery?.lon || -0.3763,
    city: activeDelivery?.city || "Industrial Park",
    unLocode: activeDelivery?.unLocode,
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === "ALL") return true;
    return o.status === statusFilter;
  });

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
              <Truck size={24} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                Drayage & Port Haulage
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  GLEC v3.0 Verified
                </span>
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                Landside container drayage dispatch, dynamic route rating, and
                terminal turnaround control.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner">
          <button
            onClick={() => setActiveTab("CALCULATOR")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "CALCULATOR"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Calculator size={15} />
            <span>Rate & Route Calculator</span>
          </button>

          <button
            onClick={() => setActiveTab("BOARD")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "BOARD"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ClipboardList size={15} />
            <span>Dispatch Board</span>
            {orders.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] flex items-center justify-center text-indigo-300">
                {orders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("HAULIERS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "HAULIERS"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Building2 size={15} />
            <span>Haulier Directory</span>
          </button>
        </div>
      </div>

      {/* TAB 1: RATE & ROUTE CALCULATOR */}
      {activeTab === "CALCULATOR" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form & Quote (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800/80 pb-3">
                <Navigation size={18} className="text-indigo-400" />
                <span>Haulage Parameters</span>
              </h3>

              {error && (
                <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300">
                  {error}
                </div>
              )}

              {/* Origin Terminal */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5 flex items-center gap-1.5">
                  <Anchor size={14} className="text-indigo-400" />
                  Origin Maritime Gate / Terminal
                </label>
                <select
                  value={selectedTerminalId}
                  onChange={(e) => setSelectedTerminalId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {terminals.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.companyName} ({t.city} • {t.unLocode || "PORT"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Facility */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5 flex items-center gap-1.5">
                  <Building size={14} className="text-emerald-400" />
                  Delivery Facility / Consignee
                </label>
                <select
                  value={selectedDeliveryId}
                  onChange={(e) => setSelectedDeliveryId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {deliveryAddresses.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.companyName} ({d.city} - {d.street1})
                    </option>
                  ))}
                </select>
              </div>

              {/* Container Specs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                    Container Number
                  </label>
                  <input
                    type="text"
                    value={containerNumber}
                    onChange={(e) => setContainerNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                    Equipment Size / Type
                  </label>
                  <select
                    value={containerType}
                    onChange={(e) => setContainerType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="20GP">20' Standard Dry (20GP)</option>
                    <option value="40GP">40' Standard Dry (40GP)</option>
                    <option value="40HC">40' High Cube Dry (40HC)</option>
                    <option value="45HC">
                      45' High Cube Palletwide (45HC)
                    </option>
                    <option value="20RF">20' Reefer Temperature Control</option>
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Surcharge Checkboxes */}
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={isDangerousGoods}
                    onChange={(e) => setIsDangerousGoods(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-950 border-slate-700"
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
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-950 border-slate-700"
                  />
                  <span className="flex items-center gap-1 text-cyan-400">
                    <Zap size={14} /> Reefer Genset (+25%)
                  </span>
                </label>
              </div>

              {/* Calculate Button */}
              <Button
                onClick={handleCalculateQuote}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                <Calculator size={16} />
                <span>Calculate Rate & GLEC Emissions</span>
              </Button>
            </div>

            {/* Quote Results Card */}
            {quote && (
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-900/40 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Contract Haulage Total
                    </span>
                    <span className="text-2xl font-black text-emerald-400">
                      {quote.costs.totalGross.toFixed(2)} {quote.costs.currency}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 font-bold uppercase block">
                      Road Distance
                    </span>
                    <span className="text-base font-extrabold text-white">
                      {quote.distanceKm.toFixed(1)} km
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-slate-400">Base Transport Tariff:</div>
                  <div className="text-right font-medium text-slate-200">
                    {quote.costs.baseRate.toFixed(2)} EUR
                  </div>

                  <div className="text-slate-400">Fuel Adjustment (FAS):</div>
                  <div className="text-right font-medium text-slate-200">
                    {quote.costs.fuelSurcharge.toFixed(2)} EUR
                  </div>

                  <div className="text-slate-400">Estimated Tolls:</div>
                  <div className="text-right font-medium text-slate-200">
                    {quote.costs.tollsCost.toFixed(2)} EUR
                  </div>

                  {quote.costs.extraSurcharges > 0 && (
                    <>
                      <div className="text-amber-400">ADR / Genset Extras:</div>
                      <div className="text-right font-medium text-amber-300">
                        +{quote.costs.extraSurcharges.toFixed(2)} EUR
                      </div>
                    </>
                  )}
                </div>

                {/* GLEC Emissions Card */}
                <div className="bg-slate-950/60 border border-emerald-900/40 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Leaf size={14} /> GLEC v3.0 / ISO 14083 Footprint
                    </span>
                    <span className="font-mono text-emerald-300 font-bold">
                      {quote.emissions.co2WtwKg.toFixed(1)} kg CO2e
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                    <div>TTW: {quote.emissions.co2TtwKg.toFixed(1)} kg</div>
                    <div>WTE: {quote.emissions.co2WteKg.toFixed(1)} kg</div>
                    <div>
                      Intensity:{" "}
                      {quote.emissions.emissionsIntensityFactor.toFixed(1)}{" "}
                      g/t-km
                    </div>
                  </div>
                </div>

                {/* Dispatch Haulier Selector & Trigger */}
                <div className="pt-2 border-t border-slate-800 space-y-3">
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                      Assign Haulier Partner
                    </label>
                    <select
                      value={selectedHaulierId}
                      onChange={(e) => setSelectedHaulierId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {hauliers.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.companyName} ({h.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button
                    onClick={handleCreateOrder}
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    <span>Dispatch Transport Order & Gate Pass</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Leaflet Map (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <DrayageRouteMap
              origin={originPoint}
              destination={destPoint}
              distanceKm={quote?.distanceKm}
              className="h-[580px] w-full rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative"
            />
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE DISPATCH BOARD */}
      {activeTab === "BOARD" && (
        <div className="space-y-5">
          {/* Status Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="flex flex-wrap items-center gap-2">
              {[
                "ALL",
                "DISPATCHED",
                "ACCEPTED",
                "GATE_IN",
                "IN_TRANSIT",
                "DELIVERED",
              ].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === status
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadOrders}
              className="text-slate-300 border-slate-700 hover:bg-slate-800 flex items-center gap-1.5"
            >
              <RefreshCw size={14} />
              <span>Refresh Board</span>
            </Button>
          </div>

          {/* Orders Grid / Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl hover:border-indigo-500/50 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                      {order.orderNumber}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-800 text-slate-200 border border-slate-700">
                      {order.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-white font-bold mb-3">
                    <div className="font-mono text-emerald-400">
                      {order.containerNumber || "UNASSIGNED"}
                    </div>
                    <div className="text-slate-400 font-medium">
                      {order.containerType} •{" "}
                      {order.cargoWeightKg.toLocaleString()} kg
                    </div>
                  </div>

                  {/* Route Summary */}
                  <div className="space-y-1.5 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Anchor size={14} className="text-indigo-400 shrink-0" />
                      <span className="truncate">
                        {order.origin?.companyName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Building
                        size={14}
                        className="text-emerald-400 shrink-0"
                      />
                      <span className="truncate">
                        {order.destination?.companyName}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                    <div>
                      Haulier:{" "}
                      <span className="text-slate-200 font-semibold">
                        {order.haulier?.companyName}
                      </span>
                    </div>
                    <div className="font-bold text-emerald-400">
                      {order.totalGrossCost.toFixed(2)} {order.currency}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedOrderForPass(order);
                      setIsPassModalOpen(true);
                    }}
                    className="flex-1 text-slate-300 border-slate-700 hover:bg-slate-800 flex items-center justify-center gap-1.5"
                  >
                    <QrCode size={14} />
                    <span>Gate Voucher</span>
                  </Button>

                  {order.status === "DISPATCHED" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate(order.id, "ACCEPTED")}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      Accept
                    </Button>
                  )}
                  {order.status === "ACCEPTED" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate(order.id, "GATE_IN")}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white"
                    >
                      Gate In
                    </Button>
                  )}
                  {order.status === "GATE_IN" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate(order.id, "IN_TRANSIT")}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Transit
                    </Button>
                  )}
                  {order.status === "IN_TRANSIT" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate(order.id, "DELIVERED")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Delivered
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: HAULIER DIRECTORY & FLEET CAPABILITIES */}
      {activeTab === "HAULIERS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hauliers.map((h) => (
            <div
              key={h.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-lg">
                  {h.companyName.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {h.companyName}
                  </h4>
                  <p className="text-xs text-slate-400">
                    Tax ID: {h.taxId || "ES-B99214401"} • {h.city || "Depot"}
                  </p>
                </div>
              </div>

              {/* Fleet Badges */}
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                  <ShieldAlert size={12} /> ADR Hazmat
                </span>
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center gap-1">
                  <Zap size={12} /> Reefer Genset
                </span>
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                  <Truck size={12} /> Side-Loader
                </span>
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1">
                  <Leaf size={12} /> GLEC Partner
                </span>
              </div>

              {/* Contact Card */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 space-y-1 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Primary Dispatch Contact
                </span>
                <div className="text-slate-200 font-semibold">
                  {h.primaryContact?.fullName || "Central Dispatch Operator"}
                </div>
                <div className="text-slate-400 font-mono text-[11px]">
                  {h.primaryContact?.email || "dispatch@haulier-logistics.es"}
                </div>
                <div className="text-slate-400 text-[11px]">
                  Tel: {h.primaryContact?.phone || "+34 963 88 12 00"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Digital Gate Pass Modal */}
      <DigitalGatePassModal
        order={selectedOrderForPass}
        isOpen={isPassModalOpen}
        onClose={() => setIsPassModalOpen(false)}
        onStatusUpdate={
          selectedOrderForPass
            ? (newStatus) =>
                handleStatusUpdate(selectedOrderForPass.id, newStatus)
            : undefined
        }
      />
    </div>
  );
}
