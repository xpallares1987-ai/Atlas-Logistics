import React from "react";
import { motion, Variants } from "framer-motion";
import { PartnerRecord } from "../../types/edi-integration.types";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export interface EdiPartnersTabProps {
  partners: PartnerRecord[];
}

export const EdiPartnersTab: React.FC<EdiPartnersTabProps> = ({ partners }) => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {partners.map((p) => (
        <motion.div
          key={p.id}
          variants={itemVariants}
          className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between gap-4"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-indigo-400 px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                {p.standard}
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                ACTIVO
              </span>
            </div>
            <h3 className="font-extrabold text-white text-base">{p.name}</h3>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <span>Protocolo:</span>
              <span className="font-mono text-indigo-300 font-bold">
                {p.transportProtocol}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-2xl border border-white/5 font-mono">
            <div>
              <div className="text-[9px] text-slate-500 uppercase">
                Sender ID
              </div>
              <div className="font-bold text-slate-200">
                {p.senderId} ({p.senderQualifier})
              </div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase">
                Receiver ID
              </div>
              <div className="font-bold text-slate-200">
                {p.receiverId} ({p.receiverQualifier})
              </div>
            </div>
          </div>

          {p.endpointUrl && (
            <div className="text-[11px] text-slate-500 truncate font-mono">
              {p.endpointUrl}
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
};
