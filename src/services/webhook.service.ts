import { eq } from "drizzle-orm";
import { db } from "../db/db.config.js";
import { webhooks, webhookDeliveries } from "../db/schema.js";
import { logger } from "../config/logger.js";
import crypto from "crypto";

export class WebhookService {
  /**
   * Despacha un evento a todos los webhooks suscritos
   * @param eventType Ej. "shipment.status_changed"
   * @param payload Datos JSON a enviar
   */
  static async dispatchEvent(eventType: string, payload: any) {
    if (!db) {
      logger.warn("Database not initialized. Cannot dispatch webhooks.");
      return;
    }

    try {
      // 1. Obtener webhooks activos
      const activeWebhooks = await db
        .select()
        .from(webhooks)
        .where(eq(webhooks.isActive, true));

      // 2. Filtrar por evento suscrito (jsonb contiene array de strings o '*' )
      const subscribedWebhooks = activeWebhooks.filter((wh: any) => {
        const events = wh.events as string[];
        return events.includes(eventType) || events.includes("*");
      });

      if (subscribedWebhooks.length === 0) return;

      logger.info(`Dispatching ${eventType} to ${subscribedWebhooks.length} webhooks`);

      // 3. Enviar a todos en paralelo
      const payloadString = JSON.stringify({
        event: eventType,
        timestamp: new Date().toISOString(),
        data: payload,
      });

      await Promise.allSettled(
        subscribedWebhooks.map(async (webhook: any) => {
          // Generar firma HMAC-SHA256 para validación de origen
          const signature = crypto
            .createHmac("sha256", webhook.secret)
            .update(payloadString)
            .digest("hex");

          const deliveryObj = {
            webhookId: webhook.id,
            eventType,
            payload: JSON.parse(payloadString),
            status: "FAILED",
            responseCode: 0,
            errorMessage: "",
          };

          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(webhook.endpointUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-atlas-signature": signature,
                "x-atlas-event": eventType,
              },
              body: payloadString,
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            deliveryObj.responseCode = response.status;
            
            if (response.ok) {
              deliveryObj.status = "SUCCESS";
            } else {
              deliveryObj.errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
          } catch (error: any) {
            deliveryObj.errorMessage = error.message;
          }

          // 4. Registrar intento de entrega
          await db.insert(webhookDeliveries).values(deliveryObj);
        })
      );
    } catch (error) {
      logger.error(error, "Error in WebhookService.dispatchEvent:");
    }
  }
}
