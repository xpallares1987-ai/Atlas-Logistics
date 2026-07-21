import fs from 'fs/promises';
import { layoutProcess } from 'bpmn-auto-layout';
import path from 'path';

async function layoutFile(filePath) {
  try {
    const xml = await fs.readFile(filePath, 'utf8');
    const layoutedXml = await layoutProcess(xml);
    await fs.writeFile(filePath, layoutedXml, 'utf8');
    console.log(`Auto-layout applied to ${filePath}`);
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err);
  }
}

async function run() {
  const dir = path.resolve("./src/bpm/diagrams");
  const files = await fs.readdir(dir);
  for (const file of files) {
    if (file.endsWith('.bpmn')) {
      await layoutFile(path.join(dir, file));
    }
  }
}

run();
