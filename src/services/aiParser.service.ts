import { GoogleGenAI } from '@google/genai';
import { db } from '../db/index';
import { companies, companyBlAliases } from '../db/schema';
import { eq, or } from 'drizzle-orm';
import { z } from 'zod';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Expected JSON structure from the AI Parser
const parsedInstructionSchema = z.object({
  shipperText: z.string().optional(),
  consigneeText: z.string().optional(),
  notifyText: z.string().optional(),
  originPort: z.string().optional(), // E.g. UN/LOCODE or Port Name
  destinationPort: z.string().optional(),
  containers: z.array(z.object({
    containerNumber: z.string(),
    isoType: z.string(),
    sealNumber: z.string().optional(),
    tareWeight: z.number().optional(),
    vgm: z.number().optional()
  })).optional(),
  commodities: z.array(z.object({
    hsCode: z.string().optional(),
    description: z.string(),
    pieces: z.number(),
    grossWeightKg: z.number(),
    volumeCbm: z.number()
  })).optional()
});

export type ParsedInstruction = z.infer<typeof parsedInstructionSchema>;

export class AiParserService {
  
  /**
   * Processes a document (PDF, JPG, or DOCX via buffer/mimeType) using Gemini 1.5 Pro
   * and extracts structured shipping instructions.
   */
  static async parseShippingInstructions(fileBuffer: Buffer, mimeType: string): Promise<ParsedInstruction> {
    try {
      // For binary files, we pass inlineData to Gemini
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-pro',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: fileBuffer.toString('base64'),
                  mimeType: mimeType
                }
              },
              {
                text: `Eres un asistente experto en Freight Forwarding. Extrae la información de las instrucciones de embarque adjuntas y devuélvela ESTRICTAMENTE en un formato JSON válido siguiendo esta estructura:
                {
                  "shipperText": "Nombre completo y dirección",
                  "consigneeText": "Nombre completo y dirección",
                  "notifyText": "Nombre completo y dirección",
                  "originPort": "Puerto de origen (usa UN/LOCODE si es posible)",
                  "destinationPort": "Puerto de destino (usa UN/LOCODE si es posible)",
                  "containers": [{"containerNumber": "...", "isoType": "22G1", "sealNumber": "...", "tareWeight": 0, "vgm": 0}],
                  "commodities": [{"hsCode": "...", "description": "...", "pieces": 0, "grossWeightKg": 0, "volumeCbm": 0}]
                }
                No incluyas texto adicional fuera del JSON.`
              }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1 // Low temperature for factual extraction
        }
      });

      const jsonText = response.text || '{}';
      
      // Valida la estructura devuelta
      const parsedData = parsedInstructionSchema.parse(JSON.parse(jsonText));
      return parsedData;

    } catch (error) {
      console.error('Error parsing document with Gemini:', error);
      throw new Error('Failed to parse shipping instructions.');
    }
  }

  /**
   * Helper: Matches extracted text (e.g. Shipper) with existing companies to deduplicate
   * Returns a suggested company ID and Alias ID if found.
   */
  static async matchCompanyOrAlias(extractedText: string) {
    if (!extractedText) return null;

    // Lógica básica de normalización: extraer primeras 3 palabras en mayúsculas
    const normalizedMatch = extractedText.substring(0, 30).toUpperCase().trim();

    // 1. Check if the exact alias already exists
    const aliasMatch = await db.query.companyBlAliases.findFirst({
      where: (aliases, { ilike }) => ilike(aliases.aliasText, `%${normalizedMatch}%`)
    });

    if (aliasMatch) {
      return {
        companyId: aliasMatch.companyId,
        aliasId: aliasMatch.id
      };
    }

    // 2. Check if the company name itself matches
    const companyMatch = await db.query.companies.findFirst({
      where: (companies, { ilike }) => ilike(companies.name, `%${normalizedMatch}%`)
    });

    if (companyMatch) {
      return {
        companyId: companyMatch.id,
        aliasId: null // User will need to save this new text as an alias for this company
      };
    }

    return null; // Not found, implies a New Company / New Alias
  }
}
