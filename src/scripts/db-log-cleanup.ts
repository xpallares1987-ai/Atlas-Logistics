import { db } from '../db/client.js';
import { audit_logs } from '../db/schema.js';
import { lte } from 'drizzle-orm';

/**
 * Maintenance script to purge audit logs older than 90 days.
 * Ensures the audit log table size does not degrade database query speeds over time.
 */
async function main() {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  console.log(`[LogCleanup] Pruning audit logs created before ${ninetyDaysAgo.toISOString()}...`);

  try {
    await db.delete(audit_logs).where(lte(audit_logs.created_at, ninetyDaysAgo));
    console.log(`[LogCleanup] Audit logs prune action executed successfully.`);
    process.exit(0);
  } catch (error) {
    console.error(`[LogCleanup] Failed to prune audit logs:`, error);
    process.exit(1);
  }
}

main();
