import React from "react";

export default function WorkflowManagerModule() {
  const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const bullMqUrl = `${backendUrl}/admin/queues`;

  return (
    <div className="h-full w-full bg-slate-50 min-h-[calc(100vh-4rem)] flex flex-col">
      <div className="p-6 pb-2 shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Workflow Engine Dashboard
            </h1>
            <p className="text-slate-500 mt-1">
              Monitor background jobs, orchestrate tasks, and manage dead-letter
              queues.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 pt-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full h-full min-h-[600px] relative">
          {/* We use an iframe to embed the BullMQ Board directly in the frontend */}
          <iframe
            src={bullMqUrl}
            title="BullMQ Dashboard"
            className="w-full h-full border-none absolute inset-0"
          />
        </div>
      </div>
    </div>
  );
}
