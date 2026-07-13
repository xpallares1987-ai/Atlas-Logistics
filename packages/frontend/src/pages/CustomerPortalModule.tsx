import { useState } from 'react';
import { PackageSearch, FileText, Anchor, Truck, ShieldCheck, MapPin, Search } from 'lucide-react';

interface ClientShipment {
  id: string;
  poNumber: string;
  origin: string;
  destination: string;
  status: 'In Transit' | 'Customs' | 'Delivered' | 'Pending';
  eta: string;
  progress: number;
}

const MOCK_CLIENT_SHIPMENTS: ClientShipment[] = [
  { id: 'BL-99238', poNumber: 'PO-2026-441', origin: 'Shanghai, CN', destination: 'Los Angeles, US', status: 'In Transit', eta: '2026-08-15', progress: 65 },
  { id: 'BL-99239', poNumber: 'PO-2026-442', origin: 'Rotterdam, NL', destination: 'New York, US', status: 'Customs', eta: '2026-07-20', progress: 90 },
  { id: 'BL-99240', poNumber: 'PO-2026-443', origin: 'Shenzhen, CN', destination: 'Miami, US', status: 'Delivered', eta: '2026-07-10', progress: 100 },
];

export default function CustomerPortalModule() {
  const [searchQuery, setSearchQuery] = useState('');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'In Transit': return <Anchor className="w-5 h-5 text-blue-500" />;
      case 'Customs': return <ShieldCheck className="w-5 h-5 text-amber-500" />;
      case 'Delivered': return <Truck className="w-5 h-5 text-emerald-500" />;
      default: return <PackageSearch className="w-5 h-5 text-slate-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Transit': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Customs': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const filteredShipments = MOCK_CLIENT_SHIPMENTS.filter(s => 
    s.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.poNumber.toLowerCase().includes(searchQuery.toLowerCase())
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
                      {shipment.id}
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
                  <span className="text-indigo-600">ETA: {shipment.eta}</span>
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
