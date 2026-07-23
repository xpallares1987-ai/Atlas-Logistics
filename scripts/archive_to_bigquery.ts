import { BigQuery } from "@google-cloud/bigquery";
// In a real scenario, this would use Data Connect SDK to fetch expired records.
// import { executeGetExpiredShipments } from "../src/dataconnect-admin-generated";

const bigquery = new BigQuery();
const DATASET_ID = "atlas_archive_europe";
const TABLE_ID = "historical_shipments";

async function archiveOldRecords() {
  console.log("🔍 Scanning for Shipments older than 5 years...");

  // Example dry-run logic
  const isDryRun = process.argv.includes("--dry-run");

  // Mocking the data extraction for the script skeleton
  const expiredRecords = [
    {
      trackingNumber: "ARC-001-OLD",
      status: "DELIVERED",
      origin: "CNSHG",
      destination: "NLRTM",
      createdAt: new Date("2019-01-01").toISOString(),
    },
  ];

  if (expiredRecords.length === 0) {
    console.log("✅ No records older than 5 years found.");
    return;
  }

  console.log(
    `📦 Found ${expiredRecords.length} records ready for Cold Storage.`,
  );

  if (isDryRun) {
    console.log("DRY-RUN: Skipping BigQuery insertion. Data:");
    console.table(expiredRecords);
    return;
  }

  try {
    const dataset = bigquery.dataset(DATASET_ID);
    const table = dataset.table(TABLE_ID);

    await table.insert(expiredRecords);
    console.log("✅ Successfully archived to BigQuery.");

    // TODO: Mark them as isDeleted: true in Cloud SQL using Data Connect mutation
    // await executeMarkAsDeletedMutation({ trackingNumbers: [...] })
  } catch (err) {
    console.error("❌ Failed to archive records to BigQuery:", err);
    process.exit(1);
  }
}

archiveOldRecords();
