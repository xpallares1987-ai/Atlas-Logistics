import path from "path";
import fs from "fs";
import { execSync } from "child_process";

async function deploy() {
  try {
    const deployFiles = [];

    // Load BPMNs
    const bpmnDir = path.resolve("./src/bpm/diagrams");
    const bpmns = fs.readdirSync(bpmnDir).filter(f => f.endsWith('.bpmn')).map(f => path.join(bpmnDir, f));
    deployFiles.push(...bpmns);

    // Load Forms
    const formDir = path.resolve("./src/bpm/forms");
    if (fs.existsSync(formDir)) {
      const forms = fs.readdirSync(formDir).filter(f => f.endsWith('.form')).map(f => path.join(formDir, f));
      deployFiles.push(...forms);
    }

    // Load DMNs
    const dmnDir = path.resolve("./src/bpm/dmn");
    if (fs.existsSync(dmnDir)) {
      const dmns = fs.readdirSync(dmnDir).filter(f => f.endsWith('.dmn')).map(f => path.join(dmnDir, f));
      deployFiles.push(...dmns);
    }

    console.log(`[Deployer] Found ${deployFiles.length} files to deploy.`);
    
    // We fetch the vars from env since dotenvx is injecting them
    const address = process.env.ZEEBE_ADDRESS || 'c9d0ee13-1491-4b8c-a944-ee6147d37cb5.bru-2.zeebe.camunda.io:443';
    const clientId = process.env.ZEEBE_CLIENT_ID || process.env.CAMUNDA_CLIENT_ID || 'XqSmx64lKA8MRNWL0KU0os_1ZMksbfwG';
    const clientSecret = process.env.ZEEBE_CLIENT_SECRET || process.env.CAMUNDA_CLIENT_SECRET || 'rm6-FLdEqMyTXR5TAQfxPKKxVHFERjvWQbSWz4w_MgEoceVFURxoWsHp9GRGez9U';

    for (const file of deployFiles) {
      console.log(`[Deployer] Deploying resource: ${path.basename(file)}...`);
      const cmd = `npx zbctl deploy "${file}" --address "${address}" --clientId "${clientId}" --clientSecret "${clientSecret}"`;
      try {
        const output = execSync(cmd, { stdio: 'pipe' }).toString();
        console.log(`[Deployer] ✓ Deploy successful for ${path.basename(file)}!`);
      } catch (err) {
        console.error(`[Deployer] ✗ Deploy failed for ${path.basename(file)}:\n`, err.message || err.stderr?.toString());
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
