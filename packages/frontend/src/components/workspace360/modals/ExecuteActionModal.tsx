import React from "react";
import { CheckCircle2, Info, RefreshCw, Sparkles, Zap } from "lucide-react";
import { ResolutionJustificationSelect } from "../../common/ResolutionJustificationSelect";
import { ExecuteActionModalProps } from "../../../types/shipment-workspace360.types";

export const ExecuteActionModal: React.FC<ExecuteActionModalProps> = ({
  modalState,
  onClose,
  onSubmit,
  submitting,
  onChangeInputs,
}) => {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md md:max-w-lg bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between">
          {/* Drawer Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-inner">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Contextual Action Drawer
                </h3>
                <p className="text-xs text-slate-400">
                  Supply Chain Execution & Resolution Protocol
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg text-sm font-bold transition"
              title="Close Drawer"
            >
              ✕
            </button>
          </div>

          {/* Drawer Body: Explain -> Decide -> Act */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Step 1: Explain */}
            <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> 1. Explain Context & Impact
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                  {modalState.type === "RESOLVE_EXCEPTION"
                    ? "Exception"
                    : "Workflow Task"}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">
                {modalState.title}
              </h4>
              <p className="text-slate-300 leading-relaxed">
                {modalState.description}
              </p>
              <div className="pt-2 border-t border-indigo-500/20 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Target ID:</span>
                <span className="text-indigo-300 font-semibold">
                  {modalState.targetId}
                </span>
              </div>
            </div>

            {/* Step 2 & 3: Decide & Act */}
            <form
              id="drawer-action-form"
              onSubmit={onSubmit}
              className="space-y-4"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> 2. Decide & Act
              </div>

              {modalState.type === "RESOLVE_EXCEPTION" ? (
                <div className="space-y-4">
                  <ResolutionJustificationSelect
                    id="modal-resolution-note"
                    value={modalState.inputs["resolutionNote"] || ""}
                    onChange={(val) =>
                      onChangeInputs({
                        ...modalState.inputs,
                        resolutionNote: val,
                      })
                    }
                  />

                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Executing resolution will write an immutable domain event
                      to the Outbox and unblock downstream DAG tasks.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {modalState.primaryAction?.inputFields &&
                  modalState.primaryAction.inputFields.length > 0 ? (
                    modalState.primaryAction.inputFields.map((f) => (
                      <div key={f.name}>
                        <label
                          htmlFor={`modal-field-${f.name}`}
                          className="block text-xs font-semibold text-slate-300 mb-1"
                        >
                          {f.label}{" "}
                          {f.required && (
                            <span className="text-rose-400">*</span>
                          )}
                        </label>
                        <input
                          id={`modal-field-${f.name}`}
                          name={f.name}
                          aria-label={f.label}
                          type={f.type === "number" ? "number" : "text"}
                          required={f.required}
                          value={modalState.inputs[f.name] || ""}
                          onChange={(e) =>
                            onChangeInputs({
                              ...modalState.inputs,
                              [f.name]: e.target.value,
                            })
                          }
                          placeholder={`Enter ${f.label.toLowerCase()}...`}
                          className="w-full p-2.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <span>
                        No additional parameters required. Submitting will
                        advance the DAG workflow and persist the domain
                        mutation.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Drawer Footer: Confirm */}
          <div className="p-6 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              form="drawer-action-form"
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />{" "}
                  Committing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm & Execute Mutation
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
