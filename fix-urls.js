import fs from "fs";
import path from "path";

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function (file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(file));
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      results.push(file);
    }
  });
  return results;
}

const files = walkDir("packages/frontend/src");

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  let original = content;

  // Pattern 1: import.meta.env.VITE_API_URL || 'http://localhost:3001'
  content = content.replace(
    /VITE_API_URL\s*\|\|\s*['"]http:\/\/localhost:3001(\/api)?['"]/g,
    "VITE_API_URL || ''",
  );

  // Pattern 2: 'http://localhost:3001/api/shipments' -> '/api/shipments'
  content = content.replace(
    /['"]http:\/\/localhost:3001(\/api[^'"]*)['"]/g,
    "'$1'",
  );

  // Pattern 3: fetch('http://localhost:3001/api/...
  content = content.replace(/fetch\(['"]http:\/\/localhost:3001/g, "fetch('");

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}
