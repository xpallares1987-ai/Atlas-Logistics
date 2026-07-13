import { useState } from 'react';
import { BookOpen, FileText, CheckCircle2, Printer, ChevronRight } from 'lucide-react';

interface Booking {
  id: string;
  customer: string;
  origin: string;
  destination: string;
  equipment: string;
  status: 'Draft' | 'Confirmed' | 'Documentation' | 'On Board';
  vessel: string;
  voyage: string;
}

const MOCK_BOOKINGS: Booking[] = [
  { id: 'BKG-99238', customer: 'Global Electronics Ltd', origin: 'Shanghai (CNSHA)', destination: 'Los Angeles (USLAX)', equipment: '2x 40HC', status: 'Draft', vessel: 'TBD', voyage: 'TBD' },
  { id: 'BKG-99239', customer: 'Automotive Parts Inc', origin: 'Rotterdam (NLRTM)', destination: 'New York (USNYC)', equipment: '1x 20DC', status: 'Confirmed', vessel: 'MSC Zoe', voyage: 'FX849' },
  { id: 'BKG-99240', customer: 'Fashion Retailers Group', origin: 'Shenzhen (CNSZX)', destination: 'Valencia (ESVLC)', equipment: '4x 40HC', status: 'Documentation', vessel: 'CMA CGM Antoine', voyage: '0ME7SW' },
  { id: 'BKG-99241', customer: 'AgriCorp', origin: 'Santos (BRSSZ)', destination: 'Antwerp (BEANR)', equipment: '10x 40RF', status: 'On Board', vessel: 'Maersk Mc-Kinney', voyage: '234E' },
];

export default function BookingManagementModule() {
  const [activeTab, setActiveTab] = useState<'All' | 'Draft' | 'Confirmed'>('All');
  const [selectedBkg, setSelectedBkg] = useState<Booking | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'Confirmed': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Documentation': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'On Board': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900">
      <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Booking & B/L Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Convert quotes to bookings and issue House Bills of Lading.</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm">
          + New Booking
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Kanban / List View */}
        <div className="w-1/3 min-w-[400px] border-r border-slate-200 bg-white flex flex-col">
          <div className="p-4 border-b border-slate-100 flex gap-2">
            {['All', 'Draft', 'Confirmed'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${activeTab === tab ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {MOCK_BOOKINGS.filter(b => activeTab === 'All' || b.status === activeTab).map(bkg => (
              <div 
                key={bkg.id} 
                onClick={() => setSelectedBkg(bkg)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedBkg?.id === bkg.id ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-300 hover:shadow-sm bg-white'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono font-bold text-slate-800">{bkg.id}</span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getStatusColor(bkg.status)}`}>
                    {bkg.status}
                  </span>
                </div>
                <h3 className="font-medium text-sm text-slate-700 truncate">{bkg.customer}</h3>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <span className="truncate max-w-[100px]">{bkg.origin.split(' ')[0]}</span>
                  <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                  <span className="truncate max-w-[100px]">{bkg.destination.split(' ')[0]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Details / Editor View */}
        <div className="flex-1 bg-slate-50 overflow-y-auto p-8 relative">
          {selectedBkg ? (
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-800">{selectedBkg.id}</h2>
                  <p className="text-slate-500">{selectedBkg.customer}</p>
                </div>
                <div className="flex gap-3">
                  <button className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                    <Printer className="w-4 h-4" /> Print Draft B/L
                  </button>
                  <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                    <CheckCircle2 className="w-4 h-4" /> Approve Booking
                  </button>
                </div>
              </div>

              {/* B/L Editor Form Simulation */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-800 px-6 py-3 border-b border-slate-700 flex items-center justify-between">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" /> House Bill of Lading Draft
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">HBL-{selectedBkg.id.replace('BKG-', '')}</span>
                </div>
                
                <div className="p-6 grid grid-cols-2 gap-6">
                  <div className="col-span-2 md:col-span-1 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Shipper</label>
                      <textarea className="w-full border border-slate-200 rounded p-2 text-sm bg-slate-50 focus:bg-white transition-colors" rows={3} defaultValue={`${selectedBkg.customer}\n123 Export Avenue\nIndustrial Zone, City`}></textarea>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Consignee</label>
                      <textarea className="w-full border border-slate-200 rounded p-2 text-sm bg-slate-50 focus:bg-white transition-colors" rows={3} defaultValue="To Order of Shipper"></textarea>
                    </div>
                  </div>
                  
                  <div className="col-span-2 md:col-span-1 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vessel / Voyage</label>
                      <input type="text" className="w-full border border-slate-200 rounded p-2 text-sm bg-slate-50 focus:bg-white transition-colors" defaultValue={`${selectedBkg.vessel} / ${selectedBkg.voyage}`} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Port of Loading</label>
                        <input type="text" className="w-full border border-slate-200 rounded p-2 text-sm bg-slate-50 focus:bg-white transition-colors" defaultValue={selectedBkg.origin} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Port of Discharge</label>
                        <input type="text" className="w-full border border-slate-200 rounded p-2 text-sm bg-slate-50 focus:bg-white transition-colors" defaultValue={selectedBkg.destination} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Equipment</label>
                      <input type="text" className="w-full border border-slate-200 rounded p-2 text-sm bg-slate-50 focus:bg-white transition-colors" defaultValue={selectedBkg.equipment} />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description of Goods</label>
                    <textarea className="w-full border border-slate-200 rounded p-3 text-sm bg-slate-50 focus:bg-white transition-colors font-mono" rows={5} defaultValue="1 PACKAGES STC:\nELECTRONIC COMPONENTS AND ACCESSORIES\n\nFREIGHT PREPAID\nSHIPPERS LOAD, STOW AND COUNT"></textarea>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
              <FileText className="w-16 h-16 mb-4 text-slate-200" />
              <p>Select a booking to view or edit details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
