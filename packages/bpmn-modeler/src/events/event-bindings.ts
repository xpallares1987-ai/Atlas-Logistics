import { on, debounce, formatError } from '@atlas/shared';
import { Toast } from '@atlas/ui';
import { getDiagramXml } from '../services/xml-service';
import { saveTabsSession } from '../services/storage-service';
import { updateTabsUi, handleNewDiagram } from '../state/tab-manager';
import { handleToggleTheme } from '../ui/ui-manager';
import { bindTaskFormViewerEvents } from '../ui/task-form-viewer';
import { createToolbar } from '../ui/toolbar';
import { fitViewport, zoomByStep } from '../services/modeler-service';
import { refreshLogisticsPanel } from '../ui/logistics-sidebar';
import type { AppState } from '../state';
import type { AppUi } from '../types';
import type { Statusbar } from '../ui/statusbar';
import APP_CONFIG from '../config';

let state: AppState;
let ui: AppUi;
let statusbar: Statusbar;

let handleOpenDiagram: () => void = () => {};
let handleSaveDiagram: () => void = () => {};
let handleExportDiagram: () => void = () => {};
let handleOpenCloudModal: () => void = () => {};
let handleCopyXml: () => void = () => {};

export function initHandlers(handlers: {
  handleOpenDiagram: () => void;
  handleSaveDiagram: () => void;
  handleExportDiagram: () => void;
  handleOpenCloudModal: () => void;
  handleCopyXml: () => void;
}) {
  handleOpenDiagram = handlers.handleOpenDiagram;
  handleSaveDiagram = handlers.handleSaveDiagram;
  handleExportDiagram = handlers.handleExportDiagram;
  handleOpenCloudModal = handlers.handleOpenCloudModal;
  handleCopyXml = handlers.handleCopyXml;
}

async function runAction(action: () => Promise<void> | void, errorPrefix: string) {
  try {
    await action();
  } catch (error) {
    Toast.show(formatError(error, errorPrefix), 'error');
  }
}

export function bindToolbar() {
  state.toolbar = createToolbar(ui, {
    onNew: () => runAction(() => handleNewDiagram(state), 'Error al crear un diagrama nuevo'),
    onOpen: () => runAction(handleOpenDiagram, 'Error al abrir el archivo'),
    onSave: () => runAction(handleSaveDiagram, 'Error al guardar'),
    onExport: () => runAction(handleExportDiagram, 'Error al exportar imagen'),
    onTheme: handleToggleTheme,
    onShortcuts: () => ui.shortcutsModal.showModal(),
    onCloud: handleOpenCloudModal,
    onFit: () => state.modeler && fitViewport(state.modeler),
    onZoomIn: () => state.modeler && zoomByStep(state.modeler, 0.1),
    onZoomOut: () => state.modeler && zoomByStep(state.modeler, -0.1),
    onToggleProperties: () => state.sidebar?.toggle(),
  });

  const btnCopyXml = document.getElementById('btnCopyXml');
  if (btnCopyXml) on(btnCopyXml, 'click', handleCopyXml);
}

export function bindModelerEvents() {
  if (!state.modeler) return;

  state.modeler.on(
    'commandStack.changed',
    debounce(async () => {
      const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
      if (activeTab && state.modeler) {
        activeTab.isDirty = true;
        activeTab.xml = await getDiagramXml(state.modeler);
        await saveTabsSession(APP_CONFIG.storage.keys, state.tabs, state.activeTabId);
        updateTabsUi(state);
      }
    }, 500)
  );

  bindTaskFormViewerEvents(state.modeler);

  state.modeler.on('selection.changed', (event: { newSelection?: Array<{ type: string }> }) => {
    const element = event.newSelection?.[0] || null;
    const type = element ? String(element.type).replace('bpmn:', '') : 'Sin selección';
    statusbar.setSelection(type);

    const logisticsPanel = document.getElementById('logisticsPanel');
    if (logisticsPanel && !logisticsPanel.classList.contains('hidden')) {
      refreshLogisticsPanel(state);
    }
  });

  state.modeler.on('commandStack.changed', () => {
    const logisticsPanel = document.getElementById('logisticsPanel');
    if (logisticsPanel && !logisticsPanel.classList.contains('hidden')) {
      refreshLogisticsPanel(state);
    }
  });
}

export function initEventBindings(dependencies: { state: AppState; ui: AppUi; statusbar: Statusbar }) {
  state = dependencies.state;
  ui = dependencies.ui;
  statusbar = dependencies.statusbar;
}


