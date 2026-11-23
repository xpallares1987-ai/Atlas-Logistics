/**
 * @file Mapping.tsx
 * @description Bidirectional schema equivalence mapping studio for SAP S/4HANA, NetSuite, and Dynamics 365 BC.
 * @module @atlas/frontend/components/ErpIntegrations/Tab/Mapping
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeftRight } from "lucide-react";

export const Mapping: React.FC = () => {
  return (
    <motion.div
      key="mapping"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
            Matriz de Transformación y Equivalencia de Campos ERP
          </h3>
          <p className="text-xs text-slate-400">
            Mapeo bidireccional entre el modelo canónico de Atlas-Logistics, SAP
            S/4HANA OData, NetSuite SuiteTalk y Dynamics 365 BC
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
              <th className="p-3">Entidad Atlas</th>
              <th className="p-3">SAP S/4HANA</th>
              <th className="p-3">Oracle NetSuite</th>
              <th className="p-3">MS Dynamics 365 BC</th>
              <th className="p-3">Regla Contable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            <tr>
              <td className="p-3 font-mono text-indigo-300 font-semibold">
                shipment.ref
              </td>
              <td className="p-3 font-mono text-blue-300">
                PurchaseOrder (EBELN)
              </td>
              <td className="p-3 font-mono text-amber-300">tranId</td>
              <td className="p-3 font-mono text-teal-300">documentNo</td>
              <td className="p-3 text-slate-400">
                Mapeo directo bidireccional
              </td>
            </tr>
            <tr>
              <td className="p-3 font-mono text-indigo-300 font-semibold">
                shipment.bolNumber
              </td>
              <td className="p-3 font-mono text-blue-300">
                BillOfLading (BOLNR)
              </td>
              <td className="p-3 font-mono text-amber-300">
                packageTrackingNumber
              </td>
              <td className="p-3 font-mono text-teal-300">
                externalDocumentNo
              </td>
              <td className="p-3 text-slate-400">
                Inyección en manifiesto de transporte
              </td>
            </tr>
            <tr>
              <td className="p-3 font-mono text-indigo-300 font-semibold">
                finance.freightAccrual
              </td>
              <td className="p-3 font-mono text-blue-300">
                ServiceEntrySheet (SES)
              </td>
              <td className="p-3 font-mono text-amber-300">
                landedCost.allocated
              </td>
              <td className="p-3 font-mono text-teal-300">
                Account 600000 (Freight Op)
              </td>
              <td className="p-3 text-slate-400">
                Gasto devengado contra provisión 400000
              </td>
            </tr>
            <tr>
              <td className="p-3 font-mono text-indigo-300 font-semibold">
                customs.suplidos
              </td>
              <td className="p-3 font-mono text-blue-300">
                Account 475000 (Pass-Through)
              </td>
              <td className="p-3 font-mono text-amber-300">taxCode: EXEMPT</td>
              <td className="p-3 font-mono text-teal-300">
                Account 475000 (Disbursements)
              </td>
              <td className="p-3 text-slate-400">
                Partida neutra sin margen comercial
              </td>
            </tr>
            <tr>
              <td className="p-3 font-mono text-indigo-300 font-semibold">
                esg.cbamLiability
              </td>
              <td className="p-3 font-mono text-blue-300">
                BAPI_ACC_DOCUMENT_POST
              </td>
              <td className="p-3 font-mono text-amber-300">
                JournalEntry (CBAM)
              </td>
              <td className="p-3 font-mono text-teal-300">
                Account 475100 (CBAM Liability)
              </td>
              <td className="p-3 text-slate-400">
                Reg (UE) 2023/956 indexado a EEX
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
