/**
 * @file check-naming-conventions.test.ts
 * @description Unit tests verifying DRY naming guardrails, semantic UI buckets, hooks/ purity, and barrel enforcement.
 * @module @atlas/tests/check-naming-conventions
 * @see {@link scripts/check-naming-conventions.mjs}
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { scanNamingConventions } from "../scripts/check-naming-conventions.mjs";

function makeTempFixture() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "atlas-naming-test-"));
}

function writeFixtureFile(
  rootDir: string,
  relPath: string,
  content = "export {};\n",
) {
  const fullPath = path.join(rootDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
}

describe("DRY Naming Convention Guardrail (scanNamingConventions)", () => {
  it("passes cleanly when packages and src follow canonical DRY naming rules", () => {
    const tmp = makeTempFixture();
    try {
      writeFixtureFile(tmp, "src/services/billing.service.ts");
      writeFixtureFile(
        tmp,
        "packages/frontend/src/components/Bookings/index.ts",
      );
      writeFixtureFile(
        tmp,
        "packages/frontend/src/components/Bookings/Modal/Confirm.tsx",
      );
      writeFixtureFile(
        tmp,
        "packages/frontend/src/components/Bookings/hooks/useBooking.ts",
      );
      writeFixtureFile(
        tmp,
        "packages/frontend/src/components/Bookings/utils/helpers.ts",
      );
      writeFixtureFile(tmp, "packages/ui/src/components/Modal/index.ts");
      writeFixtureFile(tmp, "packages/ui/src/components/Modal/Base.tsx");

      const result = scanNamingConventions({ rootDir: tmp });
      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("flags Component suffixes, index.tsx files, legacy *Service.ts, non-hooks in hooks/, unbucketed Modal/Drawer files, redundant suffixes, and missing barrels", () => {
    const tmp = makeTempFixture();
    try {
      writeFixtureFile(tmp, "src/services/geminiService.ts");
      writeFixtureFile(tmp, "packages/rate-comparer/src/index.tsx");
      writeFixtureFile(
        tmp,
        "packages/frontend/src/components/Bad/ButtonComponent.tsx",
      );
      writeFixtureFile(
        tmp,
        "packages/frontend/src/components/Bad/CreateModal.tsx",
      );
      writeFixtureFile(
        tmp,
        "packages/frontend/src/components/Bad/DetailsDrawer.tsx",
      );
      writeFixtureFile(
        tmp,
        "packages/frontend/src/components/Bad/Tab/OverviewTab.tsx",
      );
      writeFixtureFile(
        tmp,
        "packages/frontend/src/components/Bad/hooks/helperUtils.ts",
      );

      const result = scanNamingConventions({ rootDir: tmp });
      expect(result.passed).toBe(false);

      const rules = new Set(result.violations.map((v) => v.rule));
      expect(rules.has("CANONICAL_SERVICE_ROUTE_SUFFIX")).toBe(true);
      expect(rules.has("NO_INDEX_TSX")).toBe(true);
      expect(rules.has("NO_COMPONENT_SUFFIX")).toBe(true);
      expect(rules.has("SEMANTIC_MODAL_BUCKET")).toBe(true);
      expect(rules.has("SEMANTIC_DRAWER_BUCKET")).toBe(true);
      expect(rules.has("NO_REDUNDANT_BUCKET_SUFFIX")).toBe(true);
      expect(rules.has("HOOKS_DIR_PURITY")).toBe(true);
      expect(rules.has("MISSING_BARREL_INDEX")).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
