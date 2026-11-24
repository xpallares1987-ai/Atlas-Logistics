/**
 * @file warehouse.resource.ts
 * @description Resource accessor for Warehouse inventory, stock movements, and CFS allocations.
 * @module @atlas/client-sdk/resources/warehouse
 * @see {@link docs/architecture/atlas-monorepo-structure.md}
 */

import { BaseResource } from "./base.resource.js";
import type {
  InventoryItemSummary,
  PaginationParams,
  PaginatedResult,
  StockMovementPayload,
} from "../types/api.types.js";
import type { RequestOptions } from "../types/client.types.js";

export class WarehouseResource extends BaseResource {
  /**
   * Lists inventory items across warehouse facilities.
   */
  public listInventory(
    facilityCode?: string,
    params?: PaginationParams,
    options?: RequestOptions,
  ): Promise<PaginatedResult<InventoryItemSummary>> {
    return this.get<PaginatedResult<InventoryItemSummary>>(
      "/warehouse/inventory",
      {
        ...options,
        query: {
          ...options?.query,
          facilityCode,
          page: params?.page,
          limit: params?.limit,
          search: params?.search,
          sortBy: params?.sortBy,
          sortOrder: params?.sortOrder,
        },
      },
    );
  }

  /**
   * Records a stock movement (inbound, dispatch, bin transfer, cycle count adjustment).
   */
  public recordMovement(
    payload: StockMovementPayload,
    options?: RequestOptions,
  ): Promise<{
    success: boolean;
    movementId: string;
    updatedQuantityOnHand: number;
  }> {
    return this.post<{
      success: boolean;
      movementId: string;
      updatedQuantityOnHand: number;
    }>("/warehouse/movements", payload, options);
  }
}
