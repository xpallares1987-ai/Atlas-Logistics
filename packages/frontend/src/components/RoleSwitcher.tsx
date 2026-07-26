import { useRole, type Role } from "../contexts/RoleContext";
import { UserCircle } from "lucide-react";

export function RoleSwitcher() {
  const { role, setRole } = useRole();
  const roles: Role[] = [
    "Shipper",
    "Freight Forwarder",
    "Customs Broker",
    "Admin",
  ];

  return (
    <div className="flex items-center gap-2 mr-4">
      <UserCircle className="w-5 h-5 text-slate-400" />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-1.5"
      >
        {roles.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </div>
  );
}
