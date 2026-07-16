import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, Save, ScanLine, Bot, Building2, Package, ArrowRight, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface ParsedData {
  shipperText?: string;
  consigneeText?: string;
  notifyText?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  containers?: { isoCode: string; count: number; weight: number }[];
  commodities?: { hsCode: string; description: string; weight: number; volume: number }[];
  incoterm?: string;
  marksAndNumbers?: string;
}

export default function AiBookingParserModule() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { addNotification } = useAppStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    setError(null);
    setParsedData(null);
    setSuggestions(null);

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(selectedFile.type)) {
      setError("Formato no soportado. Por favor sube un PDF, Word o Imagen (JPG/PNG).");
      return;
    }

    setFile(selectedFile);

    if (selectedFile.type.startsWith('image/') || selectedFile.type === 'application/pdf') {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setParsedData(null);
    setSuggestions(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processDocument = async () => {
    if (!file) return;
    setIsParsing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/ai/parse-shipping-instructions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileBase64: base64, mimeType: file.type })
        });

        const result = await response.json();
        setIsParsing(false);

        if (result.success) {
          setParsedData(result.extractedData);
          setSuggestions(result.suggestions);
          addNotification({
            id: Date.now().toString(),
            title: 'Análisis IA Completado',
            message: 'Se han extraído los datos del documento con éxito.',
            type: 'success',
            read: false,
            timestamp: new Date().toISOString()
          });
        } else {
          setError(result.error || 'Error procesando el documento con la IA.');
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsParsing(false);
      setError(err.message || "Error de red al contactar al servidor de IA.");
    }
  };

  const saveShipment = async () => {
    if (!parsedData || !file) return;

    try {
      // Leer el archivo base64 para enviarlo al backend
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        
        const payload: any = {
          referenceNumber: `BKG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          status: 'DRAFT',
          documentBase64: base64,
          documentMimeType: file.type,
          documentName: file.name
        };
        
        if (suggestions?.shipper?.exactMatch) {
          payload.supplierId = suggestions.shipper.company.id;
        }
        if (suggestions?.consignee?.exactMatch) {
          payload.billingPartyId = suggestions.consignee.company.id;
        }

        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/shipments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Error al guardar el shipment en BD');

        addNotification({
          id: Date.now().toString(),
          title: 'Booking Guardado',
          message: 'El shipment y su documento adjunto se han registrado correctamente.',
          type: 'success',
          read: false,
          timestamp: new Date().toISOString()
        });
        clearFile();
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || "Error al guardar");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 p-6 overflow-hidden">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Bot className="text-indigo-500 w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Smart Booking OCR</h1>
          </div>
          <p className="text-slate-500 font-medium">Extrae automáticamente instrucciones de embarque usando Gemini 1.5 Pro</p>
        </div>
      </header>

      <div className="flex flex-1 gap-6 min-h-0">
        
        {/* LADO IZQUIERDO: Subida / Previsualización */}
        <div className="w-1/2 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {!file ? (
            <form 
              className={`flex-1 flex flex-col items-center justify-center p-12 transition-all ${dragActive ? 'bg-indigo-50 dark:bg-indigo-900/10 border-2 border-indigo-400 border-dashed m-4 rounded-xl' : 'border-2 border-transparent m-4'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpeg,.jpg,.png,.doc,.docx" onChange={handleChange} />
              
              <div className="w-24 h-24 mb-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-inner">
                <UploadCloud className="w-10 h-10 text-slate-400" />
              </div>
              
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2">Arrastra tu documento aquí</h3>
              <p className="text-slate-500 text-center max-w-sm mb-8">Soporta instrucciones de embarque en formato PDF, Word o Imágenes escaneadas.</p>
              
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Seleccionar Archivo
              </button>
            </form>
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <FileText className="text-indigo-500 w-5 h-5" />
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{file.name}</span>
                  <span className="text-xs text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded-full">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                <button onClick={clearFile} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 bg-slate-100 dark:bg-slate-950 overflow-hidden relative flex items-center justify-center">
                {previewUrl ? (
                  file.type === 'application/pdf' ? (
                    <iframe src={`${previewUrl}#toolbar=0`} className="w-full h-full border-none" />
                  ) : (
                    <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                  )
                ) : (
                  <div className="text-slate-400 flex flex-col items-center gap-3">
                    <FileText className="w-16 h-16 opacity-20" />
                    <p>Previsualización no disponible para este formato</p>
                  </div>
                )}
                
                {isParsing && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                    <ScanLine className="w-16 h-16 text-indigo-400 animate-pulse mb-4" />
                    <div className="flex items-center gap-3 bg-slate-900 px-6 py-3 rounded-full shadow-2xl border border-slate-700">
                      <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                      <span className="text-white font-medium">Motor IA extrayendo datos...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* LADO DERECHO: Resultados y Formulario */}
        <div className="w-1/2 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-indigo-500" />
              Datos Extraídos
            </h3>
            
            {!parsedData && file && !isParsing && (
              <button 
                onClick={processDocument}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
              >
                <Bot className="w-4 h-4" />
                Ejecutar IA Parser
              </button>
            )}
            
            {parsedData && (
              <button 
                onClick={saveShipment}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Guardar Booking
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {!parsedData && !isParsing && !error && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Bot className="w-16 h-16 opacity-20 mb-4" />
                <p>Sube un documento y ejecuta el parser para ver los resultados aquí.</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 p-4 rounded-xl flex gap-3 text-red-600 dark:text-red-400 mb-6">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {parsedData && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Entidades Principales */}
                <section>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Entidades Comerciales
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    {/* Shipper */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                      <label className="text-xs font-medium text-slate-500 mb-1 block">Shipper</label>
                      <textarea 
                        className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-medium text-slate-800 dark:text-slate-200 resize-none h-16" 
                        defaultValue={parsedData.shipperText}
                      />
                      {suggestions?.shipper?.exactMatch ? (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Match en BD: <b>{suggestions.shipper.company.name}</b></span>
                        </div>
                      ) : (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                          <AlertCircle className="w-3 h-3" />
                          <span>Compañía nueva. Se registrará al guardar.</span>
                        </div>
                      )}
                    </div>

                    {/* Consignee */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                      <label className="text-xs font-medium text-slate-500 mb-1 block">Consignee</label>
                      <textarea 
                        className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-medium text-slate-800 dark:text-slate-200 resize-none h-16" 
                        defaultValue={parsedData.consigneeText}
                      />
                      {suggestions?.consignee?.exactMatch ? (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Match en BD: <b>{suggestions.consignee.company.name}</b></span>
                        </div>
                      ) : (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                          <AlertCircle className="w-3 h-3" />
                          <span>Se creará un alias de cliente.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Ruta */}
                <section>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" /> Ruta
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                      <label className="text-xs font-medium text-slate-500 mb-1 block">Port of Loading</label>
                      <input className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-medium text-slate-800 dark:text-slate-200" defaultValue={parsedData.portOfLoading} />
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                      <label className="text-xs font-medium text-slate-500 mb-1 block">Port of Discharge</label>
                      <input className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-medium text-slate-800 dark:text-slate-200" defaultValue={parsedData.portOfDischarge} />
                    </div>
                  </div>
                </section>

                {/* Contenedores y Carga */}
                <section>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                    <Package className="w-4 h-4" /> Equipamiento y Carga
                  </h4>
                  <div className="space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                      <label className="text-xs font-medium text-slate-500 mb-2 block">Contenedores Solicitados</label>
                      {parsedData.containers && parsedData.containers.length > 0 ? (
                        <ul className="space-y-2">
                          {parsedData.containers.map((c, i) => (
                            <li key={i} className="flex justify-between text-sm bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{c.count}x {c.isoCode}</span>
                              <span className="text-slate-500">{c.weight} kg</span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-sm text-slate-500">No se encontraron contenedores específicos (¿Es LCL?)</p>}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                      <label className="text-xs font-medium text-slate-500 mb-2 block">Mercancía (Commodities)</label>
                      {parsedData.commodities && parsedData.commodities.length > 0 ? (
                        <ul className="space-y-2">
                          {parsedData.commodities.map((c, i) => (
                            <li key={i} className="text-sm bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                              <p className="font-medium text-slate-800 dark:text-slate-200 mb-1">{c.description}</p>
                              <div className="flex gap-4 text-xs text-slate-500">
                                <span>HS Code: {c.hsCode || 'N/A'}</span>
                                <span>Peso: {c.weight} kg</span>
                                <span>Vol: {c.volume} cbm</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-sm text-slate-500">No se extrajo detalle de mercancía.</p>}
                    </div>
                  </div>
                </section>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
