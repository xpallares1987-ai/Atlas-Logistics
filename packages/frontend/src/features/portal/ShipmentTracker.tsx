import { PackageSearch, Anchor, Truck, ShieldCheck } from "lucide-react";

export function ShipmentTracker({ shipment }: { shipment: any }) {
  const getStatusIcon = (status: string) => {
    if (status === "IN_TRANSIT")
      return <Anchor className="w-5 h-5 text-blue-500" />;
    if (status === "CUSTOMS_CLEARED")
      return <ShieldCheck className="w-5 h-5 text-amber-500" />;
    if (status === "DELIVERED")
      return <Truck className="w-5 h-5 text-emerald-500" />;
    return <PackageSearch className="w-5 h-5 text-slate-500" />;
  };

  const getStatusColor = (status: string) => {
    if (status === "IN_TRANSIT")
      return "bg-blue-50 text-blue-700 border-blue-200";
    if (status === "CUSTOMS_CLEARED")
      return "bg-amber-50 text-amber-700 border-amber-200";
    if (status === "DELIVERED")
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${getStatusColor(shipment.status).replace("border-", "").replace("text-", "")} bg-opacity-50`}
          >
            {getStatusIcon(shipment.status)}
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
              {shipment.referenceNumber}
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold border ${getStatusColor(shipment.status)}`}
              >
                {shipment.status}
              </span>
            </h3>
            <p className="text-sm text-slate-500 font-medium">
              PO Ref:{" "}
              <span className="text-slate-700">{shipment.poNumber}</span>
            </p>
          </div>
        </div>
      </div>
      <div className="p-6 bg-slate-50/50">
        <div className="flex justify-between text-sm font-bold text-slate-700 mb-2">
          <span>{shipment.origin}</span>
          <span className="text-indigo-600">Transit</span>
          <span>{shipment.destination}</span>
        </div>
        <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${shipment.progress === 100 ? "bg-emerald-500" : "bg-indigo-500"}`}
            style={{ width: `${shipment.progress}%` }}
          ></div>
        </div>

        {/* Detailed Events Timeline */}
        {shipment.events && shipment.events.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Milestones
            </h4>
            <div className="space-y-4">
              {shipment.events.map((ev: any, idx: number) => (
                <div key={idx} className="flex gap-4 items-start">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {ev.status}
                    </p>
                    <p className="text-xs text-slate-500 flex gap-2">
                      <span>{ev.location}</span>
                      <span>•</span>
                      <span>{new Date(ev.date).toLocaleDateString()}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
