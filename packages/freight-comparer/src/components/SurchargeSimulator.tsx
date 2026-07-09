import React, { useState } from "react";
import { SurchargeRule, LanguageCode } from "../types";
import { Calculator, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { LOCALES } from "../locale";

interface Props {
  activeSurcharges: SurchargeRule[];
  onChange: (surcharges: SurchargeRule[]) => void;
  lang: LanguageCode;
}

const DEFAULT_SURCHARGES: Omit<SurchargeRule, "id" | "active">[] = [
  {
    name: "PSS Red Sea",
    type: "PSS",
    amount: 500,
    currency: "USD",
    calcMethod: "PER_TEU",
  },
  {
    name: "BAF Q3 Adjust",
    type: "BAF",
    amount: 250,
    currency: "USD",
    calcMethod: "PER_TEU",
  },
  {
    name: "CAF Market Fluctuations",
    type: "CAF",
    amount: 5,
    currency: "USD",
    calcMethod: "PERCENTAGE",
  },
];

export default function SurchargeSimulator({
  activeSurcharges,
  onChange,
  lang,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSurcharge = (id: string) => {
    onChange(
      activeSurcharges.map((s) =>
        s.id === id ? { ...s, active: !s.active } : s,
      ),
    );
  };

  const addDefaultSurcharge = (
    surchargeInfo: Omit<SurchargeRule, "id" | "active">,
  ) => {
    const newSurcharge: SurchargeRule = {
      ...surchargeInfo,
      id: crypto.randomUUID(),
      active: true,
    };
    onChange([...activeSurcharges, newSurcharge]);
  };

  const removeSurcharge = (id: string) => {
    onChange(activeSurcharges.filter((s) => s.id !== id));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6 overflow-hidden">
      <div
        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">
              Pricing Engine: Dynamic Surcharges
            </h3>
            <p className="text-xs text-slate-500">
              Simulate BAF, CAF, and PSS impacts on freight costs
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activeSurcharges.some((s) => s.active) && (
            <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
              {activeSurcharges.filter((s) => s.active).length} Active
            </span>
          )}
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="px-6 pb-6 border-t border-slate-100 pt-4 bg-slate-50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Surcharges */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Active Rules
              </h4>
              {activeSurcharges.length === 0 ? (
                <div className="text-sm text-slate-500 italic py-4 text-center border-2 border-dashed border-slate-200 rounded-lg">
                  No surcharge rules defined. Add one from the templates.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeSurcharges.map((s) => (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${s.active ? "bg-white border-indigo-200 shadow-sm" : "bg-transparent border-slate-200 opacity-60"} transition-all`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleSurcharge(s.id)}
                          className="text-indigo-600 hover:text-indigo-700 focus:outline-none"
                        >
                          {s.active ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-300" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-slate-900">
                              {s.name}
                            </span>
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">
                              {s.type}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {s.calcMethod === "PERCENTAGE"
                              ? `${s.amount}% of Ocean Freight`
                              : `+ ${s.amount} ${s.currency} per BL`}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeSurcharge(s.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Templates */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Templates
              </h4>
              <div className="space-y-2">
                {DEFAULT_SURCHARGES.map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => addDefaultSurcharge(template)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors text-left"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-slate-800">
                          {template.name}
                        </span>
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">
                          {template.type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {template.calcMethod === "PERCENTAGE"
                          ? `${template.amount}%`
                          : `+${template.amount} ${template.currency}`}
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-indigo-500" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
