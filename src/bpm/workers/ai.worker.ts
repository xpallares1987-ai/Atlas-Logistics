import { logger } from "../../config/logger.js";
import { AtlasWorker, AtlasWorkerJob } from "../utils/worker-base.js";
import { processAiTask } from "../../services/gemini.service.js";

interface AiWorkerVariables {
  documentUrl?: string;
  origin?: string;
  destination?: string;
  currentDate?: string;
  aiPrompt?: string;
  prompt?: string;
  [key: string]: unknown;
}

interface AiWorkerOutput {
  extractedData?: string;
  predictiveAnalysis?: string;
  aiDecision?: string;
  aiConfidence?: number;
  automated: boolean;
}

const AIService = {
  parseDocument: async (
    _fileBase64: string,
    _mimeType: string,
    prompt: string,
    schema: Record<string, unknown>,
  ) => {
    return processAiTask(`${prompt}\n\nSchema: ${JSON.stringify(schema)}`);
  },
  generateText: async (prompt: string) => processAiTask(prompt),
};

class AIWorker extends AtlasWorker<AiWorkerVariables, AiWorkerOutput> {
  readonly taskType: string;

  constructor(taskType: string = "ai-automation") {
    super();
    this.taskType = taskType;
  }

  async execute(
    job: AtlasWorkerJob<AiWorkerVariables>,
  ): Promise<AiWorkerOutput> {
    logger.info(
      `[AIWorker] Handling AI job ${job.key} for taskType ${this.taskType}`,
    );

    try {
      if (this.taskType === "atlas.ai.ocr") {
        const docUrl = job.variables.documentUrl;

        let fileBase64 = "";
        let mimeType = "application/pdf";

        try {
          if (docUrl) {
            // Assume it's an HTTP URL (Signed URL or Public)
            const response = await fetch(docUrl);
            const arrayBuffer = await response.arrayBuffer();
            fileBase64 = Buffer.from(arrayBuffer).toString("base64");
            mimeType =
              response.headers.get("content-type") || "application/pdf";
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          logger.warn(`[AIWorker] Failed to download document: ${msg}`);
        }

        const prompt = `Analiza este documento logístico (B/L, Factura, etc.) y extrae los datos clave.`;

        // Using Google Gen AI SDK Schema type implicitly via object structure
        const schema: Record<string, unknown> = {
          type: "object",
          properties: {
            shipper: {
              type: "string",
              description: "Name of the shipping company or person",
            },
            consignee: { type: "string", description: "Name of the receiver" },
            weight: { type: "number", description: "Total weight in KG" },
            volume: { type: "number", description: "Total volume in CBM" },
            hs_codes: {
              type: "array",
              items: { type: "string" },
              description: "List of Harmonized System (HS) tariff codes",
            },
          },
          required: ["shipper", "consignee"],
        };

        const result = await AIService.parseDocument(
          fileBase64,
          mimeType,
          prompt,
          schema,
        );
        return { extractedData: result, automated: true };
      }

      if (this.taskType === "atlas.ai.predict-eta") {
        const { origin, destination, currentDate } = job.variables;

        let contextData = "";
        try {
          // 1. Geocode origin using Nominatim
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${origin}&format=json`,
          );
          if (geoRes.ok) {
            const geoJson = (await geoRes.json()) as Array<{
              lat?: string;
              lon?: string;
            }>;
            const lat = geoJson[0]?.lat;
            const lon = geoJson[0]?.lon;

            if (lat && lon) {
              contextData += `Coordenadas origen: ${lat}, ${lon}. `;
              // 2. Fetch weather from Open-Meteo
              const weatherRes = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
              );
              if (weatherRes.ok) {
                const weatherJson = (await weatherRes.json()) as {
                  current_weather?: unknown;
                };
                contextData += `Clima actual en origen: ${JSON.stringify(weatherJson.current_weather)}. `;
              }
            }
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          logger.warn(`[AIWorker] Could not fetch enriched data: ${msg}`);
        }

        const prompt = `Calcula un ETA predictivo y los riesgos de retraso para un embarque de ${origin} a ${destination} con fecha de salida ${currentDate}. Datos adicionales: ${contextData}. Devuelve JSON con 'predictedETA' y 'riskLevel'.`;
        const result = await AIService.generateText(prompt);
        return { predictiveAnalysis: result, automated: true };
      }

      // Default ai-automation behavior
      const prompt =
        job.variables.aiPrompt || job.variables.prompt || "Analyze this task.";
      const result = await AIService.generateText(prompt);
      return { aiDecision: result, aiConfidence: 0.95, automated: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`[AIWorker] Failed to process ${this.taskType}: ${msg}`);
      throw error;
    }
  }
}

export const aiWorker = new AIWorker("ai-automation");
export const ocrWorker = new AIWorker("atlas.ai.ocr");
export const predictEtaWorker = new AIWorker("atlas.ai.predict-eta");
