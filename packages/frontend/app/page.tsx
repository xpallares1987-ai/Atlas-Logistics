"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertConfig } from '../components/dashboard/AlertConfig';
import { 
  Search, Plane, Ship, Package, AlertTriangle, Clock, ArrowRight, Filter, Calendar, MapPin, Activity, CheckCircle2, TrendingUp, Anchor, SlidersHorizontal, FolderOpen
} from 'lucide-react';
import { fetchShipments } from '@/app/actions/actions';
import { Shipment } from '@/types/scm';

import dynamic from 'next/dynamic';

const MonthlyOperationsChart = dynamic(() => import('../components/dashboard/MonthlyOperationsChart'), { ssr: false });
const TransportShareChart = dynamic(() => import('../components/dashboard/TransportShareChart'), { ssr: false });

export default function SCMDashboard() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Custom Filter States
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [routeFilter, setRouteFilter] = useState('ALL');
  const [transportFilter, setTransportFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const today = new Date('2026-06-15');

  useEffect(() => {
    async function loadShipments() {
      try {
        const data = await fetchShipments();
        setShipments(data);
      } catch (err) {
        console.error("Error loading shipments", err);
      } finally {
        setLoading(false);
      }
    }
    
    loadShipments(); // Initial call
    
    const interval = setInterval(loadShipments, 60000); // Poll every 60 seconds
    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  // Compute stats
  const activeShipments = shipments.filter(s => s.status !== 'DELIVERED');
  
  const delayedShipments = shipments.filter(s => {
    if (s.delayed) return true;
    // or past ETA and not arrived/delivered
    const etaDate = new Date(s.eta);
    return etaDate < today && s.status !== 'DELIVERED' && s.status !== 'ARRIVED';
  });

  const closeToEta = shipments.filter(s => {
    if (s.status === 'DELIVERED') return false;
    const etaDate = new Date(s.eta);
    const timeDiff = etaDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff >= 0 && daysDiff <= 10;
  });

  const customsHeld = shipments.filter(s => s.customsStatus === 'HELD_FOR_INSPECTION');

  // Filter Shipments
  const filteredShipments = shipments.filter(s => {
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    
    const routeKey = `${s.origin}➔${s.destination}`;
    const matchesRoute = routeFilter === 'ALL' || routeKey === routeFilter;
    
    // Normalize mode filter
    let matchesTransport = false;
    if (transportFilter === 'ALL') {
      matchesTransport = true;
    } else if (transportFilter === 'FCL') {
      matchesTransport = s.mode.startsWith('FCL');
    } else if (transportFilter === 'LCL') {
      matchesTransport = s.mode === 'LCL';
    } else if (transportFilter === 'AIR') {
      matchesTransport = s.mode === 'AIR';
    }

    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      s.reference.toLowerCase().includes(searchLower) ||
      s.mblNumber.toLowerCase().includes(searchLower) ||
      s.hblNumber.toLowerCase().includes(searchLower) ||
      s.carrier.toLowerCase().includes(searchLower) ||
      (s.cargoDetails?.description || '').toLowerCase().includes(searchLower);

    return matchesStatus && matchesRoute && matchesTransport && matchesSearch;
  });

  // Chart Data Calculations
  // Monthly summary of operations: Ene-Jun
  // Group real or mock shipments by month
  const monthlyOperationsData = [
    { month: 'Ene', Activos: 25, Completados: 40, Demorados: 2 },
    { month: 'Feb', Activos: 28, Completados: 42, Demorados: 4 },
    { month: 'Mar', Activos: 35, Completados: 55, Demorados: 3 },
    { month: 'Abr', Activos: 42, Completados: 61, Demorados: 5 },
    { month: 'May', Activos: 48, Completados: 75, Demorados: 6 },
    { month: 'Jun', Activos: activeShipments.length * 10, Completados: 85, Demorados: delayedShipments.length },
  ];

  const transportData = [
    { name: 'FCL', value: shipments.filter(s => s.mode.startsWith('FCL')).length || 15 },
    { name: 'LCL', value: shipments.filter(s => s.mode.startsWith('LCL')).length || 8 },
    { name: 'AIR', value: shipments.filter(s => s.mode.startsWith('AIR')).length || 4 },
    { name: 'ROAD', value: shipments.filter(s => s.mode.startsWith('ROAD')).length || 6 }
  ];

  const COLORS: Record<string, string> = {
    'FCL': '#3b82f6',
    'LCL': '#8b5cf6',
    'AIR': '#10b981',
    'ROAD': '#f59e0b'
  };


  // Transport distribution count
  const fclCount = shipments.filter(s => s.mode.startsWith('FCL')).length;
  const lclCount = shipments.filter(s => s.mode === 'LCL').length;
  const airCount = shipments.filter(s => s.mode === 'AIR').length;

  const transportShareData = [
    { name: 'FCL (Contenedor)', value: fclCount || 1, color: '#3b82f6' },
    { name: 'LCL (Carga Suelta)', value: lclCount || 1, color: '#10b981' },
    { name: 'Aéreo Cargo', value: airCount || 1, color: '#8b5cf6' },
  ];

  // Unique route list for filters
  const uniqueRoutes = Array.from(new Set(shipments.map(s => `${s.origin}➔${s.destination}`)));

  const getStatusColor = (status: Shipment['status']) => {
    switch (status) {
      case 'BOOKED': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'IN_TRANSIT': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'ARRIVED': return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      case 'DELIVERED': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
    }
  };

  const getStatusName = (status: Shipment['status']) => {
    switch (status) {
      case 'BOOKED': return 'Espacio Reservado';
      case 'IN_TRANSIT': return 'En Tránsito Marítimo';
      case 'ARRIVED': return 'Arribado a Destino';
      case 'DELIVERED': return 'Entregado a Cliente';
      default: return status;
    }
  };

  const calculateProgress = (status: Shipment['status']) => {
    switch (status) {
      case 'BOOKED': return 25;
      case 'IN_TRANSIT': return 60;
      case 'ARRIVED': return 85;
      case 'DELIVERED': return 100;
      default: return 0;
    }
  };

  return (
    <div id="scm-dashboard-root" className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Dashboard Coordinador Logístico</h1>
          <p className="text-gray-400 text-sm">Resumen en vivo de operaciones, hitos, alertas críticas de despacho y de transporte marítimo.</p>
        </div>
        <div className="flex gap-3">
          <Link 
            href="/bookings/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-lg flex items-center gap-2 transition"
          >
            <Package className="w-4 h-4" />
            Nuevo Booking Contenedor / FCL
          </Link>
          <Link 
            href="/rates"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-semibold rounded-lg border border-gray-700 flex items-center gap-2 transition"
          >
            <Anchor className="w-4 h-4 text-blue-400" />
            Ver Tarifario
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-400">Cargando métricas y envíos...</span>
        </div>
      ) : (
        <>
          {/* Dashboard KPIs Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* KPI 1: Active Shipments */}
            <div className="bg-[#16161A] p-6 rounded-xl border border-gray-800/40 relative overflow-hidden group hover:border-gray-700/80 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {((activeShipments.length / (shipments.length || 1)) * 100).toFixed(0)}% Activos
                </span>
              </div>
              <div className="relative z-10">
                <div className="text-3xl font-bold text-white mb-1 font-mono">{activeShipments.length}</div>
                <div className="text-xs font-semibold text-gray-400">Envíos en Tránsito o Reservados</div>
              </div>
              <div className="absolute -right-6 -bottom-6 opacity-[0.02] group-hover:opacity-[0.06] transition-opacity">
                <Ship className="w-32 h-32 text-blue-500" />
              </div>
            </div>

            {/* KPI 2: Close to ETA */}
            <div className="bg-[#16161A] p-6 rounded-xl border border-gray-800/40 relative overflow-hidden group hover:border-gray-700/80 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
                {closeToEta.length > 0 && (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                    Acción Requerida
                  </span>
                )}
              </div>
              <div className="relative z-10">
                <div className="text-3xl font-bold text-white mb-1 font-mono">{closeToEta.length}</div>
                <div className="text-xs font-semibold text-gray-400">Próximos a ETA (&lt;10 días)</div>
              </div>
              <div className="absolute -right-6 -bottom-6 opacity-[0.02] group-hover:opacity-[0.06] transition-opacity">
                <Clock className="w-32 h-32 text-amber-500" />
              </div>
            </div>

            {/* KPI 3: Delayed shipments */}
            <div className="bg-[#16161A] p-6 rounded-xl border border-gray-800/40 relative overflow-hidden group hover:border-gray-700/80 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                {delayedShipments.length > 0 ? (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                    Alerta de Demoras
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Sin Demoras
                  </span>
                )}
              </div>
              <div className="relative z-10">
                <div className="text-3xl font-bold text-white mb-1 font-mono">{delayedShipments.length}</div>
                <div className="text-xs font-semibold text-gray-400">Embarques Retrasados hoy</div>
              </div>
              <div className="absolute -right-6 -bottom-6 opacity-[0.02] group-hover:opacity-[0.06] transition-opacity">
                <AlertTriangle className="w-32 h-32 text-red-500" />
              </div>
            </div>

            {/* KPI 4: Customs Inspection Held status */}
            <div className="bg-[#16161A] p-6 rounded-xl border border-gray-800/40 relative overflow-hidden group hover:border-gray-700/80 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <Package className="w-5 h-5" />
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Semáforo Rojo
                </span>
              </div>
              <div className="relative z-10">
                <div className="text-3xl font-bold text-white mb-1 font-mono">{customsHeld.length}</div>
                <div className="text-xs font-semibold text-gray-400">Retenidos en Aduana / Alertas</div>
              </div>
              <div className="absolute -right-6 -bottom-6 opacity-[0.02] group-hover:opacity-[0.06] transition-opacity">
                <Package className="w-32 h-32 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Warnings & Critical Highlights Grid */}
          {(delayedShipments.length > 0 || closeToEta.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Delayed shipments highlight panel */}
              {delayedShipments.length > 0 && (
                <div className="bg-[#1e1416] border border-red-500/20 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-red-500/10">
                    <h3 className="text-sm font-bold text-red-400 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      ALERTA CRÍTICA: Retrasos & Obstáculos en Curso ({delayedShipments.length})
                    </h3>
                    <span className="text-[10px] font-semibold bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/10">
                      ETA Vencidos / Congestión
                    </span>
                  </div>
                  <div className="space-y-4">
                    {delayedShipments.map(s => {
                      const originName = s.origin === 'CNSHA' ? 'Shanghai (CNSHA)' : s.origin;
                      const destName = s.destination === 'ESBCN' ? 'Barcelona (ESBCN)' : s.destination === 'USLAX' ? 'Los Angeles (USLAX)' : s.destination;
                      return (
                        <div key={s.id} className="bg-[#161011] p-4 rounded-lg border border-red-500/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-red-500/30 transition-colors">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-red-400">{s.reference}</span>
                              <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded font-bold">{s.carrier}</span>
                            </div>
                            <p className="text-xs text-gray-300 font-medium">{s.cargoDetails?.description || 'Mercadería general'}</p>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400">
                              <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> {originName}</span>
                              <ArrowRight className="w-3 h-3" />
                              <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> {destName}</span>
                            </div>
                          </div>
                          <div className="text-right md:min-w-[150px]">
                            <div className="text-xs text-red-400 font-semibold flex items-center justify-end">
                              <Clock className="w-3.5 h-3.5 mr-1" />
                              ETA Pasado: {s.eta}
                            </div>
                            <p className="text-[10px] text-gray-400 italic">Held at Destination / Congestion</p>
                            <div className="mt-2 flex justify-end">
                              <Link 
                                href={`/tracking?id=${s.id}`}
                                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 hover:underline flex items-center"
                              >
                                Resolver en Tracking &rarr;
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Close to ETA highlight panel */}
              {closeToEta.length > 0 && (
                <div className="bg-[#141a16] border border-emerald-500/20 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-500/10">
                    <h3 className="text-sm font-bold text-emerald-400 flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      PRÓXIMAS LLEGADAS: En Tránsito Cercano ({closeToEta.length})
                    </h3>
                    <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/10">
                      ETA &lt;10 días
                    </span>
                  </div>
                  <div className="space-y-4">
                    {closeToEta.map(s => {
                      const etaDate = new Date(s.eta);
                      const daysLeft = Math.ceil((etaDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
                      return (
                        <div key={s.id} className="bg-[#111612] p-4 rounded-lg border border-emerald-500/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-emerald-500/30 transition-colors">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-emerald-400">{s.reference}</span>
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold">{s.carrier}</span>
                            </div>
                            <p className="text-xs text-gray-300 font-medium">{s.cargoDetails?.description || 'Mercadería General'}</p>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400">
                              <span>POL: {s.origin}</span>
                              <ArrowRight className="w-3 h-3" />
                              <span>POD: {s.destination}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-emerald-400 font-bold">
                              Llega {daysLeft === 0 ? 'HOY' : daysLeft === 1 ? 'mañana' : `en ${daysLeft} días`}
                            </div>
                            <p className="text-[10px] text-gray-400 font-mono">ETA: {s.eta}</p>
                            <div className="mt-2 flex justify-end">
                              <Link 
                                href={`/tracking?id=${s.id}`}
                                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 hover:underline"
                              >
                                Despachar Alerta &rarr;
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Interactive Chart Section: Monthly operations & transport share division */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Operations by month */}
            <div className="lg:col-span-2 bg-[#16161A] p-6 rounded-xl border border-gray-800/40 flex flex-col h-[350px]">
              <div>
                <h3 className="text-sm font-semibold text-white">Resumen de Operaciones por Mes</h3>
                <p className="text-[11px] text-gray-500 mt-1">Crecimiento mensual de embarques completados, activos y demorados (Año 2026)</p>
              </div>
              <div className="flex-1 w-full min-h-0 mt-4">
                
                  <MonthlyOperationsChart data={monthlyOperationsData} />
                
              </div>
            </div>

            {/* Chart 2: Transport Share */}
            <div className="bg-[#16161A] p-6 rounded-xl border border-gray-800/40 flex flex-col h-[350px]">
              <div>
                <h3 className="text-sm font-semibold text-white">Múltiples Modos de Carga</h3>
                <p className="text-[11px] text-gray-500 mt-1">Distribución global por modal de transporte activo</p>
              </div>
              <div className="flex-1 w-full min-h-0 mt-4 flex flex-col justify-between">
                <div className="h-[180px] w-full relative">
                  
                    <TransportShareChart data={transportData} colors={COLORS} />
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-white font-mono">{shipments.length}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Totales</span>
                  </div>
                </div>
                <div className="space-y-1.5 pt-2">
                  {transportShareData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-gray-400">{item.name}</span>
                      </div>
                      <span className="font-bold text-white font-mono">{item.value} ({((item.value / (shipments.length || 1)) * 100).toFixed(0)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Filters and Active Shipments Search Console */}
          <div className="bg-[#16161A] p-6 rounded-xl border border-gray-800/40 space-y-6">
            <AlertConfig />
          </div>

          <div className="bg-[#16161A] p-6 rounded-xl border border-gray-800/40 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-800/50">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-500" />
                  Consola de Búsqueda y Filtros de Carga
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Filtra la flota activa por estados logísticos, rutas comerciales o modales marítimo/aéreo.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Reset Filters button */}
                {(statusFilter !== 'ALL' || routeFilter !== 'ALL' || transportFilter !== 'ALL' || searchQuery !== '') && (
                  <button 
                    onClick={() => {
                      setStatusFilter('ALL');
                      setRouteFilter('ALL');
                      setTransportFilter('ALL');
                      setSearchQuery('');
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 font-bold transition hover:underline"
                  >
                    Restablecer Filtros
                  </button>
                )}
              </div>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search input */}
              <div className="relative">
                <label className="sr-only">Buscar por palabra clave</label>
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar Ref, BL, Naviera..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#0A0A0B] border border-gray-800 rounded-lg text-xs text-gray-200 focus:outline-none focus:border-blue-500 placeholder-gray-600 transition"
                />
              </div>

              {/* Status filter selection */}
              <div>
                <label htmlFor="dashboard-status-select" className="sr-only">Estado del Embarque</label>
                <select
                  id="dashboard-status-select"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full py-2 px-3 bg-[#0A0A0B] border border-gray-800 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-blue-500 transition cursor-pointer"
                >
                  <option value="ALL">📍 Todos los Estados</option>
                  <option value="BOOKED">Espacio Reservado (Booked)</option>
                  <option value="IN_TRANSIT">En Tránsito Marítimo (In Transit)</option>
                  <option value="ARRIVED">Arribado a Destino (Arrived)</option>
                  <option value="DELIVERED">Entregado final (Delivered)</option>
                </select>
              </div>

              {/* Route filter selection */}
              <div>
                <label htmlFor="dashboard-route-select" className="sr-only">Ruta Comercial</label>
                <select
                  id="dashboard-route-select"
                  value={routeFilter}
                  onChange={e => setRouteFilter(e.target.value)}
                  className="w-full py-2 px-3 bg-[#0A0A0B] border border-gray-800 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-blue-500 transition cursor-pointer"
                >
                  <option value="ALL">🌐 Todas las Rutas</option>
                  {uniqueRoutes.map(rt => {
                    const [pol, pod] = rt.split('➔');
                    return (
                      <option key={rt} value={rt}>
                        {pol} ➔ {pod}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Transport Filter selection */}
              <div>
                <label htmlFor="dashboard-transport-select" className="sr-only">Tipo de Transporte</label>
                <select
                  id="dashboard-transport-select"
                  value={transportFilter}
                  onChange={e => setTransportFilter(e.target.value)}
                  className="w-full py-2 px-3 bg-[#0A0A0B] border border-gray-800 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-blue-500 transition cursor-pointer"
                >
                  <option value="ALL">🚢 Todos los Transportes</option>
                  <option value="FCL">FCL - Contenedor Completo (20&apos;/40&apos;)</option>
                  <option value="LCL">LCL - Carga Consolidada (Suelto)</option>
                  <option value="AIR">AIR - Transporte Aéreo</option>
                </select>
              </div>
            </div>

            {/* Filtered Shipments Grid */}
            <div className="pt-2">
              {filteredShipments.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-800 rounded-xl bg-[#0F0F12]">
                  <FolderOpen className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                  <p className="text-xs font-semibold text-gray-400">No se encontraron embarques con los filtros activos.</p>
                  <p className="text-[10px] text-gray-500 mt-1">Prueba reajustando la palabra clave o el selector de modal o ruta.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[11px] text-gray-500 px-1 font-semibold uppercase tracking-wider">
                    <span>Lista de Embarques ({filteredShipments.length} de {shipments.length})</span>
                    <span>Progreso de Hito</span>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {filteredShipments.map(s => {
                      const pct = calculateProgress(s.status);
                      const isDelayed = s.delayed || (new Date(s.eta) < today && s.status !== 'DELIVERED' && s.status !== 'ARRIVED');
                      return (
                        <div 
                          key={s.id} 
                          className={`bg-[#111114] p-5 rounded-xl border transition-all hover:bg-[#131318] hover:border-gray-700/80 ${
                            isDelayed ? 'border-red-500/20' : 'border-gray-800/50'
                          }`}
                        >
                          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-xs font-mono font-bold ${isDelayed ? 'text-red-400' : 'text-blue-500'}`}>{s.reference}</span>
                                <span className="text-[10px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono font-bold">MBL: {s.mblNumber || 'Pendiente'}</span>
                                {s.customsStatus === 'HELD_FOR_INSPECTION' && (
                                  <span className="text-[9px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded font-bold border border-red-500/20 animate-pulse">Aduana Retenido</span>
                                )}
                                {isDelayed && (
                                  <span className="text-[9px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded font-bold border border-red-500/20">Demorado</span>
                                )}
                              </div>
                              <h4 className="text-sm font-medium text-white">{s.cargoDetails?.description || 'Cargamento de Exportación / Importación'}</h4>
                              <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-gray-500" /> {s.origin}
                                </span>
                                <ArrowRight className="w-3 h-3 text-gray-600" />
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-gray-500" /> {s.destination}
                                </span>
                                <span className="text-gray-600">|</span>
                                <span className="text-gray-500 font-mono text-[11px]">Modal: {s.mode}</span>
                                <span className="text-gray-600">|</span>
                                <span className="text-gray-500">Carrier: {s.carrier}</span>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 shrink-0 self-stretch lg:self-auto justify-between lg:justify-start">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 font-semibold">Incoterm: <span className="text-white font-mono">{s.incoterm || 'FOB'}</span></span>
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${getStatusColor(s.status)}`}>
                                  {getStatusName(s.status)}
                                </span>
                              </div>
                              <div className="text-xs text-gray-400 flex items-center gap-3">
                                <span>ETD: <strong className="text-gray-300 font-mono">{s.etd}</strong></span>
                                <span>ETA: <strong className={`${isDelayed ? 'text-red-400 font-bold animate-pulse' : 'text-emerald-400'} font-mono`}>{s.eta}</strong></span>
                              </div>
                            </div>
                          </div>

                          {/* Progress Line */}
                          <div className="space-y-1.5">
                            <div className="relative w-full h-1.5 bg-[#16161C] rounded-full overflow-hidden border border-gray-800/40">
                              <div 
                                className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
                                  isDelayed ? 'bg-gradient-to-r from-red-600 to-amber-500' : 'bg-gradient-to-r from-blue-600 to-indigo-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-gray-500">
                              <span className="font-semibold text-blue-500">Booking Confirmado</span>
                              <span className={pct >= 50 ? 'text-blue-500 font-semibold' : ''}>En Buque</span>
                              <span className={pct >= 75 ? 'text-blue-500 font-semibold' : ''}>Arribado POD</span>
                              <span className={pct >= 100 ? 'text-emerald-500 font-bold' : ''}>Entregado</span>
                            </div>
                          </div>

                          {/* Detail button & links directly into shipment focus */}
                          <div className="mt-4 pt-3 border-t border-gray-800/40 flex justify-between items-center">
                            <div className="text-[10px] text-gray-500 font-mono">
                              Contenedores asociados: <span className="text-gray-300 font-bold">{s.containers?.length || 0}</span>
                              {s.containers?.[0] && <span className="ml-1 text-gray-400">({s.containers[0].containerNumber})</span>}
                            </div>
                            <Link 
                              href={`/tracking?id=${s.id}`}
                              className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-white rounded border border-gray-700 flex items-center gap-1 transition"
                            >
                              Gestionar Hitos marítimos
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
