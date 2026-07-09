/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Modeler from 'bpmn-js/lib/Modeler';
import { getDiagramXml } from './xml-service';

/**
 * Auto-generates a Standard Operating Procedure (SOP) from a BPMN diagram using Web Workers.
 * Falls back to synchronous DOM parsing in server/test environments.
 */
export async function generateSOP(modeler: Modeler): Promise<string> {
  if (!modeler) return 'No modeler instance';

  try {
    const xml = await getDiagramXml(modeler, false);

    const isTestOrServer =
      typeof window === 'undefined' ||
      typeof Worker === 'undefined' ||
      (typeof (globalThis as typeof globalThis & { process?: { env?: { NODE_ENV?: string } } })
        .process !== 'undefined' &&
        (globalThis as typeof globalThis & { process?: { env?: { NODE_ENV?: string } } }).process
          ?.env?.NODE_ENV === 'test');

    if (isTestOrServer) {
      // Fallback to synchronous DOM parser
      const safeXml = xml.replace(/<!DOCTYPE[\s\S]*?>/gi, '');
      const parser = new DOMParser();
      const doc = parser.parseFromString(safeXml, 'application/xml');
      return generateSopFromDoc(doc);
    }

    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(new URL('../workers/bpmn-worker.ts', import.meta.url), {
          type: 'module',
        });
        worker.onmessage = (event) => {
          const { status, sop, message } = event.data;
          worker.terminate();
          if (status === 'success') {
            resolve(sop);
          } else {
            reject(new Error(message));
          }
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
    console.error('SOP generation failed:', err);
    return 'Error generating SOP';
  }
}

function generateSopFromDoc(doc: Document): string {
  const taskTags = [
    'task',
    'userTask',
    'serviceTask',
    'sendTask',
    'receiveTask',
    'manualTask',
    'businessRuleTask',
    'scriptTask',
  ];

  const tasks: Element[] = [];
  taskTags.forEach((tag) => {
    const list = doc.getElementsByTagNameNS('*', tag);
    for (let i = 0; i < list.length; i++) {
      tasks.push(list[i] as Element);
    }
  });

  let sop = `# Standard Operating Procedure (SOP)\n`;
  sop += `Generated: ${new Date().toLocaleString()}\n\n`;
  sop += `## Process Overview\n`;
  sop += `This document outlines the operational steps for the modeled logistics process.\n\n`;
  sop += `## Step-by-Step Instructions\n\n`;

  tasks.forEach((task, idx) => {
    const name = task.getAttribute('name') || 'Unnamed Task';
    const id = task.getAttribute('id') || `Task_${idx + 1}`;
    const type = task.localName;

    sop += `### Step ${idx + 1}: ${name}\n`;
    sop += `- **Task ID**: ${id}\n`;
    sop += `- **Type**: ${type}\n`;

    const docNodes = task.getElementsByTagNameNS('*', 'documentation');
    if (docNodes.length > 0 && docNodes[0].textContent) {
      sop += `- **Guidelines**: ${docNodes[0].textContent.trim()}\n`;
    }

    sop += `\n---\n\n`;
  });

  return sop;
}
