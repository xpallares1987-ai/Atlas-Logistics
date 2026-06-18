'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getAddresses, CompanyAddress, AddressType } from '@/lib/addressStore';
import { Search, ChevronDown, Plus, Check, MapPin, Tag } from 'lucide-react';

interface AddressSelectorProps {
  value: string;
  onChange: (value: string) => void;
  allowedTypes?: AddressType[];
  placeholder?: string;
  className?: string;
  error?: boolean;
}

export default function AddressSelector({
  value,
  onChange,
  allowedTypes,
  placeholder = 'Seleccionar empresa...',
  className = '',
  error = false
}: AddressSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [addresses, setAddresses] = useState<CompanyAddress[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Read the list of addresses
    setAddresses(getAddresses());
  }, [value, isOpen]);

  // Handle closing when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter addresses based on type and input search
  const filteredAddresses = addresses.filter(addr => {
    const matchesType = !allowedTypes || allowedTypes.includes(addr.type);
    const matchesSearch = 
      addr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      addr.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      addr.taxId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      addr.city.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Find currently selected item based on company name or ID
  const selectedAddress = addresses.find(
    addr => addr.name.toLowerCase() === value.toLowerCase() || addr.id === value
  );

  const displayLabel = selectedAddress ? selectedAddress.name : value || placeholder;

  const handleSelect = (addr: CompanyAddress) => {
    onChange(addr.name);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleCreateOnTheFly = () => {
    if (!searchTerm.trim()) return;
    
    // Create new address of the first allowed type (or 'Cliente' as fallback)
    const newType = (allowedTypes && allowedTypes.length > 0) ? allowedTypes[0] : 'Cliente';
    const newAddress: CompanyAddress = {
      id: `addr-custom-${Date.now()}`,
      name: searchTerm.trim(),
      taxId: 'N/A',
      type: newType,
      street: 'Dirección Registrada Rápida',
      city: 'N/A',
      stateProv: '',
      country: 'N/A',
      postalCode: '',
      phone: 'N/A',
      email: 'contacto@' + searchTerm.toLowerCase().replace(/\s+/g, '') + '.com',
      contactPerson: 'Contacto Comercial',
      notes: 'Registrado sobre la marcha desde el formulario.'
    };

    const currentList = getAddresses();
    const updatedList = [...currentList, newAddress];
    localStorage.setItem('sys_modeler_addresses', JSON.stringify(updatedList));
    setAddresses(updatedList);
    onChange(newAddress.name);
    setSearchTerm('');
    setIsOpen(false);
  };

  const getTypeStyle = (type: AddressType) => {
    switch (type) {
      case 'Cliente': return 'text-sky-400 bg-sky-400/10 border-sky-400/20';
      case 'Aduanas': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      case 'Transportista': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'Naviera': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
      case 'Agente': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'Almacén': return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20';
      case 'Aérea': return 'text-fuchsia-400 bg-fuchsia-400/10 border-fuchsia-400/20';
      case 'Terminal': return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20';
      case 'Seguros': return 'text-teal-400 bg-teal-400/10 border-teal-400/20';
    }
  };

  return (
    <div ref={dropdownRef} className={`relative w-full ${className}`}>
      {/* Target Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-[#0A0A0B] border text-left p-3 text-sm rounded-lg flex justify-between items-center transition focus:outline-none focus:border-blue-500 text-gray-200 select-none ${
          error ? 'border-red-500' : 'border-gray-800'
        }`}
      >
        <span className={`truncate ${!selectedAddress && !value ? 'text-gray-500' : 'text-white font-medium'}`}>
          {displayLabel}
        </span>
        <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 text-gray-500 shrink-0 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
      </button>

      {/* Dropdown Menu Container */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-[#111114] border border-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search Box */}
          <div className="relative border-b border-gray-800 p-2 bg-[#0E0E11]">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar en libreta de direcciones..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#070709] border border-gray-850 rounded-lg text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* List content */}
          <div className="max-h-60 overflow-y-auto divide-y divide-gray-850">
            {filteredAddresses.map(addr => {
              const isEachSelected = selectedAddress?.id === addr.id;
              return (
                <div
                  key={addr.id}
                  onClick={() => handleSelect(addr)}
                  className="p-2.5 hover:bg-[#16161C] transition cursor-pointer flex items-start gap-2 text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-bold text-gray-200 group-hover:text-white truncate">
                        {addr.name}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase shrink-0 ${getTypeStyle(addr.type)}`}>
                        {addr.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                      <MapPin className="w-3 h-3 text-gray-650 shrink-0" />
                      <span className="truncate">{addr.city}, {addr.country}</span>
                      {addr.taxId && addr.taxId !== 'N/A' && (
                        <span className="text-[9px] bg-gray-950/40 text-gray-500 px-1 rounded ml-auto font-mono">
                          {addr.taxId}
                        </span>
                      )}
                    </div>
                  </div>

                  {isEachSelected && (
                    <Check className="w-3.5 h-3.5 text-blue-500 self-center" />
                  )}
                </div>
              );
            })}

            {filteredAddresses.length === 0 && (
              <div className="p-4 text-center">
                <p className="text-xs text-gray-500">No se encontraron coincidencias.</p>
                {searchTerm.trim().length > 1 && (
                  <button
                    type="button"
                    onClick={handleCreateOnTheFly}
                    className="mt-3 inline-flex items-center text-[11px] bg-blue-600 hover:bg-blue-500 text-white font-medium px-2.5 py-1 rounded transition whitespace-nowrap cursor-pointer"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Registrar &ldquo;{searchTerm}&rdquo; como {allowedTypes && allowedTypes.length > 0 ? allowedTypes[0] : 'Cliente'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Subtitle list info */}
          {allowedTypes && allowedTypes.length > 0 && (
            <div className="bg-[#0E0E11]/85 p-2 border-t border-gray-800 text-[9px] text-gray-500 font-mono flex items-center gap-1">
              <Tag className="w-2.5 h-2.5" />
              <span>Categorías recomendadas: {allowedTypes.join(', ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
