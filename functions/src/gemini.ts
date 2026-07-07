import { GoogleGenAI } from "@google/genai";

const MODEL_NAME = "models/gemini-3.1-pro-preview";

const interactionConfig = {
  temperature: 0.2,
  max_output_tokens: 65536,
  topP: 0.95,
  thinkingLevel: "high" as const,
  responseMimeType: "application/json",
};

export async function generatePredictiveETA(apiKey: string, shipmentData: any) {
  if (!apiKey) {
    throw new Error("Missing Gemini API Key");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
  Eres un experto analista de cadena de suministro de "Atlas Logistics".
  Analiza los siguientes datos de envío y predice si habrá retrasos, justificando la razón, y proveyendo un ETA ajustado.
  Datos del envío: ${JSON.stringify(shipmentData)}
  
  Utiliza la herramienta de Google Search para investigar si hay problemas actuales de congestión portuaria, mal tiempo u otros retrasos reales que puedan afectar la ruta de este envío (especialmente en los puertos de origen y destino indicados).
  
  Devuelve la respuesta final en este formato JSON exacto sin markdown:
  {
    "riskLevel": "LOW" | "MEDIUM" | "HIGH",
    "predictedDelayDays": number,
    "adjustedEta": "YYYY-MM-DD",
    "reasoning": "Explicación detallada del porqué, integrando tus hallazgos de búsqueda en la vida real",
    "confidenceScore": number
  }
  `;

  try {
    const interaction = await ai.interactions.create({
      model: MODEL_NAME,
      input: prompt,
      tools: [{ type: "google_search" }],
      generation_config: interactionConfig,
    });

    const lastStep = interaction.steps && interaction.steps.length > 0
      ? (interaction.steps[interaction.steps.length - 1] as any)
      : undefined;
    const text = lastStep?.model_turn?.parts ? lastStep.model_turn.parts[0]?.text?.replace(/```json/g, "").replace(/```/g, "") : lastStep?.model_turn?.parts?.at(0)?.text?.replace(/```json/g, "").replace(/```/g, "") || "{}";
    return JSON.parse(text.trim());
  } catch (error) {
    console.warn("Gemini 3.1 Pro prediction error, attempting fallback to gemini-2.5-flash:", error);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });
      const text = response.text?.replace(/```json/g, '').replace(/```/g, '') || "{}";
      return JSON.parse(text);
    } catch (fallbackError) {
      console.error("Gemini ETA fallback failed:", fallbackError);
      throw new Error("Failed to generate predictive ETA");
    }
  }
}

export async function processDocumentOCR(apiKey: string, base64Image: string, mimeType: string) {
  if (!apiKey) throw new Error("Missing Gemini API Key");
  
  // Limit payload size to 5MB to prevent memory exhaustion (OOM)
  const approxSizeMb = (base64Image.length * 3) / 4 / (1024 * 1024);
  if (approxSizeMb > 5) {
    throw new Error("El archivo excede el tamaño máximo permitido de 5MB.");
  }

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
      ],
      config: {
        responseMimeType: "application/json",
      }
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

  // Simple protection against prompt injection and SQL DDL/DML injection
  const injectionPatterns = [
    /drop\s+/i,
    /truncate\s+/i,
    /delete\s+/i,
    /insert\s+/i,
    /update\s+/i,
    /alter\s+/i,
    /grant\s+/i,
    /revoke\s+/i,
    /syscolumns/i,
    /sysobjects/i,
  ];

  const hasInjection = injectionPatterns.some((pattern) => pattern.test(question));
  if (hasInjection) {
    return {
      sqlQuery: null,
      friendlyResponse: "Error de seguridad: La consulta contiene comandos no autorizados o potencialmente peligrosos.",
      chartSuggestion: "none",
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
  Eres el 'Atlas Data Analyst', un agente de inteligencia artificial experto en SQL y análisis de cadena de suministro.
  La base de datos tiene la tabla 'Shipments' con campos: trackingNumber, status, origin, destination, weight, createdAt, etc.
  
  Pregunta del usuario: "${question}"
  
  Puedes usar la herramienta de ejecución de código (Code Execution) si necesitas realizar análisis complejos, simulaciones de datos o cálculos que requieran Python. También puedes usar Google Search si la pregunta involucra información externa de puertos o tendencias.
  
  Devuelve una respuesta estructurada en JSON con:
  {
    "sqlQuery": "La query de Postgres aproximada (o null si es conversacional)",
    "friendlyResponse": "Respuesta humana para el usuario, detallada y razonada",
    "chartSuggestion": "bar" | "line" | "pie" | "none"
  }
  Sin markdown, solo JSON puro.
  `;

  try {
    const interaction = await ai.interactions.create({
      model: MODEL_NAME,
      input: prompt,
      tools: [
        { type: "code_execution" },
        { type: "google_search" }
      ],
      generation_config: interactionConfig,
    });

    const lastStep = interaction.steps && interaction.steps.length > 0
      ? (interaction.steps[interaction.steps.length - 1] as any)
      : undefined;
    const text = lastStep?.model_turn?.parts ? lastStep.model_turn.parts[0]?.text?.replace(/```json/g, "").replace(/```/g, "") : lastStep?.model_turn?.parts?.at(0)?.text?.replace(/```json/g, "").replace(/```/g, "") || "{}";
    return JSON.parse(text.trim());
  } catch (error) {
    console.warn("Gemini 3.1 Pro Analyst chat error, attempting fallback to gemini-2.5-flash:", error);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });
      const text = response.text?.replace(/```json/g, '').replace(/```/g, '') || "{}";
      return JSON.parse(text);
    } catch (fallbackError) {
      console.error("Gemini chat fallback failed:", fallbackError);
      throw new Error("Failed to process chat with data");
    }
  }
}

export async function calculateLCLBinPacking(apiKey: string, containerSpec: any, cargoPool: any[]) {
  if (!apiKey) throw new Error("Missing Gemini API Key");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
  Eres un algoritmo avanzado de Bin-Packing (Empaquetado LCL) con IA.
  Tienes un contenedor: ${JSON.stringify(containerSpec)} (Dimensiones en cm, peso en kg).
  Tienes la siguiente carga disponible para consolidar (Pool): ${JSON.stringify(cargoPool)}.
  
  Debes escribir y ejecutar un script de Python (con Code Execution) para calcular el empaquetado tridimensional (3D bin packing) óptimo de la carga en el contenedor, maximizando la utilización de volumen y peso sin exceder los límites del contenedor.
  
  Devuelve un JSON exacto con los resultados computados por tu script:
  {
    "selectedCargoIds": ["id1", "id2"],
    "totalWeight": number,
    "totalVolume": number,
    "utilizationPercentage": number,
    "reasoning": "Breve explicación de la lógica de optimización matemática ejecutada en Python"
  }
  Sin markdown.
  `;

  try {
    const interaction = await ai.interactions.create({
      model: MODEL_NAME,
      input: prompt,
      tools: [{ type: "code_execution" }],
      generation_config: interactionConfig,
    });

    const lastStep = interaction.steps && interaction.steps.length > 0
      ? (interaction.steps[interaction.steps.length - 1] as any)
      : undefined;
    const text = lastStep?.model_turn?.parts ? lastStep.model_turn.parts[0]?.text?.replace(/```json/g, "").replace(/```/g, "") || "{}" : lastStep?.model_turn?.parts?.at(0)?.text?.replace(/```json/g, "").replace(/```/g, "") || "{}";
    return JSON.parse(text.trim());
  } catch (error) {
    console.warn("Gemini 3.1 Pro BinPacking error, attempting fallback to gemini-2.5-flash:", error);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });
      const text = response.text?.replace(/```json/g, '').replace(/```/g, '') || "{}";
      return JSON.parse(text);
    } catch (fallbackError) {
      console.error("Gemini BinPacking fallback failed:", fallbackError);
      throw new Error("Failed to calculate LCL bin packing");
    }
  }
}
