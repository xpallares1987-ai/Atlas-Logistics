import Modeler from 'bpmn-js/lib/Modeler';
import { getDiagramXml as getModelerDiagramXml } from './modeler-service';
import { downloadFile, openTextFile, resetFileInput } from './file-service';
import { isServerEnv } from '../utils/env';

function sanitizeXmlDocument(doc: Document): void {
  const DANGEROUS_TAGS = new Set(['script', 'foreignobject']);
  const URI_ATTRS = new Set(['href', 'src']);
  const elements = Array.from(doc.getElementsByTagName('*'));

  for (const el of elements) {
    const tagName = el.localName.toLowerCase();
    if (DANGEROUS_TAGS.has(tagName)) {
      el.remove();
      continue;
    }

    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      const name = attr.localName.toLowerCase();
      const value = attr.value.trim().toLowerCase();

      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        continue;
      }

      if (URI_ATTRS.has(name) && (value.startsWith('javascript:') || value.startsWith('data:') || value.startsWith('vbscript:'))) {
        el.removeAttribute(attr.name);
      }
    }
  }
}

export interface SanitizedResult {
  name: string;
  xml: string;
  stats?: { tasks: number; gateways: number; events: number; isCamunda8: boolean; };
}

function processXmlFallback(xml: string, fileName: string, checkErrors: boolean = true): SanitizedResult {
  const safeXml = xml.replace(/<!DOCTYPE[\s\S]*?>/gi, '');
  const parser = new DOMParser();
  const doc = parser.parseFromString(safeXml, 'application/xml');

  if (checkErrors) {
    const parserError = doc.getElementsByTagName('parsererror');
    if (parserError.length > 0) throw new Error(`Invalid XML: ${parserError[0].textContent}`);
  }

  sanitizeXmlDocument(doc);
  return { name: fileName, xml: new XMLSerializer().serializeToString(doc) };
}

function sanitizeXmlViaWorker(xml: string, fileName: string): Promise<SanitizedResult> {
  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(new URL('../workers/bpmn-worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (event) => {
        const { status, xml: resultXml, stats, message } = event.data;
        worker.terminate();
        if (status === 'success') resolve({ name: fileName, xml: resultXml, stats });
        else reject(new Error(message));
      };
      worker.onerror = (error) => {
        worker.terminate();
        reject(error);
      };
      worker.postMessage({ xml, fileName });
    } catch (err) {
      reject(err);
    }
  });
}

export async function sanitizeXml(xml: string, fileName: string): Promise<SanitizedResult> {
  if (isServerEnv()) {
    try {
      return processXmlFallback(xml, fileName, true);
    } catch (error) {
      throw new Error(`Error en sanitización (fallback): ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  try {
    return await sanitizeXmlViaWorker(xml, fileName);
  } catch (error) {
    try {
      return processXmlFallback(xml, fileName, false);
    } catch {
      throw new Error(`Error en sanitización: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export async function loadXmlFromUrl(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Status: ${response.status}`);
    const xml = await response.text();
    const fileName = url.substring(url.lastIndexOf('/') + 1) || 'diagram.bpmn';
    return await sanitizeXml(xml, fileName);
  } catch (error) {
    throw new Error(`No se pudo cargar el diagrama remoto. ${error instanceof Error ? error.message : ''}`);
  }
}

export async function openLocalXmlFromInput(fileInput: HTMLInputElement) {
  try {
    const result = await openTextFile(fileInput);
    if (!result) return null;
    return await sanitizeXml(result.text, result.name || 'diagram.bpmn');
  } catch (error) {
    throw new Error('El archivo no parece ser un XML/BPMN válido.');
  } finally {
    resetFileInput(fileInput);
  }
}

export async function getDiagramXml(modeler: Modeler, format = true) {
  return await getModelerDiagramXml(modeler, format);
}

export async function downloadXmlFile(fileName: string, xml: string) {
  return downloadFile(fileName, xml, 'application/xml;charset=utf-8');
}
