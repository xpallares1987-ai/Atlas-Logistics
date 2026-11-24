/**
 * @file LetterOfCreditViewer.tsx
 * @description Documentary Credits & Trade Finance viewer (tsmt.019 / MT700) for e-B/L presentation tracking.
 * @module @atlas/frontend/components/FinancialClearing/Tab/BankingIso20022/LetterOfCreditViewer
 * @see {@link docs/adr/0040-financial-settlement-automated-clearing-and-outbox-event-bus.md}
 */

import React from "react";
import {
  FileText,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { Button } from "../../../ui/Button";

export interface LetterOfCreditRecord {
  id: string;
  lcNumber: string;
  applicant: string;
  beneficiary: string;
  issuingBankBic: string;
  advisingBankBic: string;
  amount: number;
  currency: string;
  expiryDate: string;
  presentationStatus:
    "DRAFT" | "ISSUED" | "DOCS_PRESENTED" | "HONORED" | "DISCREPANT";
  eBlAttached: boolean;
  eBlNumber?: string;
  ucp600Compliant: boolean;
}

export interface LetterOfCreditViewerProps {
  records?: LetterOfCreditRecord[];
  onSelectLc?: (lc: LetterOfCreditRecord) => void;
}

const DEFAULT_LC_RECORDS: LetterOfCreditRecord[] = [
  {
    id: "lc_01",
    lcNumber: "LC-2026-ES-9921",
    applicant: "Atlas Logistics Mediterranean S.A.",
    beneficiary: "Singapore Logistics Pte. Ltd.",
    issuingBankBic: "BBVAESMMXXX",
    advisingBankBic: "DBSGSGSGXXX",
    amount: 145000.0,
    currency: "USD",
    expiryDate: "2026-12-15",
    presentationStatus: "DOCS_PRESENTED",
    eBlAttached: true,
    eBlNumber: "EBL-WAVE-2026-4411",
    ucp600Compliant: true,
  },
  {
    id: "lc_02",
    lcNumber: "LC-2026-FR-5502",
    applicant: "Atlas Logistique France SAS",
    beneficiary: "Rotterdam Stevedoring Hub B.V.",
    issuingBankBic: "BNPAFRPPXXX",
    advisingBankBic: "INGBNL2AXXX",
    amount: 88500.0,
    currency: "EUR",
    expiryDate: "2026-12-30",
    presentationStatus: "ISSUED",
    eBlAttached: true,
    eBlNumber: "EBL-GSBN-2026-1092",
    ucp600Compliant: true,
  },
  {
    id: "lc_03",
    lcNumber: "LC-2026-DE-8109",
    applicant: "Atlas Spedition Hamburg GmbH",
    beneficiary: "Shanghai Maritime Logistics Ltd.",
    issuingBankBic: "DEUTDEDDXXX",
    advisingBankBic: "BKCHCNBJXXX",
    amount: 320000.0,
    currency: "USD",
    expiryDate: "2026-11-28",
    presentationStatus: "HONORED",
    eBlAttached: true,
    eBlNumber: "EBL-BOLERO-2026-8831",
    ucp600Compliant: true,
  },
];

export const LetterOfCreditViewer: React.FC<LetterOfCreditViewerProps> = ({
  records = DEFAULT_LC_RECORDS,
  onSelectLc,
}) => {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            Trade Finance & Documentary Credits (tsmt.019 / MT700)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time presentation status and electronic Bill of Lading (e-B/L)
            endorsement compliance under UCP 600.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {records.map((lc) => (
          <div
            key={lc.id}
            className="bg-slate-900/60 border border-white/10 hover:border-white/20 p-5 rounded-2xl backdrop-blur-xl transition-all flex flex-col justify-between h-64"
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
                  {lc.lcNumber}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                    lc.presentationStatus === "HONORED"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : lc.presentationStatus === "DOCS_PRESENTED"
                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        : lc.presentationStatus === "DISCREPANT"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {lc.presentationStatus === "HONORED" ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : lc.presentationStatus === "DISCREPANT" ? (
                    <ShieldAlert className="w-3 h-3" />
                  ) : (
                    <Clock className="w-3 h-3" />
                  )}
                  {lc.presentationStatus}
                </span>
              </div>

              <h4 className="text-sm font-bold text-white truncate mb-1">
                {lc.applicant}
              </h4>
              <p className="text-xs text-slate-400 truncate mb-3">
                to: {lc.beneficiary}
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-white/5 font-mono">
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block">
                    Issuing BIC
                  </span>
                  {lc.issuingBankBic}
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-500 block">
                    Advising BIC
                  </span>
                  {lc.advisingBankBic}
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-white/10 flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">
                  Credit Value
                </p>
                <p className="text-lg font-black text-white">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: lc.currency,
                  }).format(lc.amount)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {lc.eBlAttached && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> e-B/L
                  </span>
                )}
                {onSelectLc && (
                  <Button
                    variant="ghost"
                    onClick={() => onSelectLc(lc)}
                    className="p-1.5 h-auto text-indigo-400 hover:text-indigo-300 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
