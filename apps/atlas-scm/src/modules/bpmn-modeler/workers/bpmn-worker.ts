import {
  DOMParser as PolyfilledDOMParser,
  XMLSerializer as PolyfilledXMLSerializer,
} from '@xmldom/xmldom';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// BPMN Worker for background processing (sanitization, validation, and analytics)
// Note: bpmn-js is UI-heavy and not suitable for a worker.
// We use the worker for DOM operations to avoid blocking the UI thread.

const MAX_XML_SIZE = 5 * 1024 * 1024; // Increased to 5MB for large logistics diagrams

const DANGEROUS_TAGS = new Set(['script', 'foreignobject', 'iframe', 'object', 'embed']);
const URI_ATTRS = new Set(['href', 'src', 'xlink:href']);

const BPMN_20_NS = 'http://www.omg.org/spec/BPMN/20100524/MODEL';

// Regex to detect XML bomb / entity expansion vectors before parsing
const XML_ENTITY_PATTERN = /<!(?:DOCTYPE|ENTITY)[\s\S]*?>/i;

const XMLSerializerToUse =
  typeof self.XMLSerializer !== 'undefined' ? self.XMLSerializer : PolyfilledXMLSerializer;

interface WorkerResult {
  status: 'success' | 'error';
  fileName: string;
  xml?: string;
  message: string;
  stats?: {
    tasks: number;
    gateways: number;
    events: number;
    isCamunda8: boolean;
  };
}

function sanitizeXmlDocument(doc: Document): void {
  const elements = Array.from(doc.getElementsByTagName('*'));

  for (const el of elements as unknown as Element[]) {
    const tagName = el.localName.toLowerCase();
    if (DANGEROUS_TAGS.has(tagName)) {
      el.remove();
      continue;
    }

    const attrs = Array.from(el.attributes);
    for (const attr of attrs as unknown as Attr[]) {
      const name = attr.localName.toLowerCase();
      const value = attr.value.trim().toLowerCase();

      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        continue;
      }

      if (
        URI_ATTRS.has(name) &&
        (value.startsWith('javascript:') ||
          value.startsWith('data:') ||
          value.startsWith('vbscript:'))
      ) {
        el.removeAttribute(attr.name);
      }
    }
  }
}

function extractStats(doc: Document) {
  if (!doc.documentElement) {
    return { tasks: 0, gateways: 0, events: 0, isCamunda8: false };
  }

  const tasks =
    doc.getElementsByTagNameNS('*', 'task').length +
    doc.getElementsByTagNameNS('*', 'userTask').length +
    doc.getElementsByTagNameNS('*', 'serviceTask').length;

  const gateways =
    doc.getElementsByTagNameNS('*', 'exclusiveGateway').length +
    doc.getElementsByTagNameNS('*', 'parallelGateway').length;

  const events =
    doc.getElementsByTagNameNS('*', 'startEvent').length +
    doc.getElementsByTagNameNS('*', 'endEvent').length;

  const isCamunda8 =
    doc.documentElement.getAttribute('xmlns:zeebe') !== null || xmlStringContains(doc, 'zeebe:');

  return { tasks, gateways, events, isCamunda8 };
}

function xmlStringContains(doc: Document, search: string): boolean {
  const serializer = new (XMLSerializerToUse as unknown as new () => XMLSerializer)();
  return serializer.serializeToString(doc as unknown as Node).includes(search);
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

    // Extract logistics execution properties
    const costHR = task.getAttribute('sys:costHR');
    const status = task.getAttribute('sys:status');
    const formKey = task.getAttribute('sys:formKey');
    const decisionRef = task.getAttribute('sys:decisionRef');

    if (costHR) sop += `- **Cost/Hr**: $${costHR}\n`;
    if (status) sop += `- **Status**: ${status}\n`;
    if (formKey) sop += `- **Assigned Form**: ${formKey}\n`;
    if (decisionRef) sop += `- **DMN Decision**: ${decisionRef}\n`;

    // Extract Camunda 8 Connectors
    const extElements = task.getElementsByTagNameNS('*', 'extensionElements');
    if (extElements.length > 0) {
      const taskDefs = extElements[0].getElementsByTagNameNS('*', 'taskDefinition');
      if (taskDefs.length > 0) {
        const zeebeType = taskDefs[0].getAttribute('type');
        if (zeebeType) sop += `- **Zeebe Connector**: \`${zeebeType}\`\n`;
      }
    }

    sop += `\n---\n\n`;
  });

  // Extract routing conditions (SequenceFlows)
  const flows = doc.getElementsByTagNameNS('*', 'sequenceFlow');
  let hasConditions = false;
  Array.from(flows).forEach((flow) => {
    const conds = flow.getElementsByTagNameNS('*', 'conditionExpression');
    if (conds.length > 0 && conds[0].textContent) {
      if (!hasConditions) {
        sop += `## Routing Logic & Conditions\n\n`;
        hasConditions = true;
      }
      const source = flow.getAttribute('sourceRef') || 'Unknown';
      const target = flow.getAttribute('targetRef') || 'Unknown';
      const name = flow.getAttribute('name') ? ` (${flow.getAttribute('name')})` : '';
      sop += `- Flow **${source} &rarr; ${target}**${name}: \`${conds[0].textContent.trim()}\`\n`;
    }
  });

  return sop;
}

self.onmessage = async (event) => {
  const { action, xml, fileName } = event.data;

  try {
    if (typeof xml !== 'string') {
      throw new Error('Invalid BPMN payload: xml must be a string.');
    }

    if (xml.length === 0 || xml.length > MAX_XML_SIZE) {
      throw new Error(
        `Invalid BPMN payload: xml is empty or exceeds ${MAX_XML_SIZE / 1024 / 1024}MB.`
      );
    }

    // Security Guard: Prevent XML Entity Expansion (Billion Laughs)
    if (XML_ENTITY_PATTERN.test(xml)) {
      throw new Error('Security Alert: XML entities and DOCTYPE declarations are prohibited.');
    }

    // Step 1: Parse (hardened parser config for untrusted XML)
    const parser = new PolyfilledDOMParser({
      onErrorStopParsing: true,
      onError: (msg: string) => {
        throw new Error(`XML Parse Error: ${msg}`);
      },
    } as any);
    const doc = parser.parseFromString(xml, 'application/xml');

    // Step 2: Validate Well-formedness
    const parserError = doc.getElementsByTagName('parsererror');
    if (parserError.length > 0) {
      throw new Error(`XML Parse Error: ${parserError[0].textContent}`);
    }

    // Step 3: Handle Action
    if (action === 'generate-sop') {
      const sopText = generateSopFromDoc(doc as unknown as Document);
      self.postMessage({
        status: 'success',
        fileName,
        sop: sopText,
        message: 'SOP generated successfully.',
      });
      return;
    }

    if (action === 'execute-process') {
      const tasks = Array.from(doc.getElementsByTagNameNS('*', 'serviceTask')).map((task) => ({
        id: task.getAttribute('id'),
        name: task.getAttribute('name') || 'Unnamed Service Task',
        type: 'serviceTask',
      }));

      // Simulate sending execution steps back to the main thread
      self.postMessage({
        status: 'success',
        action: 'execute-process',
        tasks,
        message: 'Process execution planned.',
      });
      return;
    }

    // Step 4: Validate BPMN Namespace (Basic check)
    if (
      doc.documentElement &&
      !doc.documentElement.getAttribute('xmlns') &&
      !Array.from(doc.documentElement.attributes as unknown as Attr[]).some(
        (a) => a.value === BPMN_20_NS
      )
    ) {
      // We don't throw yet, some valid files might be loose, but we log it.
      console.warn('Worker: BPMN 2.0 Namespace not explicitly found in root.');
    }

    // Step 5: Extract Stats (UX Metadata)
    const stats = extractStats(doc as unknown as Document);

    // Step 6: Sanitize (Security)
    sanitizeXmlDocument(doc as unknown as Document);

    // Step 7: Serialize
    const sanitizedXml = new (
      XMLSerializerToUse as unknown as new () => XMLSerializer
    )().serializeToString(doc as unknown as Node);

    const result: WorkerResult = {
      status: 'success',
      fileName,
      xml: sanitizedXml,
      stats,
      message: 'Diagram parsed, sanitized and analyzed successfully.',
    };

    self.postMessage(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred during BPMN processing.';

    self.postMessage({
      status: 'error',
      fileName,
      message,
      sop: '',
    });
  }
};
