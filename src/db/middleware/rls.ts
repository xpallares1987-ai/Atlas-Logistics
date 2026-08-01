import { eq, SQL } from 'drizzle-orm';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';

/**
 * Row-Level Security (RLS) Wrapper for Drizzle ORM
 * 
 * Ensures that all queries on tables containing a `companyId` are automatically
 * scoped to the current user's tenant.
 * 
 * Usage:
 * const safeSelect = withTenant(db.select().from(users), users, context.companyId);
 */
export function withTenant<T extends { where: (condition: SQL) => any }>(
  queryBuilder: T,
  table: SQLiteTable & { companyId: any },
  companyId: string
): ReturnType<T['where']> {
  if (!companyId) {
    throw new Error('RLS Violation: companyId is required for this query.');
  }
  return queryBuilder.where(eq(table.companyId, companyId));
}
