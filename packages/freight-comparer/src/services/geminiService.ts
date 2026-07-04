/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import { GoogleGenAI } from "@google/genai";
import { FreightRate } from "../types";
import { analysisCache, AnalysisCache } from "@atlas/ui";

const API_KEY = (import.meta as unknown as { env: Record<string, string> }).env.VITE_GEMINI_API_KEY || "";

/**
 * Summarizes freight rate data to optimize token usage before sending to Gemini.
 * Groups by trade lane and calculates key metrics instead of sending raw rows.
 */
export function summarizeRatesForAI(rates: FreightRate[]) {
  if (rates.length === 0) return [];

  const lanes: Record<string, {
    pol: string;
    pod: string;
    carriers: Set<string>;
    prices: number[];
    min: number;
    max: number;
    avg: number;
  }> = {};

  rates.forEach(r => {
    const key = `${r.pol} -> ${r.pod}`;
    if (!lanes[key]) {
      lanes[key] = {
        pol: r.pol,
        pod: r.pod,
        carriers: new Set(),
        prices: [],
        min: Infinity,
        max: -Infinity,
        avg: 0
      };
    }
    lanes[key].carriers.add(r.carrier);
    lanes[key].prices.push(r.total);
    if (r.total < lanes[key].min) lanes[key].min = r.total;
    if (r.total > lanes[key].max) lanes[key].max = r.total;
  });

  return Object.values(lanes).map(l => {
    const sum = l.prices.reduce((a, b) => a + b, 0);
    l.avg = Math.round(sum / l.prices.length);
    return {
      lane: `${l.pol} to ${l.pod}`,
      carrier_count: l.carriers.size,
      carriers: Array.from(l.carriers).join(", "),
      min_rate: l.min,
      max_rate: l.max,
      avg_rate: l.avg,
      sample_size: l.prices.length
    };
  });
}

/**
 * Calls Gemini API to get strategic logistics insights based on summarized data.
 * Results are cached in IndexedDB to minimize token usage and improve performance.
 */
export async function getLogisticsInsights(rates: FreightRate[]): Promise<string> {
  if (!API_KEY) {
    console.warn("[GeminiService] VITE_GEMINI_API_KEY not found in environment.");
    return "Error: API Key de Gemini no configurada.";
  }

  if (rates.length === 0) {
    return "No hay datos suficientes para generar insights.";
  }

  const summary = summarizeRatesForAI(rates);
  
  // 1. Check cache first
  const cacheKey = AnalysisCache.generateKey(summary);
  const cachedResult = await analysisCache.get<string>(cacheKey);
  if (cachedResult) {
    console.log("[GeminiService] Returning cached insights.");
    return cachedResult;
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const model = "gemini-2.5-flash";

  const prompt = `
    Como Analista Senior de Logística y Supply Chain, analiza el siguiente resumen de tarifas de fletes y proporciona 3-4 insights estratégicos de alto nivel.
    
    Tus objetivos:
    1. Identificar rutas con mayor competitividad (muchas navieras, precios bajos).
    2. Detectar rutas con alta volatilidad o dispersión de precios (gran diferencia entre min/max).
    3. Identificar oportunidades de ahorro inmediato (comparando el promedio vs el mínimo).
    4. Sugerir estrategias de negociación basadas en el volumen de navieras por ruta.

    DATOS RESUMIDOS DE FLETES:
    ${JSON.stringify(summary, null, 2)}

    RESPUESTA:
    - Formato: Lista corta de puntos (bullet points).
    - Idioma: Español.
    - Tono: Directo, ejecutivo y profesional. No incluyas introducciones ni conclusiones.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 0.2,
        topP: 0.8,
      }
    });
    const text = (response.text || "").trim();
    
    // 2. Store in cache
    await analysisCache.set(cacheKey, text);
    
    return text;
  } catch (error) {
    console.error("[GeminiService] Error calling Gemini API:", error);
    return "Error al generar insights de IA. Por favor, revise la consola para más detalles.";
  }
}

