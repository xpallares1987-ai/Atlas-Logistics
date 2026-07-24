import { UploadCloud, FileText } from "lucide-react";

export function DocumentUpload({}: { shipmentId: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <UploadCloud className="text-indigo-500 w-5 h-5" />
        <h3 className="text-lg font-black text-slate-800">Upload Documents</h3>
      </div>
      <div className="p-6 bg-slate-50 text-center">
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 bg-white hover:bg-slate-50 transition-colors cursor-pointer flex flex-col items-center justify-center">
          <FileText className="w-8 h-8 text-slate-400 mb-3" />
          <p className="text-sm font-bold text-slate-700">
            Drag & Drop files here
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Commercial Invoice, Packing List, PO
          </p>
          <button className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-sm">
            Browse Files
          </button>
        </div>
      </div>
    </div>
  );
}
