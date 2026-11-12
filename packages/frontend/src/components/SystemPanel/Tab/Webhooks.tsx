/**
 * @file Webhooks.tsx
 * @description Omnichannel dispatch notification endpoints and webhook status tab.
 * @module @atlas/frontend/components/SystemPanel/Tab
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import { BellRing } from "lucide-react";

export function Webhooks() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
      <h3 className="text-base font-bold text-white flex items-center gap-2">
        <BellRing size={18} className="text-indigo-400" />
        <span>Omnichannel Notification Endpoints</span>
      </h3>
      <p className="text-xs text-slate-400">
        Automated alerts dispatched for critical container exceptions,
        temperature excursions, and port gate events.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
          <span className="text-xs font-bold text-indigo-400">
            Microsoft Teams
          </span>
          <p className="text-[11px] text-slate-400">
            #ops-control-tower webhook connected.
          </p>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            CONNECTED
          </span>
        </div>

        <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
          <span className="text-xs font-bold text-cyan-400">Telegram Bot</span>
          <p className="text-[11px] text-slate-400">
            @AtlasOpsAlertsBot active for emergency push.
          </p>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            CONNECTED
          </span>
        </div>

        <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
          <span className="text-xs font-bold text-amber-400">
            Slack Webhook
          </span>
          <p className="text-[11px] text-slate-400">
            #logistics-dispatch channel enabled.
          </p>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            CONNECTED
          </span>
        </div>
      </div>
    </div>
  );
}

export default Webhooks;
