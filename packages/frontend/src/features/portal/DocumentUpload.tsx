import {
  UploadCloud,
  FileText,
  CheckCircle,
  DownloadCloud,
  File,
} from "lucide-react";
import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input } from "@atlas/ui";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export function DocumentUpload({ shipmentId }: { shipmentId: string }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["shipmentDocuments", shipmentId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/documents?shipmentId=${shipmentId}`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    },
  });

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
          queryClient.invalidateQueries({
            queryKey: ["shipmentDocuments", shipmentId],
          });
          setTimeout(() => setUploaded(false), 3000);
        }
      } catch (err) {
        console.error("Upload failed", err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const downloadDoc = (doc: any) => {
    window.open(`http://localhost:3005${doc.url}`, "_blank");
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="text-indigo-500 w-5 h-5" />
          <h3 className="text-lg font-black text-slate-800">
            Shipment Documents
          </h3>
        </div>
      </div>
      <div className="p-4 bg-white">
        {!isLoading && documents.length > 0 && (
          <div className="mb-6 space-y-3">
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
              Available Documents
            </h4>
            {documents.map((doc: any) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <File className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-800">
                      {doc.name}
                    </p>
                    <p className="text-xs text-slate-500">{doc.type}</p>
                  </div>
                </div>
                <Button
                  onClick={() => downloadDoc(doc)}
                  variant="ghost"
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors h-auto"
                  title="Download Document"
                >
                  <DownloadCloud className="w-5 h-5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-6 text-center">
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
              className={`rounded-xl transition-colors cursor-pointer flex flex-col items-center justify-center ${isUploading ? "opacity-50" : "hover:bg-slate-100"}`}
            >
              <Input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              {isUploading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
              ) : (
                <UploadCloud className="w-8 h-8 text-slate-400 mb-3" />
              )}
              <p className="text-sm font-bold text-slate-700">
                {isUploading
                  ? "Uploading..."
                  : "Click or Drag & Drop to upload more files"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Commercial Invoice, Packing List, PO
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
