import { db } from '../db/index.js';
import { users, contacts } from '../db/schema/core.js';
import { eq, and, lt } from 'drizzle-orm';
import 'dotenv/config';

/**
 * GDPR Purge Job
 * 
 * To be run via a Cron scheduler (e.g. daily at 00:00).
 * Scans for records that have been marked as deleted (isDeleted = true)
 * for more than 30 days and physically deletes or anonymizes them.
 */

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function runPurge() {
  console.log('🚀 Starting GDPR Data Purge Job...');
  const cutoffDate = new Date(Date.now() - THIRTY_DAYS_MS);

  try {
    // 1. Hard delete users deleted more than 30 days ago
    const deletedUsers = await db.delete(users)
      .where(
        and(
          eq(users.isDeleted, true),
          lt(users.updatedAt, cutoffDate)
        )
      )
      .returning({ id: users.id });
    console.log(`✅ Hard-deleted ${deletedUsers.length} users.`);

    // 2. Hard delete contacts
    const deletedContacts = await db.delete(contacts)
      .where(
        and(
          eq(contacts.isDeleted, true),
          lt(contacts.updatedAt, cutoffDate)
        )
      )
      .returning({ id: contacts.id });
    console.log(`✅ Hard-deleted ${deletedContacts.length} contacts.`);

    // Note: Transactional data like Invoices or Shipments should usually 
    // be anonymized rather than deleted due to tax regulations.
    // For this example, we focus on purely PII master data.

    console.log('🎉 GDPR Purge complete.');
  } catch (error) {
    console.error('❌ Error during GDPR Purge:', error);
    process.exit(1);
  }
}

// Allow running directly via tsx
if (import.meta.url === `file://${process.argv[1]}`) {
  runPurge().then(() => process.exit(0));
}
