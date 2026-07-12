import React, { useState, useCallback } from 'react';
import { UploadCloud, FileType, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface SmartOCRDropzoneProps {
  onDataExtracted: (data: any) => void;
}

export function SmartOCRDropzone({ onDataExtracted }: SmartOCRDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    if (!apiKey) {
      setError("Falta la API Key de Gemini en el archivo .env (VITE_GEMINI_API_KEY)");
      return;
    }

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError("Solo se soportan imágenes y PDFs.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // Convert file to Base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          
          const prompt = `You are a logistics document parsing AI. Extract the key entities from this document and output ONLY a valid JSON object matching this structure (use null if a field is not found):
{
  "shipper": "Company Name and Address",
  "consignee": "Company Name and Address",
  "documentNumber": "Invoice or BL number",
  "vessel": "Vessel Name",
  "pol": "Port of Loading",
  "pod": "Port of Discharge",
  "grossWeight": "Total weight",
  "descriptionOfGoods": "Short description"
}`;

          const result = await model.generateContent([
            prompt,
            {
              inlineData: {
                data: base64Data,
                mimeType: file.type
              }
            }
          ]);

          const responseText = result.response.text();
          console.log("Raw Gemini Response:", responseText);

          // Clean markdown from JSON response if present
          const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
          const cleanJson = jsonMatch ? jsonMatch[1] : responseText;
          
          const extractedData = JSON.parse(cleanJson);
          onDataExtracted(extractedData);
        } catch (err: any) {
          setError("Error analizando el documento: " + err.message);
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);

    } catch (err: any) {
      setError(err.message);
      setIsAnalyzing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [apiKey]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-all duration-300 relative
        ${isDragging ? 'border-indigo-500 bg-indigo-50 shadow-inner' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}
        ${isAnalyzing ? 'opacity-75 pointer-events-none' : ''}
      `}
    >
      {isAnalyzing ? (
        <div className="flex flex-col items-center gap-4 animate-pulse text-indigo-600">
          <Loader2 size={48} className="animate-spin" />
          <p className="font-semibold text-lg text-slate-700">IA Analizando Documento...</p>
          <p className="text-sm text-slate-500">Extrayendo datos clave (Shipper, Consignee, Pesos)</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-slate-500 text-center">
          <div className="p-4 bg-white rounded-full shadow-sm">
            <UploadCloud size={48} className="text-indigo-400" />
          </div>
          <div>
            <p className="font-bold text-slate-700 text-lg">Arrastra un documento logístico aquí</p>
            <p className="text-sm mt-1">Soporta Facturas Comerciales, Packing Lists, o BLs en formato Imagen/PDF.</p>
          </div>
          
          <label className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium cursor-pointer hover:bg-indigo-700 transition-colors shadow-sm">
            Explorar Archivos
            <input 
              type="file" 
              className="hidden" 
              accept="image/*,application/pdf"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
              }}
            />
          </label>
        </div>
      )}

      {error && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-100 text-red-700 p-3 rounded-md flex items-center gap-2 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
    </div>
  );
}
