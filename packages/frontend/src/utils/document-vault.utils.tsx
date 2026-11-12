import React from "react";
import {
  FileText,
  ShieldCheck,
  Ship,
  Plane,
  Truck,
  TrainTrack,
  FileCheck,
  Snowflake,
  Leaf,
  Anchor,
  FileSignature,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";

export const getDocumentTypeIcon = (type: string): React.ReactNode => {
  switch (type) {
    case "HBL":
      return <Ship className="text-blue-400" size={18} />;
    case "DUA":
      return <FileCheck className="text-amber-400" size={18} />;
    case "ECMR":
      return <Truck className="text-emerald-400" size={18} />;
    case "AWB":
      return <Plane className="text-indigo-400" size={18} />;
    case "CIM":
      return <TrainTrack className="text-orange-400" size={18} />;
    case "INSURANCE_CERT":
      return <ShieldCheck className="text-teal-400" size={18} />;
    case "CONTRACT":
      return <FileSignature className="text-cyan-400" size={18} />;
    case "GDP_CERT":
      return <Snowflake className="text-sky-400" size={18} />;
    case "CBAM_DECLARATION":
      return <Leaf className="text-lime-400" size={18} />;
    case "DGR_DECLARATION":
      return <AlertTriangle className="text-red-400" size={18} />;
    case "AEO_7POINT":
      return <ShieldAlert className="text-violet-400" size={18} />;
    case "LAYTIME_SHEET":
      return <Anchor className="text-amber-500" size={18} />;
    default:
      return <FileText className="text-slate-400" size={18} />;
  }
};
