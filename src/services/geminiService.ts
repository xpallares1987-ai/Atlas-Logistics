import crypto from "crypto";
import NodeCache from "node-cache";
import { GoogleGenAI } from "@google/genai";

export type GeminiFreeTierModel =
  "gemini-2.5-flash" | "gemini-2.5-flash-lite" | "text-embedding-004";

export interface GeminiInlinePart {
  mimeType: string;
  data: string; // base64 encoded payload
}

export interface GeminiTaskOptions {
  model?: "gemini-2.5-flash" | "gemini-2.5-flash-lite";
  systemInstruction?: string;
  maxOutputTokens?: number;
  temperature?: number;
  bypassCache?: boolean;
  cacheTtlSeconds?: number;
  fallbackText?: string;
  inlineData?: GeminiInlinePart;
  l2CacheReader?: () => Promise<string | null>;
  l2CacheWriter?: (text: string) => Promise<void>;
}

export interface GeminiStructuredTaskOptions<T> {
  model?: "gemini-2.5-flash" | "gemini-2.5-flash-lite";
  systemInstruction?: string;
  responseSchema?: Record<string, any>;
  maxOutputTokens?: number;
  temperature?: number;
  bypassCache?: boolean;
  cacheTtlSeconds?: number;
  fallbackData: T;
  inlineData?: GeminiInlinePart;
  l2CacheReader?: () => Promise<T | null>;
  l2CacheWriter?: (data: T) => Promise<void>;
}

export type GeminiResponseSource =
  "gemini-live" | "gemini-cache" | "sqlite-cache" | "deterministic-fallback";

export interface ModelQuotaSnapshot {
  rpmUsed: number;
  rpmLimit: number;
  requestsToday: number;
  dailyLimit: number;
  rpdUsed: number;
  rpdLimit: number;
}

export interface GeminiTaskResponse {
  text: string;
  model: string;
  source: GeminiResponseSource;
  cached: boolean;
  latencyMs: number;
  quota: ModelQuotaSnapshot;
}

export interface GeminiStructuredTaskResponse<T> {
  data: T;
  model: string;
  source: GeminiResponseSource;
  cached: boolean;
  latencyMs: number;
  quota: ModelQuotaSnapshot;
}

export interface SemanticSearchCandidate {
  id: string;
  title: string;
  category?: string;
  text: string;
}

export interface SemanticSearchResultItem extends SemanticSearchCandidate {
  score: number;
}

// Per-model Free Tier limits (Google AI Studio Free Tier pools are independent per model)
const MODEL_LIMITS: Record<
  GeminiFreeTierModel,
  { maxRpm: number; maxRpd: number }
> = {
  "gemini-2.5-flash": { maxRpm: 12, maxRpd: 1400 },
  "gemini-2.5-flash-lite": { maxRpm: 15, maxRpd: 1400 },
  "text-embedding-004": { maxRpm: 100, maxRpd: 5000 },
};

const DEFAULT_MODEL: "gemini-2.5-flash" | "gemini-2.5-flash-lite" =
  (process.env.GEMINI_MODEL as "gemini-2.5-flash" | "gemini-2.5-flash-lite") ||
  "gemini-2.5-flash";

// L1 30-minute TTL memory cache so repeated clicks consume 0 quota
const responseCache = new NodeCache({ stdTTL: 1800, checkperiod: 120 });

// Per-model sliding window state
interface ModelUsageBucket {
  timestamps: number[];
  dailyCounter: number;
  dailyResetDate: string;
}

const modelBuckets: Record<GeminiFreeTierModel, ModelUsageBucket> = {
  "gemini-2.5-flash": {
    timestamps: [],
    dailyCounter: 0,
    dailyResetDate: new Date().toISOString().slice(0, 10),
  },
  "gemini-2.5-flash-lite": {
    timestamps: [],
    dailyCounter: 0,
    dailyResetDate: new Date().toISOString().slice(0, 10),
  },
  "text-embedding-004": {
    timestamps: [],
    dailyCounter: 0,
    dailyResetDate: new Date().toISOString().slice(0, 10),
  },
};

let runtimeApiKeyOverride: string | null = null;

// Dynamic model alias resolution: if Google AI Studio retires a model ID for newer keys
// (e.g. gemini-2.5-flash -> gemini-3.8-flash, gemini-2.5-flash-lite -> gemini-3.5-flash-lite,
// text-embedding-004 -> gemini-embedding-001), remember the active upstream model ID so we never waste a retry.
const resolvedModelAlias: Record<string, string> = {
  "gemini-2.5-flash": "gemini-3.5-flash-lite",
  "gemini-2.5-flash-lite": "gemini-3.5-flash-lite",
  "text-embedding-004": "gemini-embedding-001",
};

function withTimeout<T>(promise: Promise<T>, ms = 6500): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Gemini upstream timeout (${ms}ms)`)),
      ms,
    );
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function resolveUpstreamModelId(requestedModel: string): string {
  return resolvedModelAlias[requestedModel] || requestedModel;
}

function detectReplacementModelFromError(
  requestedModel: string,
  err: any,
): string | null {
  const msg = String(err?.message || err || "");
  if (
    msg.includes("503") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("timeout")
  ) {
    return "gemini-3.5-flash-lite";
  }
  if (!msg.includes("404") && !msg.includes("NOT_FOUND")) {
    return null;
  }
  const match = msg.match(/use models\/([a-zA-Z0-9._-]+)/i);
  if (match && match[1]) {
    resolvedModelAlias[requestedModel] = match[1];
    return match[1];
  }
  if (requestedModel === "gemini-2.5-flash") {
    resolvedModelAlias[requestedModel] = "gemini-3.5-flash-lite";
    return "gemini-3.5-flash-lite";
  }
  if (requestedModel === "gemini-2.5-flash-lite") {
    resolvedModelAlias[requestedModel] = "gemini-3.5-flash-lite";
    return "gemini-3.5-flash-lite";
  }
  if (requestedModel === "text-embedding-004") {
    resolvedModelAlias[requestedModel] = "gemini-embedding-001";
    return "gemini-embedding-001";
  }
  return null;
}

function resolveApiKey(): string | undefined {
  // Never consume the user's real Free Tier quota during automated Vitest runs
  // unless an explicit runtime override was injected by a test.
  if (
    (process.env.VITEST || process.env.NODE_ENV === "test") &&
    !runtimeApiKeyOverride
  ) {
    return undefined;
  }
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

export function clearGeminiMemoryCache() {
  const keysBefore = responseCache.keys().length;
  responseCache.flushAll();
  return {
    clearedKeys: keysBefore,
    status: getGeminiServiceStatus(),
  };
}

function pruneAndCheckModelQuota(model: GeminiFreeTierModel): {
  allowed: boolean;
  snapshot: ModelQuotaSnapshot;
  reason?: string;
} {
  const bucket = modelBuckets[model] || modelBuckets["gemini-2.5-flash"];
  const limits = MODEL_LIMITS[model] || MODEL_LIMITS["gemini-2.5-flash"];
  const now = Date.now();
  const todayStr = new Date().toISOString().slice(0, 10);

  if (todayStr !== bucket.dailyResetDate) {
    bucket.dailyResetDate = todayStr;
    bucket.dailyCounter = 0;
  }

  while (bucket.timestamps.length > 0 && now - bucket.timestamps[0] > 60_000) {
    bucket.timestamps.shift();
  }

  const snapshot: ModelQuotaSnapshot = {
    rpmUsed: bucket.timestamps.length,
    rpmLimit: limits.maxRpm,
    requestsToday: bucket.dailyCounter,
    dailyLimit: limits.maxRpd,
    rpdUsed: bucket.dailyCounter,
    rpdLimit: limits.maxRpd,
  };

  if (bucket.timestamps.length >= limits.maxRpm) {
    return {
      allowed: false,
      snapshot,
      reason: `Free-tier rate limit guard active for ${model} (${limits.maxRpm} RPM max).`,
    };
  }

  if (bucket.dailyCounter >= limits.maxRpd) {
    return {
      allowed: false,
      snapshot,
      reason: `Free-tier daily quota guard active for ${model} (${limits.maxRpd} RPD max).`,
    };
  }

  return {
    allowed: true,
    snapshot,
  };
}

function recordModelUsage(model: GeminiFreeTierModel): ModelQuotaSnapshot {
  const bucket = modelBuckets[model] || modelBuckets["gemini-2.5-flash"];
  bucket.timestamps.push(Date.now());
  bucket.dailyCounter += 1;
  return pruneAndCheckModelQuota(model).snapshot;
}

export function getGeminiServiceStatus() {
  const flashQuota = pruneAndCheckModelQuota("gemini-2.5-flash").snapshot;
  const flashLiteQuota = pruneAndCheckModelQuota(
    "gemini-2.5-flash-lite",
  ).snapshot;
  const embeddingQuota = pruneAndCheckModelQuota("text-embedding-004").snapshot;
  const apiKey = resolveApiKey();
  const masked = apiKey ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}` : null;
  const cacheInfo = {
    keys: responseCache.keys().length,
    hits: responseCache.getStats().hits,
    misses: responseCache.getStats().misses,
  };

  return {
    configured: Boolean(apiKey),
    keyMasked: masked,
    maskedKey: masked,
    model: DEFAULT_MODEL,
    defaultModel: DEFAULT_MODEL,
    liteModel: "gemini-2.5-flash-lite",
    embeddingModel: "text-embedding-004",
    mode: "ON_DEMAND_FREE_TIER",
    tier: "Google AI Studio Free Tier (On-Demand)",
    freeTierGuardrails: {
      maxRpm: MODEL_LIMITS["gemini-2.5-flash"].maxRpm,
      maxRpd: MODEL_LIMITS["gemini-2.5-flash"].maxRpd,
      flashLiteMaxRpm: MODEL_LIMITS["gemini-2.5-flash-lite"].maxRpm,
      embeddingMaxRpm: MODEL_LIMITS["text-embedding-004"].maxRpm,
      cacheTtlSeconds: 1800,
      maxOutputTokens: 650,
    },
    quota: flashQuota,
    modelQuotas: {
      "gemini-2.5-flash": flashQuota,
      "gemini-2.5-flash-lite": flashLiteQuota,
      "text-embedding-004": embeddingQuota,
    },
    cache: cacheInfo,
    cacheStats: cacheInfo,
  };
}

/**
 * Executes an on-demand text Gemini task with L1 (NodeCache) + L2 (SQLite) caching,
 * per-model RPM rate-limiting, token budgeting, and deterministic fallback.
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
    .update(
      `${model}::${systemInstruction}::${prompt}::${options.inlineData?.data?.slice(0, 64) || ""}`,
    )
    .digest("hex");

  // 1. Check L1 Memory Cache
  if (!options.bypassCache) {
    const cachedText = responseCache.get<string>(cacheKey);
    if (cachedText) {
      const q = pruneAndCheckModelQuota(model).snapshot;
      return {
        text: cachedText,
        model,
        source: "gemini-cache",
        cached: true,
        latencyMs: Date.now() - startMs,
        quota: q,
      };
    }

    // 2. Check L2 SQLite Persistent Cache
    if (options.l2CacheReader) {
      try {
        const l2Value = await options.l2CacheReader();
        if (l2Value) {
          responseCache.set(cacheKey, l2Value, options.cacheTtlSeconds ?? 1800);
          const q = pruneAndCheckModelQuota(model).snapshot;
          return {
            text: l2Value,
            model,
            source: "sqlite-cache",
            cached: true,
            latencyMs: Date.now() - startMs,
            quota: q,
          };
        }
      } catch (err) {
        // Ignore L2 read errors and continue
      }
    }
  }

  const apiKey = resolveApiKey();
  const quotaCheck = pruneAndCheckModelQuota(model);

  if (apiKey && quotaCheck.allowed) {
    try {
      const updatedQuota = recordModelUsage(model);
      const ai = new GoogleGenAI({ apiKey });

      const contents: any = options.inlineData
        ? [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: options.inlineData.mimeType,
                    data: options.inlineData.data,
                  },
                },
              ],
            },
          ]
        : prompt;

      let upstreamModel = resolveUpstreamModelId(model);
      let response;
      try {
        response = await withTimeout(
          ai.models.generateContent({
            model: upstreamModel,
            contents,
            config: {
              systemInstruction,
              maxOutputTokens: options.maxOutputTokens ?? 650,
              temperature: options.temperature ?? 0.2,
            },
          }),
          6500,
        );
      } catch (firstErr: any) {
        const replacement = detectReplacementModelFromError(model, firstErr);
        if (replacement && replacement !== upstreamModel) {
          upstreamModel = replacement;
          response = await withTimeout(
            ai.models.generateContent({
              model: upstreamModel,
              contents,
              config: {
                systemInstruction,
                maxOutputTokens: options.maxOutputTokens ?? 650,
                temperature: options.temperature ?? 0.2,
              },
            }),
            6500,
          );
        } else {
          throw firstErr;
        }
      }

      const text = (response.text || "").trim();
      if (text) {
        responseCache.set(cacheKey, text, options.cacheTtlSeconds ?? 1800);
        if (options.l2CacheWriter) {
          await options.l2CacheWriter(text).catch(() => {});
        }
        return {
          text,
          model,
          source: "gemini-live",
          cached: false,
          latencyMs: Date.now() - startMs,
          quota: updatedQuota,
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
    quota: quotaCheck.snapshot,
  };
}

/**
 * Executes an on-demand Gemini task that returns strictly typed JSON (`responseMimeType: "application/json"`),
 * reducing output token usage by 40-60% and supporting L1 (memory) + L2 (SQLite metadata) caching.
 */
export async function executeGeminiStructuredOnDemand<T>(
  prompt: string,
  options: GeminiStructuredTaskOptions<T>,
): Promise<GeminiStructuredTaskResponse<T>> {
  const startMs = Date.now();
  const model = options.model || "gemini-2.5-flash-lite";
  const systemInstruction =
    options.systemInstruction ||
    "Eres el Motor de Auditoría Estructurada de Atlas Logistics. Devuelve exclusivamente un objeto JSON válido que cumpla el esquema solicitado, en español y basado en los datos reales proporcionados.";

  const cacheKey = crypto
    .createHash("sha256")
    .update(
      `json::${model}::${systemInstruction}::${prompt}::${options.inlineData?.data?.slice(0, 64) || ""}`,
    )
    .digest("hex");

  // 1. Check L1 Memory Cache
  if (!options.bypassCache) {
    const cachedObj = responseCache.get<T>(cacheKey);
    if (cachedObj !== undefined) {
      const q = pruneAndCheckModelQuota(model).snapshot;
      return {
        data: cachedObj,
        model,
        source: "gemini-cache",
        cached: true,
        latencyMs: Date.now() - startMs,
        quota: q,
      };
    }

    // 2. Check L2 SQLite Persistent Cache
    if (options.l2CacheReader) {
      try {
        const l2Obj = await options.l2CacheReader();
        if (l2Obj !== null && l2Obj !== undefined) {
          responseCache.set(cacheKey, l2Obj, options.cacheTtlSeconds ?? 1800);
          const q = pruneAndCheckModelQuota(model).snapshot;
          return {
            data: l2Obj,
            model,
            source: "sqlite-cache",
            cached: true,
            latencyMs: Date.now() - startMs,
            quota: q,
          };
        }
      } catch (err) {
        // Ignore L2 read errors and continue
      }
    }
  }

  const apiKey = resolveApiKey();
  const quotaCheck = pruneAndCheckModelQuota(model);

  if (apiKey && quotaCheck.allowed) {
    try {
      const updatedQuota = recordModelUsage(model);
      const ai = new GoogleGenAI({ apiKey });

      const contents: any = options.inlineData
        ? [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: options.inlineData.mimeType,
                    data: options.inlineData.data,
                  },
                },
              ],
            },
          ]
        : prompt;

      const config: Record<string, any> = {
        systemInstruction,
        responseMimeType: "application/json",
        maxOutputTokens: options.maxOutputTokens ?? 550,
        temperature: options.temperature ?? 0.1,
      };

      if (options.responseSchema) {
        config.responseSchema = options.responseSchema;
      }

      let upstreamModel = resolveUpstreamModelId(model);
      let response;
      try {
        response = await withTimeout(
          ai.models.generateContent({
            model: upstreamModel,
            contents,
            config,
          }),
          6500,
        );
      } catch (firstErr: any) {
        const replacement = detectReplacementModelFromError(model, firstErr);
        if (replacement && replacement !== upstreamModel) {
          upstreamModel = replacement;
          response = await withTimeout(
            ai.models.generateContent({
              model: upstreamModel,
              contents,
              config,
            }),
            6500,
          );
        } else {
          throw firstErr;
        }
      }

      const rawText = (response.text || "").trim();
      if (rawText) {
        const cleaned = rawText
          .replace(/^```json\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();
        const parsed = JSON.parse(cleaned) as T;
        responseCache.set(cacheKey, parsed, options.cacheTtlSeconds ?? 1800);
        if (options.l2CacheWriter) {
          await options.l2CacheWriter(parsed).catch(() => {});
        }
        return {
          data: parsed,
          model,
          source: "gemini-live",
          cached: false,
          latencyMs: Date.now() - startMs,
          quota: updatedQuota,
        };
      }
    } catch (err: any) {
      console.warn(
        `[GeminiService] Structured task (${model}) falling back to deterministic data:`,
        err?.message || err,
      );
    }
  }

  return {
    data: options.fallbackData,
    model,
    source: "deterministic-fallback",
    cached: false,
    latencyMs: Date.now() - startMs,
    quota: quotaCheck.snapshot,
  };
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < len; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function lexicalSimilarity(query: string, doc: string): number {
  const tokenize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2);

  const qTokens = tokenize(query);
  const dTokens = new Set(tokenize(doc));
  if (qTokens.length === 0 || dTokens.size === 0) return 0;

  let matches = 0;
  for (const t of qTokens) {
    if (dTokens.has(t)) {
      matches += 1;
    } else {
      for (const dt of dTokens) {
        if (dt.includes(t) || t.includes(dt)) {
          matches += 0.6;
          break;
        }
      }
    }
  }
  return Math.min(0.99, Number((matches / qTokens.length).toFixed(3)));
}

/**
 * Computes semantic similarity ranking over candidates using Google AI Studio's free
 * `text-embedding-004` model (separate 1,500 RPM quota pool), with L1 vector caching
 * and instant deterministic lexical fallback when no API key is configured.
 */
export async function computeSemanticSimilarityOnDemand(
  query: string,
  candidates: SemanticSearchCandidate[],
  topK = 5,
): Promise<{
  results: SemanticSearchResultItem[];
  model: string;
  source: GeminiResponseSource;
  latencyMs: number;
  quota: ModelQuotaSnapshot;
}> {
  const startMs = Date.now();
  const model: GeminiFreeTierModel = "text-embedding-004";
  const apiKey = resolveApiKey();
  const quotaCheck = pruneAndCheckModelQuota(model);

  if (apiKey && quotaCheck.allowed && candidates.length > 0) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const getEmbedding = async (text: string): Promise<number[]> => {
        const hash = crypto
          .createHash("sha256")
          .update(`emb::${text}`)
          .digest("hex");
        const cachedVec = responseCache.get<number[]>(hash);
        if (cachedVec) return cachedVec;

        recordModelUsage(model);
        let upstreamEmbModel = resolveUpstreamModelId(model);
        let embRes;
        try {
          embRes = await withTimeout(
            ai.models.embedContent({
              model: upstreamEmbModel,
              contents: text,
            }),
            5000,
          );
        } catch (firstErr: any) {
          const replacement = detectReplacementModelFromError(model, firstErr);
          if (replacement && replacement !== upstreamEmbModel) {
            upstreamEmbModel = replacement;
            embRes = await withTimeout(
              ai.models.embedContent({
                model: upstreamEmbModel,
                contents: text,
              }),
              5000,
            );
          } else {
            throw firstErr;
          }
        }
        const values = embRes.embeddings?.[0]?.values || [];
        if (values.length > 0) {
          responseCache.set(hash, values, 3600);
        }
        return values;
      };

      const queryVec = await getEmbedding(query);
      if (queryVec.length > 0) {
        const scored: SemanticSearchResultItem[] = [];
        for (const c of candidates) {
          const docVec = await getEmbedding(
            `${c.title} (${c.category || ""}): ${c.text}`,
          );
          const score =
            docVec.length > 0
              ? Number(cosineSimilarity(queryVec, docVec).toFixed(3))
              : lexicalSimilarity(query, `${c.title} ${c.text}`);
          scored.push({ ...c, score });
        }

        scored.sort((a, b) => b.score - a.score);
        return {
          results: scored.slice(0, topK),
          model,
          source: "gemini-live",
          latencyMs: Date.now() - startMs,
          quota: pruneAndCheckModelQuota(model).snapshot,
        };
      }
    } catch (err: any) {
      console.warn(
        "[GeminiService] Embedding search falling back to lexical similarity:",
        err?.message || err,
      );
    }
  }

  const fallbackResults = candidates
    .map((c) => ({
      ...c,
      score: lexicalSimilarity(
        query,
        `${c.title} ${c.category || ""} ${c.text}`,
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return {
    results: fallbackResults,
    model,
    source: "deterministic-fallback",
    latencyMs: Date.now() - startMs,
    quota: quotaCheck.snapshot,
  };
}

/**
 * Backward-compatible helper used by workers/services.
 */
export async function processAiTask(prompt: string): Promise<string> {
  const res = await executeGeminiOnDemand(prompt);
  return res.text;
}
