/**
 * @module
 * @description Centralizes event listener bindings for the application.
 */

import { on, debounce, formatError } from '@atlas/ui';
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

// Module-level state, injected by init
let state: AppState;
let ui: AppUi;
let statusbar: Statusbar;

// Injected Handlers
let handleOpenDiagram: () => void = () => {};
let handleSaveDiagram: () => void = () => {};
let handleExportDiagram: () => void = () => {};
let handleOpenCloudModal: () => void = () => {};
let handleCopyXml: () => void = () => {};

/**
 * Initializes the handlers in the event bindings module.
 */
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

/**
 * Wraps an action with a try-catch block to show toast notifications on error.
 * @param action - The function to execute.
 * @param errorPrefix - The prefix for the error message.
 */
async function runAction(action: () => Promise<void> | void, errorPrefix: string) {
  try {
    await action();
  } catch (error) {
    Toast.show(formatError(error, errorPrefix), 'error');
  }
}

/**
 * Creates the toolbar and binds all its button events.
 */
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
  if (btnCopyXml) {
    on(btnCopyXml, 'click', handleCopyXml);
  }
}

/**
 * Binds event listeners to the BPMN modeler instance.
 */
export function bindModelerEvents() {
  if (!state.modeler) return;

  // Auto-save on diagram changes
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

  // Bind the task form viewer so it listens to selection changes
  bindTaskFormViewerEvents(state.modeler);

  // Update selection text in statusbar with selected element type
  state.modeler.on('selection.changed', (event: { newSelection?: Array<{ type: string }> }) => {
    const element = event.newSelection?.[0] || null;
    const type = element ? String(element.type).replace('bpmn:', '') : 'Sin selección';
    statusbar.setSelection(type);

    // Refresh logistics panel if visible
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

/**
 * Injects dependencies into the event bindings module.
 * @param dependencies - The dependencies to inject.
 */
export function initEventBindings(dependencies: {
  state: AppState;
  ui: AppUi;
  statusbar: Statusbar;
}) {
  state = dependencies.state;
  ui = dependencies.ui;
  statusbar = dependencies.statusbar;
}
