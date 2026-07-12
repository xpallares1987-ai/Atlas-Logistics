import Modeler from 'bpmn-js/lib/Modeler';
import { getDiagramXml } from './xml-service';
import { isServerEnv } from '../utils/env';

export async function generateSOP(modeler: Modeler): Promise<string> {
  if (!modeler) return 'No modeler instance';

  try {
    const xml = await getDiagramXml(modeler, false);

    if (isServerEnv()) {
      const safeXml = xml.replace(/<!DOCTYPE[\s\S]*?>/gi, '');
      const doc = new DOMParser().parseFromString(safeXml, 'application/xml');
      return generateSopFromDoc(doc);
    }

    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(new URL('../workers/bpmn-worker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (event) => {
          const { status, sop, message } = event.data;
          worker.terminate();
          if (status === 'success') resolve(sop);
          else reject(new Error(message));
        };
        worker.onerror = (error) => {
          worker.terminate();
          reject(error);
        };
        worker.postMessage({ action: 'generate-sop', xml, fileName: 'diagram.bpmn' });
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    return 'Error generating SOP';
  }
}

function generateSopFromDoc(doc: Document): string {
  const taskTags = ['task', 'userTask', 'serviceTask', 'sendTask', 'receiveTask', 'manualTask', 'businessRuleTask', 'scriptTask'];
  const tasks: Element[] = [];
  
  taskTags.forEach((tag) => {
    tasks.push(...Array.from(doc.getElementsByTagNameNS('*', tag)));
  });

  let sop = `# Standard Operating Procedure (SOP)\nGenerated: ${new Date().toLocaleString()}\n\n## Process Overview\nThis document outlines the operational steps for the modeled logistics process.\n\n## Step-by-Step Instructions\n\n`;

  tasks.forEach((task, idx) => {
    const name = task.getAttribute('name') || 'Unnamed Task';
    const id = task.getAttribute('id') || `Task_${idx + 1}`;
    const type = task.localName;

    sop += `### Step ${idx + 1}: ${name}\n- **Task ID**: ${id}\n- **Type**: ${type}\n`;

    const docNodes = task.getElementsByTagNameNS('*', 'documentation');
    if (docNodes.length > 0 && docNodes[0].textContent) {
      sop += `- **Guidelines**: ${docNodes[0].textContent.trim()}\n`;
    }

    sop += `\n---\n\n`;
  });

  return sop;
}
