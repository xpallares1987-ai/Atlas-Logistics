/**
 * @file sync-atlas-project.mjs
 * @description Bidirectional and automated synchronization between Antigravity SharedBoard
 * and GitHub Project 4 ("Atlas Project").
 *
 * Enforces:
 * - Status field mapping (Todo, In Progress, Review, Done) on Project Items
 * - Start date (IFD_kgDOAvksLQ) and End date (IFD_kgDOAvkskA) via GraphQL updateIssueFieldValue for Roadmap visualization
 * - Automatic issue creation, project item association, and metadata updates
 */

import { execSync } from "node:child_process";
import fs from "node:fs";

const PROJECT_NUMBER = 4;
const OWNER = "xpallares1987-ai";
const REPO = "xpallares1987-ai/Atlas-Logistics";
const PROJECT_ID = "PVT_kwHODX38a84BZ46e";

// Project Field IDs
const STATUS_FIELD_ID = "PVTSSF_lAHODX38a84BZ46ezhU0bdg";

// Native Issue Date Field IDs (for Roadmap view)
const START_DATE_ISSUE_FIELD_ID = "IFD_kgDOAvksLQ";
const END_DATE_ISSUE_FIELD_ID = "IFD_kgDOAvkskA";

const STATUS_OPTIONS = {
  todo: "f75ad846",
  in_progress: "47fc9ee4",
  review: "494e64b6",
  done: "98236657",
};

// 36-Week Enterprise Roadmap Date Scheduling
const TASK_SCHEDULE = {
  // Historical SCM Foundation
  "T-36": { start: "2026-11-10", end: "2026-11-12" },
  "T-37": { start: "2026-11-12", end: "2026-11-14" },
  "T-38": { start: "2026-11-14", end: "2026-11-16" },
  "T-42": { start: "2026-11-17", end: "2026-11-19" },
  "T-45": { start: "2026-11-20", end: "2026-11-21" },
  "T-46": { start: "2026-11-21", end: "2026-11-22" },
  "T-47": { start: "2026-11-22", end: "2026-11-23" },
  "T-48": { start: "2026-11-22", end: "2026-11-23" },
  "T-49": { start: "2026-11-23", end: "2026-11-23" },

  // Phase 0: Concurrency, Invariants & CI Resilience
  "T-50": { start: "2026-11-20", end: "2026-11-23" },
  "T-51": { start: "2026-11-21", end: "2026-11-23" },
  "T-52": { start: "2026-11-22", end: "2026-11-23" },

  // Phase 1: Sovereign Customs Gateway & Multimodal Standards
  "T-53": { start: "2026-11-23", end: "2026-11-24" },
  "T-54": { start: "2026-11-23", end: "2026-11-24" },
  "T-55": { start: "2026-11-24", end: "2026-11-25" },
  "T-56": { start: "2026-11-24", end: "2026-11-25" },
  "T-57": { start: "2026-11-24", end: "2026-11-26" },

  // Phase 2: Hybrid Persistence & Offline Edge Synchronization (ADR 0039)
  "T-58": { start: "2026-11-26", end: "2026-11-28" },
  "T-59": { start: "2026-11-26", end: "2026-11-29" },
  "T-60": { start: "2026-11-28", end: "2026-12-04" },
  "T-61": { start: "2026-12-04", end: "2026-12-15" },

  // Phase 3: Financial Settlement, Automated Clearing & Outbox Event Bus (ADR 0040)
  "T-62": { start: "2026-12-16", end: "2026-12-24" },
  "T-63": { start: "2026-12-26", end: "2027-01-05" },
  "T-64": { start: "2027-01-06", end: "2027-01-14" },
  "T-65": { start: "2027-01-15", end: "2027-01-20" },

  // Phase 4: Environmental Compliance (CBAM/GLEC) & Global Treasury ISO 20022 (ADR 0041 & 0042)
  "T-66": { start: "2027-01-21", end: "2027-02-04" },
  "T-67": { start: "2027-02-05", end: "2027-02-18" },
  "T-68": { start: "2027-02-19", end: "2027-03-05" },
  "T-69": { start: "2027-03-06", end: "2027-03-20" },
  "T-70": { start: "2027-03-21", end: "2027-03-30" },
};

const BOARD_PATH = "C:\\Users\\xpall\\.gemini\\antigravity-cli\\ipc-shared\\shared-board.json";

function runGh(cmd) {
  return execSync(`gh ${cmd}`, {
    env: { ...process.env, GITHUB_TOKEN: "" },
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

function setIssueDateField(issueId, fieldId, dateValue) {
  const mutation = `
mutation($issueId: ID!, $fieldId: ID!, $date: String!) {
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
  const escapedMutation = mutation.replace(/\n/g, " ");
  runGh(`api graphql -f query="${escapedMutation}" -F issueId="${issueId}" -F fieldId="${fieldId}" -F date="${dateValue}"`);
}

async function main() {
  console.log("=== Syncing Antigravity SharedBoard with Atlas Project (#4) ===");
  if (!fs.existsSync(BOARD_PATH)) {
    console.error("Board path does not exist:", BOARD_PATH);
    process.exit(1);
  }

  const board = JSON.parse(fs.readFileSync(BOARD_PATH, "utf8"));
  const tasks = board.tasks.filter((t) => t.id && t.id.startsWith("T-"));

  // 1. Get existing issues with their GraphQL IDs
  console.log("Fetching existing GitHub issues with GraphQL IDs...");
  const rawIssues = runGh(`issue list --repo ${REPO} --limit 100 --state all --json id,number,title,url,state`);
  const existingIssues = JSON.parse(rawIssues || "[]");

  // 2. Get existing items in Project 4
  console.log("Fetching existing Project items...");
  const rawItems = runGh(`project item-list ${PROJECT_NUMBER} --owner ${OWNER} --format json --limit 100`);
  const projectData = JSON.parse(rawItems || "{}");
  const projectItems = projectData.items || [];

  for (const task of tasks) {
    const taskTag = `[${task.id}]`;
    let issue = existingIssues.find((i) => i.title.includes(taskTag) || i.title.startsWith(task.id + ":"));

    // If issue doesn't exist, create it
    if (!issue) {
      console.log(`Creating issue for ${task.id}: ${task.title}...`);
      const body = `### Task Description\n${task.summary || task.title}\n\n**Owner:** ${task.owner || "unassigned"}\n**Owned Files:**\n${(task.ownedFiles || []).map((f) => `- \`${f}\``).join("\n")}\n\n*Synchronized automatically via Antigravity-IPC.*`;
      const createRes = runGh(
        `issue create --repo ${REPO} --title "${taskTag} ${task.title.replace(/"/g, '\\"')}" --body "${body.replace(/"/g, '\\"')}"`
      );
      const url = createRes.trim();
      console.log(`Created issue: ${url}`);

      // Re-fetch issues to get GraphQL ID
      const updatedIssues = JSON.parse(runGh(`issue list --repo ${REPO} --limit 100 --state all --json id,number,title,url,state`) || "[]");
      issue = updatedIssues.find((i) => i.url === url) || { url, id: null, title: `${taskTag} ${task.title}` };
    }

    // Check if issue is already in Project 4
    let pItem = projectItems.find((pi) => pi.content?.url === issue.url || pi.title?.includes(taskTag));
    let itemId = pItem?.id;

    if (!itemId) {
      console.log(`Adding issue ${issue.url} to Project 4...`);
      try {
        const addRes = runGh(`project item-add ${PROJECT_NUMBER} --owner ${OWNER} --url ${issue.url} --format json`);
        const parsedAdd = JSON.parse(addRes || "{}");
        itemId = parsedAdd.id;
        console.log(`Added item ID: ${itemId}`);
      } catch (err) {
        console.warn(`Could not add item for ${task.id}:`, err.message);
      }
    }

    // 1. Update Status on Project Item
    if (itemId) {
      const targetOptionKey =
        task.status === "done" ? "done" : task.status === "in_progress" ? "in_progress" : "todo";
      const targetOptionId = STATUS_OPTIONS[targetOptionKey];

      try {
        runGh(
          `project item-edit --id ${itemId} --project-id ${PROJECT_ID} --field-id ${STATUS_FIELD_ID} --single-select-option-id ${targetOptionId}`
        );
        console.log(`Set ${task.id} (${itemId}) -> Status: ${targetOptionKey.toUpperCase()}`);
      } catch (err) {
        console.warn(`Could not set status for ${task.id}:`, err.message);
      }
    }

    // 2. Update Start Date and End Date on Issue for Roadmap View
    const schedule = TASK_SCHEDULE[task.id];
    if (schedule && issue.id) {
      try {
        setIssueDateField(issue.id, START_DATE_ISSUE_FIELD_ID, schedule.start);
        setIssueDateField(issue.id, END_DATE_ISSUE_FIELD_ID, schedule.end);
        console.log(`Set ${task.id} (${issue.id}) -> Roadmap: ${schedule.start} to ${schedule.end}`);
      } catch (dateErr) {
        console.warn(`Could not set dates for ${task.id}:`, dateErr.message);
      }
    }
  }

  console.log("=== Synchronization complete ===");
}

main().catch((err) => {
  console.error("Sync error:", err);
  process.exit(1);
});
