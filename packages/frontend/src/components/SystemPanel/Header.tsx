/**
 * @file Header.tsx
 * @description Top header banner for System Administration Panel with RBAC simulator.
 * @module @atlas/frontend/components/SystemPanel
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import { Sliders } from "lucide-react";

interface HeaderProps {
  role: string;
  isAdmin: boolean;
  simulatedRole: string;
  onSimulatedRoleChange: (newRole: any) => void;
}

export function Header({
  role,
  isAdmin,
  simulatedRole,
  onSimulatedRoleChange,
}: HeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
            <Sliders size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              System Administration Panel
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Role: {role}
              </span>
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Centralized management hub for operational protocols, platform
              governance, RBAC, and integrations.
            </p>
          </div>
        </div>
      </div>

      {/* Role Simulator Badge */}
      {isAdmin && (
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
          <span className="text-slate-400 font-medium">RBAC Preview:</span>
          <select
            value={simulatedRole}
            onChange={(e) => onSimulatedRoleChange(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-indigo-400 font-bold"
          >
            <option value="ADMIN">ADMIN (Full Control)</option>
            <option value="MANAGER">MANAGER (Operations & Protocols)</option>
            <option value="OPERATIONS">OPERATIONS (Execution View)</option>
            <option value="CUSTOMER">CUSTOMER (Restricted)</option>
          </select>
        </div>
      )}
    </div>
  );
}
