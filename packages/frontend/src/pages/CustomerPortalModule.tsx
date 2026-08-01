// @ts-nocheck
import { useState } from "react";
import {
  PackageSearch,
  FileText,
  Anchor,
  Truck,
  ShieldCheck,
  MapPin,
  Search,
} from "lucide-react";
import { ShipmentTracker } from "../features/portal/ShipmentTracker";
import { DocumentUpload } from "../features/portal/DocumentUpload";
import { motion } from "framer-motion";

interface ClientShipment {
  id: string;
  referenceNumber: string;
  poNumber?: string;
  origin: string;
  destination: string;
  status: string;
  progress: number;
}

// import { trpc } from "../utils/trpc";

export default function CustomerPortalModule() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");

  const rawShipments: any[] = [];

  const shipments = rawShipments.map((s: any) => {
    let prog = 10;
    if (s.status === "IN_TRANSIT") prog = 60;
    if (s.status === "CUSTOMS_CLEARED") prog = 80;
    if (s.status === "DELIVERED") prog = 100;

    return {
      id: s.id,
      referenceNumber: s.referenceNumber,
      poNumber: `PO-${s.referenceNumber}`,
      origin: s.origin?.name || s.origin,
      destination: s.destination?.name || s.destination,
      status: s.status,
      progress: prog,
    };
  });

  const downloadHBL = async (shipment: any) => {
    try {
      const hblData = {
        shipmentId: shipment.id,
        shipper: "Global Exports Inc.",
        consignee: "Atlas Client",
        portOfLoading: shipment.origin,
        portOfDischarge: shipment.destination,
        vessel: "MSC Gulsun",
        voyage: "V.240E",
        containers: [{ containerNumber: "MSCU1234567", isoType: "40HC" }],
        commodities: [
          {
            description: "General Cargo",
            pieces: 100,
            grossWeightKg: 5000,
            volumeCbm: 15,
          },
        ],
      };

      const res = await fetch(`/api/documents/hbl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hblData),
      });

      if (!res.ok) throw new Error("Failed to generate PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `HBL-${shipment.referenceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Error downloading document");
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "IN_TRANSIT")
      return <Anchor className="w-5 h-5 text-blue-500" />;
    if (status === "CUSTOMS_CLEARED")
      return <ShieldCheck className="w-5 h-5 text-amber-500" />;
    if (status === "DELIVERED")
      return <Truck className="w-5 h-5 text-emerald-500" />;
    return <PackageSearch className="w-5 h-5 text-slate-500" />;
  };

  const getStatusColor = (status: string) => {
    if (status === "IN_TRANSIT")
      return "bg-blue-50 text-blue-700 border-blue-200";
    if (status === "CUSTOMS_CLEARED")
      return "bg-amber-50 text-amber-700 border-amber-200";
    if (status === "DELIVERED")
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const filteredShipments = shipments.filter(
    (s) =>
      s.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.poNumber &&
        s.poNumber.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900">
      {/* Portal Header - Simplified for Clients */}
      <div className="bg-indigo-950 text-white px-8 py-10 shrink-0 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-indigo-900 to-indigo-950 opacity-90 z-0"></div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 z-0 mix-blend-overlay"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 max-w-7xl mx-auto">
          <div>
            <span className="text-indigo-400 font-bold tracking-widest text-xs uppercase mb-2 block">
              Client Portal
            </span>
            <h1 className="text-4xl font-black text-white mb-2">
              My Shipments
            </h1>
            <p className="text-indigo-200 max-w-xl">
              Track your cargo, view estimated arrival times, and download
              documents in real-time.
            </p>
          </div>

          <div className="w-full md:w-96 relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by B/L or PO Number..."
              className="w-full bg-white/10 border border-indigo-400/30 text-white placeholder:text-indigo-300 px-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/20 backdrop-blur-sm transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {filteredShipments.map((shipment, idx) => (
            <motion.div
              key={shipment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              whileHover={{ y: -5 }}
              className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 transition-shadow hover:shadow-md"
            >
              <ShipmentTracker shipment={shipment} />
              <DocumentUpload shipmentId={shipment.id} />
            </motion.div>
          ))}

          {filteredShipments.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
              <PackageSearch className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700">
                No shipments found
              </h3>
              <p className="text-slate-500">
                Try adjusting your search criteria.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
