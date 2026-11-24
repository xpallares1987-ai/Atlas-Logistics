/**
 * @file update-github-labels.mjs
 * @description Updates and synchronizes GitHub labels across merged PRs and Atlas-Project issues.
 */

import { execSync } from "node:child_process";

// 1. Label Mapping for Atlas-Project Issues
const ISSUE_LABELS = {
  51: ["financial", "backend", "released"],
  50: ["compliance", "backend", "logistics", "released"],
  49: ["financial", "backend", "released"],
  48: ["financial", "backend", "released"],
  47: ["financial", "backend", "released"],
  45: ["compliance", "financial", "frontend", "documentation", "released"],
  44: ["compliance", "financial", "frontend", "documentation", "released"],
  42: ["logistics", "frontend", "ui", "documentation", "released"],
  41: ["financial", "database", "documentation", "released"],
  40: ["backend", "released"],
  39: ["database", "documentation", "released"],
  38: ["financial", "backend", "logistics", "released"],
  37: ["backend", "released"],
  36: ["database", "backend", "released"],
  35: ["logistics", "compliance", "backend", "released"],
  34: ["logistics", "compliance", "backend", "tests", "released"],
  33: ["logistics", "compliance", "backend", "released"],
  32: ["compliance", "security", "backend", "released"],
  31: ["logistics", "backend", "database", "released"],
  30: ["ci/cd", "database", "tests", "released"],
  29: ["database", "performance", "tests", "released"],
  28: ["compliance", "security", "backend", "released"],
  27: ["compliance", "database", "security", "documentation", "released"],
  26: ["ci/cd", "database", "tests", "released"],
  25: ["ci/cd", "documentation", "security", "released"],
  24: ["database", "performance", "tests", "released"],
  23: ["frontend", "ui", "logistics", "released"],
  22: ["backend", "logistics", "released"],
  21: ["backend", "logistics", "released"],
  9:  ["ci/cd", "security", "enhancement", "released"],
  7:  ["ci/cd", "database", "enhancement", "released"],
  6:  ["ci/cd", "released"],
  5:  ["ci/cd", "security", "docker", "enhancement", "released"],
};

// 2. Additional labels for merged PRs
const PR_ADD_LABELS = {
  46: ["docker"],
  10: ["github-actions"],
  4:  ["github-actions", "security"],
  3:  ["docker", "security"],
};

function runGh(cmd) {
  return execSync(`gh ${cmd}`, {
    env: { ...process.env, GITHUB_TOKEN: "" },
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

console.log("=== Updating Labels for Atlas-Project Issues ===");
for (const [issueNum, labels] of Object.entries(ISSUE_LABELS)) {
  const labelFlags = labels.map((l) => `--add-label "${l}"`).join(" ");
  try {
    runGh(`issue edit ${issueNum} ${labelFlags}`);
    console.log(`✓ Issue #${issueNum} labeled: [${labels.join(", ")}]`);
  } catch (err) {
    console.error(`✗ Failed to update Issue #${issueNum}:`, err.message);
  }
}

console.log("\n=== Updating Labels for Merged PRs ===");
for (const [prNum, labels] of Object.entries(PR_ADD_LABELS)) {
  const labelFlags = labels.map((l) => `--add-label "${l}"`).join(" ");
  try {
    runGh(`pr edit ${prNum} ${labelFlags}`);
    console.log(`✓ PR #${prNum} labeled: [${labels.join(", ")}]`);
  } catch (err) {
    console.error(`✗ Failed to update PR #${prNum}:`, err.message);
  }
}

console.log("\n=== All Labels Updated Successfully ===");
