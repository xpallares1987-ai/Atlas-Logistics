import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Building2,
  MapPin,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  FileText,
  Edit,
  Trash2,
  Anchor,
  Ship,
  Truck,
  Warehouse,
  Shield,
  Layers,
  Loader2,
  Star,
  Check,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import {
  Button,
  AddressModal,
  BlCardPreview,
  DrayageCalculatorModal,
  Modal,
  Toast,
  ADDRESS_TYPES,
  type AddressFormData,
} from "@atlas/ui";
import { authFetch } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useAppStore, canManageCorporateGroups } from "../store/useAppStore";

const TYPE_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    badgeClass: string;
  }
> = {
  CUS: {
    label: "CUS · Customer",
    icon: Building2,
    color: "indigo",
    badgeClass:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  },
  CB: {
    label: "CB · Customs Broker",
    icon: Shield,
    color: "emerald",
    badgeClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  AG: {
    label: "AG · Agent",
    icon: Anchor,
    color: "sky",
    badgeClass:
      "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  },
  HAU: {
    label: "HAU · Haulier",
    icon: Truck,
    color: "violet",
    badgeClass:
      "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  },
  CAR: {
    label: "CAR · Carrier",
    icon: Ship,
    color: "blue",
    badgeClass:
      "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  INS: {
    label: "INS · Insurance",
    icon: Shield,
    color: "rose",
    badgeClass:
      "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
  CAA: {
    label: "CAA · Carrier Agent",
    icon: Anchor,
    color: "cyan",
    badgeClass:
      "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
  },
  WH: {
    label: "WH · Warehouse",
    icon: Warehouse,
    color: "amber",
    badgeClass:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  FW: {
    label: "FW · Forwarder",
    icon: Layers,
    color: "teal",
    badgeClass:
      "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  },
  TRM: {
    label: "TRM · Terminal",
    icon: Layers,
    color: "orange",
    badgeClass:
      "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  },
};

export default function AddressesHubModule() {
  const { user: authUser } = useAuth();
  const { user: storeUser } = useAppStore();
  const effectiveRole = authUser?.role || storeUser?.role || "ADMIN";
  const hasCorporateGroupAccess = canManageCorporateGroups(effectiveRole);

  const [addresses, setAddresses] = useState<any[]>([]);
  const [corporateGroups, setCorporateGroups] = useState<any[]>([]);
  const [showCorporateGroupsPanel, setShowCorporateGroupsPanel] =
    useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressToEdit, setAddressToEdit] = useState<AddressFormData | null>(
    null,
  );
  const [previewBlAddress, setPreviewBlAddress] = useState<any | null>(null);
  const [isDrayageModalOpen, setIsDrayageModalOpen] = useState(false);
  const [selectedDrayageOriginId, setSelectedDrayageOriginId] = useState<
    string | undefined
  >(undefined);

  // Fetch addresses from backend
  const fetchAddresses = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedType !== "ALL") params.append("type", selectedType);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await authFetch(`/api/addresses?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
      }
      if (hasCorporateGroupAccess) {
        const grpRes = await authFetch("/api/addresses/groups");
        if (grpRes.ok) {
          const grpData = await grpRes.json();
          setCorporateGroups(grpData);
        }
      }
    } catch (err) {
      console.error("Failed to load addresses directory:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedType, searchQuery, hasCorporateGroupAccess]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const handleLinkAddressToCorporateGroup = async (
    addressId: string,
    targetGroupId: string,
  ) => {
    if (!hasCorporateGroupAccess) return;
    try {
      const res = await authFetch(
        `/api/addresses/${addressId}/corporate-group`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId: targetGroupId }),
        },
      );
      if (res.ok) {
        Toast.show("Address linked to Corporate Group", "success");
        fetchAddresses();
      } else {
        Toast.show("Failed to link Corporate Group", "error");
      }
    } catch {
      Toast.show("Connection error while linking group", "error");
    }
  };

  // Delete address
  const handleDeleteAddress = async (id: string, name: string) => {
    if (
      !window.confirm(
        `¿Está seguro de que desea eliminar la dirección de "${name}" y todos sus contactos asociados?`,
      )
    ) {
      return;
    }

    try {
      const res = await authFetch(`/api/addresses/${id}`, { method: "DELETE" });
      if (res.ok) {
        Toast.show("Dirección eliminada correctamente", "success");
        fetchAddresses();
      } else {
        Toast.show("No se pudo eliminar la dirección", "error");
      }
    } catch (err) {
      console.error("Error deleting address:", err);
      Toast.show("Error de conexión al eliminar", "error");
    }
  };

  // Directory stats
  const stats = useMemo(() => {
    const total = addresses.length;
    const customers = addresses.filter(
      (a) => a.addressType === "CUS" || a.addressType === "FW",
    ).length;
    const carriers = addresses.filter(
      (a) =>
        a.addressType === "CAR" ||
        a.addressType === "CAA" ||
        a.addressType === "AG",
    ).length;
    const infrastructure = addresses.filter(
      (a) =>
        a.addressType === "TRM" ||
        a.addressType === "WH" ||
        a.addressType === "HAU",
    ).length;
    return { total, customers, carriers, infrastructure };
  }, [addresses]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
              <Building2 className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Addresses Hub & Maritime Directory
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Directorio maestro multi-entidad con validación de duplicados,
            resolución UN/LOCODE y estandarización B/L (BIMCO / FIATA / DCSA).
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {hasCorporateGroupAccess && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCorporateGroupsPanel((prev) => !prev)}
              className="border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2 text-xs"
            >
              <Shield className="w-4 h-4" />
              <span>
                {showCorporateGroupsPanel
                  ? "Ocultar Corporate Groups"
                  : `Corporate Groups (${corporateGroups.length})`}
              </span>
            </Button>
          )}

          <Button
            onClick={() => {
              setAddressToEdit(null);
              setIsAddressModalOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Nueva Dirección</span>
          </Button>
        </div>
      </div>

      {/* Accounting / Controlling / Admin Exclusive Corporate Groups Consolidation Panel */}
      {hasCorporateGroupAccess && showCorporateGroupsPanel && (
        <div className="p-5 rounded-2xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/40 dark:bg-amber-950/20 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                <Shield className="w-4 h-4" />
                <span>
                  Corporate Groups Consolidation — Restricted to Accounting,
                  Controlling & Admin ({effectiveRole})
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Corporate Groups group multiple global operational addresses for
                credit control and accounting consolidation. They are never
                selectable as operational shipping addresses.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {corporateGroups.map((grp) => (
              <div
                key={grp.id}
                className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-slate-800 flex flex-col justify-between gap-2 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {grp.name}
                    </span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-semibold">
                      {grp.groupCode || grp.id}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {grp.sector || "Global Logistics"} · HQ:{" "}
                    {grp.headquartersCountry || "GLOBAL"}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    Linked Addresses: <strong>{grp.addressCount ?? 0}</strong>
                  </span>
                  {grp.creditLimit && (
                    <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                      Credit: €{Number(grp.creditLimit).toLocaleString()}
                    </span>
                  )}
                </div>

                {Array.isArray(grp.linkedAddresses) &&
                  grp.linkedAddresses.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {grp.linkedAddresses.slice(0, 4).map((la: any) => (
                        <span
                          key={la.id}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate max-w-[180px]"
                          title={`${la.companyName} (${la.city}, ${la.country})`}
                        >
                          {la.addressType}: {la.city} ({la.country})
                        </span>
                      ))}
                      {grp.linkedAddresses.length > 4 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium">
                          +{grp.linkedAddresses.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Directory Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total Entidades
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {stats.total}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            En el directorio tenant
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="text-xs font-medium text-indigo-500 uppercase tracking-wider">
            Clientes & Consignees
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {stats.customers}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Shippers, buyers & notify
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="text-xs font-medium text-blue-500 uppercase tracking-wider">
            Navieras & Agentes
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {stats.carriers}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Carriers & carrier agents
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="text-xs font-medium text-emerald-500 uppercase tracking-wider">
            Nodos Portuarios & ICD
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.infrastructure}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Puertos, terminales & depósitos
          </div>
        </div>
      </div>

      {/* Search & Role Filters Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
        {/* Search Input */}
        <div className="relative">
          <input
            id="search-addresses-input"
            name="searchQuery"
            aria-label="Buscar direcciones por razón social, CIF, ciudad o UN/LOCODE"
            type="text"
            placeholder="Buscar por Razón Social, CIF / NIF / Tax ID, Ciudad o UN/LOCODE (ej. Barcelona, ESBCN)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>

        {/* Role Classification Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-medium px-2 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtro:</span>
          </span>

          <button
            type="button"
            onClick={() => setSelectedType("ALL")}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedType === "ALL"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            Todos ({stats.total})
          </button>

          {ADDRESS_TYPES.map((type) => {
            const count = addresses.filter(
              (a) => a.addressType === type.value,
            ).length;
            const isSelected = selectedType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => setSelectedType(type.value)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {type.label.split("/")[0].trim()} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Directory Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
          <span className="text-sm">Cargando directorio de direcciones...</span>
        </div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-16 px-4 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
              No se encontraron direcciones registradas
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {searchQuery || selectedType !== "ALL"
                ? "No hay direcciones que coincidan con los filtros seleccionados."
                : "Comience registrando clientes, agentes navieros, almacenes o transportistas en este hub."}
            </p>
          </div>
          <Button
            onClick={() => {
              setAddressToEdit(null);
              setIsAddressModalOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Registrar Primera Dirección</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {addresses.map((item) => {
            const config = TYPE_CONFIG[item.addressType] || {
              label: item.addressType,
              icon: Building2,
              badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
            };
            const IconComponent = config.icon;
            const contacts = item.contacts || [];
            const primaryContact =
              contacts.find((c: any) => c.isPrimary) || contacts[0];

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
              >
                {/* Card Top */}
                <div className="p-5 space-y-3">
                  {/* Classification & UN/LOCODE badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.badgeClass}`}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                      <span>{config.label}</span>
                    </span>

                    {item.unLocode && (
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                        {item.unLocode}
                      </span>
                    )}
                  </div>

                  {/* Company Name & Trade Name */}
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug">
                      {item.companyName}
                    </h3>
                    {item.tradeName && (
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                        {item.tradeName}
                      </p>
                    )}
                    {item.taxId && (
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        CIF / Tax ID:{" "}
                        <strong className="text-slate-700 dark:text-slate-300">
                          {item.taxId}
                        </strong>
                      </p>
                    )}
                  </div>

                  {/* Physical Address & Geolocation */}
                  <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <div>{item.street1}</div>
                        {item.street2 && <div>{item.street2}</div>}
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {item.zipCode} {item.city}
                          {item.federalState
                            ? `, ${item.federalState}`
                            : ""}, {item.country}
                        </div>
                      </div>
                    </div>

                    {/* Verification status and map link */}
                    <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                      {item.verificationStatus === "VERIFIED" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <Check className="w-3.5 h-3.5" />
                          <span>
                            {item.verificationProvider === "GOOGLE_MAPS"
                              ? "Google Maps"
                              : "OpenStreetMap"}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Manual</span>
                        </span>
                      )}

                      {item.lat && item.lon ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lon}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-mono"
                          title={`Lat: ${item.lat}, Lon: ${item.lon}`}
                        >
                          <span>
                            {Number(item.lat).toFixed(3)},{" "}
                            {Number(item.lon).toFixed(3)}
                          </span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">
                          Sin coords
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Default B/L Party Roles */}
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {item.isDefaultShipper && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium">
                        Shipper Habitual
                      </span>
                    )}
                    {item.isDefaultConsignee && (
                      <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium">
                        Consignee Habitual
                      </span>
                    )}
                    {item.isDefaultNotify && (
                      <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-medium">
                        Notify Habitual
                      </span>
                    )}
                  </div>

                  {/* Accounting / Controlling / Admin Corporate Group Link Selector (Hidden for standard operational users) */}
                  {hasCorporateGroupAccess && showCorporateGroupsPanel && (
                    <div className="pt-2 border-t border-amber-200/70 dark:border-amber-900/50 flex items-center justify-between gap-2 text-xs">
                      <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 shrink-0">
                        Corporate Group:
                      </span>
                      <select
                        aria-label={`Corporate Group for ${item.companyName}`}
                        value={item.companyId || ""}
                        onChange={(e) =>
                          handleLinkAddressToCorporateGroup(
                            item.id,
                            e.target.value,
                          )
                        }
                        className="flex-1 min-w-0 px-2 py-1 text-xs rounded border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none"
                      >
                        {corporateGroups.map((grp) => (
                          <option key={grp.id} value={grp.id}>
                            {grp.name} ({grp.groupCode || grp.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Contacts Summary */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold uppercase text-[10px] tracking-wider">
                        Contactos ({contacts.length})
                      </span>
                      {primaryContact && (
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-medium">
                          <Star className="w-3 h-3 fill-indigo-600 dark:fill-indigo-400" />
                          <span>{primaryContact.fullName}</span>
                        </span>
                      )}
                    </div>

                    {primaryContact && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {primaryContact.email}
                          </span>
                        </div>
                        {primaryContact.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{primaryContact.phone}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewBlAddress(item)}
                      className="text-xs flex items-center gap-1 h-8 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ver B/L</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedDrayageOriginId(item.id);
                        setIsDrayageModalOpen(true);
                      }}
                      className="text-xs flex items-center gap-1 h-8 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Acarreo</span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setAddressToEdit(item);
                        setIsAddressModalOpen(true);
                      }}
                      className="text-xs h-8 px-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                      aria-label={`Editar dirección de ${item.companyName}`}
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      <span>Editar</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        handleDeleteAddress(item.id, item.companyName)
                      }
                      className="text-xs h-8 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      aria-label={`Eliminar dirección de ${item.companyName}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Address Form Modal (Add / Edit) */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        addressToEdit={addressToEdit}
        canManageCorporateGroups={hasCorporateGroupAccess}
        corporateGroups={corporateGroups}
        onSuccess={() => {
          Toast.show(
            addressToEdit
              ? "Dirección actualizada con éxito"
              : "Dirección guardada en directorio",
            "success",
          );
          fetchAddresses();
        }}
      />

      {/* Dedicated B/L Preview Modal */}
      {previewBlAddress && (
        <Modal
          isOpen={!!previewBlAddress}
          onClose={() => setPreviewBlAddress(null)}
          size="lg"
          title={
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>Formato B/L para: {previewBlAddress.companyName}</span>
            </div>
          }
        >
          <div className="space-y-4">
            <BlCardPreview
              address={previewBlAddress}
              contacts={previewBlAddress.contacts || []}
            />
            <div className="flex justify-end pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreviewBlAddress(null)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {/* Drayage Road Haulage Calculator Modal */}
      <DrayageCalculatorModal
        isOpen={isDrayageModalOpen}
        onClose={() => {
          setIsDrayageModalOpen(false);
          setSelectedDrayageOriginId(undefined);
        }}
        preSelectedOriginId={selectedDrayageOriginId}
      />
    </div>
  );
}
