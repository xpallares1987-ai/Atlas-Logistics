import React, { useState } from 'react';
import { DocumentPreviewer } from '@/components';
import { FileText, Wand2, UploadCloud, Search } from 'lucide-react';
import { SmartOCRDropzone } from './SmartOCRDropzone';
import { DocumentApprovalInbox } from './DocumentApprovalInbox';
import { 
  useListShipments,
  useListPendingOcrDocuments,
  useCreateDocumentFromOcr,
  useApproveOcrDocument,
  useRejectOcrDocument
} from '@dataconnect/generated';
import { useAuth } from '@/components/auth/AuthProvider';

export default function Documents() {
  const { tenantId } = useAuth();
  
  // Tab management
  const [activeTab, setActiveTab] = useState<'GENERATOR' | 'OCR'>('GENERATOR');

  // Shipment Selection for Generator
  const { data: shipmentsData } = useListShipments({ tenantId: tenantId || 'atlas-default-tenant' });
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>('');

  // OCR Inbox State
  const { data: ocrDocsData, refetch: refetchOcr } = useListPendingOcrDocuments();
  const [createDoc] = useCreateDocumentFromOcr();
  const [approveDoc] = useApproveOcrDocument();
  const [rejectDoc] = useRejectOcrDocument();

  const ocrDocuments = ocrDocsData?.documents || [];

  const handleDataExtracted = async (data: any) => {
    try {
      await createDoc({
        documentNumber: data.documentNumber || null,
        documentType: "UNKNOWN",
        fileName: `Scanned_Document_${Math.floor(Math.random() * 1000)}.pdf`,
        fileUrl: "https://example.com/fake-url.pdf",
        mimeType: "application/pdf",
        extractedData: data
      });
      await refetchOcr();
    } catch (e) {
      console.error("Error saving document:", e);
      alert("Error al guardar el documento.");
    }
  };

  const handleApproveOcr = async (id: string, correctedData: any) => {
    try {
      await approveDoc({
        id,
        extractedData: correctedData,
        // Opcional: Podríamos vincularlo a un Shipment aquí si documentNumber coincide
      });
      await refetchOcr();
    } catch (e) {
      console.error("Error approving document:", e);
      alert("Error al aprobar.");
    }
  };

  const handleRejectOcr = async (id: string) => {
    try {
      await rejectDoc({ id });
      await refetchOcr();
    } catch (e) {
      console.error("Error rejecting document:", e);
      alert("Error al rechazar.");
    }
  };

  // Find selected shipment to generate BL
  const selectedShipment = shipmentsData?.shipments.find(s => s.trackingNumber === selectedShipmentId);

  return (
    <div className="flex flex-col h-full bg-slate-100">
      <div className="p-6 bg-white border-b border-slate-200 shrink-0">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <FileText className="text-indigo-600" />
          Document Management
        </h1>
        <p className="text-slate-500 mt-1">Generación automática de BLs y digitalización OCR de documentos externos.</p>
        
        {/* Tabs */}
        <div className="flex gap-4 mt-6">
          <button 
            onClick={() => setActiveTab('GENERATOR')}
            className={`pb-2 font-medium transition-colors border-b-2 ${activeTab === 'GENERATOR' ? 'text-indigo-600 border-indigo-600' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
          >
            Generador de PDFs
          </button>
          <button 
            onClick={() => setActiveTab('OCR')}
            className={`pb-2 font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'OCR' ? 'text-indigo-600 border-indigo-600' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
          >
            Bandeja OCR (IA) <Wand2 size={16} />
            {ocrDocuments.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{ocrDocuments.length}</span>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-hidden flex flex-col h-full">
        {activeTab === 'GENERATOR' && (
          <div className="h-full flex flex-col gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200 flex items-center gap-4 shrink-0 shadow-sm">
              <Search className="text-slate-400" />
              <select 
                value={selectedShipmentId}
                onChange={e => setSelectedShipmentId(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-md p-2 outline-none focus:border-indigo-500"
              >
                <option value="">-- Selecciona un Embarque para generar BL --</option>
                {shipmentsData?.shipments.map(s => (
                  <option key={s.trackingNumber} value={s.trackingNumber}>
                    {s.trackingNumber} - {s.origin} a {s.destination} ({s.customer?.name})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex-1 overflow-auto">
              {selectedShipment ? (
                <DocumentPreviewer 
                  type="HBL"
                  reference={selectedShipment.trackingNumber || ''}
                  shipper={selectedShipment.supplier?.name || "No especificado"}
                  consignee={selectedShipment.customer?.name || "No especificado"}
                  vessel={selectedShipment.vesselName || "TBD"}
                  pol={selectedShipment.origin || ""}
                  pod={selectedShipment.destination || ""}
                  marksAndNumbers="N/M"
                  descriptionOfGoods={selectedShipment.movementType + " CARGO"}
                  grossWeight="0 KGS"
                  measurement="0 CBM"
                  issueDate={new Date().toISOString().split('T')[0]}
                  onDownload={() => alert("Generando PDF (html2pdf)...")}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <p>Selecciona un embarque para visualizar el Bill of Lading.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'OCR' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full overflow-hidden">
            <div className="xl:col-span-1">
              <SmartOCRDropzone onDataExtracted={handleDataExtracted} />
            </div>
            <div className="xl:col-span-2 h-full">
              <DocumentApprovalInbox 
                documents={ocrDocuments} 
                onApprove={handleApproveOcr} 
                onReject={handleRejectOcr} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
