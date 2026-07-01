'use client';

import React, { useState, useEffect } from 'react';
import { CompanyAddress, AddressType } from '@/lib/addressStore';
import { getContacts, addContact, updateContact, deleteContact } from '@/lib/services/crmService';
import { useFirebase } from '@xpallares1987-ai/control-tower-ui';
import { 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  Building2, 
  Plus, 
  FileText, 
  UserCircle, 
  Pencil, 
  Trash2, 
  Tag, 
  Globe, 
  X, 
  FileDigit,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export default function ContactsPage() {
  const { db } = useFirebase();
  const [addresses, setAddresses] = useState<CompanyAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CompanyAddress | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [taxIdError, setTaxIdError] = useState('');
  const [type, setType] = useState<AddressType>('Cliente');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateProv, setStateProv] = useState('');
  const [country, setCountry] = useState('España');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [notes, setNotes] = useState('');

  // Validate TaxID in real time
  useEffect(() => {
    if (!taxId.trim()) {
      setTaxIdError('');
      return;
    }
    
    let error = '';
    if (country.toLowerCase() === 'españa' || country.toLowerCase() === 'spain') {
      const regex = /^[ABCDEFGHJKLMNPQRSUVW][0-9]{7}[0-9A-Z]$/;
      if (!regex.test(taxId.toUpperCase())) {
        error = 'Formato de C.I.F. inválido para España (Ej: B12345678)';
      }
    }
    setTaxIdError(error);
  }, [taxId, country]);

  // Load addresses on mount
  useEffect(() => {
    if (!db) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getContacts(db);
        setAddresses(data);
      } catch (err) {
        console.error("Failed to load contacts", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [db]);

  const handleOpenNewModal = () => {
    setEditingAddress(null);
    setName('');
    setTaxId('');
    setTaxIdError('');
    setType('Cliente');
    setStreet('');
    setCity('');
    setStateProv('');
    setCountry('España');
    setPostalCode('');
    setPhone('');
    setEmail('');
    setContactPerson('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (addr: CompanyAddress) => {
    setEditingAddress(addr);
    setName(addr.name);
    setTaxId(addr.taxId || '');
    setType(addr.type);
    setStreet(addr.street);
    setCity(addr.city);
    setStateProv(addr.stateProv || '');
    setCountry(addr.country);
    setPostalCode(addr.postalCode || '');
    setPhone(addr.phone);
    setEmail(addr.email);
    setContactPerson(addr.contactPerson || '');
    setNotes(addr.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (taxIdError) return;
    if (!db) return;

    const contactData = {
      name: name.trim(),
      taxId: taxId.trim() || 'N/A',
      type,
      street: street.trim(),
      city: city.trim(),
      stateProv: stateProv.trim(),
      country: country.trim() || 'España',
      postalCode: postalCode.trim(),
      phone: phone.trim(),
      email: email.trim(),
      contactPerson: contactPerson.trim(),
      notes: notes.trim()
    };

    try {
      if (editingAddress) {
        await updateContact(db, editingAddress.id, contactData);
        setAddresses(addresses.map(a => a.id === editingAddress.id ? { ...contactData, id: editingAddress.id } as CompanyAddress : a));
      } else {
        const newContact = await addContact(db, contactData);
        setAddresses([...addresses, newContact]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to save contact", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    if (confirm('¿Está seguro de que desea eliminar esta dirección comercial?')) {
      try {
        await deleteContact(db, id);
        setAddresses(addresses.filter(a => a.id !== id));
      } catch (err) {
        console.error("Failed to delete contact", err);
      }
    }
  };

  const filteredAddresses = addresses.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.city.toLowerCase().includes(search.toLowerCase()) ||
      c.country.toLowerCase().includes(search.toLowerCase()) ||
      c.taxId.toLowerCase().includes(search.toLowerCase()) ||
      c.contactPerson?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'ALL' || c.type === filterType;
    return matchesSearch && matchesType;
  });

  const getTypeColor = (type: AddressType) => {
    switch (type) {
      case 'Cliente': return 'text-sky-450 bg-sky-500/10 border-sky-500/20';
      case 'Aduanas': return 'text-purple-450 bg-purple-500/10 border-purple-500/20';
      case 'Transportista': return 'text-amber-450 bg-amber-500/10 border-amber-500/20';
      case 'Naviera': return 'text-rose-450 bg-rose-500/10 border-rose-500/20';
      case 'Agente': return 'text-emerald-450 bg-emerald-500/10 border-emerald-500/20';
      case 'Almacén': return 'text-indigo-405 bg-indigo-500/10 border-indigo-500/20';
      case 'Aérea': return 'text-fuchsia-450 bg-fuchsia-500/10 border-fuchsia-500/20';
      case 'Terminal': return 'text-cyan-450 bg-cyan-500/10 border-cyan-500/20';
      case 'Seguros': return 'text-teal-450 bg-teal-500/10 border-teal-500/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-450/20';
    }
  };

  const totalCount = addresses.length;
  const clientsCount = addresses.filter(a => a.type === 'Cliente').length;
  const navierasCount = addresses.filter(a => a.type === 'Naviera').length;
  const agentesCount = addresses.filter(a => a.type === 'Agente').length;
  const othersCount = totalCount - clientsCount - navierasCount - agentesCount;

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      
      {/* Upper header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-500/10 text-blue-400 text-[10px] uppercase tracking-widest font-black font-mono border border-blue-500/20 px-2 py-0.5 rounded">
              Directorio de Direcciones
            </span>
            <span className="text-[10px] text-gray-500">•</span>
            <span className="text-[10px] text-gray-500 font-mono">CLIENTES & SERVICE PROVIDERS</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-1.5 font-sans">
            <Building2 className="w-6 h-6 text-blue-500" />
            Directorio Sys Modeler
          </h1>
          <p className="text-xs text-gray-400 max-w-2xl">
            Gestione las direcciones de facturación, entrega, aduanas, armadores navieros y sus agentes locales en origen/destino. Estas empresas poblarán de forma lógica los desplegables del sistema.
          </p>
        </div>
        <button 
          onClick={handleOpenNewModal}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center cursor-pointer shadow-lg shadow-blue-900/10"
        >
          <Plus className="w-4 h-4 mr-2" /> Nuevo Registro Comercial
        </button>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111114] border border-gray-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Registros Totales</span>
          <span className="text-2xl font-mono font-black text-white mt-1">{totalCount} <span className="text-xs text-gray-500 font-sans font-medium">Compañías</span></span>
        </div>
        <div className="bg-[#111114] border border-gray-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">Clientes (Cuenta)</span>
          <span className="text-2xl font-mono font-black text-blue-400 mt-1">{clientsCount} <span className="text-xs text-gray-500 font-sans font-medium">Cuentas</span></span>
        </div>
        <div className="bg-[#111114] border border-gray-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">Navieras (Líneas)</span>
          <span className="text-2xl font-mono font-black text-rose-400 mt-1">{navierasCount} <span className="text-xs text-gray-500 font-sans font-medium">Líneas</span></span>
        </div>
        <div className="bg-[#111114] border border-gray-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Agentes y Filiales</span>
          <span className="text-2xl font-mono font-black text-emerald-400 mt-1">{agentesCount} <span className="text-xs text-gray-500 font-sans font-medium">Agentes</span></span>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      )}

      {!loading && (
        <>
          {/* Filter and search controls */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-[#111114] p-4 rounded-xl border border-gray-800">
         <div className="relative w-full lg:max-w-md shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por empresa, CIF, ciudad, país o contacto..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0A0A0B] border border-gray-850 rounded-lg text-xs text-gray-200 focus:outline-none focus:border-blue-500"
            />
         </div>
         <div className="flex gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 scrollbar-none select-none">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'Cliente', label: 'Clientes' },
              { id: 'Naviera', label: 'Navieras' },
              { id: 'Agente', label: 'Agentes' },
              { id: 'Aduanas', label: 'Aduanas' },
              { id: 'Transportista', label: 'Terrestre' },
              { id: 'Almacén', label: 'Almacenes' },
              { id: 'Aérea', label: 'Aéreo' },
              { id: 'Terminal', label: 'Portuarias' },
              { id: 'Seguros', label: 'Seguros' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition border cursor-pointer ${
                  filterType === tab.id 
                    ? 'bg-blue-600/10 border-blue-500/25 text-blue-400' 
                    : 'bg-transparent border-transparent text-gray-400 hover:text-gray-250 hover:bg-gray-850'
                }`}
              >
                {tab.label}
              </button>
            ))}
         </div>
      </div>

      {/* Address Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
         {filteredAddresses.map(contact => (
           <div 
             key={contact.id} 
             className="bg-[#111114] border border-gray-800 rounded-xl p-5 hover:border-gray-700/80 transition-all flex flex-col justify-between relative group shadow-sm hover:shadow-lg"
           >
              {/* Card Action Buttons */}
              <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button 
                  onClick={() => handleOpenEditModal(contact)}
                  title="Editar registro"
                  className="p-1.5 text-gray-500 hover:text-blue-400 rounded bg-[#16161A] border border-gray-800 hover:border-blue-500/30 cursor-pointer active:scale-95 transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => handleDelete(contact.id)}
                  title="Eliminar registro"
                  className="p-1.5 text-gray-500 hover:text-rose-400 rounded bg-[#16161A] border border-gray-800 hover:border-rose-500/30 cursor-pointer active:scale-95 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <div>
                {/* Header Block of Card */}
                <div className="flex items-start gap-3 mb-4">
                   <div className="w-10 h-10 rounded-lg bg-gray-950/40 border border-gray-850 flex items-center justify-center text-gray-400 shrink-0">
                      <Building2 className="w-5 h-5 text-gray-400" />
                   </div>
                   <div className="min-w-0 pr-12">
                     <h3 className="text-white font-bold text-sm tracking-tight truncate leading-snug" title={contact.name}>
                       {contact.name}
                     </h3>
                     <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded border mt-1.5 inline-block ${getTypeColor(contact.type)}`}>
                        {contact.type}
                     </span>
                   </div>
                </div>

                {/* Body Content Block */}
                <div className="space-y-2 mt-4 pt-4 border-t border-gray-850">
                  {contact.taxId && (
                    <div className="flex items-center text-xs">
                      <FileDigit className="w-3.5 h-3.5 mr-2 text-gray-500 shrink-0" />
                      <span className="text-gray-550 mr-1.5 uppercase font-mono text-[10px]">CIF/NIF:</span>
                      <span className="text-gray-300 font-mono font-bold text-[11px] bg-gray-950/40 px-1.5 py-0.2 rounded border border-gray-850">{contact.taxId}</span>
                    </div>
                  )}

                  {contact.contactPerson && (
                    <div className="flex items-center text-xs">
                      <UserCircle className="w-3.5 h-3.5 mr-2 text-gray-400 shrink-0" />
                      <span className="text-gray-300 truncate font-semibold">{contact.contactPerson}</span>
                    </div>
                  )}
                  
                  {contact.email && (
                    <div className="flex items-center text-xs">
                      <Mail className="w-3.5 h-3.5 mr-2 text-blue-500/80 shrink-0" />
                      <a href={`mailto:${contact.email}`} className="text-gray-400 truncate hover:text-blue-400 active:scale-95 text-xs transition-colors">
                        {contact.email}
                      </a>
                    </div>
                  )}

                  {contact.phone && (
                    <div className="flex items-center text-xs">
                      <Phone className="w-3.5 h-3.5 mr-2 text-gray-500 shrink-0" />
                      <span className="text-gray-400 font-mono">{contact.phone}</span>
                    </div>
                  )}

                  <div className="flex items-start text-xs pt-0.5">
                    <MapPin className="w-3.5 h-3.5 mr-2 text-rose-500/70 shrink-0 mt-0.5" />
                    <div className="text-gray-400 text-xs leading-relaxed">
                      <p className="truncate text-gray-300" title={contact.street}>{contact.street}</p>
                      <p className="text-[11px] text-gray-500">{contact.postalCode} - {contact.city} ({contact.stateProv}), {contact.country}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes or Footer */}
              {contact.notes && (
                <div className="mt-4 pt-3 border-t border-gray-850/60 text-[10px] text-gray-400 bg-gray-950/20 p-2 rounded italic font-sans truncate leading-relaxed text-slate-400">
                  &ldquo;{contact.notes}&rdquo;
                </div>
              )}
           </div>
         ))}
      </div>
      
      {/* Empty States */}
      {filteredAddresses.length === 0 && (
        <div className="text-center py-16 px-4 bg-[#111114] border border-gray-800 border-dashed rounded-xl">
           <Building2 className="w-12 h-12 mx-auto text-gray-500 mb-3" />
           <p className="text-gray-300 font-bold">No se encontraron registros comerciales</p>
           <p className="text-gray-500 text-xs mt-1">Intente ajustar los términos o cree un nuevo registro de contacto para comenzar.</p>
           <button 
             onClick={handleOpenNewModal} 
             className="mt-4 inline-flex items-center text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded transition cursor-pointer"
           >
             <Plus className="w-3.5 h-3.5 mr-1.5" /> Registrar nueva dirección
           </button>
        </div>
      )}
        </>
      )}

      {/* Creation/Edit Dedicated Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#111114] border border-gray-800 rounded-xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            
            {/* Modal Title Header */}
            <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-[#0D0D10]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-600/10 rounded-lg border border-blue-500/20">
                  <Building2 className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    {editingAddress ? 'Editar Registro' : 'Registrar Dirección'}
                  </h3>
                  <p className="text-[10px] text-gray-400">Sys Modeler Directory Services</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-850 cursor-pointer active:scale-90 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Fields container scroll */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {/* Category / Type Selector (Critical rule filter match) */}
              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  Categoría de Dirección / Operador <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Cliente', label: 'Cliente' },
                    { id: 'Naviera', label: 'Naviera' },
                    { id: 'Agente', label: 'Agente' },
                    { id: 'Aduanas', label: 'Aduanas' },
                    { id: 'Transportista', label: 'Terrestre' },
                    { id: 'Almacén', label: 'Almacén' },
                    { id: 'Aérea', label: 'Aérea' },
                    { id: 'Terminal', label: 'Terminal' },
                    { id: 'Seguros', label: 'Seguros' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setType(item.id as AddressType)}
                      className={`px-2.5 py-2.5 border text-[11px] font-bold rounded-lg transition-all text-center flex flex-col justify-center items-center gap-1 cursor-pointer select-none ${
                        type === item.id 
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                          : 'border-gray-800 bg-[#0A0A0B]/60 text-gray-400 hover:text-white hover:bg-gray-850'
                      }`}
                    >
                      <Tag className="w-3 h-3 shrink-0 opacity-70" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Company Identity Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Nombre Comercial de Empresa *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ej. Mediterranean Logistics Spain..."
                    className="w-full bg-[#0A0A0B] border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">C.I.F. / N.I.F. (Tax Identifier)</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={e => setTaxId(e.target.value)}
                    placeholder="Ej. B65432109..."
                    className={`w-full bg-[#0A0A0B] border rounded-lg p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none placeholder-gray-500 font-mono ${taxIdError ? 'border-red-500' : 'border-gray-800'}`}
                  />
                  {taxIdError && <p className="text-red-500 text-[10px] mt-1">{taxIdError}</p>}
                </div>
              </div>

              {/* Physical Street Location */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Calle y Número (Dirección Física)</label>
                <input
                  type="text"
                  required
                  value={street}
                  onChange={e => setStreet(e.target.value)}
                  placeholder="Ej. Gran Vía de las Cortes Catalanas 450..."
                  className="w-full bg-[#0A0A0B] border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none placeholder-gray-500"
                />
              </div>

              {/* City Location Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Ciudad</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Ej. Barcelona..."
                    className="w-full bg-[#0A0A0B] border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Provincia</label>
                  <input
                    type="text"
                    value={stateProv}
                    onChange={e => setStateProv(e.target.value)}
                    placeholder="Ej. Barcelona..."
                    className="w-full bg-[#0A0A0B] border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Código Postal</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={e => setPostalCode(e.target.value)}
                    placeholder="Ej. 08013..."
                    className="w-full bg-[#0A0A0B] border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none placeholder-gray-500 font-mono"
                  />
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">País</label>
                <div className="relative">
                  <Globe className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    placeholder="Ej. España..."
                    className="w-full pl-9 bg-[#0A0A0B] border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none placeholder-gray-500"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-850">
                <div className="sm:col-span-1">
                  <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Contacto Persona</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    placeholder="Nombre Completo..."
                    className="w-full bg-[#0A0A0B] border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none placeholder-gray-500"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+34 934 000..."
                    className="w-full bg-[#0A0A0B] border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none placeholder-gray-500 font-mono"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="correo@empresa.com..."
                    className="w-full bg-[#0A0A0B] border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none placeholder-gray-500 font-mono"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Notas / Observaciones Operativas</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Detalles sobre recargos, acuerdos, condiciones de despacho u horarios..."
                  className="w-full bg-[#0A0A0B] border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none placeholder-gray-500 h-20 resize-none"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-4 border-t border-gray-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-[#1C1C22] hover:bg-gray-800 text-gray-400 hover:text-white px-4 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition flex items-center cursor-pointer"
                >
                  {editingAddress ? 'Guardar Cambios' : 'Registrar Compañía'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
