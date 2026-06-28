'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, Eye, Share2, Plus, CheckCircle, Clock, Edit2, Save, FileBox } from 'lucide-react';
import { fetchAllDocuments, createDocument, issueDocument } from '@/app/actions/docsActions';
import { ediService } from '@/services/ediService';
import { DocumentRecord, BLPayload, ManifestPayload } from '@/types/schema';
import BLTemplate from './components/BLTemplate';
import ManifestTemplate from './components/ManifestTemplate';

export default function DocsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editingPayload, setEditingPayload] = useState<any>(null);

  // EDI State
  const [showEdiModal, setShowEdiModal] = useState(false);
  const [ediMessage, setEdiMessage] = useState<string>('');
  const [ediLoading, setEdiLoading] = useState(false);
  const [ediStatus, setEdiStatus] = useState<{ success: boolean; msg: string } | null>(null);

  const loadDocs = React.useCallback(async () => {
    setLoading(true);
    const docs = await fetchAllDocuments();
    setDocuments(docs);
    if(docs.length > 0) {
       setSelectedDoc(prev => {
         const current = prev ? docs.find(d => d.id === prev.id) : null;
         return current || docs[0];
       });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  useEffect(() => {
    if (selectedDoc) {
      setEditingPayload(JSON.parse(JSON.stringify(selectedDoc.payload)));
      setEditMode(false);
    }
  }, [selectedDoc]);

  const handleSaveEdit = () => {
    // Ideally this would be an API call to update the document back-end
    if (selectedDoc) {
      selectedDoc.payload = editingPayload;
      setEditMode(false);
      // forces re-render
      setDocuments([...documents]); 
    }
  };

  const handleCreateDraftBL = async () => {
    const payload: BLPayload = {
        shipper: 'New Shipper LLC\n123 Export St.',
        consignee: 'New Consignee SA\n456 Import Ave.',
        notifyParty: 'SAME AS CONSIGNEE',
        preCarriageBy: '',
        placeOfReceipt: 'Shanghai',
        vesselVoyage: 'CMA CGM TITAN / 098E',
        portOfLoading: 'CNSHA',
        portOfDischarge: 'MXVER',
        placeOfDelivery: 'Veracruz',
        freightPayableAt: 'DESTINATION',
        numberOfOriginals: 'THREE (3)',
        declaredValue: 'N/A',
        freightTerms: 'COLLECT',
        lines: [
          {
            id: 'l1',
            marks: 'N/M',
            pkgs: '20 PLT',
            description: 'GENERAL CARGO',
            weight: '25,000 KGS',
            measurement: '40 CBM'
          }
        ],
        remarks: 'CLEAN ON BOARD'
    };
    
    const newDoc = await createDocument({
      bookingRef: `BKG-${Math.floor(Math.random() * 1000)}`,
      type: 'HBL',
      payload
    });
    await loadDocs();
    setSelectedDoc(newDoc);
  };

  const handleCreateManifest = async () => {
     const payload: ManifestPayload = {
        vesselVoyage: 'MSC GULSUN / 024W',
        portOfLoading: 'USLAX',
        portOfDischarge: 'ESBCN',
        agentAtDestination: 'FORWARDEROS SPAIN',
        containers: [
           { id: '1', containerNumber: 'MSCU1234567', sealNumber: '887766', type: '40HC', weight: '12,500 KG', volume: '24.5 CBM', pkgs: '10 PLT' }
        ],
        remarks: 'NIL'
     };
     const newDoc = await createDocument({
      bookingRef: `MNF-${Math.floor(Math.random() * 1000)}`,
      type: 'MANIFEST',
      payload
    });
    await loadDocs();
    setSelectedDoc(newDoc);
  };

  const handleIssue = async () => {
    if (!selectedDoc) return;
    try {
      const updated = await issueDocument(selectedDoc.id);
      if (updated) {
        setSelectedDoc(updated);
        await loadDocs();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDownloadPDF = () => {
    if (selectedDoc) {
      window.open(`http://localhost:3000/api/documents/${selectedDoc.id}/pdf`, '_blank');
    }
  };

  const handleGenerateEdi = async () => {
    if (!selectedDoc) return;
    setEdiLoading(true);
    setEdiStatus(null);
    setShowEdiModal(true);
    try {
      const res = await ediService.generateEdi(selectedDoc.id, selectedDoc.type, selectedDoc.payload);
      setEdiMessage(res.content);
    } catch (e: any) {
      setEdiStatus({ success: false, msg: e.message || 'Error generating EDI' });
    } finally {
      setEdiLoading(false);
    }
  };

  const handleTransmitEdi = async () => {
    setEdiLoading(true);
    setEdiStatus(null);
    try {
      const res = await ediService.transmitEdi(ediMessage);
      setEdiStatus({ success: true, msg: `Transmission OK! Receipt: ${res.transmissionId}` });
    } catch (e: any) {
      setEdiStatus({ success: false, msg: e.message || 'Transmission Failed' });
    } finally {
      setEdiLoading(false);
    }
  };

  if (loading && documents.length === 0) {
    return <div className="p-20 text-center text-gray-500">Cargando módulo de documentación...</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto flex flex-col md:flex-row gap-6 h-[calc(100vh-80px)]">
      
      {/* Sidebar: Document List */}
      <div className="w-full md:w-80 flex flex-col gap-4 bg-[#111114] border border-gray-800 rounded-xl p-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-2">
           <h2 className="text-white font-medium">Documentos</h2>
           <div className="flex gap-1 border border-gray-800 rounded p-1">
             <button onClick={handleCreateDraftBL} title="Nuevo B/L" className="text-gray-400 hover:text-blue-400 p-1 hover:bg-gray-800 rounded">
               <FileText className="w-4 h-4" />
             </button>
             <button onClick={handleCreateManifest} title="Nuevo Manifiesto" className="text-gray-400 hover:text-amber-400 p-1 hover:bg-gray-800 rounded">
               <FileBox className="w-4 h-4" />
             </button>
           </div>
        </div>
        
        <div className="space-y-2">
          {documents.map(doc => (
            <button
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selectedDoc?.id === doc.id ? 'bg-[#1a1a24] border-blue-500/50' : 'bg-[#16161A] border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-mono text-sm font-bold text-gray-200">{doc.documentNumber}</span>
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${doc.type === 'MANIFEST' ? 'text-amber-400 bg-amber-400/10' : 'text-blue-400 bg-blue-400/10'}`}>
                  {doc.type}
                </span>
              </div>
              <div className="text-xs text-gray-500 mb-2">Ref: {doc.bookingRef}</div>
              <div className="flex items-center text-xs">
                {doc.status === 'ISSUED' ? <CheckCircle className="w-3 h-3 text-emerald-500 mr-1" /> : <Clock className="w-3 h-3 text-gray-400 mr-1" />}
                <span className={doc.status === 'ISSUED' ? 'text-emerald-500' : 'text-gray-400'}>{doc.status}</span>
              </div>
            </button>
          ))}
          {documents.length === 0 && (
             <div className="text-center text-xs text-gray-600 p-4">No hay documentos registrados</div>
          )}
        </div>
      </div>

      {/* Main Canvas: Document Viewer/Editor */}
      <div className="flex-1 flex flex-col bg-[#111114] border border-gray-800 rounded-xl overflow-hidden">
        {selectedDoc ? (
          <>
            <div className="border-b border-gray-800 bg-[#16161A] p-4 flex justify-between items-center">
               <div>
                  <h3 className="text-white font-medium flex items-center">
                     {selectedDoc.type === 'MANIFEST' ? <FileBox className="w-4 h-4 mr-2 text-amber-500" /> : <FileText className="w-4 h-4 mr-2 text-blue-500" />}
                    Visor de Documento: {selectedDoc.documentNumber}
                  </h3>
               </div>
               <div className="flex gap-2">
                 {selectedDoc.status === 'DRAFT' && (
                   <>
                     {editMode ? (
                       <>
                         <button onClick={handleSaveEdit} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center">
                           <Save className="w-4 h-4 mr-2" /> Guardar Cambios
                         </button>
                         <button onClick={() => {
                           setEditingPayload(JSON.parse(JSON.stringify(selectedDoc.payload)));
                           setEditMode(false);
                         }} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center">
                           Cancelar
                         </button>
                       </>
                     ) : (
                        <button onClick={() => setEditMode(true)} className="bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center">
                          <Edit2 className="w-4 h-4 mr-2" /> Editar
                        </button>
                     )}
                     <button onClick={handleIssue} className="bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-600/30 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center">
                       <CheckCircle className="w-4 h-4 mr-2" /> Emitir Definitivo
                     </button>
                   </>
                 )}
                 {selectedDoc.status === 'ISSUED' && (
                   <button onClick={handleGenerateEdi} className="bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center">
                     <Share2 className="w-4 h-4 mr-2" /> Transmitir EDI
                   </button>
                 )}
                 <button onClick={handleDownloadPDF} className="bg-[#0A0A0B] border border-gray-800 hover:bg-gray-800 text-gray-300 px-4 py-2 rounded-lg text-sm transition flex items-center">
                   <Download className="w-4 h-4 mr-2" /> PDF
                 </button>
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-900 flex justify-center custom-scrollbar">
              <div className="bg-white text-black w-full max-w-[850px] min-h-[1056px] shadow-2xl transition-all relative">
                 {(selectedDoc.type === 'HBL' || selectedDoc.type === 'MBL') && (
                    <BLTemplate 
                       document={selectedDoc} 
                       payload={editingPayload as BLPayload} 
                       editMode={editMode} 
                       onChange={(p) => setEditingPayload(p)} 
                    />
                 )}
                 {selectedDoc.type === 'MANIFEST' && (
                    <ManifestTemplate 
                       document={selectedDoc} 
                       payload={editingPayload as ManifestPayload} 
                       editMode={editMode} 
                       onChange={(p) => setEditingPayload(p)} 
                    />
                 )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
             <FileText className="w-12 h-12 mb-4 text-gray-800" />
            <p>Selecciona o crea un documento para visualizarlo.</p>
          </div>
        )}
      </div>

      {/* EDI Modal */}
      {showEdiModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111114] border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-[#16161A]">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-500" />
                Transmisión EDIFACT
              </h2>
              <button onClick={() => setShowEdiModal(false)} className="text-gray-400 hover:text-white transition">Cerrar</button>
            </div>
            <div className="p-6">
              {ediLoading && !ediMessage ? (
                <div className="text-center text-gray-500 py-8">Generando payload EDI...</div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Mensaje Generado (Raw Payload)</label>
                    <textarea 
                      readOnly 
                      value={ediMessage} 
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-4 text-emerald-400 font-mono text-xs focus:outline-none h-48 custom-scrollbar" 
                    />
                  </div>
                  
                  {ediStatus && (
                    <div className={`p-4 rounded-lg mb-4 text-sm font-medium border ${ediStatus.success ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      {ediStatus.msg}
                    </div>
                  )}

                  <div className="flex justify-end mt-4">
                    <button 
                      onClick={handleTransmitEdi} 
                      disabled={ediLoading || (ediStatus?.success === true)}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-blue-900/20"
                    >
                      {ediLoading ? 'Transmitiendo...' : 'Transmitir a VAN'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

