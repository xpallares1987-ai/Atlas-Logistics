'use client';

import React, { useState } from 'react';
import { Ship, Plane, Truck, Anchor, CheckCircle2, Save, Send, FileText, Calculator, Navigation, AlertTriangle, Bell, Mail, Smartphone, Plus, Trash2, DollarSign, History, UserCircle, Clock } from 'lucide-react';
import RouteMap from './RouteMap';
import WeightDistributionChart from '@/components/bookings/WeightDistributionChart';
import CarrierComparisonModal from '@/components/bookings/CarrierComparisonModal';
import DocumentValidation from '@/components/bookings/DocumentValidation';

import ChangeHistory from '@/components/bookings/ChangeHistory';

import AlertConfiguration from '@/components/bookings/AlertConfiguration';
import UserProfileConfig, { UserProfileData } from '@/components/bookings/UserProfileConfig';
import AddressSelector from '@/components/common/AddressSelector';
import { getAddresses } from '@/lib/addressStore';

type Tab = 'general' | 'booking' | 'instructions' | 'finance';

export default function NewBookingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [mode, setMode] = useState('FCL');
  
  const [userProfile, setUserProfile] = useState<UserProfileData>({
    profileImage: null,
    emailAlerts: true,
    pushAlerts: false,
    dailyDigest: false
  });

  const [generalData, setGeneralData] = useState({
    cliente: '',
    shipper: '',
    consignee: '',
    pol: '',
    pod: '',
    incoterm: 'FOB',
    commodity: ''
  });
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<'pol' | 'pod' | null>(null);
  const [showCarrierModal, setShowCarrierModal] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [bookingNo, setBookingNo] = useState('');
  const [etaDate, setEtaDate] = useState('');
  const [freeTimeCutoff, setFreeTimeCutoff] = useState('');

  const [instructionsData, setInstructionsData] = useState({
    marksAndNumbers: '',
    description: '',
    packages: '',
    volume: ''
  });

  const [grossWeight, setGrossWeight] = useState<number | ''>('');
  const [dimLength, setDimLength] = useState<number | ''>('');
  const [dimWidth, setDimWidth] = useState<number | ''>('');
  const [dimHeight, setDimHeight] = useState<number | ''>('');
  const [stowageFactor, setStowageFactor] = useState<number | ''>(1000);
  const [dimUnit, setDimUnit] = useState<'cm' | 'in'>('cm');

  const [cargoItems, setCargoItems] = useState<{id: number, description: string, weight: number | ''}[]>([
    { id: 1, description: 'Pallet general', weight: '' }
  ]);
  const [coherenceStatus, setCoherenceStatus] = useState<'none' | 'valid' | 'discrepancy'>('none');
  const [equipmentType, setEquipmentType] = useState('40HC');
  const [activationErrors, setActivationErrors] = useState<string[]>([]);



  const [financeLines, setFinanceLines] = useState([
    { id: '1', description: 'Flete Marítimo FCL', provider: 'Maersk', cost: 1500, sell: 1800 }
  ]);

  const [auditLogs, setAuditLogs] = useState<{ id: string, timestamp: string, user: string, action: string, details: string }[]>([]);

  const addAuditLog = (action: string, details: string) => {
    setAuditLogs(prev => [
      {
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        timestamp: new Date().toISOString(),
        user: 'Operador (Auto)',
        action,
        details
      },
      ...prev
    ]);
  };

  const addFinanceLine = () => {
    setFinanceLines([...financeLines, { id: Date.now().toString(), description: '', provider: '', cost: 0, sell: 0 }]);
  };

  const removeFinanceLine = (id: string) => {
    setFinanceLines(financeLines.filter(l => l.id !== id));
  };

  const updateFinanceLine = (id: string, field: string, value: string | number) => {
    setFinanceLines(financeLines.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const totalCost = financeLines.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
  const totalSell = financeLines.reduce((acc, curr) => acc + (Number(curr.sell) || 0), 0);
  const profit = totalSell - totalCost;
  const margin = totalSell > 0 ? (profit / totalSell) * 100 : 0;

  const handleAddCargoItem = () => {
    setCargoItems([...cargoItems, { id: Date.now(), description: '', weight: '' }]);
  };

  const validateCoherence = () => {
    const totalItemsWeight = cargoItems.reduce((acc, item) => acc + (Number(item.weight) || 0), 0);
    const declaredGrossWeight = Number(grossWeight) || 0;
    
    if (declaredGrossWeight === 0 && totalItemsWeight === 0) {
      setCoherenceStatus('none');
    } else if (declaredGrossWeight < totalItemsWeight || declaredGrossWeight > totalItemsWeight) {
      setCoherenceStatus('discrepancy');
    } else {
      setCoherenceStatus('valid');
    }
  };

  const handleToggleDimUnit = () => {
    if (dimUnit === 'cm') {
      setDimUnit('in');
      if (dimLength !== '') setDimLength(Number((Number(dimLength) / 2.54).toFixed(2)));
      if (dimWidth !== '') setDimWidth(Number((Number(dimWidth) / 2.54).toFixed(2)));
      if (dimHeight !== '') setDimHeight(Number((Number(dimHeight) / 2.54).toFixed(2)));
      if (stowageFactor !== '') setStowageFactor(Number((Number(stowageFactor) / 16.387).toFixed(2)));
    } else {
      setDimUnit('cm');
      if (dimLength !== '') setDimLength(Number((Number(dimLength) * 2.54).toFixed(2)));
      if (dimWidth !== '') setDimWidth(Number((Number(dimWidth) * 2.54).toFixed(2)));
      if (dimHeight !== '') setDimHeight(Number((Number(dimHeight) * 2.54).toFixed(2)));
      if (stowageFactor !== '') setStowageFactor(Number((Number(stowageFactor) * 16.387).toFixed(0)));
    }
  };

  const [estimatedVolumetricWeight, setEstimatedVolumetricWeight] = useState<number | null>(null);

  const handleCalculateVolumetricWeight = () => {
    if (dimLength !== '' && dimWidth !== '' && dimHeight !== '' && stowageFactor !== '' && Number(stowageFactor) !== 0) {
      const volWeight = (Number(dimLength) * Number(dimWidth) * Number(dimHeight)) / Number(stowageFactor);
      setEstimatedVolumetricWeight(Number(volWeight.toFixed(2)));
    } else {
      setEstimatedVolumetricWeight(null);
    }
  };

  const freeTimeDays = (etaDate && freeTimeCutoff) 
    ? Math.max(0, Math.floor((new Date(freeTimeCutoff).getTime() - new Date(etaDate).getTime()) / (1000 * 3600 * 24)))
    : null;


  const handleBookingNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let letters = raw.replace(/[^A-Z]/g, '').slice(0, 4);
    let numbers = raw.slice(letters.length).replace(/[^0-9]/g, '').slice(0, 8);
    setBookingNo(letters + numbers);
  };

  const PORT_SUGGESTIONS = [
    { code: 'ESBCN', name: 'Barcelona, Spain', coordinates: [2.1734, 41.3851] as [number, number] },
    { code: 'ESMAD', name: 'Madrid, Spain', coordinates: [-3.7038, 40.4168] as [number, number] },
    { code: 'USLAX', name: 'Los Angeles, USA', coordinates: [-118.2437, 34.0522] as [number, number] },
    { code: 'USNYC', name: 'New York, USA', coordinates: [-74.0060, 40.7128] as [number, number] },
    { code: 'CNSHA', name: 'Shanghai, China', coordinates: [121.4737, 31.2304] as [number, number] },
    { code: 'CNHKG', name: 'Hong Kong, China', coordinates: [114.1694, 22.3193] as [number, number] },
    { code: 'NLRTM', name: 'Rotterdam, Netherlands', coordinates: [4.4792, 51.9225] as [number, number] },
    { code: 'SGSIN', name: 'Singapore', coordinates: [103.8198, 1.3521] as [number, number] },
    { code: 'KRKOR', name: 'Busan, South Korea', coordinates: [129.0756, 35.1796] as [number, number] },
    { code: 'AEDXB', name: 'Dubai, UAE', coordinates: [55.2708, 25.2048] as [number, number] },
    { code: 'DEHAM', name: 'Hamburg, Germany', coordinates: [9.9937, 53.5511] as [number, number] },
    { code: 'BEANR', name: 'Antwerp, Belgium', coordinates: [4.4025, 51.2194] as [number, number] },
    { code: 'MXVER', name: 'Veracruz, Mexico', coordinates: [-96.1333, 19.1738] as [number, number] },
    { code: 'MXALT', name: 'Altamira, Mexico', coordinates: [-97.9355, 22.3956] as [number, number] }
  ];

  const getSuggestions = (query: string) => {
    if (!query) return PORT_SUGGESTIONS.slice(0, 5);
    return PORT_SUGGESTIONS.filter(p => 
      p.code.toLowerCase().includes(query.toLowerCase()) || 
      p.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);
  };

  const handleTabChange = (newTab: Tab) => {
    if (activeTab === 'general' && newTab !== 'general') {
      if (!generalData.cliente.trim() || !generalData.pol.trim() || !generalData.pod.trim()) {
        setError('Por favor completa los campos obligatorios: Cliente, POL y POD.');
        return;
      }

      const unlocodeRegex = /^[A-Za-z]{5}$/;
      if (!unlocodeRegex.test(generalData.pol.trim())) {
        setError('El POL debe ser un código UN/LOCODE válido de 5 letras exactas (ej. ESBCN).');
        return;
      }
      if (!unlocodeRegex.test(generalData.pod.trim())) {
        setError('El POD debe ser un código UN/LOCODE válido de 5 letras exactas (ej. USLAX).');
        return;
      }
    }
    setError('');
    setActiveTab(newTab);
  };
  
  const handleSaveDraft = () => {
    addAuditLog('Borrador Guardado', 'El expediente ha sido guardado como borrador exitosamente.');
    alert('Borrador guardado exitosamente.');
  };

  const handleActivate = () => {
    const newErrors: string[] = [];
    
    if (!generalData.cliente) newErrors.push('Tab 1 (General): Falta Cliente');
    if (!generalData.pol) newErrors.push('Tab 1 (General): Falta Puerto de Origen (POL)');
    if (!generalData.pod) newErrors.push('Tab 1 (General): Falta Puerto de Destino (POD)');
    if (!generalData.shipper) newErrors.push('Tab 1 (General): Falta Shipper (Exportador)');
    if (!generalData.consignee) newErrors.push('Tab 1 (General): Falta Consignee (Importador)');

    if (!selectedCarrier) newErrors.push('Tab 2 (Booking): Falta Naviera/Transportista');
    if (!bookingNo) newErrors.push('Tab 2 (Booking): Falta No. Booking Naviera');

    if (!instructionsData.marksAndNumbers) newErrors.push('Tab 3 (Instrucciones): Falta Marcas y Números');
    if (!instructionsData.description) newErrors.push('Tab 3 (Instrucciones): Falta Descripción de la Mercancía');
    if (!instructionsData.packages) newErrors.push('Tab 3 (Instrucciones): Falta Bultos');
    if (!grossWeight) newErrors.push('Tab 3 (Instrucciones): Falta Peso Bruto Total');
    if (!instructionsData.volume) newErrors.push('Tab 3 (Instrucciones): Falta Volumen (CBM)');

    const hasValidFinance = financeLines.some(line => line.description && line.provider && line.cost >= 0 && line.sell >= 0);
    if (!hasValidFinance) newErrors.push('Tab 4 (Finanzas): Debe incluir al menos una línea de costo válida (descripción, proveedor, costo).');

    if (newErrors.length > 0) {
      setActivationErrors(newErrors);
      return;
    }

    setActivationErrors([]);
    addAuditLog('Activación de Expediente', 'El expediente ha sido validado y activado correctamente.');
    alert('¡Expediente activado exitosamente y validado!');
  };

  return (
    <>
      <div className="p-6 md:p-8 max-w-6xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Nuevo Embarque / Expediente</h1>
          <p className="text-gray-400">Registra un nuevo booking y gestiona su ciclo de vida documental y financiero.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSaveDraft} className="bg-[#111114] border border-gray-800 hover:bg-gray-800 text-gray-300 px-4 py-2 rounded-lg text-sm transition">
             Guardar Borrador
          </button>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center">
             <Save className="w-4 h-4 mr-2" /> Crear Expediente
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-gray-800 mb-8 overflow-x-auto">
         <button 
           onClick={() => handleTabChange('general')}
           className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center ${activeTab === 'general' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
         >
           <Navigation className="w-4 h-4 mr-2" /> 1. Routing y General
         </button>
         <button 
           onClick={() => handleTabChange('booking')}
           className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center ${activeTab === 'booking' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
         >
           <Anchor className="w-4 h-4 mr-2" /> 2. Booking (Naviera/Agente)
         </button>
         <button 
           onClick={() => handleTabChange('instructions')}
           className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center ${activeTab === 'instructions' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
         >
           <FileText className="w-4 h-4 mr-2" /> 3. Instrucciones Documentales
         </button>
         <button 
           onClick={() => handleTabChange('finance')}
           className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center ${activeTab === 'finance' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
         >
           <Calculator className="w-4 h-4 mr-2" /> 4. Cálculos y Facturación
         </button>
      </div>

      <div className="bg-[#111114] border border-gray-800 rounded-xl p-6 md:p-8">
        
        {/* TAB: GENERAL */}
        {activeTab === 'general' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <UserProfileConfig profile={userProfile} onChange={setUserProfile} />
             
             <div>
                <h3 className="text-lg font-medium text-white mb-4">Modalidad de Transporte</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { id: 'FCL', label: 'FCL (Contenedor)', icon: Ship },
                    { id: 'LCL', label: 'LCL (Grupaje)', icon: Ship },
                    { id: 'AIR', label: 'Aéreo', icon: Plane },
                    { id: 'ROAD', label: 'Terrestre', icon: Truck },
                  ].map(m => (
                    <button 
                      key={m.id}
                      onClick={() => setMode(m.id)}
                      className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition-colors ${mode === m.id ? 'bg-blue-600/10 border-blue-500 text-blue-500' : 'bg-[#0A0A0B] border-gray-800 text-gray-400 hover:border-gray-700'}`}
                    >
                      <m.icon className="w-8 h-8" />
                      <span className="text-sm font-medium">{m.label}</span>
                    </button>
                  ))}
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-800/50">
               <div className="col-span-1 md:col-span-2 h-48 md:h-64 mb-4">
                 <RouteMap 
                   polCoordinates={PORT_SUGGESTIONS.find(p => p.code === generalData.pol)?.coordinates}
                   podCoordinates={PORT_SUGGESTIONS.find(p => p.code === generalData.pod)?.coordinates}
                   polName={PORT_SUGGESTIONS.find(p => p.code === generalData.pol)?.name}
                   podName={PORT_SUGGESTIONS.find(p => p.code === generalData.pod)?.name}
                 />
               </div>
               <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-300">Entidades Activas</h3>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Cliente (Facturación) <span className="text-red-500">*</span></label>
                    <AddressSelector
                      value={generalData.cliente}
                      onChange={val => setGeneralData({...generalData, cliente: val})}
                      allowedTypes={['Cliente']}
                      placeholder="Seleccionar cliente..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Shipper (Exportador)</label>
                    <AddressSelector
                      value={generalData.shipper}
                      onChange={val => setGeneralData({...generalData, shipper: val})}
                      allowedTypes={['Cliente', 'Agente']}
                      placeholder="Seleccionar shipper o agente..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Consignee (Importador)</label>
                    <AddressSelector
                      value={generalData.consignee}
                      onChange={val => setGeneralData({...generalData, consignee: val})}
                      allowedTypes={['Cliente']}
                      placeholder="Seleccionar consignee..."
                    />
                  </div>
                </div>

                <div className="space-y-4 border-t md:border-t-0 md:border-l border-gray-800/50 pt-4 md:pt-0 md:pl-6">
                  <h3 className="text-sm font-medium text-gray-300">Routing Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 relative">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Port of Loading (POL) <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        placeholder="Ej. CNSHA (Shanghai)" 
                        value={generalData.pol}
                        onChange={e => setGeneralData({...generalData, pol: e.target.value.toUpperCase()})}
                        onFocus={() => setFocusedField('pol')}
                        onBlur={() => setTimeout(() => setFocusedField(null), 200)}
                        className="w-full bg-[#0A0A0B] border border-gray-800 rounded-lg p-3 text-sm focus:border-blue-500 focus:outline-none text-white uppercase" 
                      />
                      {focusedField === 'pol' && (
                        <div className="absolute z-10 w-full mt-1 bg-[#16161A] border border-gray-800 rounded-lg shadow-xl overflow-hidden">
                          {getSuggestions(generalData.pol).map(port => (
                            <button
                              key={port.code}
                              type="button"
                              onClick={() => {
                                setGeneralData({...generalData, pol: port.code});
                                setFocusedField(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 focus:bg-gray-800 transition"
                            >
                              <span className="font-mono font-bold text-blue-400 mr-2">{port.code}</span>
                              {port.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 relative">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Port of Discharge (POD) <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        placeholder="Ej. ESBCN (Barcelona)" 
                        value={generalData.pod}
                        onChange={e => setGeneralData({...generalData, pod: e.target.value.toUpperCase()})}
                        onFocus={() => setFocusedField('pod')}
                        onBlur={() => setTimeout(() => setFocusedField(null), 200)}
                        className="w-full bg-[#0A0A0B] border border-gray-800 rounded-lg p-3 text-sm focus:border-blue-500 focus:outline-none text-white uppercase" 
                      />
                      {focusedField === 'pod' && (
                        <div className="absolute z-10 w-full mt-1 bg-[#16161A] border border-gray-800 rounded-lg shadow-xl overflow-hidden">
                          {getSuggestions(generalData.pod).map(port => (
                            <button
                              key={port.code}
                              type="button"
                              onClick={() => {
                                setGeneralData({...generalData, pod: port.code});
                                setFocusedField(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 focus:bg-gray-800 transition"
                            >
                              <span className="font-mono font-bold text-blue-400 mr-2">{port.code}</span>
                              {port.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Incoterm</label>
                      <select 
                        value={generalData.incoterm}
                        onChange={e => setGeneralData({...generalData, incoterm: e.target.value})}
                        className="w-full bg-[#0A0A0B] border border-gray-800 rounded-lg p-3 text-sm focus:border-blue-500 focus:outline-none text-white"
                      >
                         <option>FOB</option> <option>EXW</option> <option>CIF</option> <option>DAP</option> <option>DDP</option> <option>FCA</option> <option>CPT</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Mercancía</label>
                        <input 
                          type="text" 
                          placeholder="Commodity" 
                          value={generalData.commodity}
                          onChange={e => setGeneralData({...generalData, commodity: e.target.value})}
                          className="w-full bg-[#0A0A0B] border border-gray-800 rounded-lg p-3 text-sm focus:border-blue-500 focus:outline-none text-white" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">HS Code</label>
                        <input 
                          type="text" 
                          placeholder="Ej. 8517.12" 
                          className="w-full bg-[#0A0A0B] border border-gray-800 rounded-lg p-3 text-sm focus:border-blue-500 focus:outline-none text-white font-mono" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
             </div>
             
             {error && (
               <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-3 rounded-lg flex items-center">
                  <span className="font-medium">{error}</span>
               </div>
             )}

             <div className="flex justify-end pt-4">
               <button onClick={() => handleTabChange('booking')} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition">
                 Continuar a Booking
               </button>
             </div>
          </div>
        )}

        {/* TAB: BOOKING */}
        {activeTab === 'booking' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="bg-gradient-to-r from-blue-900/20 text-blue-400 p-4 rounded-lg text-sm flex items-start border border-blue-900/50">
               <CheckCircle2 className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
               <div>
                  <p className="font-semibold mb-1">Proceso de Booking</p>
                  <p className="text-blue-200/70">Aquí puedes registrar la solicitud inicial a la naviera/aerolínea y posteriormente capturar los datos de la confirmación oficial.</p>
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Solicitud */}
               <div className="space-y-4">
                 <div className="flex justify-between items-center pb-2 border-b border-gray-800">
                   <h3 className="text-sm font-medium text-gray-300">1. Solicitud (Booking Request)</h3>
                   <button onClick={() => setShowCarrierModal(true)} className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 px-3 py-1 rounded text-xs transition flex items-center">
                     <Ship className="w-3 h-3 mr-1" /> Comparar Navieras
                   </button>
                 </div>
                 <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">Naviera / Transportista o Agente Comercial</label>
                   <AddressSelector
                     value={selectedCarrier}
                     onChange={val => setSelectedCarrier(val)}
                     allowedTypes={['Naviera', 'Agente']}
                     placeholder="Seleccionar naviera o filial/agente..."
                   />
                   <p className="text-[10px] text-gray-500 mt-1.5 font-sans">
                     * El booking requiere forzosamente ser reservado a través de la Línea Marítima o su Agente de Embarque.
                   </p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Tipo Equipo</label>
                      <select 
                        value={equipmentType} 
                        onChange={e => setEquipmentType(e.target.value)} 
                        className="w-full bg-[#0A0A0B] border border-gray-800 rounded-lg p-3 text-sm text-white"
                      >
                         <option value="20DC">20&apos; DC</option> 
                         <option value="40DC">40&apos; DC</option>
                         <option value="40HC">40&apos; HC</option> 
                         <option value="LCL">LCL / Grupaje</option>
                         <option value="AIR">Aéreo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Cantidad</label>
                      <input type="number" defaultValue="1" className="w-full bg-[#0A0A0B] border border-gray-800 rounded-lg p-3 text-sm text-white" />
                    </div>
                 </div>
                 <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">Fecha Estimada Salida (ETD Solic.)</label>
                   <input type="date" className="w-full bg-[#0A0A0B] border border-gray-800 rounded-lg p-3 text-sm text-white" />
                 </div>
                 <button className="w-full border border-gray-700 text-gray-300 hover:bg-gray-800 px-4 py-2 rounded-lg text-sm transition">
                    Marcar como &apos;Solicitado&apos;
                 </button>
               </div>

               {/* Confirmación */}
               <div className="space-y-4">
                 <h3 className="text-sm font-medium text-green-400 pb-2 border-b border-gray-800">2. Confirmación (Booking Confirmation)</h3>
                 <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">No. Booking Naviera</label>
                   <input 
                     type="text" 
                     placeholder="Ej. MSCU12345678" 
                     value={bookingNo}
                     onChange={handleBookingNoChange}
                     maxLength={12}
                     className="w-full bg-[#0A0A0B] border border-green-900/50 rounded-lg p-3 text-sm text-white font-mono" 
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">Vessel / Voyage (Buque y Viaje)</label>
                   <input type="text" placeholder="Ej. MSC GULSUN v.024W" className="w-full bg-[#0A0A0B] border border-gray-800 rounded-lg p-3 text-sm text-white uppercase" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Conf. ETD</label>
                      <input type="date" className="w-full bg-[#0A0A0B] border border-gray-800 rounded-lg p-3 text-sm text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Conf. ETA (Llegada)</label>
                      <input 
                        type="date" 
                        value={etaDate}
                        onChange={e => setEtaDate(e.target.value)}
                        className="w-full bg-[#0A0A0B] border border-gray-800 rounded-lg p-3 text-sm text-white" 
                      />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Cut-off Free Time (Destino)</label>
                      <input 
                        type="date" 
                        value={freeTimeCutoff}
                        onChange={e => setFreeTimeCutoff(e.target.value)}
                        className="w-full bg-[#0A0A0B] border border-orange-900/30 rounded-lg p-3 text-sm text-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Días de Free Time Estimados</label>
                      <div className="w-full bg-blue-900/20 border border-blue-800 rounded-lg p-3 text-sm font-mono text-blue-300 flex items-center h-[46px]">
                        {freeTimeDays !== null ? `${freeTimeDays} Días` : '-'}
                      </div>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Cut-off Documental (Origen)</label>
                      <input type="date" className="w-full bg-[#0A0A0B] border border-orange-900/30 rounded-lg p-3 text-sm text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Cut-off Físico (Origen)</label>
                      <input type="date" className="w-full bg-[#0A0A0B] border border-orange-900/30 rounded-lg p-3 text-sm text-white" />
                    </div>
                 </div>
               </div>
             </div>

             <div className="flex justify-between pt-4">
               <button onClick={() => handleTabChange('general')} className="border border-gray-800 hover:bg-gray-800 text-gray-400 px-5 py-2.5 rounded-lg text-sm font-medium transition">
                 Atrás
               </button>
               <button onClick={() => handleTabChange('instructions')} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition">
                 Siguiente
               </button>
             </div>
          </div>
        )}

        {/* TAB: INSTRUCTIONS */}
        {activeTab === 'instructions' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                 <h3 className="text-sm font-medium text-gray-300 pb-2 border-b border-gray-800">Detalles para Shipping Instructions</h3>
                 <p className="text-xs text-gray-500">Completa esta información para redactar el Draft HBL o enviar las MBL instructions a la naviera.</p>
                 
                 <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">Marcas y Números (Marks & Numbers) <span className="text-red-500">*</span></label>
                   <textarea rows={3} placeholder="N/M..." value={instructionsData.marksAndNumbers} onChange={e => setInstructionsData({...instructionsData, marksAndNumbers: e.target.value})} className={`w-full bg-[#0A0A0B] border ${!instructionsData.marksAndNumbers ? 'border-red-900/50 focus:border-red-500' : 'border-gray-800'} rounded-lg p-3 text-sm text-white resize-none`}></textarea>
                 </div>
                 <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">Descripción de la Mercancía <span className="text-red-500">*</span></label>
                   <textarea rows={4} placeholder="Description of goods..." value={instructionsData.description} onChange={e => setInstructionsData({...instructionsData, description: e.target.value})} className={`w-full bg-[#0A0A0B] border ${!instructionsData.description ? 'border-red-900/50 focus:border-red-500' : 'border-gray-800'} rounded-lg p-3 text-sm text-white resize-none`}></textarea>
                 </div>
                 
                 <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Bultos <span className="text-red-500">*</span></label>
                      <input type="text" placeholder="Ej. 10 PLT" value={instructionsData.packages} onChange={e => setInstructionsData({...instructionsData, packages: e.target.value})} className={`w-full bg-[#0A0A0B] border ${!instructionsData.packages ? 'border-red-900/50 focus:border-red-500' : 'border-gray-800'} rounded-lg p-3 text-sm text-white`} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Peso Bruto Total (KG) <span className="text-red-500">*</span></label>
                      <input 
                        type="number" 
                        placeholder="KGS" 
                        value={grossWeight}
                        onChange={(e) => {
                          setGrossWeight(e.target.value === '' ? '' : Number(e.target.value));
                          setCoherenceStatus('none');
                        }}
                        onBlur={(e) => {
                          if (e.target.value !== '') {
                            addAuditLog('Actualización de Peso', `Peso Bruto Total actualizado a ${e.target.value} KG.`);
                          }
                        }}
                        className={`w-full bg-[#0A0A0B] border ${!grossWeight ? 'border-red-900/50 focus:border-red-500' : coherenceStatus === 'discrepancy' ? 'border-orange-500 focus:border-orange-400' : coherenceStatus === 'valid' ? 'border-green-500 focus:border-green-400' : 'border-gray-800'} rounded-lg p-3 text-sm text-white`} 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Volumen (CBM) <span className="text-red-500">*</span></label>
                      <input type="number" placeholder="CBM" value={instructionsData.volume} onChange={e => setInstructionsData({...instructionsData, volume: e.target.value})} className={`w-full bg-[#0A0A0B] border ${!instructionsData.volume ? 'border-red-900/50 focus:border-red-500' : 'border-gray-800'} rounded-lg p-3 text-sm text-white`} />
                    </div>
                 </div>

                 <div className="pt-4 border-t border-gray-800/50">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-medium text-gray-300">Desglose de Ítems de Carga</h4>
                      <button type="button" onClick={handleAddCargoItem} className="text-[10px] text-blue-400 hover:text-blue-300 font-medium">+ Añadir Ítem</button>
                    </div>
                    <div className="space-y-2 mb-4">
                      {cargoItems.map((item, index) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-600 font-mono w-4">{index + 1}.</span>
                          <input 
                            type="text" 
                            placeholder="Descripción" 
                            value={item.description}
                            onChange={(e) => setCargoItems(cargoItems.map(i => i.id === item.id ? { ...i, description: e.target.value } : i))}
                            className="flex-1 bg-[#0A0A0B] border border-gray-800 rounded p-2 text-xs text-white" 
                          />
                          <input 
                            type="number" 
                            placeholder="Peso (KG)" 
                            value={item.weight}
                            onChange={(e) => {
                              setCargoItems(cargoItems.map(i => i.id === item.id ? { ...i, weight: e.target.value === '' ? '' : Number(e.target.value) } : i));
                              setCoherenceStatus('none');
                            }}
                            onBlur={(e) => {
                              if (e.target.value !== '') {
                                addAuditLog('Actualización de Ítem', `Peso del ítem '${item.description || 'Sin descripción'}' actualizado a ${e.target.value} KG.`);
                              }
                            }}
                            className="w-24 bg-[#0A0A0B] border border-gray-800 rounded p-2 text-xs text-white" 
                          />
                          <button 
                            type="button" 
                            onClick={() => setCargoItems(cargoItems.filter(i => i.id !== item.id))}
                            className="text-gray-500 hover:text-red-400 p-1"
                          >
                           &times;
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-between items-center bg-[#16161A] border border-gray-800 rounded-lg p-3">
                       <div className="flex items-center gap-4">
                         <div>
                           <p className="text-[10px] text-gray-500">Peso Bruto Declarado</p>
                           <p className={`text-sm font-mono font-medium ${coherenceStatus === 'discrepancy' ? 'text-orange-400' : 'text-gray-300'}`}>{grossWeight || 0} KG</p>
                         </div>
                         <div className="h-6 w-px bg-gray-800"></div>
                         <div>
                           <p className="text-[10px] text-gray-500">Suma de Ítems</p>
                           <p className={`text-sm font-mono font-medium ${coherenceStatus === 'discrepancy' ? 'text-orange-400' : 'text-gray-300'}`}>
                             {cargoItems.reduce((acc, item) => acc + (Number(item.weight) || 0), 0)} KG
                           </p>
                         </div>
                       </div>
                       <button
                         type="button"
                         onClick={validateCoherence}
                         className="flex items-center gap-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded text-xs font-medium transition"
                       >
                         <CheckCircle2 className="w-3.5 h-3.5" />
                         Validar Coherencia
                       </button>
                    </div>
                    
                    {coherenceStatus === 'discrepancy' && (
                      <p className="text-[11px] text-orange-400/80 mt-2 flex items-start">
                         <AlertTriangle className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                         Discrepancia detectada: La suma de los pesos de los ítems no coincide con el Peso Bruto Total declarado.
                      </p>
                    )}
                    {coherenceStatus === 'valid' && (
                      <p className="text-[11px] text-green-400/80 mt-2 flex items-start">
                         <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                         Pesos verificados correctamente.
                      </p>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-800/50">
                      <WeightDistributionChart grossWeight={Number(grossWeight) || 0} equipmentType={equipmentType} />
                    </div>
                 </div>

                 <div className="pt-4 border-t border-gray-800/50">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-medium text-purple-400 flex items-center">
                        <Calculator className="w-3 h-3 mr-1" /> Calculadora de Peso Volumétrico
                      </h4>
                      <button
                        type="button"
                        onClick={handleToggleDimUnit}
                        className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-1 px-2 rounded transition"
                      >
                        Cambiar a {dimUnit === 'cm' ? 'Pulgadas (in)' : 'Centímetros (cm)'}
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">Largo ({dimUnit})</label>
                        <input type="number" value={dimLength} onChange={(e) => { setDimLength(e.target.value === '' ? '' : Number(e.target.value)); setEstimatedVolumetricWeight(null); }} onBlur={(e) => { if(e.target.value) addAuditLog('Actualización de Dimensión', `Largo actualizado a ${e.target.value} ${dimUnit}.`) }} className="w-full bg-[#0A0A0B] border border-gray-800 rounded p-2 text-xs text-white" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">Ancho ({dimUnit})</label>
                        <input type="number" value={dimWidth} onChange={(e) => { setDimWidth(e.target.value === '' ? '' : Number(e.target.value)); setEstimatedVolumetricWeight(null); }} onBlur={(e) => { if(e.target.value) addAuditLog('Actualización de Dimensión', `Ancho actualizado a ${e.target.value} ${dimUnit}.`) }} className="w-full bg-[#0A0A0B] border border-gray-800 rounded p-2 text-xs text-white" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">Alto ({dimUnit})</label>
                        <input type="number" value={dimHeight} onChange={(e) => { setDimHeight(e.target.value === '' ? '' : Number(e.target.value)); setEstimatedVolumetricWeight(null); }} onBlur={(e) => { if(e.target.value) addAuditLog('Actualización de Dimensión', `Alto actualizado a ${e.target.value} ${dimUnit}.`) }} className="w-full bg-[#0A0A0B] border border-gray-800 rounded p-2 text-xs text-white" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">F. Estiba ({dimUnit}³/kg)</label>
                        <input type="number" value={stowageFactor} onChange={(e) => { setStowageFactor(e.target.value === '' ? '' : Number(e.target.value)); setEstimatedVolumetricWeight(null); }} onBlur={(e) => { if(e.target.value) addAuditLog('Actualización de Dimensión', `Factor de estiba actualizado a ${e.target.value} ${dimUnit}³/kg.`) }} className="w-full bg-[#0A0A0B] border border-gray-800 rounded p-2 text-xs text-white" />
                      </div>
                    </div>

                    <div className="flex justify-end mb-3">
                      <button
                        type="button"
                        onClick={handleCalculateVolumetricWeight}
                        className="flex items-center gap-1.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded text-xs font-medium transition"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        Calcular Peso Volumétrico
                      </button>
                    </div>
                    
                    {estimatedVolumetricWeight !== null && (
                      <div className={`p-3 rounded-lg border text-sm flex justify-between items-center ${grossWeight !== '' && estimatedVolumetricWeight > Number(grossWeight) ? 'bg-orange-900/10 border-orange-800/40 text-orange-200' : 'bg-blue-900/10 border-blue-900/30 text-blue-300'}`}>
                        <span>Peso Volumétrico Estimado:</span>
                        <span className="font-mono font-bold">{estimatedVolumetricWeight} KG</span>
                      </div>
                    )}
                    
                    {estimatedVolumetricWeight !== null && grossWeight !== '' && estimatedVolumetricWeight > Number(grossWeight) && (
                      <p className="text-[11px] text-orange-400/80 mt-2 flex items-start">
                         <AlertTriangle className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                         El peso volumétrico supera al peso bruto. El costo del flete podría basarse en el peso volumétrico (Chargeable Weight).
                      </p>
                    )}
                 </div>
               </div>
               
               <div className="space-y-6">
                 <div className="bg-[#0A0A0B] border border-gray-800 rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-4">
                    <DocumentValidation fields={[
                      { label: 'Shipper (Exportador)', value: generalData.shipper },
                      { label: 'Consignee (Importador)', value: generalData.consignee },
                      { label: 'Marcas y Números', value: instructionsData.marksAndNumbers },
                      { label: 'Descripción de la Mercancía', value: instructionsData.description },
                      { label: 'Bultos', value: instructionsData.packages },
                      { label: 'Peso Bruto Total', value: grossWeight },
                      { label: 'Volumen', value: instructionsData.volume }
                    ]} />
                    
                    <FileText className="w-12 h-12 text-gray-600" />
                    <div>
                      <h4 className="text-gray-300 font-medium mb-1">Generación de Documentos</h4>
                      <p className="text-gray-500 text-xs px-8">Una vez confirmados todos los detalles obligatorios, puedes generar el Draft HBL, Sea Waybill o Telex Release.</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                         disabled={!generalData.shipper || !generalData.consignee || !instructionsData.marksAndNumbers || !instructionsData.description || !instructionsData.packages || !grossWeight || !instructionsData.volume}
                         className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm transition"
                      >
                        Vista Previa BL
                      </button>
                      <button 
                         disabled={!generalData.shipper || !generalData.consignee || !instructionsData.marksAndNumbers || !instructionsData.description || !instructionsData.packages || !grossWeight || !instructionsData.volume}
                         className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm transition flex items-center"
                      >
                        <Send className="w-4 h-4 mr-2" /> Enviar Instrucciones
                      </button>
                    </div>
                 </div>

                 <AlertConfiguration />

                 <ChangeHistory logs={auditLogs} />
               </div>
             </div>

             <div className="flex justify-between pt-4">
               <button onClick={() => handleTabChange('booking')} className="border border-gray-800 hover:bg-gray-800 text-gray-400 px-5 py-2.5 rounded-lg text-sm font-medium transition">
                 Atrás
               </button>
               <button onClick={() => handleTabChange('finance')} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition">
                 Siguiente (Finanzas)
               </button>
             </div>
          </div>
        )}

        {/* TAB: FINANCE */}
        {activeTab === 'finance' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                <div className="bg-gradient-to-br from-[#16161A] to-[#111114] border border-gray-800 rounded-xl p-6 flex flex-col justify-center relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-5">
                      <DollarSign className="w-32 h-32" />
                   </div>
                   <h3 className="text-sm font-medium text-gray-400 mb-6 relative z-10">Resumen Financiero (P&L)</h3>
                   <div className="grid grid-cols-2 gap-4 relative z-10">
                      <div>
                         <p className="text-xs text-gray-500 mb-1">Costo Total (Buy)</p>
                         <p className="text-xl font-mono text-red-400">${totalCost.toLocaleString()}</p>
                      </div>
                      <div>
                         <p className="text-xs text-gray-500 mb-1">Venta Total (Sell)</p>
                         <p className="text-xl font-mono text-green-400">${totalSell.toLocaleString()}</p>
                      </div>
                      <div className="col-span-2 pt-4 border-t border-gray-800 flex justify-between items-end">
                         <div>
                           <p className="text-xs text-gray-500 mb-1">Beneficio Bruto</p>
                           <p className={`text-2xl font-bold ${profit < 0 ? 'text-red-500' : profit > 0 ? 'text-emerald-400' : 'text-white'}`}>
                             ${profit.toLocaleString()}
                           </p>
                         </div>
                         <div className="text-right">
                           <p className="text-xs text-gray-500 mb-1">Margen</p>
                           <p className={`text-lg font-bold ${margin >= 15 ? 'text-blue-400' : margin < 0 ? 'text-red-500' : 'text-yellow-500'}`}>
                             {margin.toFixed(2)}%
                           </p>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="bg-gradient-to-br from-[#16161A] to-[#111114] border border-gray-800 rounded-xl p-6">
                  <h3 className="text-sm font-medium text-gray-300 mb-4">Emitir Facturación</h3>
                  <p className="text-xs text-gray-500 mb-6">
                     Genera la factura comercial (Invoice) de Venta basada en los cálculos provisionados.
                  </p>
                  <button className="w-full bg-blue-600/10 border border-blue-500/30 text-blue-400 hover:bg-blue-600/20 p-4 rounded-lg text-sm transition-all flex flex-col items-center justify-center">
                     <FileText className="w-6 h-6 mb-2" />
                     Generar Factura Comercial
                  </button>
                </div>
             </div>

             <div className="bg-[#111114] border border-gray-800 rounded-xl overflow-hidden mb-6">
                <div className="p-4 border-b border-gray-800 bg-[#16161A] flex justify-between items-center">
                   <h3 className="text-sm font-medium text-white">Líneas de Costo</h3>
                   <button onClick={addFinanceLine} className="text-xs text-blue-500 hover:text-blue-400 font-medium flex items-center">
                     <Plus className="w-3 h-3 mr-1" /> Añadir Concepto
                   </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#0A0A0B] text-gray-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 font-medium">Concepto</th>
                        <th className="px-4 py-3 font-medium">Proveedor</th>
                        <th className="px-4 py-3 font-medium">Mercancía/Eq.</th>
                        <th className="px-4 py-3 font-medium text-right w-24">Moneda</th>
                        <th className="px-4 py-3 font-medium text-right w-32">Costo (Buy)</th>
                        <th className="px-4 py-3 font-medium text-right w-32">Venta (Sell)</th>
                        <th className="px-4 py-3 font-medium text-center w-16">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                       {financeLines.map((line) => (
                         <tr key={line.id} className="hover:bg-[#16161A]/50 transition-colors">
                           <td className="px-4 py-2">
                             <input 
                               type="text" 
                               value={line.description} 
                               onChange={e => updateFinanceLine(line.id, 'description', e.target.value)}
                               placeholder="Concepto..."
                               className="w-full bg-transparent border-0 focus:ring-0 text-white placeholder-gray-600 text-sm px-0"
                             />
                           </td>
                           <td className="px-4 py-2">
                             <input 
                               type="text" 
                               value={line.provider} 
                               onChange={e => updateFinanceLine(line.id, 'provider', e.target.value)}
                               placeholder="Proveedor..."
                               className="w-full bg-transparent border-0 focus:ring-0 text-gray-300 placeholder-gray-600 text-sm px-0"
                             />
                           </td>
                           <td className="px-4 py-2 text-gray-500 text-xs">Unidad</td>
                           <td className="px-4 py-2">
                             <select className="w-full bg-[#0A0A0B] border border-gray-800 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500">
                               <option>USD</option>
                               <option>EUR</option>
                               <option>MXN</option>
                             </select>
                           </td>
                           <td className="px-4 py-2">
                             <div className="flex items-center justify-end">
                               <span className="text-gray-500 mr-1">$</span>
                               <input 
                                 type="number" 
                                 value={line.cost} 
                                 onChange={e => updateFinanceLine(line.id, 'cost', parseFloat(e.target.value))}
                                 className="w-24 bg-[#0A0A0B] border border-gray-800 rounded px-2 py-1 focus:border-red-500 focus:outline-none text-white text-sm text-right"
                               />
                             </div>
                           </td>
                           <td className="px-4 py-2">
                             <div className="flex items-center justify-end">
                               <span className="text-gray-500 mr-1">$</span>
                               <input 
                                 type="number" 
                                 value={line.sell} 
                                 onChange={e => updateFinanceLine(line.id, 'sell', parseFloat(e.target.value))}
                                 className="w-24 bg-[#0A0A0B] border border-gray-800 rounded px-2 py-1 focus:border-green-500 focus:outline-none text-white text-sm text-right"
                               />
                             </div>
                           </td>
                           <td className="px-4 py-2 text-center">
                             <button onClick={() => removeFinanceLine(line.id)} className="p-1.5 text-gray-500 hover:text-red-400 rounded transition-colors">
                               <Trash2 className="w-4 h-4" />
                             </button>
                           </td>
                         </tr>
                       ))}
                       {financeLines.length === 0 && (
                         <tr>
                           <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">
                             No hay conceptos. Añade uno para comenzar a cotizar.
                           </td>
                         </tr>
                       )}
                    </tbody>
                  </table>
                </div>
             </div>

             {activationErrors.length > 0 && (
               <div className="bg-red-900/10 border border-red-800/40 p-4 rounded-lg mt-6">
                 <div className="flex items-start">
                   <AlertTriangle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                   <div>
                     <h4 className="text-red-400 font-medium mb-1">El expediente no puede ser activado debido a campos obligatorios incompletos:</h4>
                     <ul className="list-disc list-inside text-xs text-red-300/80 space-y-1">
                       {activationErrors.map((err, idx) => (
                         <li key={idx}>{err}</li>
                       ))}
                     </ul>
                   </div>
                 </div>
               </div>
             )}

             <div className="flex justify-between pt-4 border-t border-gray-800/50">
               <button onClick={() => handleTabChange('instructions')} className="border border-gray-800 hover:bg-gray-800 text-gray-400 px-5 py-2.5 rounded-lg text-sm font-medium transition">
                 Atrás
               </button>
               <button onClick={handleActivate} className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition flex items-center">
                 <CheckCircle2 className="w-4 h-4 mr-2" />
                 Finalizar y Activar Expediente
               </button>
             </div>
          </div>
        )}

      </div>
    </div>
    
    <CarrierComparisonModal 
      isOpen={showCarrierModal} 
      onClose={() => setShowCarrierModal(false)}
      pol={generalData.pol}
      pod={generalData.pod}
      onSelect={(carrier) => setSelectedCarrier(carrier)}
    />
    </>
  );
}
