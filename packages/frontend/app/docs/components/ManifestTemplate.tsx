import React from 'react';
import { DocumentRecord, ManifestPayload } from '@/types/schema';

export default function ManifestTemplate({ document, payload, editMode, onChange }: { 
    document: DocumentRecord, 
    payload: ManifestPayload, 
    editMode: boolean, 
    onChange: (p: ManifestPayload) => void 
}) {
  if (!payload) return null;

  const handleChange = (field: keyof ManifestPayload, value: string) => {
    onChange({ ...payload, [field]: value });
  };

  const handleContainerChange = (index: number, field: string, value: string) => {
    const newContainers = [...(payload.containers || [])];
    newContainers[index] = { ...newContainers[index], [field]: value };
    onChange({ ...payload, containers: newContainers });
  };

  const addContainer = () => {
    onChange({ 
      ...payload, 
      containers: [...(payload.containers || []), { id: `c-${Date.now()}`, containerNumber: '', sealNumber: '', type: '', weight: '', volume: '', pkgs: '' }] 
    });
  };

  return (
    <div className="p-8 md:p-12 text-[12px] leading-snug font-sans">
      
      {/* Header */}
      <div className="border-b-2 border-gray-900 pb-3 mb-6 flex justify-between items-start">
        <div>
            <h1 className="text-2xl font-black tracking-tighter">FORWARDER<span className="text-blue-600">OS</span></h1>
            <p className="text-[10px] text-gray-600 font-medium">CARGO MANIFEST SYSTEM</p>
        </div>
        <div className="text-right">
            <h2 className="text-2xl font-bold uppercase text-gray-800 mb-1 leading-none">CARGO MANIFEST</h2>
            <p className="text-sm font-bold">Doc No: <span className="font-mono text-amber-600">{document.documentNumber}</span></p>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-6 mb-8">
         <div className="space-y-4">
            <div className="flex">
               <span className="w-32 font-bold uppercase text-gray-500">Vessel/Voyage:</span>
               {editMode ? (
                 <input type="text" className="flex-1 border-b border-gray-300 font-mono" value={payload.vesselVoyage} onChange={e => handleChange('vesselVoyage', e.target.value)} />
               ) : <span className="flex-1 font-mono font-bold border-b border-gray-200">{payload.vesselVoyage}</span>}
            </div>
            <div className="flex">
               <span className="w-32 font-bold uppercase text-gray-500">Port of Loading:</span>
               {editMode ? (
                 <input type="text" className="flex-1 border-b border-gray-300 font-mono" value={payload.portOfLoading} onChange={e => handleChange('portOfLoading', e.target.value)} />
               ) : <span className="flex-1 font-mono font-bold border-b border-gray-200">{payload.portOfLoading}</span>}
            </div>
         </div>
         <div className="space-y-4">
            <div className="flex">
               <span className="w-40 font-bold uppercase text-gray-500">Port of Discharge:</span>
               {editMode ? (
                 <input type="text" className="flex-1 border-b border-gray-300 font-mono" value={payload.portOfDischarge} onChange={e => handleChange('portOfDischarge', e.target.value)} />
               ) : <span className="flex-1 font-mono font-bold border-b border-gray-200">{payload.portOfDischarge}</span>}
            </div>
            <div className="flex">
               <span className="w-40 font-bold uppercase text-gray-500">Agent at Dest:</span>
               {editMode ? (
                 <input type="text" className="flex-1 border-b border-gray-300 font-mono" value={payload.agentAtDestination} onChange={e => handleChange('agentAtDestination', e.target.value)} />
               ) : <span className="flex-1 font-mono font-bold border-b border-gray-200">{payload.agentAtDestination}</span>}
            </div>
         </div>
      </div>

      {/* Container List Table */}
      <div className="mb-6 border border-gray-900 rounded overflow-hidden">
        <table className="w-full text-left">
           <thead className="bg-gray-100 border-b border-gray-900 text-[10px] uppercase font-bold text-gray-700">
              <tr>
                 <th className="p-2 border-r border-gray-300">Container No.</th>
                 <th className="p-2 border-r border-gray-300">Seal No.</th>
                 <th className="p-2 border-r border-gray-300">Type</th>
                 <th className="p-2 border-r border-gray-300">Packages</th>
                 <th className="p-2 border-r border-gray-300">Weight</th>
                 <th className="p-2">Volume</th>
              </tr>
           </thead>
           <tbody className="font-mono text-xs divide-y divide-gray-200">
              {(payload.containers || []).map((cnt, idx) => (
                 <tr key={cnt.id} className="hover:bg-gray-50">
                    <td className="p-2 border-r border-gray-200">
                      {editMode ? <input type="text" className="w-full border p-1" value={cnt.containerNumber} onChange={e=>handleContainerChange(idx, 'containerNumber', e.target.value)}/> : cnt.containerNumber}
                    </td>
                    <td className="p-2 border-r border-gray-200">
                      {editMode ? <input type="text" className="w-full border p-1" value={cnt.sealNumber} onChange={e=>handleContainerChange(idx, 'sealNumber', e.target.value)}/> : cnt.sealNumber}
                    </td>
                    <td className="p-2 border-r border-gray-200">
                      {editMode ? <input type="text" className="w-full border p-1" value={cnt.type} onChange={e=>handleContainerChange(idx, 'type', e.target.value)}/> : cnt.type}
                    </td>
                    <td className="p-2 border-r border-gray-200">
                      {editMode ? <input type="text" className="w-full border p-1" value={cnt.pkgs} onChange={e=>handleContainerChange(idx, 'pkgs', e.target.value)}/> : cnt.pkgs}
                    </td>
                    <td className="p-2 border-r border-gray-200">
                      {editMode ? <input type="text" className="w-full border p-1" value={cnt.weight} onChange={e=>handleContainerChange(idx, 'weight', e.target.value)}/> : cnt.weight}
                    </td>
                    <td className="p-2">
                      {editMode ? <input type="text" className="w-full border p-1" value={cnt.volume} onChange={e=>handleContainerChange(idx, 'volume', e.target.value)}/> : cnt.volume}
                    </td>
                 </tr>
              ))}
           </tbody>
        </table>
      </div>
      {editMode && (
         <button onClick={addContainer} className="mb-8 text-amber-600 font-bold border border-amber-600 px-3 py-1 rounded hover:bg-amber-50 shadow-sm">+ Add Container</button>
      )}

      {/* Summary */}
      <div className="flex justify-end mb-12">
        <div className="w-64 bg-gray-50 border border-gray-300 p-4 rounded text-right">
           <div className="font-bold uppercase text-[10px] text-gray-500 mb-2">Manifest Totals</div>
           <p className="font-mono text-sm mb-1">Total Containers: <span className="font-bold">{payload.containers?.length || 0}</span></p>
        </div>
      </div>

      <div className="border-t-2 border-gray-900 pt-4 flex justify-between items-end">
         <div>
            <h3 className="font-bold uppercase text-gray-500 mb-1">Remarks</h3>
            {editMode ? (
               <textarea className="w-80 border p-2 text-xs font-mono" rows={3} value={payload.remarks} onChange={e => handleChange('remarks', e.target.value)} />
            ) : <div className="font-mono text-xs">{payload.remarks}</div>}
         </div>
         <div className="text-center w-64">
            <div className="border-b border-gray-600 h-12 mb-1"></div>
            <p className="uppercase text-[10px] text-gray-500 font-bold">Authorized Agent Signature</p>
         </div>
      </div>
    </div>
  );
}
