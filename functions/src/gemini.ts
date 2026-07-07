import { GoogleGenAI } from "@google/genai";

export async function generatePredictiveETA(apiKey: string, shipmentData: any) {
  if (!apiKey) {
    throw new Error("Missing Gemini API Key");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
  Eres un experto analista de cadena de suministro de "Atlas Logistics".
  Analiza los siguientes datos de envío y predice si habrá retrasos, justificando la razón, y proveyendo un ETA ajustado.
  Datos del envío: ${JSON.stringify(shipmentData)}
  
  Considera factores como congestión portuaria, problemas meteorológicos, etc. (puedes simularlos para este análisis predictivo).
  
  Devuelve la respuesta en este formato JSON exacto sin markdown:
  {
    "riskLevel": "LOW" | "MEDIUM" | "HIGH",
    "predictedDelayDays": number,
    "adjustedEta": "YYYY-MM-DD",
    "reasoning": "Explicación detallada del porqué",
    "confidenceScore": number
  }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text?.replace(/```json/g, '').replace(/```/g, '') || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini prediction error:", error);
    throw new Error("Failed to generate predictive ETA");
  }
}

export async function processDocumentOCR(apiKey: string, base64Image: string, mimeType: string) {
  if (!apiKey) throw new Error("Missing Gemini API Key");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
  Eres un experto extractor de datos logísticos.
  Analiza esta imagen de un documento de transporte (Bill of Lading, Factura Comercial, Packing List).
  Extrae los datos clave y devuelve este JSON exacto:
  {
    "documentType": "BILL_OF_LADING" | "COMMERCIAL_INVOICE" | "PACKING_LIST" | "UNKNOWN",
    "referenceNumber": "string",
    "shipper": "string",
    "consignee": "string",
    "originPort": "string",
    "destinationPort": "string",
    "totalWeightKg": number,
    "totalVolumeCbm": number,
    "totalValue": number,
    "currency": "string"
  }
  Si algún dato no está presente, devuelve null para ese campo. Sin markdown, solo el JSON puro.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        prompt,
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType,
          }
        }
      ]
    });
    const text = response.text?.replace(/```json/g, '').replace(/```/g, '') || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini OCR error:", error);
    throw new Error("Failed to process document OCR");
  }
}

export async function executeDataAnalystChat(apiKey: string, question: string) {
  if (!apiKey) throw new Error("Missing Gemini API Key");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
  Eres el 'Atlas Data Analyst', un agente de inteligencia artificial experto en SQL y análisis de cadena de suministro.
  La base de datos tiene la tabla 'Shipments' con campos: trackingNumber, status, origin, destination, weight, createdAt, etc.
  
  Pregunta del usuario: "${question}"
  
  Devuelve una respuesta estructurada en JSON con:
  {
    "sqlQuery": "La query de Postgres aproximada (o null si es conversacional)",
    "friendlyResponse": "Respuesta humana para el usuario",
    "chartSuggestion": "bar" | "line" | "pie" | "none"
  }
  Sin markdown, solo JSON puro.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const text = response.text?.replace(/```json/g, '').replace(/```/g, '') || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Chat error:", error);
    throw new Error("Failed to process chat with data");
  }
}

export async function calculateLCLBinPacking(apiKey: string, containerSpec: any, cargoPool: any[]) {
  if (!apiKey) throw new Error("Missing Gemini API Key");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
  Eres un algoritmo avanzado de Bin-Packing (Empaquetado LCL) con IA.
  Tienes un contenedor: ${JSON.stringify(containerSpec)} (Dimensiones en cm, peso en kg).
  Tienes la siguiente carga disponible para consolidar (Pool): ${JSON.stringify(cargoPool)}.
  
  Debes seleccionar qué piezas de carga entran en el contenedor maximizando el volumen y peso sin pasarse de los límites del contenedor.
  
  Devuelve un JSON exacto:
  {
    "selectedCargoIds": ["id1", "id2"],
    "totalWeight": number,
    "totalVolume": number,
    "utilizationPercentage": number,
    "reasoning": "Breve explicación de la lógica de optimización utilizada"
  }
  Sin markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const text = response.text?.replace(/```json/g, '').replace(/```/g, '') || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini BinPacking error:", error);
    throw new Error("Failed to calculate LCL bin packing");
  }
}
