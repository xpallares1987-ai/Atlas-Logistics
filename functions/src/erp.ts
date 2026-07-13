import { onTaskDispatched } from "firebase-functions/v2/tasks";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFunctions } from "firebase-admin/functions";

// Initializes firebase-admin if not already initialized
import * as admin from "firebase-admin";
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Task Queue Function: Simula el procesamiento asíncrono del ERP.
 * Se ejecutará después de un retraso configurable.
 */
export const simulateErpCallback = onTaskDispatched(
  {
    retryConfig: {
      maxAttempts: 3,
      minBackoffSeconds: 10,
    },
    rateLimits: {
      maxConcurrentDispatches: 10,
    },
    region: "europe-west1"
  },
  async (request) => {
    const { trackingNumber, newStatus } = request.data;
    
    if (!trackingNumber || !newStatus) {
      console.error("Faltan parámetros en simulateErpCallback:", request.data);
      return;
    }

    console.log(`[ERP Simulation] ERP procesó el envío ${trackingNumber}. Actualizando a estado: ${newStatus}`);
    
    // Aquí iría el código real para actualizar PostgreSQL mediante Data Connect
    // o para emitir un evento que dispare webhooks.
    
    // Ejemplo de emisión simulada:
    // await fetch("https://europe-west1-gen-lang-client-0393063451.cloudfunctions.net/triggerWebhook", ...)
    
    console.log(`[ERP Simulation] Éxito. Tarea asíncrona finalizada para ${trackingNumber}.`);
  }
);

/**
 * Callable Function: Inicia el proceso de simulación del ERP.
 * El cliente llama a esta función cuando un Booking es confirmado,
 * y esta función programa la tarea simulateErpCallback.
 */
export const startErpSimulation = onCall(
  { region: "europe-west1" },
  async (request) => {
    const { trackingNumber, expectedStatus, delaySeconds = 30 } = request.data;

    if (!trackingNumber || !expectedStatus) {
      throw new HttpsError("invalid-argument", "trackingNumber y expectedStatus son requeridos.");
    }

    try {
      const queue = getFunctions().taskQueue("simulateErpCallback");
      
      // Programar la ejecución con un retraso en segundos
      await queue.enqueue(
        { trackingNumber, newStatus: expectedStatus },
        {
          scheduleDelaySeconds: delaySeconds,
          dispatchDeadlineSeconds: 60 * 5 // 5 minutos
        }
      );

      console.log(`[ERP Simulation] Tarea encolada para ${trackingNumber}. Retraso: ${delaySeconds}s`);
      return { success: true, message: `Simulación programada para dentro de ${delaySeconds}s.` };
    } catch (error) {
      console.error("[ERP Simulation] Error encolando tarea:", error);
      throw new HttpsError("internal", "No se pudo encolar la simulación del ERP.");
    }
  }
);
