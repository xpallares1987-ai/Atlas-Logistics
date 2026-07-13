import { safeTrim, ensureExtension } from '@atlas/shared';
import { Toast } from '@atlas/ui';
import { createModeler, cleanupModeler, importDiagram } from '../services/modeler-service';
import { getDiagramXml, loadXmlFromUrl } from '../services/xml-service';
import { saveTabsSession } from '../services/storage-service';
import { setDiagramName, renderTabs } from '../ui/render';
import type { AppUi, DiagramTab } from '../types';
import type { AppState } from '../state';
import APP_CONFIG from '../config';

let bindModelerEvents: () => void;
let getUi: () => AppUi;

export function createTab(name: string, xml: string): DiagramTab {
  return {
    id: crypto.randomUUID(),
    name: getSafeDiagramName(name),
    xml,
    isDirty: false,
  };
}

export function getSafeDiagramName(name: string): string {
  const trimmed = safeTrim(name, APP_CONFIG.download.defaultFileName);
  return ensureExtension(trimmed, '.bpmn');
}

export function updateTabsUi(state: AppState) {
  const ui = getUi();
  renderTabs(
    ui.tabsContainer,
    state.tabs,
    state.activeTabId,
    (tabId) => handleSwitchTab(state, tabId),
    (tabId) => handleCloseTab(state, tabId)
  );
}

export async function handleSwitchTab(state: AppState, tabId: string) {
  const ui = getUi();
  if (tabId === state.activeTabId) return;

  const currentTab = state.tabs.find((t) => t.id === state.activeTabId);
  if (currentTab && state.modeler) {
    currentTab.xml = await getDiagramXml(state.modeler);
    cleanupModeler(state.modeler);
    state.modeler = null;
  }

  state.activeTabId = tabId;
  const nextTab = state.tabs.find((t) => t.id === tabId);

  if (nextTab) {
    state.modeler = await createModeler({
      container: APP_CONFIG.selectors.canvas,
      properties: APP_CONFIG.selectors.properties,
      keyboardBindToWindow: true,
      camunda8: true,
      propertiesPanel: state.propertiesPanelOpen,
      zeebeSupport: true,
    });

    bindModelerEvents();
    await importDiagram(state.modeler, nextTab.xml);
    setDiagramName(ui.diagramName, nextTab.name);
    updateTabsUi(state);
    await saveTabsSession(APP_CONFIG.storage.keys, state.tabs, state.activeTabId);
    Toast.show(`Cambiado a: ${nextTab.name}`, 'info');
  }
}

export async function handleCloseTab(state: AppState, tabId: string) {
  const tab = state.tabs.find((t) => t.id === tabId);
  if (tab?.isDirty) {
    if (!confirm(`El diagrama "${tab.name}" tiene cambios sin guardar. ¿Cerrar de todos modos?`))
      return;
  }

  const index = state.tabs.findIndex((t) => t.id === tabId);
  state.tabs = state.tabs.filter((t) => t.id !== tabId);

  if (state.tabs.length === 0) {
    await handleNewDiagram(state);
  } else if (state.activeTabId === tabId) {
    const nextTab = state.tabs[Math.min(index, state.tabs.length - 1)];
    await handleSwitchTab(state, nextTab.id);
  } else {
    updateTabsUi(state);
    await saveTabsSession(APP_CONFIG.storage.keys, state.tabs, state.activeTabId);
  }
}

export async function handleNewTab(state: AppState) {
  const result = await loadXmlFromUrl(APP_CONFIG.paths.defaultDiagram);
  const tab = createTab(result.name, result.xml);
  state.tabs.push(tab);
  await handleSwitchTab(state, tab.id);
}

export async function handleNewDiagram(state: AppState) {
  await handleNewTab(state);
}

export async function loadDiagramInNewTab(state: AppState, xml: string, fileName: string) {
  const tab = createTab(fileName, xml);
  state.tabs.push(tab);
  await handleSwitchTab(state, tab.id);
  Toast.show(`Cargado: ${tab.name}`, 'success');
}

export function initTabManager(dependencies: {
  getUi: () => AppUi;
  bindModelerEvents: () => void;
}) {
  getUi = dependencies.getUi;
  bindModelerEvents = dependencies.bindModelerEvents;
}


