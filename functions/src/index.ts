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
import { deployToCamunda } from "./camunda";
import { startWorkers } from "./workers";
import {
  generatePredictiveETA,
  processDocumentOCR,
  executeDataAnalystChat,
  calculateLCLBinPacking,
} from "./gemini";

export * from "./gemini";
export * from "./webhooks";

// Define secrets from Google Cloud Secret Manager
const CAMUNDA_CLUSTER_ID = defineSecret("CAMUNDA_CLUSTER_ID");
const CAMUNDA_CLIENT_ID = defineSecret("CAMUNDA_CLIENT_ID");
const CAMUNDA_CLIENT_SECRET = defineSecret("CAMUNDA_CLIENT_SECRET");
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

setGlobalOptions({ maxInstances: 10 });

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  /https:\/\/.*\.web\.app$/,
  /https:\/\/.*\.firebaseapp\.com$/
];

// Global initialization of Camunda Workers when instance warms up
let workersStarted = false;

export const deployBPMN = onCall(
  {
    secrets: [CAMUNDA_CLUSTER_ID, CAMUNDA_CLIENT_ID, CAMUNDA_CLIENT_SECRET],
    cors: allowedOrigins,
  },
  async (request) => {
    // Inicializar workers si no lo están
    if (!workersStarted) {
      try {
        startWorkers(CAMUNDA_CLUSTER_ID.value(), CAMUNDA_CLIENT_ID.value(), CAMUNDA_CLIENT_SECRET.value());
        workersStarted = true;
      } catch (e) {
        console.error("Failed to start workers", e);
      }
    }

    const { xml } = request.data;
    if (!xml) {
      throw new HttpsError("invalid-argument", "El XML del diagrama es requerido.");
    }

    try {
      const clusterId = CAMUNDA_CLUSTER_ID.value();
      const clientId = CAMUNDA_CLIENT_ID.value();
      const clientSecret = CAMUNDA_CLIENT_SECRET.value();

      const result = await deployToCamunda(clusterId, clientId, clientSecret, xml);
      
      return {
        success: true,
        processId: result.deployments[0]?.process?.bpmnProcessId,
        version: result.deployments[0]?.process?.version,
        resourceId: result.deployments[0]?.process?.processDefinitionKey,
      };
    } catch (error) {
      console.error("Deploy error:", error);
      throw new HttpsError("internal", "No se pudo desplegar el proceso en Camunda 8.");
    }
  }
);

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
