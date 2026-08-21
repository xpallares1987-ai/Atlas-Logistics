// src/cron/backup-scheduler.js
// Runs the backup script on a daily schedule using node-cron.

import cron from "node-cron";
import { exec } from "node:child_process";
import path from "node:path";
import {
  backupSuccess,
  backupFailure,
  backupDuration,
} from "../monitoring/backupMetrics.js";

// Schedule: configurable via BACKUP_CRON_SCHEDULE, default every day at 00:00 (midnight)
const schedule = process.env.BACKUP_CRON_SCHEDULE || "0 0 * * *";

cron.schedule(schedule, () => {
  console.log(`[${new Date().toISOString()}] Starting scheduled backup...`);
  const backupScript = path.resolve(process.cwd(), "src/scripts/backup-db.js");
  const endTimer = backupDuration.startTimer();
  exec(`node "${backupScript}"`, (error, stdout, stderr) => {
    if (error) {
      console.error("Backup script failed:", error);
      backupFailure.inc();
      endTimer();
      return;
    }
    if (stdout) console.log(stdout.trim());
    if (stderr) console.error(stderr.trim());
    console.log(`[${new Date().toISOString()}] Scheduled backup completed.`);
    backupSuccess.inc();
    endTimer();
  });
});

console.log(`Backup scheduler started – cron pattern: ${schedule}`);
