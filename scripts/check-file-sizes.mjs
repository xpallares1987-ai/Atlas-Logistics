#!/usr/bin/env node

/**
 * Atlas Logistics - File Size Guardrail Scanner (ADR 0020)
 * Scans TypeScript / TSX files against maximum line count thresholds
 * to prevent the growth of monolithic components.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export function countFileLines(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  if (!content) return 0;
  return content.split(/\r?\n/).length;
}

export function scanFileSizes({
  targetDir,
  maxLines = 1000,
  extensions = [".tsx", ".ts"],
  exclude = ["node_modules", "dist", ".d.ts", "__tests__"],
}) {
  const violations = [];
  let scannedCount = 0;

  function traverse(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (exclude.some((ex) => entry.name.includes(ex) || fullPath.includes(ex))) {
        continue;
      }

      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          scannedCount++;
          const lines = countFileLines(fullPath);
          if (lines > maxLines) {
            violations.push({
              file: fullPath,
              fileName: entry.name,
              lines,
              limit: maxLines,
              excess: lines - maxLines,
            });
          }
        }
      }
    }
  }

  traverse(targetDir);

  violations.sort((a, b) => b.lines - a.lines);

  return {
    scannedCount,
    violations,
    passed: violations.length === 0,
  };
}

// CLI Execution
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const defaultDir = path.resolve(process.cwd(), "packages/frontend/src/pages");
  const targetDir = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : defaultDir;
  const maxLines = process.env.MAX_LINES ? parseInt(process.env.MAX_LINES, 10) : 1000;

  console.log(`\n🔍 [Guardrail ADR 0020] Escaneando archivos en: ${targetDir}`);
  console.log(`📏 Umbral estricto máximo permitido: ${maxLines} líneas por módulo de página\n`);

  const result = scanFileSizes({ targetDir, maxLines });

  if (result.violations.length === 0) {
    console.log(`✅ [ÉXITO] Todos los ${result.scannedCount} archivos escaneados cumplen el estándar (<${maxLines} líneas).\n`);
    process.exit(0);
  } else {
    console.warn(`⚠️ [ALERTA ARQUITECTÓNICA] Se detectaron ${result.violations.length} archivo(s) que superan el límite:\n`);
    console.table(
      result.violations.map((v) => ({
        Archivo: v.fileName,
        Líneas: v.lines,
        Límite: v.limit,
        Exceso: `+${v.excess}`,
      }))
    );
    console.log(`\nTotal escaneados: ${result.scannedCount} archivos.`);
    console.log(`Por favor, descomponga los componentes monolíticos según la directriz ADR 0020.\n`);
    // Exit code 1 when enforcing
    if (process.env.STRICT_FAIL === "true") {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}
