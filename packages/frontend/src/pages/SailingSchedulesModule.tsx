import { useState } from 'react';
import { Calendar, Search, MapPin, Ship, Clock, CalendarCheck, AlertCircle } from 'lucide-react';

interface Schedule {
  id: string;
  carrier: string;
  vessel: string;
  voyage: string;
  departure: string;
  arrival: string;
  transitTime: number;
  cutOffVgm: string;
  cutOffSi: string;
  cutOffCy: string;
  status: 'On Time' | 'Delayed' | 'Advanced';
}

const MOCK_SCHEDULES: Schedule[] = [
  {
    id: 'SCH-001',
    carrier: 'Maersk',
    vessel: 'Ebba Maersk',
    voyage: '304W',
    departure: '2026-08-15',
    arrival: '2026-09-17',
    transitTime: 33,
    cutOffVgm: '2026-08-11 12:00',
    cutOffSi: '2026-08-12 18:00',
    cutOffCy: '2026-08-13 10:00',
    status: 'On Time'
  },
  {
    id: 'SCH-002',
    carrier: 'MSC',
    vessel: 'MSC Zoe',
    voyage: 'FX849',
    departure: '2026-08-18',
    arrival: '2026-09-22',
    transitTime: 35,
    cutOffVgm: '2026-08-14 12:00',
    cutOffSi: '2026-08-15 18:00',
    cutOffCy: '2026-08-16 10:00',
    status: 'Delayed'
  },
  {
    id: 'SCH-003',
    carrier: 'CMA CGM',
    vessel: 'CMA CGM Antoine de Saint Exupery',
    voyage: '0ME7SW1MA',
    departure: '2026-08-22',
    arrival: '2026-09-23',
    transitTime: 32,
    cutOffVgm: '2026-08-18 12:00',
    cutOffSi: '2026-08-19 18:00',
    cutOffCy: '2026-08-20 10:00',
    status: 'On Time'
  }
];

export default function SailingSchedulesModule() {
  const [origin, setOrigin] = useState('Shanghai (CNSHA)');
  const [destination, setDestination] = useState('Rotterdam (NLRTM)');
  const [date, setDate] = useState('2026-08-15');
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    setHasSearched(true);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900">
      <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-indigo-600" />
          Sailing Schedules
        </h1>
        <p className="text-sm text-slate-500 mt-1">Search and plan your future maritime shipments across all major alliances.</p>
        
        <div className="mt-6 flex flex-wrap items-end gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Origin Port (POL)</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              <input type="text" value={origin} onChange={(e) => setOrigin(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="e.g. CNSHA" />
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Destination Port (POD)</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="e.g. NLRTM" />
            </div>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Date from</label>
            <div className="relative">
              <CalendarCheck className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
          </div>
          <button onClick={handleSearch} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg flex items-center gap-2 transition-colors">
            <Search className="w-4 h-4" />
            Search Schedules
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {!hasSearched ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Ship className="w-16 h-16 mb-4 text-slate-300" />
            <p>Enter your route and click Search to see available vessels.</p>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Available Routings</h3>
                <p className="text-sm text-slate-500">Found {MOCK_SCHEDULES.length} schedules from {origin} to {destination}</p>
              </div>
            </div>

            {MOCK_SCHEDULES.map((sch) => (
              <div key={sch.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white ${
                      sch.carrier === 'Maersk' ? 'bg-blue-600' :
                      sch.carrier === 'MSC' ? 'bg-yellow-600' :
                      sch.carrier === 'CMA CGM' ? 'bg-indigo-800' : 'bg-slate-600'
                    }`}>
                      {sch.carrier.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        {sch.carrier}
                        {sch.status === 'Delayed' && (
                          <span className="flex items-center gap-1 text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                            <AlertCircle className="w-3 h-3" /> Delayed
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                        <Ship className="w-3 h-3" /> {sch.vessel} • Voy: {sch.voyage}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-slate-800">{sch.transitTime} <span className="text-sm font-medium text-slate-500">Days</span></div>
                    <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">Transit Time</p>
                  </div>
                </div>

                <div className="p-5 flex flex-wrap gap-8 items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-8 flex-1">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Departure</p>
                      <p className="font-medium text-slate-800">{sch.departure}</p>
                      <p className="text-xs text-slate-500">{origin}</p>
                    </div>
                    <div className="flex-1 flex items-center justify-center relative">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-dashed border-slate-300"></div></div>
                      <div className="bg-slate-50 px-3 relative z-10 text-slate-400"><Ship className="w-5 h-5" /></div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Arrival</p>
                      <p className="font-medium text-slate-800">{sch.arrival}</p>
                      <p className="text-xs text-slate-500">{destination}</p>
                    </div>
                  </div>

                  <div className="w-px h-12 bg-slate-200 hidden lg:block"></div>

                  <div className="flex gap-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> VGM Cut-off</p>
                      <p className="text-xs font-medium text-slate-700">{sch.cutOffVgm}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> SI Cut-off</p>
                      <p className="text-xs font-medium text-slate-700">{sch.cutOffSi}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> CY Cut-off</p>
                      <p className="text-xs font-medium text-rose-600">{sch.cutOffCy}</p>
                    </div>
                  </div>
                  
                  <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors">
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
