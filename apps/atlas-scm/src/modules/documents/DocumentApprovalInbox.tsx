import React, { useState } from 'react';
import { CheckCircle2, XCircle, FileText, ArrowRight, Save } from 'lucide-react';

interface ApprovalDocument {
  id: string;
  fileName: string;
  extractedData: any;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface InboxProps {
  documents: ApprovalDocument[];
  onApprove: (id: string, correctedData: any) => void;
  onReject: (id: string) => void;
}

export function DocumentApprovalInbox({ documents, onApprove, onReject }: InboxProps) {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(
    documents.length > 0 ? documents[0].id : null
  );
  
  const selectedDoc = documents.find(d => d.id === selectedDocId);
  const [editedData, setEditedData] = useState<any>(null);

  // Sync edited data when selection changes
  React.useEffect(() => {
    if (selectedDoc) {
      setEditedData(selectedDoc.extractedData);
    }
  }, [selectedDoc]);

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <CheckCircle2 size={48} className="mb-4 text-emerald-400 opacity-50" />
        <p className="font-medium text-lg">Inbox al día</p>
        <p className="text-sm">No hay documentos pendientes de revisión OCR.</p>
      </div>
    );
  }

  return (
    <div className="flex border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden min-h-[600px]">
      {/* Sidebar List */}
      <div className="w-1/3 border-r border-slate-200 bg-slate-50 flex flex-col">
        <div className="p-4 border-b border-slate-200 font-bold text-slate-700">
          Pendientes de Revisión ({documents.filter(d => d.status === 'PENDING').length})
        </div>
        <div className="flex-1 overflow-y-auto">
          {documents.map(doc => (
            <div 
              key={doc.id}
              onClick={() => setSelectedDocId(doc.id)}
              className={`p-4 border-b border-slate-100 cursor-pointer transition-colors ${
                selectedDocId === doc.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'hover:bg-slate-100 border-l-4 border-l-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className={selectedDocId === doc.id ? 'text-indigo-600' : 'text-slate-400'} size={20} />
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold text-slate-800 truncate">{doc.fileName}</p>
                  <p className="text-xs text-slate-500 mt-1">Extraído vía IA</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor Panel */}
      {selectedDoc && editedData && (
        <div className="w-2/3 flex flex-col">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
            <h3 className="font-bold text-slate-800">Revisión: {selectedDoc.fileName}</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => onReject(selectedDoc.id)}
                className="px-3 py-1.5 text-sm text-red-600 font-medium hover:bg-red-50 rounded-md transition-colors"
              >
                Rechazar
              </button>
              <button 
                onClick={() => onApprove(selectedDoc.id, editedData)}
                className="px-3 py-1.5 text-sm bg-emerald-600 text-white font-medium hover:bg-emerald-700 rounded-md transition-colors flex items-center gap-2"
              >
                <Save size={16} />
                Aprobar y Guardar
              </button>
            </div>
          </div>
          
          <div className="flex-1 p-6 bg-slate-50 overflow-y-auto">
            <div className="grid grid-cols-2 gap-8">
              {/* Fake PDF Viewer placeholder */}
              <div className="bg-slate-200 rounded-lg flex items-center justify-center relative min-h-[400px] border border-slate-300">
                <div className="text-center text-slate-400">
                  <FileText size={64} className="mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-slate-500">Documento Original</p>
                  <p className="text-xs mt-1">(Vista previa del PDF)</p>
                </div>
              </div>

              {/* Form Data */}
              <div className="flex flex-col gap-4">
                <div className="bg-indigo-50 text-indigo-800 p-3 rounded-lg text-sm mb-2 border border-indigo-100 flex items-start gap-2">
                  <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                  <p>La Inteligencia Artificial ha extraído los siguientes campos. Por favor, verifica y corrige antes de guardar.</p>
                </div>

                {Object.keys(editedData).map(key => (
                  <div key={key} className="flex flex-col">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    {typeof editedData[key] === 'string' && editedData[key].length > 50 ? (
                      <textarea
                        value={editedData[key]}
                        onChange={(e) => setEditedData({...editedData, [key]: e.target.value})}
                        className="p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full min-h-[80px]"
                      />
                    ) : (
                      <input
                        type="text"
                        value={editedData[key] || ''}
                        onChange={(e) => setEditedData({...editedData, [key]: e.target.value})}
                        className="p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
