import React from "react";
import { Input, Button } from "@atlas/ui";
import { DcsaSubscriptionModalProps } from "../../../types/edi-integration.types";

export const DcsaSubscriptionModal: React.FC<DcsaSubscriptionModalProps> = ({
  isOpen,
  onClose,
  subCarrier,
  onSubCarrierChange,
  subUrl,
  onSubUrlChange,
  subSecret,
  onSubSecretChange,
  isSubmitting,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="p-3.5 rounded-2xl bg-slate-950 border border-indigo-500/30 flex flex-col gap-2.5 text-xs">
      <div>
        <label
          htmlFor="sub-carrier-select"
          className="text-[10px] text-slate-400 block mb-1"
        >
          Carrier Code
        </label>
        <select
          id="sub-carrier-select"
          name="subCarrier"
          value={subCarrier}
          onChange={(e: any) => onSubCarrierChange(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-1.5 text-xs text-white"
        >
          <option value="MSCU">MSCU (MSC)</option>
          <option value="MAEU">MAEU (Maersk)</option>
          <option value="CMDU">CMDU (CMA CGM)</option>
          <option value="HLCU">HLCU (Hapag-Lloyd)</option>
        </select>
      </div>
      <div>
        <label
          htmlFor="sub-url-input"
          className="text-[10px] text-slate-400 block mb-1"
        >
          Callback URL (Webhook)
        </label>
        <Input
          id="sub-url-input"
          name="subUrl"
          value={subUrl}
          onChange={(e: any) => onSubUrlChange(e.target.value)}
          className="bg-slate-900 border-slate-800 text-xs"
        />
      </div>
      <div>
        <label
          htmlFor="sub-secret-input"
          className="text-[10px] text-slate-400 block mb-1"
        >
          Secret Token (HMAC SHA-256)
        </label>
        <Input
          id="sub-secret-input"
          name="subSecret"
          value={subSecret}
          onChange={(e: any) => onSubSecretChange(e.target.value)}
          className="bg-slate-900 border-slate-800 text-xs font-mono"
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button
          onClick={onClose}
          variant="ghost"
          className="text-xs text-slate-400"
        >
          Cancelar
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-xl font-bold"
        >
          {isSubmitting ? "Guardando..." : "Guardar Suscripción"}
        </Button>
      </div>
    </div>
  );
};
