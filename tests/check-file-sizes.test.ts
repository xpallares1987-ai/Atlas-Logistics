import { describe, it, expect } from "vitest";
import path from "node:path";
import fs from "node:fs";

import { scanFileSizes } from "../scripts/check-file-sizes.mjs";

describe("File Size Guardrail (scanFileSizes)", () => {
  it("should detect files exceeding the line limit threshold", () => {
    // Create a temporary mock directory with a small file and a large file
    const testDir = path.resolve(
      process.cwd(),
      "tests/fixtures/file-size-test",
    );
    fs.mkdirSync(testDir, { recursive: true });

    const smallFile = path.join(testDir, "SmallComponent.tsx");
    const largeFile = path.join(testDir, "LargeMonolith.tsx");

    fs.writeFileSync(smallFile, "export const A = 1;\nexport const B = 2;\n");
    // Write 25 lines
    const largeContent = Array.from(
      { length: 25 },
      (_, i) => `const line${i} = ${i};`,
    ).join("\n");
    fs.writeFileSync(largeFile, largeContent);

    try {
      const results = scanFileSizes({
        targetDir: testDir,
        maxLines: 20,
        extensions: [".tsx"],
      });

      expect(results.violations.length).toBe(1);
      expect(results.violations[0].file).toContain("LargeMonolith.tsx");
      expect(results.violations[0].lines).toBe(25);
      expect(results.violations[0].limit).toBe(20);
    } finally {
      // Clean up
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should pass cleanly when all files are under the threshold", () => {
    const testDir = path.resolve(
      process.cwd(),
      "tests/fixtures/file-size-pass-test",
    );
    fs.mkdirSync(testDir, { recursive: true });

    const file1 = path.join(testDir, "ComponentOne.tsx");
    const file2 = path.join(testDir, "ComponentTwo.tsx");

    fs.writeFileSync(file1, "const one = 1;\n");
    fs.writeFileSync(file2, "const two = 2;\n");

    try {
      const results = scanFileSizes({
        targetDir: testDir,
        maxLines: 50,
        extensions: [".tsx"],
      });

      expect(results.violations.length).toBe(0);
      expect(results.scannedCount).toBe(2);
    } finally {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });
});
