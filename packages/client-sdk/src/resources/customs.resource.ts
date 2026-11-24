/**
 * @file customs.resource.ts
 * @description Resource accessor for Customs filings, CBAM emissions declarations, and duty estimations.
 * @module @atlas/client-sdk/resources/customs
 * @see {@link docs/architecture/atlas-monorepo-structure.md}
 */

import { BaseResource } from "./base.resource.js";
import type {
  CbamDeclarationSummary,
  DutyEstimationRequest,
  DutyEstimationResult,
  PaginationParams,
  PaginatedResult,
} from "../types/api.types.js";
import type { RequestOptions } from "../types/client.types.js";

export class CustomsResource extends BaseResource {
  /**
   * Lists EU CBAM carbon border declarations.
   */
  public listCbamDeclarations(
    params?: PaginationParams,
    options?: RequestOptions,
  ): Promise<PaginatedResult<CbamDeclarationSummary>> {
    return this.get<PaginatedResult<CbamDeclarationSummary>>(
      "/customs/cbam/declarations",
      {
        ...options,
        query: {
          ...options?.query,
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
   * Retrieves a specific CBAM declaration by ID.
   */
  public getCbamDeclarationById(
    id: string,
    options?: RequestOptions,
  ): Promise<CbamDeclarationSummary> {
    return this.get<CbamDeclarationSummary>(
      `/customs/cbam/declarations/${encodeURIComponent(id)}`,
      options,
    );
  }

  /**
   * Computes estimated import customs duties and VAT based on HS code and destination rules.
   */
  public estimateDuties(
    payload: DutyEstimationRequest,
    options?: RequestOptions,
  ): Promise<DutyEstimationResult> {
    return this.post<DutyEstimationResult>(
      "/customs/duties/estimate",
      payload,
      options,
    );
  }
}
