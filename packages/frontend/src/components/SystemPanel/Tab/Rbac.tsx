/**
 * @file Rbac.tsx
 * @description Role-Based Access Control matrix table displaying domain permission tiers.
 * @module @atlas/frontend/components/SystemPanel/Tab
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import { Users } from "lucide-react";

export function Rbac() {
  return (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Users size={18} className="text-indigo-400" />
          <span>Role-Based Access Control (RBAC) Matrix</span>
        </h3>
        <p className="text-xs text-slate-400">
          Configured permission privileges across executive, managerial,
          operational, and external participant roles.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="p-3.5">Feature / Domain Domain</th>
                <th className="p-3.5 text-center">ADMIN</th>
                <th className="p-3.5 text-center">MANAGER</th>
                <th className="p-3.5 text-center">OPERATIONS</th>
                <th className="p-3.5 text-center">CUSTOMS_BROKER</th>
                <th className="p-3.5 text-center">CUSTOMER</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr>
                <td className="p-3.5 font-bold text-white">
                  Predefined Resolution Protocols
                </td>
                <td className="p-3.5 text-center text-emerald-400 font-bold">
                  Manage
                </td>
                <td className="p-3.5 text-center text-emerald-400 font-bold">
                  Manage
                </td>
                <td className="p-3.5 text-center text-indigo-400 font-semibold">
                  Select Only
                </td>
                <td className="p-3.5 text-center text-indigo-400 font-semibold">
                  Select Only
                </td>
                <td className="p-3.5 text-center text-slate-600">No Access</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold text-white">
                  Drayage & Port Haulage Dispatch
                </td>
                <td className="p-3.5 text-center text-emerald-400 font-bold">
                  Full Dispatch
                </td>
                <td className="p-3.5 text-center text-emerald-400 font-bold">
                  Full Dispatch
                </td>
                <td className="p-3.5 text-center text-emerald-400 font-bold">
                  Full Dispatch
                </td>
                <td className="p-3.5 text-center text-amber-400 font-medium">
                  View Terminal Gate
                </td>
                <td className="p-3.5 text-center text-slate-400">
                  Track Status
                </td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold text-white">
                  Platform Governance & CQRS Rebuild
                </td>
                <td className="p-3.5 text-center text-emerald-400 font-bold">
                  Execute & Purge
                </td>
                <td className="p-3.5 text-center text-slate-400">
                  View Projections
                </td>
                <td className="p-3.5 text-center text-slate-600">No Access</td>
                <td className="p-3.5 text-center text-slate-600">No Access</td>
                <td className="p-3.5 text-center text-slate-600">No Access</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold text-white">
                  ERP & B2B EDI Partner Connectors
                </td>
                <td className="p-3.5 text-center text-emerald-400 font-bold">
                  Full Config
                </td>
                <td className="p-3.5 text-center text-indigo-400 font-semibold">
                  View Status
                </td>
                <td className="p-3.5 text-center text-indigo-400 font-semibold">
                  View Status
                </td>
                <td className="p-3.5 text-center text-slate-600">No Access</td>
                <td className="p-3.5 text-center text-slate-600">No Access</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold text-white">
                  e.firma & Digital Signature Keys
                </td>
                <td className="p-3.5 text-center text-emerald-400 font-bold">
                  Keyring Vault
                </td>
                <td className="p-3.5 text-center text-emerald-400 font-bold">
                  Sign Orders
                </td>
                <td className="p-3.5 text-center text-indigo-400 font-semibold">
                  Sign Orders
                </td>
                <td className="p-3.5 text-center text-indigo-400 font-semibold">
                  Sign Customs
                </td>
                <td className="p-3.5 text-center text-slate-600">No Access</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Rbac;
