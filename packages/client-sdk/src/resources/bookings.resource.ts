/**
 * @file bookings.resource.ts
 * @description Resource accessor for Booking management and container allocation operations.
 * @module @atlas/client-sdk/resources/bookings
 * @see {@link docs/architecture/atlas-monorepo-structure.md}
 */

import { BaseResource } from "./base.resource.js";
import type {
  BookingDetail,
  BookingSummary,
  CreateBookingPayload,
  PaginationParams,
  PaginatedResult,
} from "../types/api.types.js";
import type { RequestOptions } from "../types/client.types.js";

export class BookingsResource extends BaseResource {
  /**
   * Lists bookings with pagination and filters.
   */
  public list(
    params?: PaginationParams,
    options?: RequestOptions,
  ): Promise<PaginatedResult<BookingSummary>> {
    return this.get<PaginatedResult<BookingSummary>>("/bookings", {
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
   * Retrieves single booking details by ID or reference.
   */
  public getById(id: string, options?: RequestOptions): Promise<BookingDetail> {
    return this.get<BookingDetail>(
      `/bookings/${encodeURIComponent(id)}`,
      options,
    );
  }

  /**
   * Creates a new booking request.
   */
  public create(
    payload: CreateBookingPayload,
    options?: RequestOptions,
  ): Promise<BookingDetail> {
    return this.post<BookingDetail>("/bookings", payload, options);
  }

  /**
   * Allocates an ISO shipping container to a booking.
   */
  public allocateContainer(
    id: string,
    payload: { containerNumber: string; isoType: string; sealNumber?: string },
    options?: RequestOptions,
  ): Promise<BookingDetail> {
    return this.post<BookingDetail>(
      `/bookings/${encodeURIComponent(id)}/containers`,
      payload,
      options,
    );
  }

  /**
   * Confirms a booking with carrier confirmation reference.
   */
  public confirm(
    id: string,
    confirmationReference: string,
    options?: RequestOptions,
  ): Promise<BookingDetail> {
    return this.post<BookingDetail>(
      `/bookings/${encodeURIComponent(id)}/confirm`,
      { confirmationReference },
      options,
    );
  }
}
