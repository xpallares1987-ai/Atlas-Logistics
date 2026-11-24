/**
 * @file sync-atlas-project-dates.mjs
 * @description Synchronizes GitHub Project 4 ("Atlas Project") Start Date and End Date
 * fields with actual Issue Created Date and Closed Date across all issues.
 *
 * Uses:
 * - updateIssueFieldValue GraphQL mutation for Start date (IFD_kgDOAvksLQ) and End date (IFD_kgDOAvkskA)
 * - Safe parameterized execution via execFileSync (zero shell injection risk)
 */

import { execFileSync } from "node:child_process";

const OWNER = "xpallares1987-ai";
const REPO = "xpallares1987-ai/Atlas-Logistics";
const PROJECT_NUMBER = 4;
const PROJECT_ID = "PVT_kwHODX38a84BZ46e";

// Native Issue Date Field IDs mapped to Project 4
const START_DATE_ISSUE_FIELD_ID = "IFD_kgDOAvksLQ";
const END_DATE_ISSUE_FIELD_ID = "IFD_kgDOAvkskA";

// Project Status Field
const STATUS_FIELD_ID = "PVTSSF_lAHODX38a84BZ46ezhU0bdg";
const DONE_OPTION_ID = "98236657";

function runGh(args, maxRetries = 3) {
  let attempt = 0;
  while (true) {
    try {
      return execFileSync("gh", args, {
        env: { ...process.env, GITHUB_TOKEN: "" },
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 20000,
      }).trim();
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries) throw err;
      const waitMs = attempt * 2000;
      console.warn(
        `[runGh] Command failed (attempt ${attempt}/${maxRetries}), retrying in ${waitMs}ms...`,
      );
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, waitMs);
    }
  }
}

function setIssueDateField(issueId, fieldId, dateValue) {
  const mutation = `mutation($issueId: ID!, $fieldId: ID!, $date: String!) {
  updateIssueFieldValue(input: {
    issueId: $issueId,
    issueField: {
      fieldId: $fieldId,
      dateValue: $date
    }
  }) {
    clientMutationId
  }
}`;
  runGh([
    "api",
    "graphql",
    "-f",
    `query=${mutation}`,
    "-F",
    `issueId=${issueId}`,
    "-F",
    `fieldId=${fieldId}`,
    "-F",
    `date=${dateValue}`,
  ]);
}

async function main() {
  console.log("=== Synchronizing Created Date -> Start Date & Closed Date -> End Date on Atlas Project (#4) ===");

  // 1. Fetch all repository issues with their timestamps and IDs
  console.log("Fetching all issues from repository...");
  const rawIssues = runGh([
    "issue",
    "list",
    "--repo",
    REPO,
    "--limit",
    "100",
    "--state",
    "all",
    "--json",
    "id,number,title,url,state,createdAt,closedAt",
  ]);
  const issues = JSON.parse(rawIssues || "[]");
  console.log(`Found ${issues.length} issues in ${REPO}.`);

  // 2. Fetch all current items in Project 4
  console.log("Fetching existing items in Project 4...");
  const rawItems = runGh([
    "project",
    "item-list",
    String(PROJECT_NUMBER),
    "--owner",
    OWNER,
    "--format",
    "json",
    "--limit",
    "100",
  ]);
  const projectData = JSON.parse(rawItems || "{}");
  const projectItems = projectData.items || [];
  console.log(`Found ${projectItems.length} items in Project 4.`);

  let updatedCount = 0;
  let addedCount = 0;

  for (const issue of issues) {
    // Ensure the issue is in Project 4
    let pItem = projectItems.find(
      (pi) => pi.content?.url === issue.url || pi.content?.number === issue.number,
    );
    let itemId = pItem?.id;

    if (!itemId) {
      console.log(`Adding Issue #${issue.number} to Project 4...`);
      try {
        const addRes = runGh([
          "project",
          "item-add",
          String(PROJECT_NUMBER),
          "--owner",
          OWNER,
          "--url",
          issue.url,
          "--format",
          "json",
        ]);
        const parsedAdd = JSON.parse(addRes || "{}");
        itemId = parsedAdd.id;
        addedCount++;
      } catch (addErr) {
        console.warn(`Could not add issue #${issue.number} to project:`, addErr.message);
      }
    }

    // Set Status to Done if issue is closed
    if (itemId && (issue.state === "CLOSED" || issue.state === "closed")) {
      try {
        runGh([
          "project",
          "item-edit",
          "--id",
          itemId,
          "--project-id",
          PROJECT_ID,
          "--field-id",
          STATUS_FIELD_ID,
          "--single-select-option-id",
          DONE_OPTION_ID,
        ]);
      } catch (statusErr) {
        // Non-blocking
      }
    }

    // Determine Start Date (Created Date) and End Date (Closed Date)
    const startDate = issue.createdAt ? issue.createdAt.slice(0, 10) : null;
    const endDate = issue.closedAt ? issue.closedAt.slice(0, 10) : startDate;

    if (!startDate) {
      console.warn(`Issue #${issue.number} has no createdAt timestamp, skipping.`);
      continue;
    }

    try {
      // 1. Update Start Date with Created Date
      setIssueDateField(issue.id, START_DATE_ISSUE_FIELD_ID, startDate);

      // 2. Update End Date with Closed Date (or Created Date if not closed)
      if (endDate) {
        setIssueDateField(issue.id, END_DATE_ISSUE_FIELD_ID, endDate);
      }

      console.log(
        `✓ Issue #${issue.number} [${startDate} -> ${endDate}] (${issue.state}) - ${issue.title.slice(0, 60)}`,
      );
      updatedCount++;
    } catch (dateErr) {
      console.error(`✗ Error setting dates on Issue #${issue.number}:`, dateErr.message);
    }
  }

  console.log(`\n=== Synchronization Complete ===`);
  console.log(`Total Issues Processed: ${issues.length}`);
  console.log(`Dates Synchronized:     ${updatedCount}`);
  if (addedCount > 0) {
    console.log(`Newly Added to Project: ${addedCount}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
