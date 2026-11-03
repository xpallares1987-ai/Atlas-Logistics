import React, { useState, useEffect, useRef } from "react";
import {
  Building2,
  MapPin,
  User,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Search,
  Loader2,
  FileText,
  Shield,
  ExternalLink,
  Globe,
  Sparkles,
} from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { DuplicateWarningModal } from "./DuplicateWarningModal";
import { BlCardPreview } from "./BlCardPreview";

export const ADDRESS_TYPES = [
  { value: "CUSTOMER", label: "Customer / Cliente Directo" },
  { value: "CARRIER", label: "Carrier / Naviera o Aerolínea" },
  { value: "CARRIER_AGENT", label: "Carrier Agent / Agente Naviero" },
  { value: "CUSTOMS_BROKER", label: "Customs Broker / Agente de Aduanas" },
  { value: "PORT_AUTHORITY", label: "Port Authority / Autoridad Portuaria" },
  { value: "WAREHOUSE", label: "Warehouse / Almacén o Depósito" },
  { value: "TERMINAL", label: "Terminal / Terminal Portuaria" },
  {
    value: "INLAND_CONTAINER_DEPOT",
    label: "Inland Container Depot (ICD) / Depósito Interior",
  },
  { value: "HAULIER", label: "Haulier / Empresa de Transporte Terrestre" },
  { value: "CONSIGNEE_NOTIFY", label: "Consignee / Notify / Destinatario" },
] as const;

export const CONTACT_ROLES = [
  { value: "OPERATIONS", label: "Operaciones Marítimas / Terrestres" },
  { value: "SALES", label: "Comercial / Ventas" },
  { value: "FINANCE_BILLING", label: "Facturación y Cobranzas" },
  { value: "CUSTOMS", label: "Aduanas y Despacho" },
  { value: "PORT_OPERATIONS", label: "Operaciones Portuarias / Muelle" },
  { value: "DISPATCH_TRACKING", label: "Tráfico y Seguimiento" },
  { value: "LEGAL_CLAIMS", label: "Legal y Siniestros (Claims)" },
  { value: "MANAGEMENT", label: "Dirección y Gerencia" },
] as const;

export interface ContactFormItem {
  id?: string;
  fullName: string;
  email: string;
  phone?: string;
  mobile?: string;
  roleCategory: string;
  jobTitle?: string;
  isPrimary: boolean;
}

export interface AddressFormData {
  id?: string;
  companyId?: string;
  addressType: string;
  companyName: string;
  tradeName?: string;
  taxId?: string;
  street1: string;
  street2?: string;
  zipCode: string;
  city: string;
  federalState?: string;
  country: string;
  unLocode?: string;
  isDefaultShipper?: boolean;
  isDefaultConsignee?: boolean;
  isDefaultNotify?: boolean;
  notes?: string;
  lat?: number | null;
  lon?: number | null;
  formattedAddress?: string | null;
  verificationStatus?: string | null;
  verificationProvider?: string | null;
  contacts?: ContactFormItem[];
}

export interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  addressToEdit?: AddressFormData | null;
  onSuccess?: (savedAddress: any) => void;
  companyId?: string;
}

export const AddressModal: React.FC<AddressModalProps> = ({
  isOpen,
  onClose,
  addressToEdit,
  onSuccess,
  companyId,
}) => {
  // Main form state
  const [addressType, setAddressType] = useState<string>("CUSTOMER");
  const [companyName, setCompanyName] = useState<string>("");
  const [tradeName, setTradeName] = useState<string>("");
  const [taxId, setTaxId] = useState<string>("");
  const [street1, setStreet1] = useState<string>("");
  const [street2, setStreet2] = useState<string>("");
  const [zipCode, setZipCode] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [federalState, setFederalState] = useState<string>("");
  const [country, setCountry] = useState<string>("ES");
  const [unLocode, setUnLocode] = useState<string>("");
  const [isDefaultShipper, setIsDefaultShipper] = useState<boolean>(false);
  const [isDefaultConsignee, setIsDefaultConsignee] = useState<boolean>(false);
  const [isDefaultNotify, setIsDefaultNotify] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");

  // Geolocation & Verification State
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [formattedAddress, setFormattedAddress] = useState<string>("");
  const [verificationStatus, setVerificationStatus] = useState<
    "VERIFIED" | "MANUAL_UNVERIFIED" | "NOT_CHECKED"
  >("NOT_CHECKED");
  const [verificationProvider, setVerificationProvider] = useState<
    string | null
  >(null);

  // Smart Search Autocomplete State
  const [smartSearchQuery, setSmartSearchQuery] = useState("");
  const [smartSuggestions, setSmartSuggestions] = useState<any[]>([]);
  const [isSearchingSmart, setIsSearchingSmart] = useState(false);
  const [showSmartDropdown, setShowSmartDropdown] = useState(false);
  const [isValidatingManual, setIsValidatingManual] = useState(false);
  const smartSearchRef = useRef<HTMLDivElement>(null);
  const smartSearchTimerRef = useRef<any>(null);

  // Contacts (1:N)
  const [contacts, setContacts] = useState<ContactFormItem[]>([
    {
      fullName: "",
      email: "",
      phone: "",
      roleCategory: "OPERATIONS",
      jobTitle: "",
      isPrimary: true,
    },
  ]);

  // UN/LOCODE search autocomplete
  const [unlocodeResults, setUnlocodeResults] = useState<any[]>([]);
  const [isSearchingUnlocode, setIsSearchingUnlocode] = useState(false);
  const [showUnlocodeDropdown, setShowUnlocodeDropdown] = useState(false);
  const unlocodeRef = useRef<HTMLDivElement>(null);

  // Duplicate Warning Modal state
  const [duplicateWarning, setDuplicateWarning] = useState<any | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  // Active view tab in modal (Form vs B/L Preview)
  const [activeTab, setActiveTab] = useState<"FORM" | "BL_PREVIEW">("FORM");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Populate state when editing
  useEffect(() => {
    if (addressToEdit) {
      setAddressType(addressToEdit.addressType || "CUSTOMER");
      setCompanyName(addressToEdit.companyName || "");
      setTradeName(addressToEdit.tradeName || "");
      setTaxId(addressToEdit.taxId || "");
      setStreet1(addressToEdit.street1 || "");
      setStreet2(addressToEdit.street2 || "");
      setZipCode(addressToEdit.zipCode || "");
      setCity(addressToEdit.city || "");
      setFederalState(addressToEdit.federalState || "");
      setCountry(addressToEdit.country || "ES");
      setUnLocode(addressToEdit.unLocode || "");
      setIsDefaultShipper(!!addressToEdit.isDefaultShipper);
      setIsDefaultConsignee(!!addressToEdit.isDefaultConsignee);
      setIsDefaultNotify(!!addressToEdit.isDefaultNotify);
      setNotes(addressToEdit.notes || "");
      setLat(addressToEdit.lat ?? null);
      setLon(addressToEdit.lon ?? null);
      setFormattedAddress(addressToEdit.formattedAddress || "");
      setVerificationStatus(
        (addressToEdit.verificationStatus as any) ||
          (addressToEdit.lat ? "VERIFIED" : "NOT_CHECKED"),
      );
      setVerificationProvider(addressToEdit.verificationProvider || null);
      setSmartSearchQuery("");
      setSmartSuggestions([]);
      setShowSmartDropdown(false);
      if (addressToEdit.contacts && addressToEdit.contacts.length > 0) {
        setContacts(
          addressToEdit.contacts.map((c) => ({
            ...c,
            roleCategory: c.roleCategory || "OPERATIONS",
            isPrimary: !!c.isPrimary,
          })),
        );
      } else {
        setContacts([
          {
            fullName: "",
            email: "",
            phone: "",
            roleCategory: "OPERATIONS",
            jobTitle: "",
            isPrimary: true,
          },
        ]);
      }
    } else {
      // Reset form
      setAddressType("CUSTOMER");
      setCompanyName("");
      setTradeName("");
      setTaxId("");
      setStreet1("");
      setStreet2("");
      setZipCode("");
      setCity("");
      setFederalState("");
      setCountry("ES");
      setUnLocode("");
      setIsDefaultShipper(false);
      setIsDefaultConsignee(false);
      setIsDefaultNotify(false);
      setNotes("");
      setLat(null);
      setLon(null);
      setFormattedAddress("");
      setVerificationStatus("NOT_CHECKED");
      setVerificationProvider(null);
      setSmartSearchQuery("");
      setSmartSuggestions([]);
      setShowSmartDropdown(false);
      setContacts([
        {
          fullName: "",
          email: "",
          phone: "",
          roleCategory: "OPERATIONS",
          jobTitle: "",
          isPrimary: true,
        },
      ]);
    }
    setErrorMessage(null);
    setDuplicateWarning(null);
    setIsDuplicateModalOpen(false);
    setActiveTab("FORM");
  }, [addressToEdit, isOpen]);

  // Handle outside click for UN/LOCODE and Smart Search dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        unlocodeRef.current &&
        !unlocodeRef.current.contains(event.target as Node)
      ) {
        setShowUnlocodeDropdown(false);
      }
      if (
        smartSearchRef.current &&
        !smartSearchRef.current.contains(event.target as Node)
      ) {
        setShowSmartDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Smart Search Autocomplete (Google Maps + OSM) with Debounce
  const handleSmartSearchChange = (val: string) => {
    setSmartSearchQuery(val);
    if (smartSearchTimerRef.current) {
      clearTimeout(smartSearchTimerRef.current);
    }

    if (!val || val.trim().length < 2) {
      setSmartSuggestions([]);
      setShowSmartDropdown(false);
      return;
    }

    smartSearchTimerRef.current = setTimeout(async () => {
      try {
        setIsSearchingSmart(true);
        const countryParam = country
          ? `&country=${encodeURIComponent(country)}`
          : "";
        const res = await fetch(
          `/api/addresses/autocomplete?q=${encodeURIComponent(val)}${countryParam}`,
        );
        if (res.ok) {
          const data = await res.json();
          setSmartSuggestions(Array.isArray(data) ? data : []);
          setShowSmartDropdown(true);
        }
      } catch (err) {
        console.error("Error fetching smart address suggestions:", err);
      } finally {
        setIsSearchingSmart(false);
      }
    }, 350);
  };

  // Select Smart Suggestion and auto-distribute fields
  const handleSelectSmartSuggestion = (item: any) => {
    if (item.street1) setStreet1(item.street1);
    else if (item.title) setStreet1(item.title);

    if (item.zipCode) setZipCode(item.zipCode);
    if (item.city) setCity(item.city);
    if (item.federalState) setFederalState(item.federalState);
    if (item.country) setCountry(item.country);

    setLat(item.lat ?? null);
    setLon(item.lon ?? null);
    setFormattedAddress(item.formattedAddress || item.title || "");
    setVerificationStatus("VERIFIED");
    setVerificationProvider(item.provider || "NOMINATIM");
    setShowSmartDropdown(false);
    setSmartSearchQuery("");
  };

  // On-demand validation for current manual fields
  const handleValidateCurrentAddress = async () => {
    if (!street1.trim() && !city.trim()) {
      setErrorMessage(
        "Introduzca al menos Calle y Ciudad para validar en el mapa.",
      );
      return;
    }
    try {
      setIsValidatingManual(true);
      const res = await fetch("/api/addresses/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          street1,
          zipCode,
          city,
          federalState,
          country,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.lat && data.lon) {
          setLat(data.lat);
          setLon(data.lon);
          setFormattedAddress(data.formattedAddress || "");
          setVerificationStatus("VERIFIED");
          setVerificationProvider(data.provider || "NOMINATIM");
        } else {
          setVerificationStatus("MANUAL_UNVERIFIED");
          setVerificationProvider("MANUAL");
        }
      } else {
        setVerificationStatus("MANUAL_UNVERIFIED");
      }
    } catch {
      setVerificationStatus("MANUAL_UNVERIFIED");
    } finally {
      setIsValidatingManual(false);
    }
  };

  // Search UN/LOCODE
  const handleUnlocodeSearch = async (term: string) => {
    if (!term.trim()) {
      setUnlocodeResults([]);
      setShowUnlocodeDropdown(false);
      return;
    }

    try {
      setIsSearchingUnlocode(true);
      const res = await fetch(
        `/api/addresses/unlocode-lookup?q=${encodeURIComponent(term)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setUnlocodeResults(data);
        setShowUnlocodeDropdown(true);
      }
    } catch (err) {
      console.error("Error searching UN/LOCODE:", err);
    } finally {
      setIsSearchingUnlocode(false);
    }
  };

  // Select UN/LOCODE auto-fill
  const handleSelectUnlocode = (item: any) => {
    setUnLocode(item.location);
    if (item.name) setCity(item.name);
    if (item.country) setCountry(item.country);
    setShowUnlocodeDropdown(false);
  };

  // Add / Remove contact row
  const handleAddContact = () => {
    setContacts((prev) => [
      ...prev,
      {
        fullName: "",
        email: "",
        phone: "",
        roleCategory: "OPERATIONS",
        jobTitle: "",
        isPrimary: prev.length === 0,
      },
    ]);
  };

  const handleRemoveContact = (index: number) => {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateContact = (
    index: number,
    field: keyof ContactFormItem,
    value: any,
  ) => {
    setContacts((prev) => {
      const updated = [...prev];
      if (field === "isPrimary" && value === true) {
        // Only one primary contact
        return updated.map((c, i) => ({
          ...c,
          isPrimary: i === index,
        }));
      }
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Save address handler (with duplicate detection & override)
  const handleSave = async (overrideWarning = false) => {
    setErrorMessage(null);

    // Basic validation
    if (!companyName.trim()) {
      setErrorMessage("La Razón Social / Nombre de Empresa es obligatorio.");
      return;
    }
    if (!street1.trim()) {
      setErrorMessage("La Calle / Dirección Línea 1 es obligatoria.");
      return;
    }
    if (!zipCode.trim()) {
      setErrorMessage("El Código Postal es obligatorio.");
      return;
    }
    if (!city.trim()) {
      setErrorMessage("La Ciudad es obligatoria.");
      return;
    }
    if (!country.trim()) {
      setErrorMessage("El País es obligatorio.");
      return;
    }

    // Clean contacts: filter out empty rows
    const validContacts = contacts.filter(
      (c) => c.fullName.trim() && c.email.trim(),
    );

    const payload = {
      companyId,
      addressType,
      companyName: companyName.trim(),
      tradeName: tradeName.trim() || undefined,
      taxId: taxId.trim() || undefined,
      street1: street1.trim(),
      street2: street2.trim() || undefined,
      zipCode: zipCode.trim(),
      city: city.trim(),
      federalState: federalState.trim() || undefined,
      country: country.trim().toUpperCase(),
      unLocode: unLocode.trim() ? unLocode.trim().toUpperCase() : undefined,
      isDefaultShipper,
      isDefaultConsignee,
      isDefaultNotify,
      notes: notes.trim() || undefined,
      lat,
      lon,
      formattedAddress: formattedAddress || undefined,
      verificationStatus,
      verificationProvider: verificationProvider || undefined,
      contacts: validContacts,
      overrideWarning,
    };

    try {
      setIsSubmitting(true);
      const isEdit = !!addressToEdit?.id;
      const url = isEdit
        ? `/api/addresses/${addressToEdit.id}`
        : "/api/addresses";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 409 && data.duplicateWarning) {
        // Potential duplicate detected
        setDuplicateWarning(data);
        setIsDuplicateModalOpen(true);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Error al guardar la dirección");
      }

      // Success
      if (onSuccess) onSuccess(data);
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err.message || "Error inesperado al guardar la dirección.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPreviewAddress = {
    companyName: companyName || "Razón Social de Ejemplo S.A.",
    tradeName: tradeName || null,
    taxId: taxId || null,
    street1: street1 || "Calle Principal 123",
    street2: street2 || null,
    zipCode: zipCode || "08001",
    city: city || "Barcelona",
    federalState: federalState || null,
    country: country || "ES",
    unLocode: unLocode || "ESBCN",
    addressType,
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="xl"
        title={
          <div className="flex items-center justify-between w-full pr-6">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {addressToEdit
                  ? "Editar Dirección y Contactos"
                  : "Registrar Nueva Dirección en Directorio"}
              </span>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab("FORM")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  activeTab === "FORM"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Formulario de Datos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("BL_PREVIEW")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  activeTab === "BL_PREVIEW"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Vista Previa B/L</span>
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {errorMessage && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-3 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === "BL_PREVIEW" ? (
            <div className="space-y-4">
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-700 dark:text-indigo-300">
                Esta es la representación canónica de 4 a 5 líneas con un límite
                de 40 caracteres por línea que se estampará en los conocimientos
                de embarque (Bill of Lading) o instrucciones de despacho.
              </div>
              <BlCardPreview
                address={currentPreviewAddress}
                contacts={contacts.filter((c) => c.fullName && c.email)}
              />
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave(false);
              }}
              className="space-y-6"
            >
              {/* Entity Classification */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Shield className="w-4 h-4 text-indigo-500" />
                  <span>Clasificación y Tipo de Dirección</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="address-type-select"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Tipo de Entidad Logística *
                    </label>
                    <select
                      id="address-type-select"
                      name="addressType"
                      aria-label="Tipo de Entidad Logística"
                      value={addressType}
                      onChange={(e) => setAddressType(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {ADDRESS_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="company-tax-id-input"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      CIF / NIF / Tax ID / EORI
                    </label>
                    <input
                      id="company-tax-id-input"
                      name="taxId"
                      aria-label="CIF o Tax ID de la empresa"
                      type="text"
                      placeholder="Ej: ESB12345678 o NL847291039B01"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="company-legal-name-input"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Razón Social / Legal Company Name *
                    </label>
                    <input
                      id="company-legal-name-input"
                      name="companyName"
                      aria-label="Razón Social o Legal Company Name"
                      type="text"
                      required
                      placeholder="Ej: Mediterranean Shipping Agency S.L."
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="company-trade-name-input"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Nombre Comercial / Trade Name (Opcional)
                    </label>
                    <input
                      id="company-trade-name-input"
                      name="tradeName"
                      aria-label="Nombre comercial o de fantasía"
                      type="text"
                      placeholder="Ej: MSC Barcelona Port Terminal"
                      value={tradeName}
                      onChange={(e) => setTradeName(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Physical Geographic Address */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    <span>Ubicación Geográfica y Normalización Postal</span>
                  </div>
                  <span className="text-[11px] font-normal normal-case text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Google Maps & OpenStreetMap
                  </span>
                </div>

                {/* Smart Autocomplete Search Input */}
                <div className="relative" ref={smartSearchRef}>
                  <label
                    htmlFor="smart-address-search-input"
                    className="block text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1"
                  >
                    Buscador Inteligente (Autocompleta Calle, CP, Ciudad y
                    Coordenadas)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="smart-address-search-input"
                      name="smartAddressSearch"
                      aria-label="Buscar dirección con Google Maps u OpenStreetMap"
                      type="text"
                      placeholder="Buscar por calle, muelle, polígono o lugar (ej: Moll de Ponent, Barcelona)..."
                      value={smartSearchQuery}
                      onChange={(e) => handleSmartSearchChange(e.target.value)}
                      onFocus={() => {
                        if (smartSuggestions.length > 0)
                          setShowSmartDropdown(true);
                      }}
                      className="w-full px-3 py-2 pl-9 pr-10 text-sm bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                    />
                    <div className="absolute left-3 text-indigo-500">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="absolute right-3 text-slate-400">
                      {isSearchingSmart ? (
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  {/* Dropdown Suggestions */}
                  {showSmartDropdown && smartSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl z-30 text-sm">
                      {smartSuggestions.map((item, idx) => (
                        <button
                          key={`${item.id}-${idx}`}
                          type="button"
                          onClick={() => handleSelectSmartSuggestion(item)}
                          className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-start justify-between border-b border-slate-100 dark:border-slate-800 last:border-b-0 gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {item.title}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {item.subtitle || item.formattedAddress}
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded shrink-0 font-medium ${
                              item.provider === "GOOGLE_MAPS"
                                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            }`}
                          >
                            {item.provider === "GOOGLE_MAPS"
                              ? "Google Maps"
                              : "OpenStreetMap"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Geolocation Verification Status Banner */}
                <div
                  className={`p-3 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-3 ${
                    verificationStatus === "VERIFIED"
                      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200"
                      : verificationStatus === "MANUAL_UNVERIFIED"
                        ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200"
                        : "bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {verificationStatus === "VERIFIED" ? (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : verificationStatus === "MANUAL_UNVERIFIED" ? (
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    ) : (
                      <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <div>
                      <div className="font-semibold flex items-center gap-1.5">
                        <span>
                          {verificationStatus === "VERIFIED"
                            ? `Dirección Verificada (${
                                verificationProvider === "GOOGLE_MAPS"
                                  ? "Google Maps"
                                  : "OpenStreetMap"
                              })`
                            : verificationStatus === "MANUAL_UNVERIFIED"
                              ? "Dirección Manual / No Verificada"
                              : "Ubicación sin verificar en mapa"}
                        </span>
                      </div>
                      {lat !== null && lon !== null ? (
                        <div className="font-mono text-[11px] opacity-80">
                          Lat: {lat.toFixed(5)}, Lon: {lon.toFixed(5)}
                          {formattedAddress ? ` — ${formattedAddress}` : ""}
                        </div>
                      ) : (
                        <div className="text-[11px] opacity-75">
                          Sin coordenadas geográficas asignadas
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {lat !== null && lon !== null && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 text-[11px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-1 font-medium text-slate-700 dark:text-slate-200"
                      >
                        <ExternalLink className="w-3 h-3 text-indigo-500" />
                        <span>Ver en Mapa</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={handleValidateCurrentAddress}
                      disabled={isValidatingManual}
                      className="px-2.5 py-1 text-[11px] bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-1 font-medium"
                    >
                      {isValidatingManual ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      <span>Validar en Mapa</span>
                    </button>
                  </div>
                </div>

                {/* UN/LOCODE Autocomplete */}
                <div className="relative" ref={unlocodeRef}>
                  <label
                    htmlFor="unlocode-search-input"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Código UN/LOCODE (Autocompleta Ciudad y País)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="unlocode-search-input"
                      name="unLocode"
                      aria-label="Código de puerto o ciudad UN/LOCODE"
                      type="text"
                      placeholder="Escriba puerto o código, ej: ESBCN, NLRTM, Valencia..."
                      value={unLocode}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setUnLocode(val);
                        handleUnlocodeSearch(val);
                      }}
                      onFocus={() => {
                        if (unLocode) handleUnlocodeSearch(unLocode);
                      }}
                      className="w-full px-3 py-2 pr-10 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                    />
                    <div className="absolute right-3 text-slate-400">
                      {isSearchingUnlocode ? (
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  {/* Dropdown Suggestions */}
                  {showUnlocodeDropdown && unlocodeResults.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 text-sm">
                      {unlocodeResults.map((item, idx) => (
                        <button
                          key={`${item.location}-${idx}`}
                          type="button"
                          onClick={() => handleSelectUnlocode(item)}
                          className="w-full text-left px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {item.location}
                            </span>
                            <span className="text-slate-800 dark:text-slate-200 font-medium">
                              {item.name}
                            </span>
                          </div>
                          <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 font-mono">
                            {item.country}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Street 1 & Street 2 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="address-street1-input"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Calle y Número (Línea 1) *
                    </label>
                    <input
                      id="address-street1-input"
                      name="street1"
                      aria-label="Calle y Número Línea 1"
                      type="text"
                      required
                      placeholder="Ej: Moll de Ponent s/n, Terminal Port"
                      value={street1}
                      onChange={(e) => {
                        setStreet1(e.target.value);
                        if (verificationStatus === "VERIFIED") {
                          setVerificationStatus("MANUAL_UNVERIFIED");
                        }
                      }}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="address-street2-input"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Piso / Edificio / Puerta (Línea 2)
                    </label>
                    <input
                      id="address-street2-input"
                      name="street2"
                      aria-label="Piso, Edificio o Puerta Línea 2"
                      type="text"
                      placeholder="Ej: Edificio Nova Bocana, Muelle Sur, Planta 3"
                      value={street2}
                      onChange={(e) => setStreet2(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                {/* ZipCode, City, State, Country */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label
                      htmlFor="address-zip-input"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Código Postal *
                    </label>
                    <input
                      id="address-zip-input"
                      name="zipCode"
                      aria-label="Código Postal"
                      type="text"
                      required
                      placeholder="08039"
                      value={zipCode}
                      onChange={(e) => {
                        setZipCode(e.target.value);
                        if (verificationStatus === "VERIFIED") {
                          setVerificationStatus("MANUAL_UNVERIFIED");
                        }
                      }}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="address-city-input"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Ciudad *
                    </label>
                    <input
                      id="address-city-input"
                      name="city"
                      aria-label="Ciudad"
                      type="text"
                      required
                      placeholder="Barcelona"
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        if (verificationStatus === "VERIFIED") {
                          setVerificationStatus("MANUAL_UNVERIFIED");
                        }
                      }}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="address-state-input"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Provincia / Estado
                    </label>
                    <input
                      id="address-state-input"
                      name="federalState"
                      aria-label="Provincia o Estado"
                      type="text"
                      placeholder="Cataluña"
                      value={federalState}
                      onChange={(e) => setFederalState(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="address-country-input"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      País (ISO-2) *
                    </label>
                    <input
                      id="address-country-input"
                      name="country"
                      aria-label="Código de País ISO-2"
                      type="text"
                      required
                      maxLength={2}
                      placeholder="ES"
                      value={country}
                      onChange={(e) => setCountry(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Default Maritime B/L Party Roles */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Preasignación en Documentación de Embarque (B/L)
                  </div>
                  <div className="flex flex-wrap items-center gap-6 text-sm text-slate-700 dark:text-slate-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        id="default-shipper-checkbox"
                        name="isDefaultShipper"
                        aria-label="Por defecto como Shipper / Embarcador"
                        checked={isDefaultShipper}
                        onChange={(e) => setIsDefaultShipper(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span className="text-xs">Shipper Habitual</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        id="default-consignee-checkbox"
                        name="isDefaultConsignee"
                        aria-label="Por defecto como Consignee / Consignatario"
                        checked={isDefaultConsignee}
                        onChange={(e) =>
                          setIsDefaultConsignee(e.target.checked)
                        }
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span className="text-xs">Consignee Habitual</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        id="default-notify-checkbox"
                        name="isDefaultNotify"
                        aria-label="Por defecto como Notify Party"
                        checked={isDefaultNotify}
                        onChange={(e) => setIsDefaultNotify(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span className="text-xs">Notify Party Habitual</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Individual Contacts (1:N) */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <User className="w-4 h-4 text-purple-500" />
                    <span>
                      Contactos Individuales en esta Dirección (
                      {contacts.length})
                    </span>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddContact}
                    className="text-xs flex items-center gap-1.5 h-8 text-indigo-600 dark:text-indigo-400"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Contacto</span>
                  </Button>
                </div>

                <div className="space-y-3">
                  {contacts.map((contact, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-3 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 w-5">
                            #{idx + 1}
                          </span>
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                            <input
                              type="radio"
                              name="primaryContactGroup"
                              id={`contact-primary-${idx}`}
                              aria-label={`Contacto ${idx + 1} como principal`}
                              checked={contact.isPrimary}
                              onChange={() =>
                                handleUpdateContact(idx, "isPrimary", true)
                              }
                              className="text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="font-medium">
                              Contacto Principal
                            </span>
                          </label>
                        </div>

                        {contacts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveContact(idx)}
                            aria-label={`Eliminar contacto ${idx + 1}`}
                            className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label
                            htmlFor={`contact-name-${idx}`}
                            className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                          >
                            Nombre y Apellidos *
                          </label>
                          <input
                            id={`contact-name-${idx}`}
                            name={`contactFullName_${idx}`}
                            aria-label={`Nombre del contacto ${idx + 1}`}
                            type="text"
                            placeholder="Ej: Marc Vila"
                            value={contact.fullName}
                            onChange={(e) =>
                              handleUpdateContact(
                                idx,
                                "fullName",
                                e.target.value,
                              )
                            }
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`contact-email-${idx}`}
                            className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                          >
                            Correo Electrónico *
                          </label>
                          <input
                            id={`contact-email-${idx}`}
                            name={`contactEmail_${idx}`}
                            aria-label={`Email del contacto ${idx + 1}`}
                            type="email"
                            placeholder="m.vila@msc-agency.com"
                            value={contact.email}
                            onChange={(e) =>
                              handleUpdateContact(idx, "email", e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`contact-role-${idx}`}
                            className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                          >
                            Área / Rol
                          </label>
                          <select
                            id={`contact-role-${idx}`}
                            name={`contactRole_${idx}`}
                            aria-label={`Rol o departamento del contacto ${idx + 1}`}
                            value={contact.roleCategory}
                            onChange={(e) =>
                              handleUpdateContact(
                                idx,
                                "roleCategory",
                                e.target.value,
                              )
                            }
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                          >
                            {CONTACT_ROLES.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label
                            htmlFor={`contact-phone-${idx}`}
                            className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                          >
                            Teléfono Fijo
                          </label>
                          <input
                            id={`contact-phone-${idx}`}
                            name={`contactPhone_${idx}`}
                            aria-label={`Teléfono fijo del contacto ${idx + 1}`}
                            type="tel"
                            placeholder="+34 934 001 002"
                            value={contact.phone || ""}
                            onChange={(e) =>
                              handleUpdateContact(idx, "phone", e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`contact-mobile-${idx}`}
                            className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                          >
                            Móvil / Directo
                          </label>
                          <input
                            id={`contact-mobile-${idx}`}
                            name={`contactMobile_${idx}`}
                            aria-label={`Teléfono móvil del contacto ${idx + 1}`}
                            type="tel"
                            placeholder="+34 600 123 456"
                            value={contact.mobile || ""}
                            onChange={(e) =>
                              handleUpdateContact(idx, "mobile", e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`contact-job-${idx}`}
                            className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                          >
                            Cargo / Job Title
                          </label>
                          <input
                            id={`contact-job-${idx}`}
                            name={`contactJob_${idx}`}
                            aria-label={`Cargo o puesto del contacto ${idx + 1}`}
                            type="text"
                            placeholder="Head of Maritime Ops"
                            value={contact.jobTitle || ""}
                            onChange={(e) =>
                              handleUpdateContact(
                                idx,
                                "jobTitle",
                                e.target.value,
                              )
                            }
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label
                  htmlFor="address-notes-textarea"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Instrucciones Especiales / Observaciones de Despacho
                </label>
                <textarea
                  id="address-notes-textarea"
                  name="notes"
                  aria-label="Instrucciones especiales u observaciones"
                  rows={2}
                  placeholder="Horarios de recepción documental, restricciones de atraque o entrega..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Validando y Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>
                        {addressToEdit
                          ? "Actualizar Dirección"
                          : "Guardar en Directorio"}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* Duplicate Override Warning Modal */}
      <DuplicateWarningModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        duplicateInfo={duplicateWarning}
        isSubmitting={isSubmitting}
        onConfirmOverride={() => {
          setIsDuplicateModalOpen(false);
          handleSave(true);
        }}
      />
    </>
  );
};
