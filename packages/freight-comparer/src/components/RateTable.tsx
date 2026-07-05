import React, { useState, useMemo } from 'react';
import { Ship, Anchor, AlertCircle, TrendingDown, DollarSign, ChevronDown, ChevronUp, CheckCircle, Search, Filter } from 'lucide-react';
import { FreightRateMock } from '../data/mockRates';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { addBooking } from '../store/slices/bookingSlice';
import { createShipment } from '@dataconnect/generated';
import RfqGeneratorModal from './RfqGeneratorModal';

interface RateTableProps {
  rates: FreightRateMock[];
}

export default function RateTable({ rates }: RateTableProps) {
  const dispatch = useDispatch();
  const { current: activeCurrency, rates: exchangeRates } = useSelector((state: RootState) => state.currency);
  const bookedRates = useSelector((state: RootState) => state.booking.bookedRates);
  
  const [filterPol, setFilterPol] = useState('');
  const [filterPod, setFilterPod] = useState('');
  const [filterCarrier, setFilterCarrier] = useState('');
  
  const [sortKey, setSortKey] = useState<'total' | 'transitTimeDays'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState<string | null>(null);
  const [rfqRate, setRfqRate] = useState<FreightRateMock | null>(null);

  const handleBooking = async (rate: FreightRateMock) => {
    if (bookedRates.find(r => r.id === rate.id)) return;
    setIsBooking(rate.id);
    try {
      const etd = new Date().toISOString();
      const eta = new Date(Date.now() + rate.transitTimeDays * 24 * 60 * 60 * 1000).toISOString();

      /*
      await createShipment({
        // bookingReference: `BKG-${rate.id.substring(0, 8).toUpperCase()}`,
        pol: rate.pol,
        pod: rate.pod,
        carrier: rate.carrier,
        etd,
        eta,
        status: "BOOKED",
        freightCost: rate.total,
        containerVolume: Math.floor(Math.random() * 5) + 1,
        demurrageLimitDays: 7
      });
      */

      dispatch(addBooking(rate));
    } catch (error) {
      console.error("Failed to book shipment:", error);
      alert("Database connection failed. Please ensure Firebase Data Connect Emulator is running or cloud is accessible.");
    } finally {
      setIsBooking(null);
    }
  };

  const convertAmount = (amount: number, baseCurrency: string) => {
    if (baseCurrency === activeCurrency) return amount;
    const rate = activeCurrency === 'EUR' ? exchangeRates.EUR : 1 / exchangeRates.EUR;
    return Math.round(amount * rate);
  };

  // generatePDF moved to RfqGeneratorModal

  const filteredAndSortedRates = useMemo(() => {
    let result = rates.filter(r => 
      r.pol.toLowerCase().includes(filterPol.toLowerCase()) &&
      r.pod.toLowerCase().includes(filterPod.toLowerCase()) &&
      r.carrier.toLowerCase().includes(filterCarrier.toLowerCase())
    );

    result.sort((a, b) => {
      let aVal = sortKey === 'total' ? convertAmount(a.total, a.currency) : a[sortKey];
      let bVal = sortKey === 'total' ? convertAmount(b.total, b.currency) : b[sortKey];
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [rates, filterPol, filterPod, filterCarrier, sortKey, sortOrder, activeCurrency, exchangeRates]);

  const toggleSort = (key: 'total' | 'transitTimeDays') => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  return (
    <div className="w-full bg-white/40 backdrop-blur-xl border border-white/50 shadow-xl shadow-indigo-900/5 rounded-2xl overflow-hidden flex flex-col">
      
      {/* Header & Filters */}
      <div className="px-6 py-5 border-b border-white/40 bg-white/30 backdrop-blur-md">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Ship className="w-5 h-5 text-indigo-500" />
              Live Market Rates
            </h2>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
              Freight Forwarding Analytics Engine
            </p>
          </div>
          <div className="flex gap-3">
            <div className="px-4 py-2 bg-indigo-50/50 border border-indigo-100 rounded-lg backdrop-blur-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-0.5">Booked</span>
                <span className="text-sm font-black text-indigo-700 leading-none">{bookedRates.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-4 bg-white/50 p-2 rounded-xl border border-white shadow-inner">
          <Filter className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
          <input 
            type="text" 
            placeholder="Origin (POL)..." 
            value={filterPol}
            onChange={e => setFilterPol(e.target.value)}
            className="bg-transparent border-none outline-none text-sm font-medium text-slate-700 placeholder-slate-400 flex-1 px-2"
          />
          <div className="w-px h-6 bg-slate-300"></div>
          <input 
            type="text" 
            placeholder="Destination (POD)..." 
            value={filterPod}
            onChange={e => setFilterPod(e.target.value)}
            className="bg-transparent border-none outline-none text-sm font-medium text-slate-700 placeholder-slate-400 flex-1 px-2"
          />
          <div className="w-px h-6 bg-slate-300"></div>
          <input 
            type="text" 
            placeholder="Carrier..." 
            value={filterCarrier}
            onChange={e => setFilterCarrier(e.target.value)}
            className="bg-transparent border-none outline-none text-sm font-medium text-slate-700 placeholder-slate-400 flex-1 px-2"
          />
        </div>
      </div>

      {/* Table container */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/50 backdrop-blur-md border-b border-white/50 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
              <th className="py-4 px-6 whitespace-nowrap">Carrier & Lane</th>
              <th 
                className="py-4 px-6 whitespace-nowrap cursor-pointer hover:bg-white/50 transition-colors"
                onClick={() => toggleSort('transitTimeDays')}
              >
                <div className="flex items-center gap-1">
                  Schedule {sortKey === 'transitTimeDays' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}
                </div>
              </th>
              <th className="py-4 px-6 whitespace-nowrap">Base Ocean</th>
              <th className="py-4 px-6 whitespace-nowrap">Surcharges</th>
              <th 
                className="py-4 px-6 whitespace-nowrap text-right cursor-pointer hover:bg-white/50 transition-colors"
                onClick={() => toggleSort('total')}
              >
                <div className="flex items-center justify-end gap-1">
                  Total Net {sortKey === 'total' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}
                </div>
              </th>
              <th className="py-4 px-6 whitespace-nowrap text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/40">
            {filteredAndSortedRates.map((rate) => {
              const isExpanded = expandedRowId === rate.id;
              const isBooked = !!bookedRates.find(r => r.id === rate.id);

              return (
                <React.Fragment key={rate.id}>
                  <tr 
                    onClick={() => setExpandedRowId(isExpanded ? null : rate.id)}
                    className="group hover:bg-white/60 transition-all duration-300 ease-out cursor-pointer"
                  >
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-slate-100 flex items-center justify-center border border-white shadow-sm shrink-0">
                          <span className="text-indigo-600 font-black text-xs">{rate.carrier.substring(0, 2).toUpperCase()}</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm">{rate.carrier}</h3>
                          <div className="flex items-center gap-2 mt-1 text-[11px] font-medium text-slate-500">
                            <span className="truncate max-w-[100px]" title={rate.pol}>{rate.pol.split(" ")[0]}</span>
                            <TrendingDown className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate max-w-[100px]" title={rate.pod}>{rate.pod.split(" ")[0]}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-5 px-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-slate-700">
                          {rate.transitTimeDays} days
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {rate.isDirect ? 'DIRECT' : 'TRANSSHIPMENT'}
                        </span>
                      </div>
                    </td>

                    <td className="py-5 px-6">
                      <span className="text-sm font-bold text-slate-700 font-mono bg-slate-100/50 px-2 py-1 rounded">
                        {activeCurrency} {convertAmount(rate.baseRate, rate.currency).toLocaleString()}
                      </span>
                    </td>

                    <td className="py-5 px-6">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                        <span>{rate.surcharges.length} Surcharges</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                      </div>
                    </td>

                    <td className="py-5 px-6 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-lg font-black text-indigo-600 font-mono">
                          {activeCurrency} {convertAmount(rate.total, rate.currency).toLocaleString()}
                        </span>
                        {rate.isDirect && (
                          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded">
                            <AlertCircle className="w-3 h-3" /> Best Route
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-5 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col gap-2 items-center">
                        <button 
                          onClick={() => handleBooking(rate)}
                          disabled={isBooked || isBooking === rate.id}
                          className={`w-28 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all duration-200 ${
                            isBooked 
                            ? 'bg-emerald-500 text-white cursor-default' 
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/30'
                          }`}
                        >
                          {isBooked ? 'Booked ✓' : (isBooking === rate.id ? 'Saving...' : 'Book Now')}
                        </button>
                        <button 
                          onClick={() => setRfqRate(rate)}
                          className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 uppercase tracking-widest transition-colors"
                        >
                          PDF Quote
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Row */}
                  {isExpanded && (
                    <tr className="bg-slate-50/50 border-b border-white/50">
                      <td colSpan={6} className="py-6 px-10">
                        <div className="flex gap-12">
                          <div className="flex-1">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Surcharge Breakdown</h4>
                            <div className="space-y-3">
                              {rate.surcharges.map((s, i) => {
                                // Calculate percentage of total
                                const amount = convertAmount(s.amount, rate.currency);
                                const total = convertAmount(rate.total, rate.currency);
                                const percentage = Math.round((amount / total) * 100);
                                
                                return (
                                  <div key={i} className="flex items-center gap-4">
                                    <span className="w-20 text-[10px] font-bold text-slate-600 uppercase">{s.name}</span>
                                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-indigo-400 rounded-full" 
                                        style={{ width: `${percentage}%` }}
                                      ></div>
                                    </div>
                                    <span className="w-24 text-right text-xs font-mono font-bold text-slate-700">
                                      {activeCurrency} {amount.toLocaleString()} <span className="text-slate-400 text-[10px] ml-1">({percentage}%)</span>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="w-[300px] border-l border-white/60 pl-8 flex flex-col justify-center">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Quote Summary</h4>
                            <p className="text-sm text-slate-600 mb-1"><span className="font-semibold">Valid Until:</span> {rate.validUntil}</p>
                            <p className="text-sm text-slate-600"><span className="font-semibold">Reference ID:</span> {rate.id}</p>
                            <div className="mt-4 p-3 bg-white rounded-lg border border-slate-100 text-xs text-slate-500 italic">
                              "This rate is subject to space and equipment availability. Peak Season Surcharge (PSS) may vary at time of sailing."
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            
            {filteredAndSortedRates.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                  <p className="font-medium">No rates found matching your criteria</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rfqRate && (
        <RfqGeneratorModal 
          rate={rfqRate} 
          onClose={() => setRfqRate(null)} 
        />
      )}
    </div>
  );
}
