/**
 * Bundle, Manifest, and Modulepreload Verification Script
 * Validates that production SPA build complies with subpath hosting,
 * modulepreload budget limits (<512KB), PNG icon integrity, and
 * prevents Vite Rolldown circular TLA deadlock dependencies in federation chunks.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cwd = process.cwd();
const candidates = [
  path.resolve(cwd, "packages/frontend/dist"),
  path.resolve(__dirname, "../packages/frontend/dist"),
];

const dist = candidates.find(p => fs.existsSync(p));
if (!dist) {
  throw new Error(`Dist directory does not exist. Searched: ${candidates.join(", ")}`);
}

const manifestPath = path.join(dist, "manifest.webmanifest");
if (!fs.existsSync(manifestPath)) {
  throw new Error(`Manifest file does not exist: ${manifestPath}`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
for (const icon of manifest.icons || []) {
  if (icon.src.startsWith("/")) {
    throw new Error(`Manifest icon src must be relative for subpath hosting: ${icon.src}`);
  }
  const iconPath = path.join(dist, icon.src);
  if (!fs.existsSync(iconPath)) {
    throw new Error(`Manifest icon file not found: ${iconPath}`);
  }
  const buf = fs.readFileSync(iconPath);
  const magic = buf.subarray(0, 4).toString("hex");
  if (magic !== "89504e47") {
    throw new Error(`Invalid PNG header for ${icon.src}: ${magic}`);
  }
  if (buf.length > 256000) {
    throw new Error(`PWA icon ${icon.src} exceeds 250 KB budget (${buf.length} bytes)`);
  }
}

const htmlPath = path.join(dist, "index.html");
const html = fs.readFileSync(htmlPath, "utf8");
const preloadMatches = [...html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g)].map(m => m[1]);
const forbidden = preloadMatches.filter(h => /(three-|bpmn-|jspdf|recharts-|d3-|DynamicRateEngine-|html2canvas-)/.test(h));
if (forbidden.length > 0) {
  throw new Error(`Heavy lazy vendor chunks must not be modulepreloaded: ${forbidden.join(", ")}`);
}

let totalPreloadBytes = 0;
for (const href of preloadMatches) {
  const relAsset = href.replace(/^\/Atlas-Logistics\//, "").replace(/^\//, "");
  const assetPath = path.join(dist, relAsset);
  if (fs.existsSync(assetPath)) {
    totalPreloadBytes += fs.statSync(assetPath).size;
  }
}
if (totalPreloadBytes > 512000) {
  throw new Error(`Initial modulepreload JS budget exceeded: ${totalPreloadBytes} bytes (max 512,000 bytes)`);
}

const assetsDir = path.join(dist, "assets");
if (fs.existsSync(assetsDir)) {
  const assetFiles = fs.readdirSync(assetsDir);
  const monolithicShared = assetFiles.filter(f => /^__federation_shared_(lucide-react|tailwindcss)-/.test(f));
  if (monolithicShared.length > 0) {
    throw new Error(`Prohibited monolithic federation shared chunks found: ${monolithicShared.join(", ")}`);
  }
  for (const sharedFile of assetFiles.filter(f => f.startsWith("__federation_shared_") && f.endsWith(".js"))) {
    const code = fs.readFileSync(path.join(assetsDir, sharedFile), "utf8");
    const badDeps = [...code.matchAll(/from\s*["']\.\/([^"']+)["']/g)]
      .map(m => m[1])
      .filter(dep => /(recharts-|lucide-icons-|three-|bpmn-|jspdf-|d3-)/.test(dep));
    if (badDeps.length > 0) {
      throw new Error(`Circular TLA deadlock risk: ${sharedFile} statically imports ${badDeps.join(", ")}`);
    }
  }
}

console.log(`Verified ${preloadMatches.length} modulepreload chunks (${(totalPreloadBytes / 1024).toFixed(1)} KB total) and ${manifest.icons?.length || 0} valid PNG icons.`);
