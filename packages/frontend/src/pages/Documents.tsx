import React from 'react';
import { DocumentPreviewer } from '@atlas/ui';
import { FileText } from 'lucide-react';

export default function Documents() {
  const mockDocumentData = {
    type: 'HBL',
    reference: 'HBL-982132',
    shipper: 'Global Exports Ltd',
    consignee: 'Euro Imports Corp',
    vessel: 'MSC Zoe / 192W',
    portOfLoading: 'Shanghai (CNSHA)',
    portOfDischarge: 'Rotterdam (NLRTM)',
    issueDate: '2026-06-15',
    status: 'Original Issued'
  };

  return (
    <div className="flex flex-col h-full bg-slate-100">
      <div className="p-6 bg-white border-b border-slate-200 shrink-0">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <FileText className="text-indigo-600" />
          Document Management
        </h1>
        <p className="text-slate-500 mt-1">Centralised document management for bills of lading, customs declarations, and shipping instructions.</p>
      </div>
      <div className="flex-1 p-6 overflow-hidden">
        <DocumentPreviewer 
          {...(mockDocumentData as any)} 
        />
      </div>
    </div>
  );
}
