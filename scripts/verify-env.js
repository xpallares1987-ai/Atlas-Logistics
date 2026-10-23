#!/usr/bin/env node
// scripts/verify-env.js
// Cross-platform environment and pre-flight verification script for Atlas Logistics

import { existsSync, readFileSync } from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, "..");

console.log("\n🔍 Verifying Atlas Logistics Environment (Cross-Platform)...");
console.log(`📁 Project root: ${ROOT_DIR}\n`);

let passed = 0;
let failed = 0;

function check(title, condition, fix = "") {
  if (condition) {
    console.log(`  ✓ ${title}`);
    passed++;
  } else {
    console.error(`  ✗ ${title}`);
    if (fix) console.error(`    ↳ Fix: ${fix}`);
    failed++;
  }
}

function checkCmd(title, cmd) {
  try {
    const version = execSync(cmd, {
      stdio: ["pipe", "pipe", "ignore"],
      encoding: "utf8",
    })
      .trim()
      .split("\n")[0];
    check(`${title} (${version})`, true);
  } catch {
    check(`${title}`, false, `Install ${title.split(" ")[0]}`);
  }
}

// 1. System dependencies
console.log("📦 Checking System Dependencies...");
checkCmd("Node.js", "node -v");
checkCmd("pnpm", "pnpm -v");

// 2. Project files
console.log("\n📄 Checking Project Files...");
const criticalFiles = [
  ["docker-compose.yml", "Docker Compose configuration"],
  [".env.local", "Local environment file (.env.local)"],
  ["package.json", "Monorepo package configuration"],
  ["drizzle.config.ts", "Drizzle ORM configuration"],
  ["src/server.ts", "Backend Fastify entrypoint"],
  ["src/worker-node.ts", "AtlasEngine BullMQ Worker node"],
];

for (const [relPath, desc] of criticalFiles) {
  check(`${desc} (${relPath})`, existsSync(path.join(ROOT_DIR, relPath)));
}

// 3. Node modules
console.log("\n📚 Checking Node Dependencies...");
check(
  "Installed node_modules",
  existsSync(path.join(ROOT_DIR, "node_modules")),
  "Run: pnpm install",
);

// 4. Environment config
console.log("\n⚙️  Checking Environment Configuration...");
const envPath = path.join(ROOT_DIR, ".env.local");
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf8");
  check("NODE_ENV defined in .env.local", content.includes("NODE_ENV="));
  check(
    "DATABASE_URL defined in .env.local",
    content.includes("DATABASE_URL="),
  );
} else {
  check(".env.local exists", false, "Copy .env.local.example to .env.local");
}

// 5. Summary
console.log(
  "\n═══════════════════════════════════════════════════════════════════════",
);
console.log(`✅ VERIFICATION SUMMARY: ${passed} passed, ${failed} failed`);
console.log(
  "═══════════════════════════════════════════════════════════════════════\n",
);

if (failed > 0) {
  console.error(
    "⚠️ Some environment checks failed. Please address the issues above.\n",
  );
  process.exit(1);
} else {
  console.log(
    "🎉 Atlas Logistics development & production-readiness check passed!\n",
  );
  process.exit(0);
}
