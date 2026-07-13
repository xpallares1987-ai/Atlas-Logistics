import React, { useState } from "react";
import { useListCrmDeals, useUpdateCrmDealStatus } from "@/dataconnect-generated/react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Plus, MoreHorizontal } from "lucide-react";

const PIPELINE_STAGES = [
  { id: "LEAD", name: "Lead / Prospecto", color: "bg-gray-100 border-gray-300" },
  { id: "CONTACTED", name: "Contactado", color: "bg-blue-50 border-blue-200" },
  { id: "QUOTING", name: "Cotizando", color: "bg-yellow-50 border-yellow-200" },
  { id: "NEGOTIATION", name: "Negociación", color: "bg-orange-50 border-orange-200" },
  { id: "WON", name: "Ganado", color: "bg-green-50 border-green-200" },
  { id: "LOST", name: "Perdido", color: "bg-red-50 border-red-200" },
];

export function PipelineTab() {
  const { tenantId } = useAuth();
  const { data, loading, error } = useListCrmDeals({ tenantId: tenantId || "atlas-default-tenant" });
  const [updateDealStatus] = useUpdateCrmDealStatus();

  const handleDrop = async (dealId: string, newStatus: string) => {
    try {
      await updateDealStatus({ id: dealId, status: newStatus });
      window.location.reload(); // Para forzar repintado, en prod usar optimisic update
    } catch (e) {
      console.error(e);
      alert("Error moviendo oportunidad");
    }
  };

  if (loading) return <div className="text-gray-500">Cargando Pipeline...</div>;
  if (error) return <div className="text-red-500">Error al cargar oportunidades</div>;

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900">Tablero de Oportunidades</h2>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Oportunidad
        </button>
      </div>

      <div className="flex flex-1 space-x-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map(stage => {
          const dealsInStage = data?.crmDeals.filter(d => d.status === stage.id) || [];
          const totalValue = dealsInStage.reduce((acc, d) => acc + (d.estimatedValue || 0), 0);

          return (
            <div 
              key={stage.id} 
              className={`flex-shrink-0 w-80 rounded-xl border ${stage.color} flex flex-col`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const dealId = e.dataTransfer.getData("dealId");
                handleDrop(dealId, stage.id);
              }}
            >
              <div className="p-3 border-b border-inherit bg-white/50 rounded-t-xl flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-700 text-sm">{stage.name}</h3>
                  <p className="text-xs text-gray-500">{dealsInStage.length} Deals · ${totalValue.toLocaleString()}</p>
                </div>
                <button className="text-gray-400 hover:text-gray-600"><MoreHorizontal className="h-4 w-4" /></button>
              </div>

              <div className="p-3 flex-1 overflow-y-auto space-y-3">
                {dealsInStage.map(deal => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("dealId", deal.id)}
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {deal.customer.name}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">{deal.title}</h4>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{deal.expectedCloseDate ? new Date(deal.expectedCloseDate.toString()).toLocaleDateString() : 'Sin fecha'}</span>
                      <span className="font-semibold text-indigo-600">${deal.estimatedValue?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
