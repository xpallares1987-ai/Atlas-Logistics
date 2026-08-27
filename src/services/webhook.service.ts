import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
// import { webhooks, webhookDeliveries } from "../db/schema/index.js";
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
      logger.info(
        `[WebhookService] Skipping dispatch of ${eventType} (webhooks table missing in local SQLite)`,
      );
    } catch (error) {
      logger.error(error, "Error in WebhookService.dispatchEvent:");
    }
  }
}
