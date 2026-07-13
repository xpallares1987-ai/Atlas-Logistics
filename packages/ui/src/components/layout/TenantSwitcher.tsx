
import { useAuth } from "../auth/AuthProvider";
import { Building2, ChevronDown } from "lucide-react";

const AVAILABLE_TENANTS = [
  { id: "atlas-default-tenant", name: "🌍 Global HQ" },
  { id: "atlas-spain", name: "🇪🇸 Atlas Spain" },
  { id: "atlas-mexico", name: "🇲🇽 Atlas Mexico" },
  { id: "atlas-us", name: "🇺🇸 Atlas USA" },
];

export default function TenantSwitcher() {
  const { role, tenantId, setTenantId } = useAuth();

  const currentTenant = AVAILABLE_TENANTS.find((t) => t.id === tenantId) || AVAILABLE_TENANTS[0];

  if (role !== "ADMIN") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm font-medium text-slate-300">
        <Building2 className="w-4 h-4 text-indigo-400" />
        {currentTenant.name}
      </div>
    );
  }

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg text-sm font-medium text-indigo-300 transition-colors">
        <Building2 className="w-4 h-4" />
        {currentTenant.name}
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>
      
      <div className="absolute top-full mt-2 right-0 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
        {AVAILABLE_TENANTS.map((tenant) => (
          <button
            key={tenant.id}
            onClick={() => setTenantId(tenant.id)}
            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-700 transition-colors ${tenant.id === tenantId ? "bg-slate-700/50 text-indigo-400 font-bold" : "text-slate-300"}`}
          >
            {tenant.name}
          </button>
        ))}
      </div>
    </div>
  );
}
