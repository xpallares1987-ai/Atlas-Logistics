import path from "path";
import fs from "fs";
import { execFileSync } from "child_process";

function getFilesRecursively(dirPath: string, extensions: string[]): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dirPath)) return results;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath, extensions));
    } else if (
      entry.isFile() &&
      extensions.some((ext) => entry.name.endsWith(ext))
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

async function deploy() {
  try {
    const baseDir = path.resolve("./camunda-config");
    console.log(`[Deployer] Scanning recursively under: ${baseDir}`);

    const deployFiles = getFilesRecursively(baseDir, [
      ".bpmn",
      ".dmn",
      ".form",
    ]);

    // Fallback to legacy path if none found in camunda-config
    if (deployFiles.length === 0) {
      const legacyDir = path.resolve("./src/bpm");
      deployFiles.push(
        ...getFilesRecursively(legacyDir, [".bpmn", ".dmn", ".form"]),
      );
    }

    console.log(
      `[Deployer] Found ${deployFiles.length} Camunda resources to deploy.`,
    );

    const address =
      process.env.ZEEBE_ADDRESS ||
      "c9d0ee13-1491-4b8c-a944-ee6147d37cb5.bru-2.zeebe.camunda.io:443";
    const clientId =
      process.env.ZEEBE_CLIENT_ID ||
      process.env.CAMUNDA_CLIENT_ID ||
      "XqSmx64lKA8MRNWL0KU0os_1ZMksbfwG";
    const clientSecret =
      process.env.ZEEBE_CLIENT_SECRET ||
      process.env.CAMUNDA_CLIENT_SECRET ||
      "rm6-FLdEqMyTXR5TAQfxPKKxVHFERjvWQbSWz4w_MgEoceVFURxoWsHp9GRGez9U";

    for (const file of deployFiles) {
      const relPath = path.relative(process.cwd(), file);
      console.log(`[Deployer] Deploying resource: ${relPath}...`);
      const args = ["zbctl", "deploy", file, "--address", address, "--clientId", clientId, "--clientSecret", clientSecret];
      try {
        execFileSync("npx", args, { stdio: "pipe" });
        console.log(`[Deployer] ✓ Deploy successful for ${relPath}`);
      } catch (err: any) {
        console.error(
          `[Deployer] ✗ Deploy failed for ${relPath}:\n`,
          err.message || err.stderr?.toString(),
        );
        throw err;
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("[Deployer] ✗ Final Deploy failed.");
    process.exit(1);
  }
}

deploy();
