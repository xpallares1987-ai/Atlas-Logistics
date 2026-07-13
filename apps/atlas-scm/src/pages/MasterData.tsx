import React, { useState } from "react";
import { FileCode2, Anchor, Database, Calendar, BookOpen } from "lucide-react";

import { HsCodesTab } from "../modules/master-data/HsCodesTab";
import { IncotermsTab } from "../modules/master-data/IncotermsTab";
import { VesselsTab } from "../modules/master-data/VesselsTab";
import { SchedulesTab } from "../modules/master-data/SchedulesTab";
import { DictionaryTab } from "../modules/master-data/DictionaryTab";

export function MasterData() {
  const [activeTab, setActiveTab] = useState<"hscodes" | "incoterms" | "vessels" | "schedules" | "dictionary">("schedules");

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Master Data
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Gestiona los catálogos y datos maestros del ERP logístico
          </p>
        </div>
      </div>

      {/* <MasterDataStats /> */}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px px-6 space-x-8" aria-label="Tabs">
            {[
              { id: "schedules", name: "Schedules", icon: Calendar },
              { id: "vessels", name: "Vessels", icon: Anchor },
              { id: "hscodes", name: "HS Codes", icon: FileCode2 },
              { id: "incoterms", name: "Incoterms", icon: Database },
              { id: "dictionary", name: "Dictionary", icon: BookOpen },
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
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }
                  `}
                >
                  <Icon
                    className={`
                      -ml-0.5 mr-2 h-5 w-5
                      ${activeTab === tab.id ? "text-blue-500" : "text-gray-400 group-hover:text-gray-500"}
                    `}
                  />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "schedules" && <SchedulesTab />}
          {activeTab === "vessels" && <VesselsTab />}
          {activeTab === "incoterms" && <IncotermsTab />}
          {activeTab === "hscodes" && <HsCodesTab />}
          {activeTab === "dictionary" && <DictionaryTab />}
        </div>
      </div>
    </div>
  );
}
