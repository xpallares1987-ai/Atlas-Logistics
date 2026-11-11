import { z } from "zod";
import { sql, SQL } from "drizzle-orm";

/**
 * Pagination Schema
 * Standard pagination query parameters for all list endpoints
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/**
 * Pagination metadata returned in response
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Standard paginated API response
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
  timestamp: string;
  correlationId: string;
}

/**
 * Calculate pagination offset
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Generate pagination metadata
 */
export function generatePaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const pages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1,
  };
}

/**
 * Apply pagination to database query
 * Returns { offset, limit } for use with .offset() and .limit()
 */
export function applyPagination(pagination: PaginationQuery) {
  const offset = calculateOffset(pagination.page, pagination.limit);
  return { offset, limit: pagination.limit };
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(pagination: any): PaginationQuery {
  return PaginationQuerySchema.parse(pagination);
}
