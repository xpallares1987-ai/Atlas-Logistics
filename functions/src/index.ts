/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

import {
  generatePredictiveETA,
  processDocumentOCR,
  executeDataAnalystChat,
  calculateLCLBinPacking,
} from "./gemini";

export * from "./gemini";
export * from "./webhooks";

// Define secrets from Google Cloud Secret Manager

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

setGlobalOptions({ maxInstances: 10 });

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  /https:\/\/.*\.web\.app$/,
  /https:\/\/.*\.firebaseapp\.com$/
];



export const predictETA = onCall(
  {
    secrets: [GEMINI_API_KEY],
    cors: allowedOrigins,
  },
  async (request) => {
    const { shipmentData } = request.data;
    if (!shipmentData) {
      throw new HttpsError("invalid-argument", "Los datos del envío son requeridos.");
    }

    try {
      const apiKey = GEMINI_API_KEY.value();
      const prediction = await generatePredictiveETA(apiKey, shipmentData);
      return { success: true, data: prediction };
    } catch (error) {
      console.error("Prediction error:", error);
      throw new HttpsError("internal", "No se pudo generar la predicción de ETA.");
    }
  }
);

export const documentOCR = onCall(
  {
    secrets: [GEMINI_API_KEY],
    cors: allowedOrigins,
  },
  async (request) => {
    const { base64Image, mimeType } = request.data;
    if (!base64Image || !mimeType) {
      throw new HttpsError("invalid-argument", "Imagen y MimeType requeridos.");
    }
    try {
      const result = await processDocumentOCR(GEMINI_API_KEY.value(), base64Image, mimeType);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpsError("internal", "Error en OCR con IA.");
    }
  }
);

export const chatWithData = onCall(
  {
    secrets: [GEMINI_API_KEY],
    cors: allowedOrigins,
  },
  async (request) => {
    const { question } = request.data;
    if (!question) throw new HttpsError("invalid-argument", "Pregunta requerida.");
    try {
      const result = await executeDataAnalystChat(GEMINI_API_KEY.value(), question);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpsError("internal", "Error en Chat Analytics.");
    }
  }
);

export const optimizeLCL = onCall(
  {
    secrets: [GEMINI_API_KEY],
    cors: allowedOrigins,
  },
  async (request) => {
    const { containerSpec, cargoPool } = request.data;
    if (!containerSpec || !cargoPool) throw new HttpsError("invalid-argument", "Faltan parámetros.");
    try {
      const result = await calculateLCLBinPacking(GEMINI_API_KEY.value(), containerSpec, cargoPool);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpsError("internal", "Error en LCL Optimization.");
    }
  }
);
