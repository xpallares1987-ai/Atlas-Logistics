import { fetchWithExponentialBackoff, ExternalApiException } from './api-client.js';
import { db } from '../db/client.js';
import { stock_items, inventory_movements } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { XMLParser } from 'fast-xml-parser';

export class WarehouseSyncService {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
  }

  async syncFromExternalWarehouse(endpointUrl: string, warehouseId: number) {
    console.log(`[WarehouseSync] Iniciando sincronización desde ${endpointUrl} para el almacén ${warehouseId}...`);

    try {
      const response = await fetchWithExponentialBackoff(endpointUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml',
          'Authorization': `Bearer ${process.env.WMS_EXTERNAL_API_KEY}`
        }
      });

      const xmlText = await response.text();
      const parsedData = this.parser.parse(xmlText);

      // Verificamos si existe el nodo esperado (StockData) y si contiene elementos (Item)
      const items = parsedData?.StockData?.Item;
      if (!items) {
        throw new Error('Formato XML no válido: Faltan nodos StockData/Item');
      }

      // Aseguramos que sea un array para procesarlo consistentemente
      const itemsArray = Array.isArray(items) ? items : [items];
      let processedCount = 0;

      for (const item of itemsArray) {
        const sku = item.SKU;
        const description = item.Description || 'Importado por sincronización XML';
        const quantityStr = item.Quantity;
        const weightStr = item.WeightKG;

        // Limpieza y validación de tipos
        if (!sku || !quantityStr) {
          console.warn(`[WarehouseSync] Omitiendo item con datos insuficientes:`, item);
          continue;
        }

        const quantity = parseInt(quantityStr, 10);
        if (isNaN(quantity) || quantity <= 0) {
          console.warn(`[WarehouseSync] Omitiendo SKU ${sku} por cantidad inválida: ${quantityStr}`);
          continue;
        }

        const weight = weightStr ? parseFloat(weightStr) : null;

        await db.transaction(async (tx) => {
          // Buscamos si el SKU ya existe en este almacén
          const [existingItem] = await tx.select()
            .from(stock_items)
            .where(
              and(
                eq(stock_items.warehouse_id, warehouseId),
                eq(stock_items.sku, sku)
              )
            )
            .limit(1);

          let currentStockId: number;

          if (existingItem) {
            currentStockId = existingItem.id;
            // Actualizamos la cantidad total de stock sumando lo entrante
            await tx.update(stock_items)
              .set({ 
                quantity_on_hand: existingItem.quantity_on_hand + quantity,
                updated_at: new Date()
              })
              .where(eq(stock_items.id, existingItem.id));
          } else {
            // Creamos el nuevo ítem en el maestro de stock
            const [newItem] = await tx.insert(stock_items)
              .values({
                warehouse_id: warehouseId,
                shipment_id: null,
                sku: sku,
                description: description,
                quantity_on_hand: quantity,
                weight_kg: weight ? String(weight) : null,
              })
              .returning();
            currentStockId = newItem.id;
          }

          // Registramos el movimiento (Receiving) en el histórico
          await tx.insert(inventory_movements)
            .values({
              stock_item_id: currentStockId,
              movement_type: 'Receiving',
              quantity_change: quantity,
              reference_note: 'Sincronización XML periódica'
            });
        });

        processedCount++;
      }

      console.log(`[WarehouseSync] Sincronización completada. ${processedCount} items procesados.`);
      return { success: true, processedCount };

    } catch (error) {
      if (error instanceof ExternalApiException) {
         console.error('[WarehouseSync] Fallo en la API externa tras reintentos:', error.message);
      } else {
         console.error('[WarehouseSync] Error interno en la sincronización:', error);
      }
      throw error;
    }
  }
}

export const warehouseSyncService = new WarehouseSyncService();