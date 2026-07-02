import React from 'react';
import { DocumentPreviewer } from '@xpallares1987-ai/control-tower-ui';

export default function DocumentsPage() {
  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Visor de Documentos</h1>
        <p className="text-gray-400">Previsualización de HBL</p>
      </div>
      
      <div className="flex-1 bg-[#111114] border border-gray-800 rounded-xl overflow-hidden">
        <DocumentPreviewer 
          type="HBL" 
          reference="HBL-982132" 
          shipper="Global Exports Ltd" 
          consignee="Logistics Importers Inc"
          vessel="MSC Zoe"
          portOfLoading="Shanghai"
          portOfDischarge="Rotterdam"
        />
      </div>
    </div>
  );
}
