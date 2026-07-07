import { onCall, HttpsError } from "firebase-functions/v2/https";

// Mock database of registered webhooks
const webhookRegistry: Record<string, { url: string; secret: string; events: string[] }> = {
  "tenant-sap-123": {
    url: "https://api.sap-customer.com/atlas-webhook",
    secret: "whsec_12345",
    events: ["SHIPMENT_ARRIVED", "CUSTOMS_CLEARED"],
  },
};

export const registerWebhook = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debe iniciar sesión para registrar webhooks.");
  }

  const { url, secret, events } = request.data;
  if (!url || !events) {
    throw new HttpsError("invalid-argument", "Faltan parámetros requeridos (url, events).");
  }

  // En un entorno real, guardar en Postgres vía Data Connect
  const tenantId = request.auth.token.tenantId || "default";
  
  webhookRegistry[tenantId] = { url, secret, events };
  
  return { success: true, message: "Webhook B2B registrado exitosamente." };
});

export const triggerWebhook = onCall(async (request) => {
  // Función auxiliar para emitir webhooks tras cambios de estado importantes.
  // En producción, esto sería llamado desde un onDocumentWritten trigger de Firestore
  // o desde Camunda Service Tasks, y usaría fetch() para notificar a la URL registrada.
  const { eventType, payload: _payload } = request.data;
  
  console.log(`[Webhooks] Evaluando emisión para evento: ${eventType}`);
  
  let dispatches = 0;
  for (const [tenant, config] of Object.entries(webhookRegistry)) {
    if (config.events.includes(eventType)) {
      console.log(`[Webhooks] Emitiendo a ${config.url} para tenant ${tenant}`);
      // fetch(config.url, { method: "POST", body: JSON.stringify(payload) })
      dispatches++;
    }
  }

  return { success: true, dispatches };
});
