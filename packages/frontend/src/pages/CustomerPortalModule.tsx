import { useState, useEffect } from 'react';
import { PackageSearch, FileText, Anchor, Truck, ShieldCheck, MapPin, Search } from 'lucide-react';

interface ClientShipment {
  id: string;
  referenceNumber: string;
  poNumber?: string;
  origin: string;
  destination: string;
  status: string;
  progress: number;
}

// @ts-ignore
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export default function CustomerPortalModule() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState('');
  const [shipments, setShipments] = useState<any[]>([]);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/shipments`);
      const data = await res.json();
      
      const mapped = data.map((s: any) => {
        // Calculate progress based on status (simplified)
        let prog = 10;
        if (s.status === 'IN_TRANSIT') prog = 60;
        if (s.status === 'CUSTOMS_CLEARED') prog = 80;
        if (s.status === 'DELIVERED') prog = 100;
        
        return {
          id: s.id,
          referenceNumber: s.referenceNumber,
          poNumber: `PO-${s.referenceNumber}`,
          origin: s.origin,
          destination: s.destination,
          status: s.status,
          progress: prog,
        };
      });
      setShipments(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'IN_TRANSIT') return <Anchor className="w-5 h-5 text-blue-500" />;
    if (status === 'CUSTOMS_CLEARED') return <ShieldCheck className="w-5 h-5 text-amber-500" />;
    if (status === 'DELIVERED') return <Truck className="w-5 h-5 text-emerald-500" />;
    return <PackageSearch className="w-5 h-5 text-slate-500" />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'IN_TRANSIT') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (status === 'CUSTOMS_CLEARED') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (status === 'DELIVERED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const filteredShipments = shipments.filter(s => 
    s.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.poNumber && s.poNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900">
      {/* Portal Header - Simplified for Clients */}
      <div className="bg-indigo-950 text-white px-8 py-10 shrink-0 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-indigo-900 to-indigo-950 opacity-90 z-0"></div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 z-0 mix-blend-overlay"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 max-w-7xl mx-auto">
          <div>
            <span className="text-indigo-400 font-bold tracking-widest text-xs uppercase mb-2 block">Client Portal</span>
            <h1 className="text-4xl font-black text-white mb-2">My Shipments</h1>
            <p className="text-indigo-200 max-w-xl">Track your cargo, view estimated arrival times, and download documents in real-time.</p>
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
          
          {filteredShipments.map(shipment => (
            <div key={shipment.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
                <div className="flex gap-4 items-center">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${getStatusColor(shipment.status).replace('border-', '').replace('text-', '')} bg-opacity-50`}>
                    {getStatusIcon(shipment.status)}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                      {shipment.referenceNumber}
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${getStatusColor(shipment.status)}`}>
                        {shipment.status}
                      </span>
                    </h3>
                    <p className="text-sm text-slate-500 font-medium">PO Ref: <span className="text-slate-700">{shipment.poNumber}</span></p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button className="flex-1 md:flex-none px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 border border-indigo-100">
                    <FileText className="w-4 h-4" /> Documents
                  </button>
                  <button className="flex-1 md:flex-none px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm">
                    View Details <MapPin className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 bg-slate-50/50">
                <div className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                  <span>{shipment.origin}</span>
                  <span className="text-indigo-600">En Tránsito</span>
                  <span>{shipment.destination}</span>
                </div>
                <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${shipment.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                    style={{ width: `${shipment.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}

          {filteredShipments.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
              <PackageSearch className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700">No shipments found</h3>
              <p className="text-slate-500">Try adjusting your search criteria.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
