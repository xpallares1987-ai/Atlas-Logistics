import { useState } from "react";
import { PackageSearch, FileText, Search, PlusCircle } from "lucide-react";
import { ShipmentTracker } from "../features/portal/ShipmentTracker";
import { DocumentUpload } from "../features/portal/DocumentUpload";
import { QuoteWizardModal } from "../features/portal/QuoteWizardModal";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export default function CustomerPortalModule() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: rawShipments = [], isLoading } = useQuery({
    queryKey: ["clientShipments"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/tracking/my-shipments`);
      return res.json();
    },
  });

  const shipments = rawShipments.map((s: any) => {
    let prog = 10;
    if (s.status === "IN_TRANSIT") prog = 60;
    if (s.status === "CUSTOMS_CLEARED" || s.status === "CUSTOMS") prog = 80;
    if (s.status === "DELIVERED") prog = 100;

    return {
      id: s.id,
      referenceNumber: s.id.substring(0, 8).toUpperCase(),
      poNumber: `PO-${s.id.substring(0, 8).toUpperCase()}`,
      origin: s.origin || "Shanghai",
      destination: s.destination || "Los Angeles",
      status: s.status,
      progress: prog,
    };
  });

  const downloadHBL = async (shipment: any) => {
    try {
      // Backend generated PDF
      window.open(`${API_URL}/documents/hbl/${shipment.id}`, "_blank");
    } catch (err) {
      console.error(err);
      alert("Error downloading document");
    }
  };

  const handleBookQuote = async (quote: any) => {
    try {
      const res = await fetch(`${API_URL}/tracking/my-shipments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quote)
      });
      if (res.ok) {
        setIsQuoteModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ["clientShipments"] });
      }
    } catch (err) {
      console.error(err);
      alert("Error booking shipment");
    }
  };

  const filteredShipments = shipments.filter(
    (s: any) =>
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

          <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-4 relative">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by B/L or PO Number..."
                className="w-full bg-white/10 border border-indigo-400/30 text-white placeholder:text-indigo-300 px-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/20 backdrop-blur-sm transition-all"
              />
            </div>
            
            <button 
              onClick={() => setIsQuoteModalOpen(true)}
              className="w-full md:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <PlusCircle className="w-5 h-5" />
              Get Instant Quote
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {isLoading && (
            <div className="flex justify-center p-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          )}
          {!isLoading &&
            filteredShipments.map((shipment: any, idx: number) => (
              <motion.div
                key={shipment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.4 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => downloadHBL(shipment)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <FileText className="w-4 h-4" /> Download HBL
                  </button>
                </div>
                <ShipmentTracker shipment={shipment} />
                <DocumentUpload shipmentId={shipment.id} />
              </motion.div>
            ))}

          {!isLoading && filteredShipments.length === 0 && (
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

      <QuoteWizardModal 
        isOpen={isQuoteModalOpen} 
        onClose={() => setIsQuoteModalOpen(false)} 
        onBook={handleBookQuote} 
      />
    </div>
  );
}
