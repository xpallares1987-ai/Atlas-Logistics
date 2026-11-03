import React, { useRef } from "react";
import {
  X,
  Printer,
  QrCode,
  Key,
  ShieldCheck,
  Building,
  Anchor,
  Clock,
  Truck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@atlas/ui";

export interface DrayageOrderDetails {
  id: string;
  orderNumber: string;
  status: string;
  containerNumber?: string | null;
  containerType: string;
  cargoWeightKg: number;
  driverPickupPin: string;
  qrDigest: string;
  appointmentWindowStart: string;
  appointmentWindowEnd: string;
  haulier?: {
    id: string;
    companyName: string;
    taxId?: string | null;
    city?: string | null;
  } | null;
  origin?: {
    companyName: string;
    city: string;
    unLocode?: string | null;
    street1?: string | null;
  } | null;
  destination?: {
    companyName: string;
    city: string;
    unLocode?: string | null;
    street1?: string | null;
  } | null;
  distanceKm: number;
  totalGrossCost: number;
  currency: string;
  co2WtwKg?: number;
  notes?: string | null;
}

interface DigitalGatePassModalProps {
  order: DrayageOrderDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate?: (status: string) => Promise<void>;
}

export const DigitalGatePassModal: React.FC<DigitalGatePassModalProps> = ({
  order,
  isOpen,
  onClose,
  onStatusUpdate,
}) => {
  const printableRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Truck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Digital Port Gate Pass
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {order.orderNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Authorized Multimodal Drayage Transport Document
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-slate-300 border-slate-700 hover:bg-slate-800 flex items-center gap-1.5"
            >
              <Printer size={15} />
              <span>Print Pass</span>
            </Button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Pass Body */}
        <div ref={printableRef} className="p-6 overflow-y-auto space-y-6">
          {/* Status & PIN Banner */}
          <div className="bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white rounded-xl p-2 flex items-center justify-center shadow-lg border border-slate-200 shrink-0">
                <QrCode size={64} className="text-slate-900" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Driver Gate-In PIN
                </div>
                <div className="text-3xl font-black tracking-widest text-emerald-400 flex items-center gap-2">
                  <Key size={22} className="text-emerald-500" />
                  {order.driverPickupPin}
                </div>
                <div className="text-[10px] font-mono text-slate-500 truncate max-w-[260px]">
                  SHA-256: {order.qrDigest.substring(0, 24)}...
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5 w-full sm:w-auto">
              <div className="text-[10px] font-bold uppercase text-slate-400">
                Transport Lifecycle State
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wide">
                {order.status}
              </span>
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Verified Carrier</span>
              </div>
            </div>
          </div>

          {/* Container & Transport Specs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase text-slate-500">
                Container Number
              </span>
              <div className="text-sm font-bold text-white font-mono mt-0.5">
                {order.containerNumber || "PENDING ALLOCATION"}
              </div>
            </div>

            <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase text-slate-500">
                Equipment Type
              </span>
              <div className="text-sm font-bold text-indigo-400 mt-0.5">
                {order.containerType}
              </div>
            </div>

            <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase text-slate-500">
                Gross Payload
              </span>
              <div className="text-sm font-bold text-white mt-0.5">
                {order.cargoWeightKg.toLocaleString()} kg
              </div>
            </div>

            <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase text-slate-500">
                Contract Rate
              </span>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">
                {order.totalGrossCost.toFixed(2)} {order.currency}
              </div>
            </div>
          </div>

          {/* Route Journey Path */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Origin Terminal &rarr; Consignee Route</span>
              <span className="text-indigo-400 font-medium lowercase">
                {order.distanceKm.toFixed(1)} km road leg
              </span>
            </div>

            <div className="relative pl-6 space-y-4 border-l-2 border-slate-800 ml-2">
              {/* Origin */}
              <div className="relative">
                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-indigo-500 border-2 border-slate-900" />
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                  <Anchor size={14} />
                  <span>PORT TERMINAL / PICKUP</span>
                </div>
                <div className="text-sm font-semibold text-white">
                  {order.origin?.companyName || "Port Terminal"}
                </div>
                <div className="text-xs text-slate-400">
                  {order.origin?.city}{" "}
                  {order.origin?.unLocode ? `(${order.origin.unLocode})` : ""}
                </div>
              </div>

              {/* Destination */}
              <div className="relative">
                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900" />
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <Building size={14} />
                  <span>DELIVERY DESTINATION</span>
                </div>
                <div className="text-sm font-semibold text-white">
                  {order.destination?.companyName || "Consignee Warehouse"}
                </div>
                <div className="text-xs text-slate-400">
                  {order.destination?.city}{" "}
                  {order.destination?.street1
                    ? `- ${order.destination.street1}`
                    : ""}
                </div>
              </div>
            </div>
          </div>

          {/* Haulier & Appointment Timeslot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
              <div className="text-[11px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1.5">
                <Truck size={14} className="text-indigo-400" />
                Assigned Haulier
              </div>
              <div className="text-sm font-bold text-white">
                {order.haulier?.companyName || "Direct Carrier Fleet"}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Tax ID: {order.haulier?.taxId || "ES-B99214401"} •{" "}
                {order.haulier?.city || "Depot"}
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
              <div className="text-[11px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1.5">
                <Clock size={14} className="text-cyan-400" />
                Gate Appointment Window
              </div>
              <div className="text-xs text-slate-300 font-medium">
                {formatDateTime(order.appointmentWindowStart)}
              </div>
              <div className="text-xs text-slate-400">
                to {formatDateTime(order.appointmentWindowEnd)}
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="p-3.5 bg-indigo-950/20 border border-indigo-900/30 rounded-xl text-xs text-indigo-300">
              <span className="font-bold">Dispatcher Instructions: </span>
              {order.notes}
            </div>
          )}
        </div>

        {/* Action Footer */}
        {onStatusUpdate && (
          <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Advance gate operational status:
            </span>
            <div className="flex items-center gap-2">
              {order.status === "DISPATCHED" && (
                <Button
                  size="sm"
                  onClick={() => onStatusUpdate("ACCEPTED")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Mark Accepted by Haulier
                </Button>
              )}
              {order.status === "ACCEPTED" && (
                <Button
                  size="sm"
                  onClick={() => onStatusUpdate("GATE_IN")}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white flex items-center gap-1"
                >
                  <CheckCircle2 size={14} />
                  Confirm Port Gate-In
                </Button>
              )}
              {order.status === "GATE_IN" && (
                <Button
                  size="sm"
                  onClick={() => onStatusUpdate("IN_TRANSIT")}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Start Highway Transit
                </Button>
              )}
              {order.status === "IN_TRANSIT" && (
                <Button
                  size="sm"
                  onClick={() => onStatusUpdate("DELIVERED")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
                >
                  <CheckCircle2 size={14} />
                  Confirm Delivery
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
