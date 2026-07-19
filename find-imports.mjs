import { readdirSync, statSync, readFileSync } from "fs";
import { join } from "path";

function walk(dir) {
  let results = [];
  const list = readdirSync(dir);
  list.forEach((file) => {
    const fullPath = join(dir, file);
    if (
      fullPath.includes("node_modules") ||
      fullPath.includes(".next") ||
      fullPath.includes("dist") ||
      fullPath.includes("build")
    )
      return;
    const stat = statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx")) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk("C:/Users/xpall/Source/Atlas-Logistics/packages");
let found = 0;

files.forEach((file) => {
  const content = readFileSync(file, "utf8");
  if (/from\s+['"][^'"]*db['"]/.test(content)) {
    if (!content.includes("@atlas/shared") && !content.includes("@atlas/ui")) {
      console.log("DB Import in:", file);
      found++;
    }
  }
  if (/import\s+['"][^'"]*theme\.css['"]/.test(content)) {
    if (!content.includes("@atlas/ui")) {
      console.log("Theme Import in:", file);
      found++;
    }
  }
});

console.log(`Found ${found} unchecked imports.`);
