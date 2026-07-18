// @ts-nocheck
import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MapPin, 
  Ship, 
  Anchor, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Printer as _Printer,
  ChevronRight, 
  Save, 
  Trash2,
  Book
} from "lucide-react";

interface Booking {
  id: string;
  referenceNumber: string;
  customer: string;
  origin: string;
  destination: string;
  equipment: string;
  status: string;
  vessel: string;
  voyage: string;
}

// @ts-ignore
const API_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/shipments` : 'http://localhost:3001/api/shipments';

export default function BookingManagementModule() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'All' | 'DRAFT' | 'CONFIRMED'>('All');
  const [selectedBkg, setSelectedBkg] = useState<Booking | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Booking>>({});

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URL);
      const data = await res.json();
      setBookings(data);
    } catch (err) {
      console.error('Failed to fetch bookings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewBooking = () => {
    setSelectedBkg(null);
    setFormData({
      referenceNumber: `BKG-${Math.floor(10000 + Math.random() * 90000)}`,
      status: 'DRAFT',
      customer: '',
      origin: '',
      destination: '',
      equipment: '1x 20DC',
      vessel: '',
      voyage: ''
    });
    setIsEditing(true);
  };

  const handleSelectBooking = (bkg: Booking) => {
    setSelectedBkg(bkg);
    setFormData(bkg);
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      const method = formData.id ? 'PUT' : 'POST';
      const url = formData.id ? `${API_URL}/${formData.id}` : API_URL;
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        await fetchBookings();
        const savedBkg = await res.json();
        handleSelectBooking(savedBkg);
      }
    } catch (err) {
      console.error('Failed to save booking', err);
    }
  };

  const handleApprove = async () => {
    if (!selectedBkg?.id) return;
    try {
      const updatedData = { ...formData, status: 'CONFIRMED' };
      const res = await fetch(`${API_URL}/${selectedBkg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      if (res.ok) {
        await fetchBookings();
        const savedBkg = await res.json();
        handleSelectBooking(savedBkg);
      }
    } catch (err) {
      console.error('Failed to approve booking', err);
    }
  };

  const handleDelete = async () => {
    if (!selectedBkg?.id) return;
    if (!window.confirm('Are you sure you want to delete this booking?')) return;
    
    try {
      const res = await fetch(`${API_URL}/${selectedBkg.id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchBookings();
        setSelectedBkg(null);
        setFormData({});
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Failed to delete booking', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'CONFIRMED': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DOCUMENTATION': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ON_BOARD': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900">
      <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Book className="w-6 h-6 text-indigo-600" />
            Booking & B/L Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Convert quotes to bookings and issue House Bills of Lading.</p>
        </div>
        <button onClick={handleNewBooking} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm">
          + New Booking
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Kanban / List View */}
        <div className="w-1/3 min-w-[400px] border-r border-slate-200 bg-white flex flex-col">
          <div className="p-4 border-b border-slate-100 flex gap-2">
            {['All', 'DRAFT', 'CONFIRMED'].map((tab) => (
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
            {loading ? (
              <p className="text-sm text-slate-500 text-center py-4">Loading bookings...</p>
            ) : bookings.filter(b => activeTab === 'All' || b.status === activeTab).map(bkg => (
              <div 
                key={bkg.id} 
                onClick={() => handleSelectBooking(bkg)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedBkg?.id === bkg.id ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-300 hover:shadow-sm bg-white'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono font-bold text-slate-800">{bkg.referenceNumber}</span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getStatusColor(bkg.status)}`}>
                    {bkg.status}
                  </span>
                </div>
                <h3 className="font-medium text-sm text-slate-700 truncate">{bkg.customer}</h3>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <span className="truncate max-w-[100px]">{bkg.origin?.split(' ')[0] || '?'}</span>
                  <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                  <span className="truncate max-w-[100px]">{bkg.destination?.split(' ')[0] || '?'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Details / Editor View */}
        <div className="flex-1 bg-slate-50 overflow-y-auto p-8 relative">
          {(selectedBkg || isEditing) ? (
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-800">{formData.referenceNumber}</h2>
                  <p className="text-slate-500">{formData.customer || 'New Customer'}</p>
                </div>
                <div className="flex gap-3">
                  {selectedBkg && !isEditing && (
                    <>
                      <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                         Edit
                      </button>
                      <button onClick={handleDelete} className="px-4 py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                      {formData.status !== 'CONFIRMED' && (
                        <button onClick={handleApprove} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                          <CheckCircle2 className="w-4 h-4" /> Approve
                        </button>
                      )}
                    </>
                  )}
                  {isEditing && (
                    <>
                      <button onClick={() => selectedBkg ? setIsEditing(false) : setFormData({})} className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                        Cancel
                      </button>
                      <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                        <Save className="w-4 h-4" /> Save Booking
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* B/L Editor Form */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-800 px-6 py-3 border-b border-slate-700 flex items-center justify-between">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" /> House Bill of Lading Draft
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">HBL-{formData.referenceNumber?.replace('BKG-', '')}</span>
                </div>
                
                <div className="p-6 grid grid-cols-2 gap-6">
                  <div className="col-span-2 md:col-span-1 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Customer / Shipper</label>
                      <input 
                        type="text" 
                        disabled={!isEditing}
                        value={formData.customer || ''} 
                        onChange={(e) => setFormData({...formData, customer: e.target.value})}
                        className="w-full border border-slate-200 rounded p-2 text-sm bg-slate-50 focus:bg-white transition-colors disabled:opacity-50" 
                        placeholder="Customer Name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                      <select 
                        disabled={!isEditing}
                        value={formData.status || 'DRAFT'} 
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="w-full border border-slate-200 rounded p-2 text-sm bg-slate-50 focus:bg-white transition-colors disabled:opacity-50"
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="DOCUMENTATION">DOCUMENTATION</option>
                        <option value="ON_BOARD">ON_BOARD</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="col-span-2 md:col-span-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vessel</label>
                        <input type="text" disabled={!isEditing} value={formData.vessel || ''} onChange={(e) => setFormData({...formData, vessel: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm bg-slate-50 focus:bg-white transition-colors disabled:opacity-50" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Voyage</label>
                        <input type="text" disabled={!isEditing} value={formData.voyage || ''} onChange={(e) => setFormData({...formData, voyage: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm bg-slate-50 focus:bg-white transition-colors disabled:opacity-50" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Port of Loading</label>
                        <input type="text" disabled={!isEditing} value={formData.origin || ''} onChange={(e) => setFormData({...formData, origin: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm bg-slate-50 focus:bg-white transition-colors disabled:opacity-50" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Port of Discharge</label>
                        <input type="text" disabled={!isEditing} value={formData.destination || ''} onChange={(e) => setFormData({...formData, destination: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm bg-slate-50 focus:bg-white transition-colors disabled:opacity-50" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Equipment</label>
                      <input type="text" disabled={!isEditing} value={formData.equipment || ''} onChange={(e) => setFormData({...formData, equipment: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm bg-slate-50 focus:bg-white transition-colors disabled:opacity-50" />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
              <FileText className="w-16 h-16 mb-4 text-slate-200" />
              <p>Select a booking to view or edit details, or create a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
