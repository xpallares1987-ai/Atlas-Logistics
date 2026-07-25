import { logger } from "../../config/logger.js";
import { AtlasWorker } from "../utils/worker-base.js";
import { AIService } from "../../services/ai.service.js";

class AIWorker extends AtlasWorker<any, any> {
  readonly taskType: string;

  constructor(taskType: string = "ai-automation") {
    super();
    this.taskType = taskType;
  }

  async execute(job: any): Promise<any> {
    logger.info(
      `[AIWorker] Handling AI job ${job.key} for taskType ${this.taskType}`,
    );

    try {
      if (this.taskType === "atlas.ai.ocr") {
        const docUrl = job.variables.documentUrl;
        const prompt = `Extrae los datos estructurados en formato JSON del siguiente documento logístico: ${docUrl || "documento adjunto"}`;
        const result = await AIService.generateText(prompt);
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
            const geoJson = await geoRes.json();
            const lat = geoJson[0]?.lat;
            const lon = geoJson[0]?.lon;

            if (lat && lon) {
              contextData += `Coordenadas origen: ${lat}, ${lon}. `;
              // 2. Fetch weather from Open-Meteo
              const weatherRes = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
              );
              if (weatherRes.ok) {
                const weatherJson = await weatherRes.json();
                contextData += `Clima actual en origen: ${JSON.stringify(weatherJson.current_weather)}. `;
              }
            }
          }
        } catch (e: any) {
          logger.warn(`[AIWorker] Could not fetch enriched data: ${e.message}`);
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
    } catch (error: any) {
      logger.error(
        `[AIWorker] Failed to process ${this.taskType}: ${error.message}`,
      );
      throw error;
    }
  }
}

export const aiWorker = new AIWorker("ai-automation");
export const ocrWorker = new AIWorker("atlas.ai.ocr");
export const predictEtaWorker = new AIWorker("atlas.ai.predict-eta");
