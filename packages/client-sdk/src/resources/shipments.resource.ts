/**
 * @file shipments.resource.ts
 * @description Resource accessor for Shipment lifecycle and milestone operations.
 * @module @atlas/client-sdk/resources/shipments
 * @see {@link docs/architecture/atlas-monorepo-structure.md}
 */

import { BaseResource } from "./base.resource.js";
import type {
  CreateShipmentPayload,
  PaginationParams,
  PaginatedResult,
  ShipmentDetail,
  ShipmentMilestone,
  ShipmentSummary,
  UpdateShipmentStatusPayload,
} from "../types/api.types.js";
import type { RequestOptions } from "../types/client.types.js";

export class ShipmentsResource extends BaseResource {
  /**
   * Retrieves a paginated list of shipments matching optional filter criteria.
   */
  public list(
    params?: PaginationParams,
    options?: RequestOptions,
  ): Promise<PaginatedResult<ShipmentSummary>> {
    return this.get<PaginatedResult<ShipmentSummary>>("/shipments", {
      ...options,
      query: {
        ...options?.query,
        page: params?.page,
        limit: params?.limit,
        search: params?.search,
        sortBy: params?.sortBy,
        sortOrder: params?.sortOrder,
      },
    });
  }

  /**
   * Retrieves detailed information for a specific shipment by ID or tracking number.
   */
  public getById(
    id: string,
    options?: RequestOptions,
  ): Promise<ShipmentDetail> {
    return this.get<ShipmentDetail>(
      `/shipments/${encodeURIComponent(id)}`,
      options,
    );
  }

  /**
   * Creates a new shipment in DRAFT or BOOKED state.
   */
  public create(
    payload: CreateShipmentPayload,
    options?: RequestOptions,
  ): Promise<ShipmentDetail> {
    return this.post<ShipmentDetail>("/shipments", payload, options);
  }

  /**
   * Updates shipment transit status and appends a tracking milestone.
   */
  public updateStatus(
    id: string,
    payload: UpdateShipmentStatusPayload,
    options?: RequestOptions,
  ): Promise<ShipmentDetail> {
    return this.patch<ShipmentDetail>(
      `/shipments/${encodeURIComponent(id)}/status`,
      payload,
      options,
    );
  }

  /**
   * Retrieves chronological tracking milestones for a shipment.
   */
  public getMilestones(
    id: string,
    options?: RequestOptions,
  ): Promise<readonly ShipmentMilestone[]> {
    return this.get<readonly ShipmentMilestone[]>(
      `/shipments/${encodeURIComponent(id)}/milestones`,
      options,
    );
  }

  /**
   * Cancels a shipment.
   */
  public cancel(
    id: string,
    reason?: string,
    options?: RequestOptions,
  ): Promise<{ success: boolean; message: string }> {
    return this.post<{ success: boolean; message: string }>(
      `/shipments/${encodeURIComponent(id)}/cancel`,
      { reason },
      options,
    );
  }
}
