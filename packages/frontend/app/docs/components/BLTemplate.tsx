import React from 'react';
import { DocumentRecord, BLPayload } from '@/types/schema';

export default function BLTemplate({ document, payload, editMode, onChange }: { 
    document: DocumentRecord, 
    payload: BLPayload, 
    editMode: boolean, 
    onChange: (p: BLPayload) => void 
}) {
  if (!payload) return null;

  const handleChange = (field: keyof BLPayload, value: string) => {
    onChange({ ...payload, [field]: value });
  };

  const handleLineChange = (index: number, field: string, value: string) => {
    const newLines = [...(payload.lines || [])];
    newLines[index] = { ...newLines[index], [field]: value };
    onChange({ ...payload, lines: newLines });
  };

  const addLine = () => {
    onChange({ 
      ...payload, 
      lines: [...(payload.lines || []), { id: `l-${Date.now()}`, marks: '', pkgs: '', description: '', weight: '', measurement: '' }] 
    });
  };

  return (
    <div className="p-8 md:p-12 text-[11px] leading-snug font-sans">
      
      {/* Header */}
      <div className="border-b-2 border-gray-900 pb-3 mb-4 flex justify-between items-start">
        <div>
            <h1 className="text-2xl font-black tracking-tighter">FORWARDER<span className="text-blue-600">OS</span></h1>
            <p className="text-[10px] text-gray-600 font-medium">B/L ISSUANCE SYSTEM</p>
        </div>
        <div className="text-right">
            <h2 className="text-xl font-bold uppercase text-gray-400 mb-1 leading-none">{document.type === 'HBL' ? 'HOUSE BILL OF LADING' : 'MASTER BILL OF LADING'}</h2>
            <p className="text-sm font-bold">B/L No: <span className="font-mono text-blue-600">{document.documentNumber}</span></p>
        </div>
      </div>

      <div className="border-2 border-gray-900 grid grid-cols-2">
        {/* Left Column */}
        <div className="border-r border-gray-900">
           <div className="border-b border-gray-900 p-2 min-h-[100px]">
             <h3 className="font-bold uppercase text-gray-500 mb-1">1. Shipper / Exporter</h3>
             {editMode ? (
               <textarea className="w-full border p-1 rounded font-mono text-xs" rows={3} value={payload.shipper} onChange={e => handleChange('shipper', e.target.value)} />
             ) : (
               <div className="font-mono text-xs whitespace-pre-wrap">{payload.shipper}</div>
             )}
           </div>
           <div className="border-b border-gray-900 p-2 min-h-[100px]">
             <h3 className="font-bold uppercase text-gray-500 mb-1">2. Consignee</h3>
             {editMode ? (
               <textarea className="w-full border p-1 rounded font-mono text-xs" rows={3} value={payload.consignee} onChange={e => handleChange('consignee', e.target.value)} />
             ) : (
               <div className="font-mono text-xs whitespace-pre-wrap">{payload.consignee}</div>
             )}
           </div>
           <div className="p-2 min-h-[100px]">
             <h3 className="font-bold uppercase text-gray-500 mb-1">3. Notify Party</h3>
             {editMode ? (
               <textarea className="w-full border p-1 rounded font-mono text-xs" rows={3} value={payload.notifyParty} onChange={e => handleChange('notifyParty', e.target.value)} />
             ) : (
               <div className="font-mono text-xs whitespace-pre-wrap">{payload.notifyParty}</div>
             )}
           </div>
        </div>

        {/* Right Column */}
        <div>
           <div className="border-b border-gray-900 p-2 min-h-[100px] flex flex-col justify-end">
              <div className="text-right">
                <p className="font-bold uppercase text-gray-500">Booking Reference</p>
                <p className="font-mono font-bold text-sm">{document.bookingRef}</p>
              </div>
           </div>
           <div className="border-b border-gray-900 p-2">
             <h3 className="font-bold text-gray-500 mb-1">Point and Country of Origin</h3>
             <div className="font-mono text-xs">AS PER B/L</div>
           </div>
           <div className="border-b border-gray-900 p-2">
             <h3 className="font-bold text-gray-500 mb-1">For Delivery of goods please apply to:</h3>
             <div className="font-mono text-xs text-gray-400">DESTINATION AGENT</div>
           </div>
        </div>
      </div>

      <div className="border-x-2 border-b-2 border-gray-900 grid grid-cols-4">
         <div className="border-r border-gray-900 p-2">
           <h3 className="font-bold uppercase text-gray-500 mb-1">Pre-Carriage by</h3>
           {editMode ? (
               <input type="text" className="w-full border p-1 font-mono text-xs" value={payload.preCarriageBy} onChange={e => handleChange('preCarriageBy', e.target.value)} />
             ) : <div className="font-mono font-bold">{payload.preCarriageBy || '---'}</div>}
         </div>
         <div className="border-r border-gray-900 p-2">
           <h3 className="font-bold uppercase text-gray-500 mb-1">Place of Receipt</h3>
           {editMode ? (
               <input type="text" className="w-full border p-1 font-mono text-xs" value={payload.placeOfReceipt} onChange={e => handleChange('placeOfReceipt', e.target.value)} />
             ) : <div className="font-mono font-bold">{payload.placeOfReceipt || '---'}</div>}
         </div>
         <div className="border-r border-gray-900 p-2 col-span-2">
           <h3 className="font-bold uppercase text-gray-500 mb-1">Ocean Vessel / Voy No.</h3>
           {editMode ? (
               <input type="text" className="w-full border p-1 font-mono text-xs" value={payload.vesselVoyage} onChange={e => handleChange('vesselVoyage', e.target.value)} />
             ) : <div className="font-mono font-bold">{payload.vesselVoyage || '---'}</div>}
         </div>
         <div className="border-t border-r border-gray-900 p-2">
           <h3 className="font-bold uppercase text-gray-500 mb-1">Port of Loading</h3>
           {editMode ? (
               <input type="text" className="w-full border p-1 font-mono text-xs" value={payload.portOfLoading} onChange={e => handleChange('portOfLoading', e.target.value)} />
             ) : <div className="font-mono font-bold">{payload.portOfLoading || '---'}</div>}
         </div>
         <div className="border-t border-r border-gray-900 p-2">
           <h3 className="font-bold uppercase text-gray-500 mb-1">Port of Discharge</h3>
           {editMode ? (
               <input type="text" className="w-full border p-1 font-mono text-xs" value={payload.portOfDischarge} onChange={e => handleChange('portOfDischarge', e.target.value)} />
             ) : <div className="font-mono font-bold">{payload.portOfDischarge || '---'}</div>}
         </div>
         <div className="border-t border-gray-900 p-2 col-span-2">
           <h3 className="font-bold uppercase text-gray-500 mb-1">Place of Delivery</h3>
           {editMode ? (
               <input type="text" className="w-full border p-1 font-mono text-xs" value={payload.placeOfDelivery} onChange={e => handleChange('placeOfDelivery', e.target.value)} />
             ) : <div className="font-mono font-bold">{payload.placeOfDelivery || '---'}</div>}
         </div>
      </div>

      {/* Cargo description area */}
      <div className="border-x-2 border-b-2 border-gray-900 min-h-[300px] flex flex-col relative">
        <div className="grid grid-cols-12 border-b border-gray-900 bg-gray-50 font-bold uppercase text-[10px] text-gray-600">
           <div className="col-span-3 p-2 border-r border-gray-200">Marks & Numbers</div>
           <div className="col-span-2 p-2 border-r border-gray-200">No. Pkgs</div>
           <div className="col-span-5 p-2 border-r border-gray-200">Description of Packages and Goods</div>
           <div className="col-span-1 p-2 border-r border-gray-200 text-right">Gross W.</div>
           <div className="col-span-1 p-2 text-right">Meas.</div>
        </div>
        
        <div className="p-2 flex-1">
          {(!payload.lines || payload.lines.length === 0) && !editMode && (
             <div className="text-center text-gray-400 mt-10">No items</div>
          )}
          
          {(payload.lines || []).map((line, idx) => (
             <div key={line.id} className="grid grid-cols-12 mb-4 font-mono text-[11px] gap-2">
                {editMode ? (
                   <>
                     <div className="col-span-3"><textarea className="w-full border p-1" rows={3} value={line.marks} onChange={e=>handleLineChange(idx, 'marks', e.target.value)} /></div>
                     <div className="col-span-2"><input type="text" className="w-full border p-1" value={line.pkgs} onChange={e=>handleLineChange(idx, 'pkgs', e.target.value)} /></div>
                     <div className="col-span-5"><textarea className="w-full border p-1" rows={3} value={line.description} onChange={e=>handleLineChange(idx, 'description', e.target.value)} /></div>
                     <div className="col-span-1"><input type="text" className="w-full border p-1" value={line.weight} onChange={e=>handleLineChange(idx, 'weight', e.target.value)} /></div>
                     <div className="col-span-1"><input type="text" className="w-full border p-1" value={line.measurement} onChange={e=>handleLineChange(idx, 'measurement', e.target.value)} /></div>
                   </>
                ) : (
                   <>
                     <div className="col-span-3 whitespace-pre-wrap">{line.marks}</div>
                     <div className="col-span-2 whitespace-pre-wrap font-bold">{line.pkgs}</div>
                     <div className="col-span-5 whitespace-pre-wrap leading-relaxed">{line.description}</div>
                     <div className="col-span-1 text-right whitespace-pre-wrap">{line.weight}</div>
                     <div className="col-span-1 text-right whitespace-pre-wrap">{line.measurement}</div>
                   </>
                )}
             </div>
          ))}
          {editMode && (
             <button onClick={addLine} className="mt-2 text-blue-600 font-bold border border-blue-600 px-2 rounded hover:bg-blue-50">+ Add Line</button>
          )}

          <div className="mt-12 text-center uppercase font-bold tracking-widest text-[10px]">
             *** Shipper&apos;s Load, Stow, and Count ***<br/>
             *** Freight {payload.freightTerms} ***
          </div>
        </div>
      </div>
      
      <div className="border-x-2 border-b-2 border-gray-900 grid grid-cols-4 min-h-[80px]">
         <div className="border-r border-gray-900 p-2 col-span-2">
            <p className="uppercase text-[9px] text-gray-500 font-bold">Declared Value</p>
            {editMode ? (
               <input type="text" className="w-full border p-1 font-mono text-xs mt-1" value={payload.declaredValue} onChange={e => handleChange('declaredValue', e.target.value)} />
            ) : <div className="mt-1 font-mono font-bold text-sm">{payload.declaredValue}</div>}
         </div>
         <div className="border-r border-gray-900 p-2">
            <p className="uppercase text-[9px] text-gray-500 font-bold">Freight Payable At</p>
            {editMode ? (
               <input type="text" className="w-full border p-1 font-mono text-xs mt-1" value={payload.freightPayableAt} onChange={e => handleChange('freightPayableAt', e.target.value)} />
            ) : <div className="mt-1 font-mono font-bold text-sm">{payload.freightPayableAt}</div>}
         </div>
         <div className="p-2">
            <p className="uppercase text-[9px] text-gray-500 font-bold">No. of Original B/L</p>
            {editMode ? (
               <input type="text" className="w-full border p-1 font-mono text-xs mt-1" value={payload.numberOfOriginals} onChange={e => handleChange('numberOfOriginals', e.target.value)} />
            ) : <div className="mt-1 font-mono font-bold text-sm">{payload.numberOfOriginals}</div>}
         </div>
      </div>

      <div className="border-x-2 border-b-2 border-gray-900 p-2 h-[120px] relative">
         <p className="uppercase text-[9px] text-gray-500 font-bold leading-tight w-2/3">RECEIVED by the Carrier from the Shipper in apparent good order and condition unless otherwise indicated herein, the Goods, or the container(s) or package(s) said to contain the cargo herein mentioned, to be carried subject to all the terms and conditions provided for on the face and back of this Bill of Lading.</p>
         <div className="absolute right-4 bottom-2 text-center w-64">
            <div className="border-b border-gray-600 h-10 mb-1 text-blue-800 flex items-center justify-center font-cursive text-xl">
              {document.status === 'ISSUED' && "John Doe"}
            </div>
            <p className="uppercase text-[9px] text-gray-500 font-bold">Authorized Signature</p>
         </div>
      </div>
      
    </div>
  );
}
