import {
  Activity,
  Settings,
  CheckCircle2,
  Circle,
  Clock,
  PlayCircle,
} from "lucide-react";
// Assuming the SDK provides these hooks
// import { useGetWorkflowInstanceQuery, useStartWorkflowInstanceMutation } from "@dataconnect/generated/react";

export default function WorkflowManagerModule() {
  // Mocking data for now since we're setting up the UI structure.
  // In a real implementation, you'd swap this with the Data Connect hooks.
  const mockWorkflows = [
    {
      id: "1",
      name: "Order-to-Cash",
      status: "RUNNING",
      context: { orderId: "ORD-001" },
    },
    {
      id: "2",
      name: "Customs-Clearance",
      status: "COMPLETED",
      context: { shipmentId: "SHP-099" },
    },
    {
      id: "3",
      name: "Predictive-ETA",
      status: "PENDING",
      context: { origin: "CNYIT", destination: "MXZLO" },
    },
  ];

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/60 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Settings className="text-indigo-600" size={32} />
            Workflows Modeler
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Manage and visualize automated processes via Firebase Data Connect.
          </p>
        </div>
        <div className="flex gap-4">
          <button className="bg-white border border-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
            Refresh
          </button>
          <button className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 hover:scale-105 transition-all">
            + New Workflow
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">
              Active
            </p>
            <p className="text-3xl font-black text-slate-800">12</p>
          </div>
        </div>
        <div className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">
              Completed
            </p>
            <p className="text-3xl font-black text-slate-800">849</p>
          </div>
        </div>
        <div className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">
              Pending
            </p>
            <p className="text-3xl font-black text-slate-800">5</p>
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 bg-white/50">
          <h2 className="text-xl font-bold text-slate-800">
            Recent Workflow Instances
          </h2>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-400 text-xs uppercase tracking-widest font-bold border-b border-slate-100">
                <th className="pb-4 font-bold">Instance ID</th>
                <th className="pb-4 font-bold">Definition Name</th>
                <th className="pb-4 font-bold">Status</th>
                <th className="pb-4 font-bold">Context / Variables</th>
                <th className="pb-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockWorkflows.map((wf) => (
                <tr
                  key={wf.id}
                  className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="py-4 text-slate-800 font-mono text-sm">
                    {wf.id.padStart(4, "0")}
                  </td>
                  <td className="py-4 font-semibold text-slate-800">
                    {wf.name}
                  </td>
                  <td className="py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        wf.status === "RUNNING"
                          ? "bg-indigo-100 text-indigo-700"
                          : wf.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {wf.status === "RUNNING" && <PlayCircle size={14} />}
                      {wf.status === "COMPLETED" && <CheckCircle2 size={14} />}
                      {wf.status === "PENDING" && <Circle size={14} />}
                      {wf.status}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-600 inline-block max-w-[200px] truncate">
                      {JSON.stringify(wf.context)}
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    <button className="text-indigo-600 font-bold text-sm hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
