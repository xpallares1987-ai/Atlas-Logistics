import { zbc } from "../src/bpm/client.js";
import path from "path";

async function deploy() {
  try {
    const bpmnPath = path.resolve(
      "./src/bpm/diagrams/billing-choreography.bpmn",
    );
    console.log(`[Deployer] Deploying BPMN file: ${bpmnPath}...`);

    const res = await zbc.deployResource({
      processFilename: bpmnPath,
    });

    console.log("[Deployer] ✓ Deploy successful!");
    console.log(JSON.stringify(res, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("[Deployer] ✗ Deploy failed:", error);
    process.exit(1);
  }
}

deploy();
