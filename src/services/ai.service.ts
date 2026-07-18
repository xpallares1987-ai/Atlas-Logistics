import { GoogleGenAI, Schema } from '@google/genai';

/**
 * Singleton configuration for Google Gen AI.
 * Reuses the same instance to prevent memory leaks and overhead.
 */
class AIServiceClass {
  private ai: GoogleGenAI;

  constructor() {
    // Falls back to GEMINI_API_KEY if GOOGLE_API_KEY is not set
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[AIService] API Key is missing. AI calls will fail.');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Generates text using Gemini 1.5 Pro.
   * Supports up to 5 stop sequences as per Google API limits.
   */
  async generateText(prompt: string, stopSequences?: string[]): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-1.5-pro',
      contents: prompt,
      config: {
        // Enforce maximum of 5 stop sequences
        stopSequences: stopSequences ? stopSequences.slice(0, 5) : undefined,
      }
    });

    return response.text || '';
  }

  /**
   * Processes a document (PDF, Image, etc.) and extracts structured data based on a schema.
   * Defaults to Gemini 1.5 Flash for faster multimodal parsing.
   */
  async parseDocument(fileBase64: string, mimeType: string, prompt: string, responseSchema: Schema) {
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

    return JSON.parse(response.text || '{}');
  }
}

// Export a single instance to be used across the application
export const AIService = new AIServiceClass();
