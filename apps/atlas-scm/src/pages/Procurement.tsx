import React, { useState } from "react";
import { Ship, Truck, Globe, Briefcase } from "lucide-react";
import { CarriersTab } from "../modules/procurement/CarriersTab";
import { HauliersTab } from "../modules/procurement/HauliersTab";
import { AgentsTab } from "../modules/procurement/AgentsTab";

export default function Procurement() {
  const [activeTab, setActiveTab] = useState<"carriers" | "hauliers" | "agents">("carriers");

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Procurement (Compras)</h1>
            <p className="text-gray-500">
              Gestión de Navieras, Transportistas y Agentes Corresponsales
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
        <div className="border-b border-gray-200 shrink-0">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: "carriers", name: "Navieras (Carriers)", icon: Ship },
              { id: "hauliers", name: "Transportistas (Hauliers)", icon: Truck },
              { id: "agents", name: "Agentes en Destino", icon: Globe },
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
                        ? "border-emerald-500 text-emerald-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }
                  `}
                >
                  <Icon
                    className={`
                      -ml-0.5 mr-2 h-5 w-5
                      ${activeTab === tab.id ? "text-emerald-500" : "text-gray-400 group-hover:text-gray-500"}
                    `}
                  />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50 p-6">
          {activeTab === "carriers" && <CarriersTab />}
          {activeTab === "hauliers" && <HauliersTab />}
          {activeTab === "agents" && <AgentsTab />}
        </div>
      </div>
    </div>
  );
}
