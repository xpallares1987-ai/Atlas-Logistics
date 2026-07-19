const fs = require("fs");
const path = "C:/Users/xpall/Source/Atlas-Logistics/src/index.ts";
let content = fs.readFileSync(path, "utf8");

// Replace catch (error: any)
content = content.replace(/catch \(error: any\)/g, "catch (error: unknown)");

// Replace error.message with error instanceof Error ? error.message : String(error)
content = content.replace(
  /error\.message/g,
  "error instanceof Error ? error.message : String(error)",
);

fs.writeFileSync(path, content, "utf8");
console.log("Fixed any types in src/index.ts");
