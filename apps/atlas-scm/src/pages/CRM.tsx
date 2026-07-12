import React, { useState } from "react";
import { Users, Trello, Calendar as CalendarIcon, Phone } from "lucide-react";
import { CustomersTab } from "../modules/crm/CustomersTab";
import { PipelineTab } from "../modules/crm/PipelineTab";
import { ActivityTab } from "../modules/crm/ActivityTab";

export default function CRM() {
  const [activeTab, setActiveTab] = useState<"customers" | "pipeline" | "activity">("customers");

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CRM (Sales)</h1>
            <p className="text-gray-500">
              Gestión de clientes, oportunidades y actividad comercial
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
        <div className="border-b border-gray-200 shrink-0">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: "customers", name: "Directorio de Clientes", icon: Users },
              { id: "pipeline", name: "Pipeline (Oportunidades)", icon: Trello },
              { id: "activity", name: "Actividad y Visitas", icon: CalendarIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                    ${
                      activeTab === tab.id
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }
                  `}
                >
                  <Icon
                    className={`
                      -ml-0.5 mr-2 h-5 w-5
                      ${activeTab === tab.id ? "text-indigo-500" : "text-gray-400 group-hover:text-gray-500"}
                    `}
                  />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50 p-6">
          {activeTab === "customers" && <CustomersTab />}
          {activeTab === "pipeline" && <PipelineTab />}
          {activeTab === "activity" && <ActivityTab />}
        </div>
      </div>
    </div>
  );
}
