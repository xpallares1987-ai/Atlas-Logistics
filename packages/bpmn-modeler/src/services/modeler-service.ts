import Modeler from 'bpmn-js/lib/Modeler';
import type EventBus from 'diagram-js/lib/core/EventBus';
import { publishEvent } from '@atlas/shared';
import { safeGetMetadata } from '../schemas/metadata';
import { initCustomKeyboard } from './keyboard-service';
import { getActiveTab } from '../state';

function resolveTarget(target: string | HTMLElement): HTMLElement {
  if (!target) throw new Error('Falta el contenedor requerido para inicializar el modelador');
  if (typeof target === 'string') {
    const element = document.querySelector(target) as HTMLElement;
    if (!element) throw new Error(`No se encontró el contenedor: ${target}`);
    return element;
  }
  return target;
}

export interface CreateModelerOptions {
  container: string | HTMLElement;
  properties: string | HTMLElement;
  keyboardBindToWindow?: boolean;
  camunda8?: boolean;
  propertiesPanel?: boolean;
  zeebeSupport?: boolean;
}

export async function createModeler({
  container,
  properties,
  camunda8 = true,
  propertiesPanel = true,
  zeebeSupport = true,
}: CreateModelerOptions) {
  try {
    const [
      { default: BpmnModeler },
      { default: zeebeModdle },
      { default: sysModdle },
      { default: MinimapModule },
      { default: LintModule },
      { default: TokenSimulationModule },
    ] = await Promise.all([
      import('bpmn-js/lib/Modeler'),
      import('zeebe-bpmn-moddle/resources/zeebe.json'),
      import('../resources/sys.json'),
      import('diagram-js-minimap'),
      import('bpmn-js-bpmnlint'),
      import('bpmn-js-token-simulation'),
      import('diagram-js-minimap/assets/diagram-js-minimap.css'),
      import('bpmn-js-bpmnlint/dist/assets/css/bpmn-js-bpmnlint.css'),
      import('bpmn-js-token-simulation/assets/css/bpmn-js-token-simulation.css'),
    ]);

    const { default: CustomModule } = await import('./modeler/custom');
    const containerNode = resolveTarget(container);
    const additionalModules = [MinimapModule, LintModule, TokenSimulationModule, CustomModule];
    const moddleExtensions = {
      sys: sysModdle,
      ...(camunda8 && zeebeSupport ? { zeebe: zeebeModdle } : {}),
    };

    if (camunda8 && zeebeSupport) {
      const { default: ZeebeBehaviorsModule } = await import('camunda-bpmn-js-behaviors/lib/camunda-cloud');
      additionalModules.push(ZeebeBehaviorsModule);
    }

    if (propertiesPanel) {
      const { loadPropertiesModules } = await import('./properties-panel-loader');
      const propsModules = await loadPropertiesModules(camunda8, zeebeSupport);
      additionalModules.push(...propsModules);
    }

    const propertiesNode = propertiesPanel ? resolveTarget(properties) : null;

    const modeler = new BpmnModeler({
      container: containerNode,
      propertiesPanel: propertiesNode ? { parent: propertiesNode } : undefined,
      linting: { active: true },
      additionalModules,
      moddleExtensions,
    });

    initCustomKeyboard(modeler);

    const eventBus = modeler.get('eventBus') as EventBus;
    let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;

    eventBus.on('commandStack.changed', async () => {
      const xml = await getDiagramXml(modeler);
      publishEvent({ type: 'DIAGRAM_CHANGED', payload: xml });

      if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
      autoSaveTimeout = setTimeout(async () => {
        const activeTab = getActiveTab();
        if (activeTab) {
          const { historyService } = await import('./history-service');
          await historyService.saveVersion(activeTab.id, '', xml);
        }
      }, 2000);
    });

    return modeler;
  } catch (error) {
    throw new Error('No se pudo iniciar el modelador. Verifique su conexión a internet.');
  }
}

export async function importDiagram(modeler: Modeler, xml: string) {
  if (!modeler) throw new Error('El modelador BPMN no está inicializado');
  try {
    const result = await modeler.importXML(xml);
    fitViewport(modeler);
    return result;
  } catch (importError) {
    throw new Error(`Failed to import diagram: ${importError instanceof Error ? importError.message : ''}`);
  }
}

export async function getDiagramXml(modeler: Modeler, format = true): Promise<string> {
  if (!modeler) throw new Error('El modelador BPMN no está inicializado');
  const { xml } = await modeler.saveXML({ format });
  return xml || '';
}

export function fitViewport(modeler: Modeler) {
  if (!modeler) return;
  const canvas = modeler.get('canvas') as unknown as BpmnCanvas;
  if (canvas) canvas.zoom('fit-viewport', 'auto');
}

export function zoomByStep(modeler: Modeler, delta = 0.1) {
  if (!modeler) return;
  const canvas = modeler.get('canvas') as unknown as { zoom: (level?: number) => number; };
  const currentZoom = canvas.zoom();
  canvas.zoom(Math.min(Math.max(0.2, currentZoom + delta), 4));
}

export function attachPropertiesPanel(modeler: Modeler, container: string | HTMLElement) {
  if (!modeler) return;
  const target = resolveTarget(container);
  const panel = modeler.get('propertiesPanel') as unknown as { attachTo: (el: HTMLElement) => void; };
  panel.attachTo(target);
}

export function cleanupModeler(modeler: Modeler) {
  if (!modeler) return;
  try { modeler.destroy(); } catch {}
}

export function detachPropertiesPanel(modeler: Modeler) {
  if (!modeler) return;
  const panel = modeler.get('propertiesPanel') as unknown as { detach: () => void; };
  if (panel) panel.detach();
}

export function toggleMinimap(modeler: Modeler) {
  if (!modeler) return;
  try {
    const minimap = modeler.get('minimap') as { toggle: () => void };
    minimap.toggle();
  } catch {}
}

export interface BpmnElement {
  id: string;
  type: string;
  businessObject: { name?: string; [key: string]: unknown; };
}

interface ElementRegistry {
  filter(cb: (element: BpmnElement) => boolean): BpmnElement[];
  get(id: string): BpmnElement | undefined;
}

interface BpmnCanvas {
  zoom(level: string | number, center?: BpmnElement | { x: number; y: number } | 'auto'): void;
}

interface BpmnSelection {
  select(element: BpmnElement | BpmnElement[]): void;
}

export function searchElements(modeler: Modeler, term: string): BpmnElement[] {
  if (!modeler || !term) return [];
  const elementRegistry = modeler.get('elementRegistry') as unknown as ElementRegistry;
  const termLower = term.toLowerCase();

  return elementRegistry.filter((element) => {
    const businessObject = element.businessObject;
    const nameMatch = businessObject?.name?.toLowerCase().includes(termLower);
    const idMatch = element.id?.toLowerCase().includes(termLower);
    return Boolean(nameMatch || idMatch);
  });
}

export function highlightElement(modeler: Modeler, element: BpmnElement) {
  if (!modeler || !element) return;
  const canvas = modeler.get('canvas') as unknown as BpmnCanvas;
  const selection = modeler.get('selection') as unknown as BpmnSelection;

  selection.select(element);
  canvas.zoom(1.0, element);
}

export interface ProcessAnalytics {
  totalTasks: number;
  totalCost: number;
  delayedTasksCount: number;
  blockedTasksCount: number;
  decisionRefCount: number;
  decisions: string[];
  bottlenecks: Array<{ id: string; name: string; cost: number; status: string }>;
}

export function calculateProcessAnalytics(modeler: Modeler | null): ProcessAnalytics {
  const result: ProcessAnalytics = {
    totalTasks: 0,
    totalCost: 0,
    delayedTasksCount: 0,
    blockedTasksCount: 0,
    decisionRefCount: 0,
    decisions: [],
    bottlenecks: [],
  };

  if (!modeler) return result;

  try {
    interface BPMNElement {
      id: string;
      businessObject: {
        $instanceOf: (type: string) => boolean;
        $type?: string;
        name?: string;
      };
    }
    const elementRegistry = modeler.get('elementRegistry') as { getAll: () => BPMNElement[] };
    if (!elementRegistry) return result;

    const allElements = elementRegistry.getAll();

    for (const element of allElements) {
      const bo = element.businessObject;
      if (bo && (bo.$instanceOf('bpmn:Task') || (bo.$type && bo.$type.includes('Task')))) {
        result.totalTasks++;
        const metadata = safeGetMetadata(bo);
        result.totalCost += metadata.costHR;
        const name = bo.name || element.id;

        if (metadata.status === 'Retrasado') {
          result.delayedTasksCount++;
          result.bottlenecks.push({ id: element.id, name, cost: metadata.costHR, status: 'Retrasado' });
        } else if (metadata.status === 'Bloqueado') {
          result.blockedTasksCount++;
          result.bottlenecks.push({ id: element.id, name, cost: metadata.costHR, status: 'Bloqueado' });
        }

        if (metadata.decisionRef) {
          result.decisionRefCount++;
          result.decisions.push(metadata.decisionRef);
        }
      }
    }
  } catch {}

  return result;
}

