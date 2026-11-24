/**
 * @file financial.resource.ts
 * @description Resource accessor for Financial invoices, job costing, and accruals.
 * @module @atlas/client-sdk/resources/financial
 * @see {@link docs/architecture/atlas-monorepo-structure.md}
 */

import { BaseResource } from "./base.resource.js";
import type {
  InvoiceSummary,
  JobCostingAccrual,
  PaginationParams,
  PaginatedResult,
} from "../types/api.types.js";
import type { RequestOptions } from "../types/client.types.js";

export class FinancialResource extends BaseResource {
  /**
   * Lists customer and vendor invoices.
   */
  public listInvoices(
    params?: PaginationParams,
    options?: RequestOptions,
  ): Promise<PaginatedResult<InvoiceSummary>> {
    return this.get<PaginatedResult<InvoiceSummary>>("/financial/invoices", {
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
   * Retrieves single invoice details by ID.
   */
  public getInvoiceById(
    id: string,
    options?: RequestOptions,
  ): Promise<InvoiceSummary> {
    return this.get<InvoiceSummary>(
      `/financial/invoices/${encodeURIComponent(id)}`,
      options,
    );
  }

  /**
   * Retrieves job costing and accruals reconciliation for a specific shipment.
   */
  public getShipmentJobCosting(
    shipmentId: string,
    options?: RequestOptions,
  ): Promise<readonly JobCostingAccrual[]> {
    return this.get<readonly JobCostingAccrual[]>(
      `/financial/job-costing/shipments/${encodeURIComponent(shipmentId)}`,
      options,
    );
  }

  /**
   * Reconciles an actual vendor invoice line against an existing accrual.
   */
  public reconcileAccrual(
    accrualId: string,
    actualCost: number,
    vendorInvoiceNumber: string,
    options?: RequestOptions,
  ): Promise<JobCostingAccrual> {
    return this.post<JobCostingAccrual>(
      `/financial/job-costing/accruals/${encodeURIComponent(accrualId)}/reconcile`,
      {
        actualCost,
        vendorInvoiceNumber,
      },
      options,
    );
  }
}
