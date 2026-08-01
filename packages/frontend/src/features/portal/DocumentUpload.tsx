import { UploadCloud, FileText, CheckCircle } from "lucide-react";
import { useState, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export function DocumentUpload({ shipmentId }: { shipmentId: string }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("shipmentId", shipmentId);
      formData.append("type", "Commercial Invoice");

      try {
        const res = await fetch(`${API_URL}/documents/upload`, {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          setUploaded(true);
        }
      } catch (err) {
        console.error("Upload failed", err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <UploadCloud className="text-indigo-500 w-5 h-5" />
        <h3 className="text-lg font-black text-slate-800">Upload Documents</h3>
      </div>
      <div className="p-6 bg-slate-50 text-center">
        {uploaded ? (
          <div className="flex flex-col items-center justify-center p-4">
            <CheckCircle className="w-10 h-10 text-emerald-500 mb-2" />
            <p className="font-bold text-slate-700">
              Document Uploaded Successfully
            </p>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed ${isUploading ? "border-indigo-400 bg-indigo-50" : "border-slate-300 bg-white hover:bg-slate-50"} rounded-xl p-8 transition-colors cursor-pointer flex flex-col items-center justify-center`}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            {isUploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
            ) : (
              <FileText className="w-8 h-8 text-slate-400 mb-3" />
            )}
            <p className="text-sm font-bold text-slate-700">
              {isUploading ? "Uploading..." : "Drag & Drop files here"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Commercial Invoice, Packing List, PO
            </p>
            {!isUploading && (
              <button className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-sm">
                Browse Files
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
