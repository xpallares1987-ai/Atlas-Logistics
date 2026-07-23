import { GoogleGenAI, Schema } from '@google/genai';
import pLimit from 'p-limit';
import NodeCache from 'node-cache';
import crypto from 'crypto';

/**
 * Singleton configuration for Google Gen AI.
 * Reuses the same instance to prevent memory leaks and overhead.
 */
class AIServiceClass {
  private ai: GoogleGenAI;
  private limit: ReturnType<typeof pLimit>;
  private cache: NodeCache;

  constructor() {
    // Falls back to GEMINI_API_KEY if GOOGLE_API_KEY is not set
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[AIService] API Key is missing. AI calls will fail.');
    }
    this.ai = new GoogleGenAI({ apiKey });
    // Limit to 10 concurrent requests to prevent rate limiting issues
    this.limit = pLimit(10);
    // Cache AI responses for 10 minutes to reduce duplicate calls and costs
    this.cache = new NodeCache({ stdTTL: 600 });
  }

  private generateHash(str: string): string {
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  /**
   * Generates text using Gemini 1.5 Pro.
   * Supports up to 5 stop sequences as per Google API limits.
   */
  async generateText(prompt: string, stopSequences?: string[]): Promise<string> {
    const cacheKey = this.generateHash(`text:${prompt}:${JSON.stringify(stopSequences)}`);
    const cached = this.cache.get<string>(cacheKey);
    if (cached) return cached;

    return this.limit(async () => {
      const response = await this.ai.models.generateContent({
        model: 'gemini-1.5-pro',
        contents: prompt,
        config: {
          // Enforce maximum of 5 stop sequences
          stopSequences: stopSequences ? stopSequences.slice(0, 5) : undefined,
        }
      });
      const result = response.text || '';
      this.cache.set(cacheKey, result);
      return result;
    });
  }

  /**
   * Processes a document (PDF, Image, etc.) and extracts structured data based on a schema.
   * Defaults to Gemini 1.5 Flash for faster multimodal parsing.
   */
  async parseDocument(fileBase64: string, mimeType: string, prompt: string, responseSchema: Schema) {
    const cacheKey = this.generateHash(`doc:${prompt}:${fileBase64.substring(0, 50)}:${fileBase64.length}`);
    const cached = this.cache.get<any>(cacheKey);
    if (cached) return cached;

    return this.limit(async () => {
      const response = await this.ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { data: fileBase64, mimeType: mimeType || 'application/pdf' } }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
        }
      });
      const result = JSON.parse(response.text || '{}');
      this.cache.set(cacheKey, result);
      return result;
    });
  }
}

// Export a single instance to be used across the application
export const AIService = new AIServiceClass();
