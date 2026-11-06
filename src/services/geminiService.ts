import crypto from "crypto";
import NodeCache from "node-cache";
import { GoogleGenAI } from "@google/genai";

export type GeminiFreeTierModel = "gemini-2.5-flash" | "gemini-2.5-flash-lite";

export interface GeminiTaskOptions {
  model?: GeminiFreeTierModel;
  systemInstruction?: string;
  maxOutputTokens?: number;
  temperature?: number;
  bypassCache?: boolean;
  fallbackText?: string;
}

export interface GeminiTaskResponse {
  text: string;
  model: string;
  source: "gemini-live" | "gemini-cache" | "deterministic-fallback";
  cached: boolean;
  latencyMs: number;
  quota: {
    rpmUsed: number;
    rpmLimit: number;
    requestsToday: number;
    dailyLimit: number;
  };
}

// Free-tier guardrails (Google AI Studio Free Tier = 15 RPM / 1,500 RPD)
const FREE_TIER_MAX_RPM = 12;
const FREE_TIER_MAX_RPD = 1400;
const DEFAULT_MODEL: GeminiFreeTierModel =
  (process.env.GEMINI_MODEL as GeminiFreeTierModel) || "gemini-2.5-flash";

// 30-minute TTL cache so repeated clicks on the same entity consume 0 quota
const responseCache = new NodeCache({ stdTTL: 1800, checkperiod: 120 });

// Sliding window timestamps (ms) for RPM & daily counter
const requestTimestamps: number[] = [];
let dailyCounter = 0;
let dailyResetDate = new Date().toISOString().slice(0, 10);
let runtimeApiKeyOverride: string | null = null;

function resolveApiKey(): string | undefined {
  const key =
    runtimeApiKeyOverride ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;
  if (!key || key.startsWith("your-") || key.trim() === "") {
    return undefined;
  }
  return key.trim();
}

export function setRuntimeGeminiApiKey(apiKey: string): void {
  runtimeApiKeyOverride = apiKey.trim();
}

function pruneAndCheckQuota(): {
  allowed: boolean;
  rpmUsed: number;
  requestsToday: number;
  reason?: string;
} {
  const now = Date.now();
  const todayStr = new Date().toISOString().slice(0, 10);
  if (todayStr !== dailyResetDate) {
    dailyResetDate = todayStr;
    dailyCounter = 0;
  }

  // Remove timestamps older than 60 seconds
  while (requestTimestamps.length > 0 && now - requestTimestamps[0] > 60_000) {
    requestTimestamps.shift();
  }

  if (requestTimestamps.length >= FREE_TIER_MAX_RPM) {
    return {
      allowed: false,
      rpmUsed: requestTimestamps.length,
      requestsToday: dailyCounter,
      reason: `Free-tier rate limit guard active (${FREE_TIER_MAX_RPM} RPM max).`,
    };
  }

  if (dailyCounter >= FREE_TIER_MAX_RPD) {
    return {
      allowed: false,
      rpmUsed: requestTimestamps.length,
      requestsToday: dailyCounter,
      reason: `Free-tier daily quota guard active (${FREE_TIER_MAX_RPD} RPD max).`,
    };
  }

  return {
    allowed: true,
    rpmUsed: requestTimestamps.length,
    requestsToday: dailyCounter,
  };
}

export function getGeminiServiceStatus() {
  const quota = pruneAndCheckQuota();
  const apiKey = resolveApiKey();
  return {
    configured: Boolean(apiKey),
    keyMasked: apiKey ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}` : null,
    model: DEFAULT_MODEL,
    tier: "Google AI Studio Free Tier (On-Demand)",
    quota: {
      rpmUsed: quota.rpmUsed,
      rpmLimit: FREE_TIER_MAX_RPM,
      requestsToday: quota.requestsToday,
      dailyLimit: FREE_TIER_MAX_RPD,
    },
    cacheStats: {
      keys: responseCache.keys().length,
      hits: responseCache.getStats().hits,
      misses: responseCache.getStats().misses,
    },
  };
}

/**
 * Executes an on-demand Gemini task with caching, RPM rate-limiting, token budgeting,
 * and deterministic fallback so the application stays 100% within the AI Studio Free Tier.
 */
export async function executeGeminiOnDemand(
  prompt: string,
  options: GeminiTaskOptions = {},
): Promise<GeminiTaskResponse> {
  const startMs = Date.now();
  const model = options.model || DEFAULT_MODEL;
  const systemInstruction =
    options.systemInstruction ||
    "Eres el Copiloto Técnico de Atlas Logistics (ERP Marítimo, Aduanero y Multimodal). Responde siempre en español de forma concisa, estructurada y basada estrictamente en los datos operativos proporcionados (normativas FMC 46 CFR Part 541, DCSA v3.0, IMO/CSS Code Anexo 13 y CAU/DUA).";

  const cacheKey = crypto
    .createHash("sha256")
    .update(`${model}::${systemInstruction}::${prompt}`)
    .digest("hex");

  if (!options.bypassCache) {
    const cachedText = responseCache.get<string>(cacheKey);
    if (cachedText) {
      const q = pruneAndCheckQuota();
      return {
        text: cachedText,
        model,
        source: "gemini-cache",
        cached: true,
        latencyMs: Date.now() - startMs,
        quota: {
          rpmUsed: q.rpmUsed,
          rpmLimit: FREE_TIER_MAX_RPM,
          requestsToday: q.requestsToday,
          dailyLimit: FREE_TIER_MAX_RPD,
        },
      };
    }
  }

  const apiKey = resolveApiKey();
  const quotaCheck = pruneAndCheckQuota();

  if (apiKey && quotaCheck.allowed) {
    try {
      requestTimestamps.push(Date.now());
      dailyCounter += 1;

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          maxOutputTokens: options.maxOutputTokens ?? 650,
          temperature: options.temperature ?? 0.2,
        },
      });

      const text = (response.text || "").trim();
      if (text) {
        responseCache.set(cacheKey, text);
        const updatedQuota = pruneAndCheckQuota();
        return {
          text,
          model,
          source: "gemini-live",
          cached: false,
          latencyMs: Date.now() - startMs,
          quota: {
            rpmUsed: updatedQuota.rpmUsed,
            rpmLimit: FREE_TIER_MAX_RPM,
            requestsToday: updatedQuota.requestsToday,
            dailyLimit: FREE_TIER_MAX_RPD,
          },
        };
      }
    } catch (err: any) {
      console.warn(
        "[GeminiService] Falling back to deterministic engine:",
        err?.message || err,
      );
    }
  }

  const fallback =
    options.fallbackText ||
    "Análisis determinista de Atlas Logistics: configure `GEMINI_API_KEY` en `.env.local` (o mediante el panel de configuración IA) para activar la generación en vivo con Google AI Studio (`gemini-2.5-flash`).";

  return {
    text: fallback,
    model,
    source: "deterministic-fallback",
    cached: false,
    latencyMs: Date.now() - startMs,
    quota: {
      rpmUsed: quotaCheck.rpmUsed,
      rpmLimit: FREE_TIER_MAX_RPM,
      requestsToday: quotaCheck.requestsToday,
      dailyLimit: FREE_TIER_MAX_RPD,
    },
  };
}

/**
 * Backward-compatible helper used by workers/services.
 */
export async function processAiTask(prompt: string): Promise<string> {
  const res = await executeGeminiOnDemand(prompt);
  return res.text;
}
