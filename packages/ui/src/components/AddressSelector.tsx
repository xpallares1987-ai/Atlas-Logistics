import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Building2,
  Search,
  ChevronDown,
  Plus,
  X,
  User,
  Shield,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "./Button";
import { AddressModal } from "./AddressModal";

export interface AddressSelectorProps {
  id: string;
  name?: string;
  label: string;
  roleType?: string | string[]; // e.g. "CUSTOMER", "CARRIER_AGENT", or ["CUSTOMER", "CONSIGNEE_NOTIFY"]
  selectedAddressId?: string | null;
  selectedContactId?: string | null;
  onAddressSelect: (address: any | null, contact: any | null) => void;
  // Negotiable "To Order" support (for Consignee)
  enableToOrder?: boolean;
  isToOrder?: boolean;
  orderOf?: string;
  onToOrderChange?: (isToOrder: boolean, orderOf: string) => void;
  // Smart auto-suggestion for discharge agent
  suggestedUnLocode?: string;
  suggestedCarrier?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export const AddressSelector: React.FC<AddressSelectorProps> = ({
  id,
  name,
  label,
  roleType,
  selectedAddressId,
  selectedContactId,
  onAddressSelect,
  enableToOrder = false,
  isToOrder = false,
  orderOf = "THE SHIPPER",
  onToOrderChange,
  suggestedUnLocode,
  suggestedCarrier,
  required = false,
  disabled = false,
  className = "",
  placeholder = "Buscar razón social, CIF o UN/LOCODE...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [isNewAddressModalOpen, setIsNewAddressModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch addresses when dropdown opens or search changes
  useEffect(() => {
    if (!isOpen && !selectedAddressId) return;

    let isMounted = true;
    const fetchEntities = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.append("search", searchQuery.trim());
        if (roleType && typeof roleType === "string") {
          params.append("type", roleType);
        }

        const res = await fetch(`/api/addresses?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            // If roleType is array, filter client-side if needed
            let filtered = data;
            if (Array.isArray(roleType) && roleType.length > 0) {
              filtered = data.filter((item: any) =>
                roleType.includes(item.addressType),
              );
            }
            setAddresses(filtered);

            // Populate selectedEntity if selectedAddressId is set
            if (selectedAddressId) {
              const match = data.find((a: any) => a.id === selectedAddressId);
              if (match) setSelectedEntity(match);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching addresses in selector:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchEntities();
    return () => {
      isMounted = false;
    };
  }, [isOpen, searchQuery, roleType, selectedAddressId]);

  // Select an address
  const handleSelect = (addr: any) => {
    setSelectedEntity(addr);
    setIsOpen(false);
    setSearchQuery("");
    const primary =
      addr.contacts?.find((c: any) => c.isPrimary) ||
      addr.contacts?.[0] ||
      null;
    onAddressSelect(addr, primary);
  };

  // Clear selected address
  const handleClear = () => {
    setSelectedEntity(null);
    onAddressSelect(null, null);
  };

  // Switch selected contact
  const handleContactChange = (contactId: string) => {
    if (!selectedEntity) return;
    if (contactId === "NONE") {
      onAddressSelect(selectedEntity, null);
      return;
    }
    const contact =
      selectedEntity.contacts?.find((c: any) => c.id === contactId) || null;
    onAddressSelect(selectedEntity, contact);
  };

  // Intelligent Suggestion
  const matchingSuggestion = useMemo(() => {
    if (!suggestedUnLocode || !addresses.length) return null;
    const normLocode = suggestedUnLocode.toUpperCase();
    return addresses.find((a) => {
      const matchLocode = a.unLocode?.toUpperCase() === normLocode;
      if (suggestedCarrier) {
        const normCarr = suggestedCarrier.toLowerCase();
        const matchName =
          a.companyName?.toLowerCase().includes(normCarr) ||
          a.tradeName?.toLowerCase().includes(normCarr);
        return matchLocode && matchName;
      }
      return matchLocode;
    });
  }, [addresses, suggestedUnLocode, suggestedCarrier]);

  return (
    <div className={`space-y-1.5 ${className}`} ref={dropdownRef}>
      {/* Label and Mode Switcher */}
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>

        {enableToOrder && onToOrderChange && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md text-[11px]">
            <button
              type="button"
              onClick={() => onToOrderChange(false, orderOf)}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                !isToOrder
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Nominativo
            </button>
            <button
              type="button"
              onClick={() => onToOrderChange(true, orderOf || "THE SHIPPER")}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                isToOrder
                  ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              A la Orden (To Order)
            </button>
          </div>
        )}
      </div>

      {/* If "TO ORDER" mode is active */}
      {isToOrder ? (
        <div className="space-y-2 p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl">
          <div className="text-xs text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span>B/L Negociable UCP 600 (A la orden de):</span>
          </div>
          <input
            id={`${id}-order-of`}
            name={`${name || id}_orderOf`}
            aria-label="Orden del B/L negociable"
            type="text"
            value={orderOf}
            onChange={(e) =>
              onToOrderChange &&
              onToOrderChange(true, e.target.value.toUpperCase())
            }
            placeholder="Ej: THE SHIPPER o BANCO SANTANDER S.A."
            className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none uppercase text-amber-900 dark:text-amber-100"
          />
          <div className="text-[10px] text-amber-700 dark:text-amber-400">
            ⚠️ Recuerde que para conocimientos de embarque <em>To Order</em>, es{" "}
            <strong>obligatorio</strong> especificar un Notify Party en el
            directorio.
          </div>
        </div>
      ) : (
        /* Regular Hub Selector Mode */
        <div className="relative">
          {selectedEntity ? (
            /* Selected State Card */
            <div className="p-3 bg-indigo-50/40 dark:bg-slate-800/60 border border-indigo-200 dark:border-slate-700 rounded-xl space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>{selectedEntity.companyName}</span>
                      {selectedEntity.unLocode && (
                        <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 rounded font-normal">
                          {selectedEntity.unLocode}
                        </span>
                      )}
                    </div>
                    {selectedEntity.tradeName && (
                      <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                        {selectedEntity.tradeName}
                      </div>
                    )}
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {selectedEntity.street1}, {selectedEntity.zipCode}{" "}
                      {selectedEntity.city}, {selectedEntity.country}
                      {selectedEntity.taxId &&
                        ` — CIF: ${selectedEntity.taxId}`}
                    </div>
                  </div>
                </div>

                {!disabled && (
                  <button
                    type="button"
                    onClick={handleClear}
                    aria-label={`Quitar dirección ${selectedEntity.companyName}`}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-200/50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Contact Picker (ATTN line) */}
              {selectedEntity.contacts &&
                selectedEntity.contacts.length > 0 && (
                  <div className="pt-2 border-t border-indigo-100 dark:border-slate-700 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Atención a (ATTN):</span>
                    </div>

                    <select
                      id={`${id}-contact-select`}
                      name={`${name || id}_contactId`}
                      aria-label="Contacto de atención para B/L"
                      value={
                        selectedContactId ||
                        selectedEntity.contacts.find((c: any) => c.isPrimary)
                          ?.id ||
                        "NONE"
                      }
                      onChange={(e) => handleContactChange(e.target.value)}
                      disabled={disabled}
                      className="text-[11px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2 py-0.5 outline-none font-medium text-slate-800 dark:text-slate-200"
                    >
                      {selectedEntity.contacts.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName} ({c.jobTitle || c.roleCategory})
                        </option>
                      ))}
                      <option value="NONE">
                        -- Solo Razón Social (Sin ATTN) --
                      </option>
                    </select>
                  </div>
                )}
            </div>
          ) : (
            /* Input Search Trigger */
            <div>
              <div
                onClick={() => !disabled && setIsOpen(true)}
                className={`flex items-center justify-between px-3 py-2 text-xs bg-white dark:bg-slate-900 border ${
                  isOpen
                    ? "border-indigo-500 ring-2 ring-indigo-500/20"
                    : "border-slate-300 dark:border-slate-700"
                } rounded-xl cursor-pointer hover:border-slate-400 transition-colors shadow-2xs`}
              >
                <div className="flex items-center gap-2 text-slate-400 truncate">
                  <Search className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{placeholder}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </div>

              {/* Smart Suggestion Pill */}
              {matchingSuggestion && !selectedEntity && (
                <div className="mt-1 flex items-center justify-between p-2 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[11px]">
                  <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                    <span>
                      Sugerido para <strong>{suggestedUnLocode}</strong>:{" "}
                      {matchingSuggestion.companyName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelect(matchingSuggestion)}
                    className="px-2 py-0.5 rounded bg-indigo-600 text-white font-medium hover:bg-indigo-700 shrink-0"
                  >
                    Asignar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 max-h-64 overflow-y-auto space-y-1 p-1">
              {/* Internal Search Bar */}
              <div className="p-1 sticky top-0 bg-white dark:bg-slate-900 z-10 border-b border-slate-100 dark:border-slate-800">
                <input
                  id={`${id}-dropdown-search`}
                  name={`${name || id}_search`}
                  aria-label="Buscar dirección en directorio"
                  type="text"
                  autoFocus
                  placeholder="Escriba para filtrar por nombre o CIF..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Items List */}
              {isLoading ? (
                <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                  <span>Cargando directorio...</span>
                </div>
              ) : addresses.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No se encontraron entidades coincidentes.
                </div>
              ) : (
                addresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => handleSelect(addr)}
                    className="w-full text-left p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-start justify-between gap-2 border-b border-slate-50 dark:border-slate-800/40 last:border-b-0 transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {addr.companyName}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {addr.street1}, {addr.zipCode} {addr.city} (
                        {addr.country})
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-slate-600 dark:text-slate-400">
                        {addr.addressType}
                      </span>
                      {addr.unLocode && (
                        <span className="text-[9px] font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                          {addr.unLocode}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}

              {/* In-Place Quick Create Trigger */}
              <div className="pt-1 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900 p-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                    setIsNewAddressModalOpen(true);
                  }}
                  className="w-full text-xs flex items-center justify-center gap-1.5 text-indigo-600 dark:text-indigo-400 h-8"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Registrar Nueva Dirección en Hub</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* In-Place Address Modal */}
      <AddressModal
        isOpen={isNewAddressModalOpen}
        onClose={() => setIsNewAddressModalOpen(false)}
        onSuccess={(savedAddress) => {
          setIsNewAddressModalOpen(false);
          if (savedAddress) {
            handleSelect(savedAddress);
          }
        }}
      />
    </div>
  );
};
