/// <reference types="vite/client" />
import '@atlas/ui/dist/control-tower-ui.css';
import '../assets/css/app.css';
import { initPassiveEventsPatch } from './utils/passive-events';
// Initialize performance patches
initPassiveEventsPatch();

const getFeatures = () => ({ enableTemplateManager: true });
import { TemplateService } from './services/template-service';
import { initTemplateManager } from './ui/template-manager';
import { initLogisticsSidebar } from './ui/logistics-sidebar';
import { initDeployModal } from './ui/deploy-modal';
import APP_CONFIG from './config';
import { state, updateTheme } from './state';
import {
  attachPropertiesPanel,
  createModeler,
  detachPropertiesPanel,
  fitViewport,
  highlightElement,
  searchElements,
  zoomByStep,
  importDiagram,
} from './services/modeler-service';
import { exportToPng } from './services/export-service';
import { saveToGitHub } from './services/cloud-service';
import {
  getDiagramXml,
  loadXmlFromUrl,
  openLocalXmlFromInput,
  downloadXmlFile,
} from './services/xml-service';
import {
  encryptToken,
  decryptToken,
  loadTabsSession,
  saveTabsSession,
} from './services/storage-service';
import {
  initTabManager,
  handleNewTab,
  handleSwitchTab,
  loadDiagramInNewTab,
  updateTabsUi,
  handleNewDiagram,
} from './state/tab-manager';
import { DiffVisualizer } from './ui/diff-visualizer';
import { initCustomKeyboard } from './services/keyboard-service';
import { initEventBindings, bindModelerEvents, initHandlers } from './events/event-bindings';
import { initUiManager, resolveUi, updateThemeIcon, handleToggleTheme } from './ui/ui-manager';
import { createSidebar } from './ui/sidebar';
import { createStatusbar, Statusbar } from './ui/statusbar';
import { createToolbar } from './ui/toolbar';
import { initVersionHistory, toggleVersionHistory } from './ui/version-history';
import { initTaskFormViewer } from './ui/task-form-viewer';
import {
  on,
  qs,
  debounce,
  formatError,
  applyTheme,
  subscribeToEvents,
  SharedDatabase,
  publishEvent,
} from '@atlas/ui';
import { Toast } from '@atlas/ui';
import { AppUi } from './types';

let ui: AppUi;
let statusbar: Statusbar;
let visualizer: DiffVisualizer;

async function handleOpenDiagram() {
  const result = await openLocalXmlFromInput(ui.fileInput);
  if (result) {
    await loadDiagramInNewTab(state, result.xml, result.name);
  }
}

async function handleLogisticsTemplate() {
  const logisticsTemplates = [
    {
      id: 'scm-ocean-export',
      name: 'Ocean Export Full',
      path: './xml/templates/scm-ocean-export-full.bpmn',
      icon: '🚢',
      desc: 'Proceso integral de exportación marítima.',
    },
    {
      id: 'sea-export',
      name: 'Exportación Marítima (Simp)',
      path: './xml/templates/sea-export.bpmn',
      icon: '🌊',
      desc: 'Gestión simplificada de envíos FCL/LCL.',
    },
    {
      id: 'air-export',
      name: 'Exportación Aérea',
      path: './xml/templates/air-export.bpmn',
      icon: '✈️',
      desc: 'Procesos para carga aérea urgente.',
    },
    {
      id: 'customs',
      name: 'Despacho de Aduanas',
      path: './xml/templates/customs-clearance.bpmn',
      icon: '🛂',
      desc: 'Validación y liberación de mercancía.',
    },
    {
      id: 'warehouse',
      name: 'Recepción Almacén',
      path: './xml/templates/warehouse-receiving.bpmn',
      icon: '🏢',
      desc: 'Control de entrada en bodega.',
    },
    {
      id: 'last-mile',
      name: 'Última Milla',
      path: './xml/templates/last-mile.bpmn',
      icon: '🚚',
      desc: 'Entrega final al cliente consignatario.',
    },
    {
      id: 'wms-flow',
      name: 'Flujo WMS',
      path: './xml/templates/wms-flow.bpmn',
      icon: '⚙️',
      desc: 'Gestión avanzada de almacenes.',
    },
    {
      id: 'scm-track-trace',
      name: 'Track & Trace',
      path: './xml/templates/scm-track-trace.bpmn',
      icon: '📍',
      desc: 'Seguimiento y trazabilidad de carga.',
    },
    {
      id: 'scm-claims',
      name: 'Gestión de Reclamos',
      path: './xml/templates/scm-claims.bpmn',
      icon: '⚠️',
      desc: 'Procesamiento de incidencias y reclamos.',
    },
    {
      id: 'scm-invoice-handling',
      name: 'Gestión de Facturas',
      path: './xml/templates/scm-invoice-handling.bpmn',
      icon: '🧾',
      desc: 'Procesamiento y control de facturas.',
    },
  ];

  ui.logisticsTemplatesList.innerHTML = logisticsTemplates
    .map(
      (t) => `
    <div class="template-card" data-path="${t.path}" data-name="${t.name}">
      <div class="template-card__icon">${t.icon}</div>
      <div class="template-card__name">${t.name}</div>
      <div class="template-card__desc">${t.desc}</div>
    </div>
  `
    )
    .join('');

  ui.logisticsTemplatesList.querySelectorAll('.template-card').forEach((card) => {
    on(card as HTMLElement, 'click', async () => {
      const path = card.getAttribute('data-path')!;
      const name = card.getAttribute('data-name')!;
      try {
        const result = await loadXmlFromUrl(path);
        await loadDiagramInNewTab(
          state,
          result.xml,
          name.toLowerCase().replace(/ /g, '-') + '.bpmn'
        );
        ui.logisticsModal.close();
        Toast.show(`Plantilla cargada: ${name}`, 'success');
      } catch (error) {
        console.error(error);
        Toast.show('Error al cargar la plantilla', 'error');
      }
    });
  });

  ui.logisticsModal.showModal();
}

async function handleSaveDiagram() {
  if (!state.modeler) return;
  const xml = await getDiagramXml(state.modeler);
  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
  if (!activeTab) return;

  await downloadXmlFile(activeTab.name, xml);
  activeTab.isDirty = false;
  activeTab.xml = xml;
  updateTabsUi(state);

  // Persist to shared Dexie database and broadcast event
  try {
    const db = new SharedDatabase('ControlTowerDB');
    await db.diagrams.put({
      id: activeTab.id,
      name: activeTab.name,
      xml: xml,
      updatedAt: Date.now(),
    });
    publishEvent({
      type: 'DIAGRAM_SAVED',
      payload: { id: activeTab.id, name: activeTab.name },
    });
  } catch (dbErr) {
    console.warn('Failed to persist diagram to IndexedDB:', dbErr);
  }

  Toast.show('Diagrama guardado', 'success');
}

async function handleExportDiagram() {
  if (!state.modeler) return;
  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
  const fileName = activeTab ? activeTab.name.replace('.bpmn', '') : 'diagrama';
  await exportToPng(state.modeler, fileName);
  Toast.show('Imagen exportada', 'success');
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
}

async function handleDrop(e: DragEvent) {
  e.preventDefault();
  const file = e.dataTransfer?.files[0];
  if (file && (file.name.endsWith('.bpmn') || file.name.endsWith('.xml'))) {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const xml = event.target?.result as string;
      await loadDiagramInNewTab(state, xml, file.name);
    };
    reader.readAsText(file);
  } else {
    Toast.show('Por favor, suelta un archivo .bpmn o .xml válido', 'warning');
  }
}

async function handleCopyXml() {
  if (!state.modeler) return;
  try {
    const xml = await getDiagramXml(state.modeler);
    await navigator.clipboard.writeText(xml);
    Toast.show('XML copiado al portapapeles', 'success');
  } catch (err) {
    console.error('Error al copiar XML', err);
    Toast.show('No se pudo copiar el XML', 'error');
  }
}

function bindToolbar() {
  state.toolbar = createToolbar(ui, {
    onNew: () => runAction(() => handleNewDiagram(state), 'Error al crear un diagrama nuevo'),
    onOpen: () => runAction(handleOpenDiagram, 'Error al abrir el archivo'),
    onSave: () => runAction(handleSaveDiagram, 'Error al guardar'),
    onExport: () => runAction(handleExportDiagram, 'Error al exportar imagen'),
    onTheme: handleToggleTheme,
    onShortcuts: () => ui.shortcutsModal.showModal(),
    onCloud: handleOpenCloudModal,
    onLogistics: handleLogisticsTemplate,
    onFit: () => state.modeler && fitViewport(state.modeler),
    onZoomIn: () => state.modeler && zoomByStep(state.modeler, 0.1),
    onZoomOut: () => state.modeler && zoomByStep(state.modeler, -0.1),
    onToggleProperties: () => state.sidebar?.toggle(),
    onVersions: () => toggleVersionHistory(),
  });

  const btnCopyXml = document.getElementById('btnCopyXml');
  if (btnCopyXml) {
    on(btnCopyXml, 'click', handleCopyXml);
  }

  const btnDiff = document.getElementById('btnDiff');
  if (btnDiff) {
    on(btnDiff, 'click', async () => {
      const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
      if (activeTab && visualizer) {
        const { historyService } = await import('./services/history-service');
        const versions = await historyService.getVersions(activeTab.id);
        if (versions.length > 0) {
          visualizer.open(versions);
        } else {
          Toast.show('No hay versiones anteriores para comparar.', 'info');
        }
      }
    });
  }

  const btnSop = document.getElementById('btnSop');
  if (btnSop) {
    on(btnSop, 'click', async () => {
      if (state.modeler) {
        const { generateSOP } = await import('./services/sop-service');
        const sop = await generateSOP(state.modeler);
        const blob = new Blob([sop], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SOP-${state.activeTabId}.md`;
        a.click();
        Toast.show('SOP generado con éxito', 'success');
      }
    });
  }

  const btnMinimap = document.getElementById('btnMinimap');
  if (btnMinimap) {
    on(btnMinimap, 'click', () => {
      if (state.modeler) {
        try {
          const minimap = state.modeler.get('minimap') as { toggle: () => void };
          minimap.toggle();
        } catch {
          console.warn('Minimap module not found');
        }
      }
    });
  }
}

async function handleOpenCloudModal() {
  const encryptedToken = sessionStorage.getItem(APP_CONFIG.storage.keys.githubToken);
  if (encryptedToken) {
    const pin = prompt('Introduce tu PIN para desbloquear el token:');
    if (pin) {
      try {
        const token = await decryptToken(encryptedToken, pin);
        ui.githubTokenInput.value = token;
      } catch {
        Toast.show('PIN incorrecto', 'error');
        ui.githubTokenInput.value = '';
      }
    }
  }
  ui.cloudModal.showModal();
}

async function handleCloudSync() {
  const token = ui.githubTokenInput.value.trim();
  if (!token) return Toast.show('Introduce un token de GitHub', 'error');

  const pin = prompt('Crea un PIN para proteger tu token en esta sesión:');
  if (!pin) return Toast.show('El PIN es obligatorio para proteger el token', 'warning');

  try {
    const encrypted = await encryptToken(token, pin);
    sessionStorage.setItem(APP_CONFIG.storage.keys.githubToken, encrypted);

    if (!state.modeler) return;
    const xml = await getDiagramXml(state.modeler);
    const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
    const result = await saveToGitHub(
      token,
      activeTab?.name || 'diagram.bpmn',
      xml,
      sessionStorage.getItem(APP_CONFIG.storage.keys.gistId)
    );
    if (result?.id) {
      sessionStorage.setItem(APP_CONFIG.storage.keys.gistId, result.id);
      ui.cloudModal.close();
      Toast.show('Sincronizado con GitHub', 'success');
    }
  } catch {
    Toast.show('Error de sincronización', 'error');
  }
}

async function runAction(action: () => Promise<void> | void, errorPrefix: string) {
  try {
    await action();
  } catch (error) {
    Toast.show(formatError(error, errorPrefix), 'error');
  }
}

async function handleAutoSave() {
  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
  if (!activeTab || !state.modeler || !activeTab.isDirty) return;

  const indicator = document.getElementById('autoSaveText');
  if (indicator) indicator.textContent = 'Guardando...';

  try {
    const xml = await getDiagramXml(state.modeler);
    activeTab.xml = xml;
    activeTab.isDirty = false;
    await saveTabsSession(APP_CONFIG.storage.keys, state.tabs, state.activeTabId);
    updateTabsUi(state);
    if (indicator) {
      const now = new Date().toLocaleTimeString();
      indicator.textContent = `Auto-guardado: ${now}`;
    }
  } catch (error) {
    console.error('Auto-save failed', error);
  }
}

async function init() {
  try {
    applyTheme(state.theme);
    ui = resolveUi(APP_CONFIG.selectors);

    initTabManager({
      getUi: () => ui,
      bindModelerEvents: bindModelerEvents,
    });

    initUiManager({ ui, state });

    statusbar = createStatusbar({
      statusElement: ui.statusText,
      selectionElement: ui.selectionText,
    });

    initEventBindings({ state, ui, statusbar });
    initDeployModal(statusbar);
    initVersionHistory();
    initTaskFormViewer();
    initHandlers({
      handleOpenDiagram,
      handleSaveDiagram,
      handleExportDiagram,
      handleOpenCloudModal,
      handleCopyXml,
    });

    // Dynamic imports for heavy services are currently handled by a static import at the top.
    // Assign imported services to a scope accessible to the rest of the file
    // Note: Since main.ts is large, I'll keep the logic inline or update scope
    const features = getFeatures();
    const templateService = new TemplateService();

    if (features.enableTemplateManager) {
      // Register all available logistics templates
      const logisticsTemplates = [
        {
          id: 'sea-export',
          name: 'Exportación Marítima',
          path: './xml/templates/sea-export.bpmn',
          icon: '🚢',
          desc: 'Gestión de envíos FCL/LCL vía mar.',
        },
        {
          id: 'sea-import',
          name: 'Importación Marítima',
          path: './xml/templates/sea-import.bpmn',
          icon: '⚓',
          desc: 'Recepción y seguimiento de carga.',
        },
        {
          id: 'air-export',
          name: 'Exportación Aérea',
          path: './xml/templates/air-export.bpmn',
          icon: '✈️',
          desc: 'Procesos para carga aérea urgente.',
        },
        {
          id: 'air-import',
          name: 'Importación Aérea',
          path: './xml/templates/air-import.bpmn',
          icon: '🛬',
          desc: 'Recepción y despacho de carga aérea.',
        },
        {
          id: 'customs',
          name: 'Despacho de Aduanas',
          path: './xml/templates/customs-clearance.bpmn',
          icon: '🛂',
          desc: 'Validación y liberación de mercancía.',
        },
        {
          id: 'warehouse',
          name: 'Recepción Almacén',
          path: './xml/templates/warehouse-receiving.bpmn',
          icon: '🏢',
          desc: 'Control de entrada en bodega.',
        },
        {
          id: 'lcl-consol',
          name: 'Consolidación LCL',
          path: './xml/templates/lcl-consolidation.bpmn',
          icon: '📦',
          desc: 'Agrupación de carga parcial en contenedor.',
        },
        {
          id: 'last-mile',
          name: 'Última Milla',
          path: './xml/templates/last-mile.bpmn',
          icon: '🚚',
          desc: 'Entrega final al cliente consignatario.',
        },
        {
          id: 'scm-claims',
          name: 'Gestión de Reclamos',
          path: './xml/templates/scm-claims.bpmn',
          icon: '⚠️',
          desc: 'Procesamiento de incidencias y reclamos.',
        },
        {
          id: 'wms-flow',
          name: 'Flujo WMS',
          path: './xml/templates/wms-flow.bpmn',
          icon: '⚙️',
          desc: 'Flujo de trabajo de gestión de almacén.',
        },
        {
          id: 'crm-flow',
          name: 'Flujo CRM',
          path: './xml/templates/crm-flow.bpmn',
          icon: '👥',
          desc: 'Gestión de relaciones con clientes.',
        },
        {
          id: 'scm-cross-trade',
          name: 'Cross Trade',
          path: './xml/templates/scm-cross-trade.bpmn',
          icon: '🌐',
          desc: 'Operaciones de comercio triangulado.',
        },
        {
          id: 'scm-invoice-handling',
          name: 'Gestión de Facturas',
          path: './xml/templates/scm-invoice-handling.bpmn',
          icon: '🧾',
          desc: 'Procesamiento y control de facturas.',
        },
      ];

      for (const t of logisticsTemplates) {
        const { xml } = await loadXmlFromUrl(t.path);
        templateService.registerTemplate({
          metadata: { id: t.id, name: t.name, category: 'bpmn' },
          xml,
        });
      }

      initTemplateManager(templateService, async (template) => {
        if (state.modeler) {
          await loadDiagramInNewTab(
            state,
            template.xml,
            template.metadata.name.toLowerCase().replace(/ /g, '-') + '.bpmn'
          );
          Toast.show(`Plantilla ${template.metadata.name} cargada`, 'success');
        }
      });
    }

    state.modeler = await createModeler({
      container: APP_CONFIG.selectors.canvas,
      properties: APP_CONFIG.selectors.properties,
      keyboardBindToWindow: true,
      camunda8: true,
      propertiesPanel: true,
      zeebeSupport: true,
    });

    if (state.modeler) {
      initCustomKeyboard(state.modeler);
      visualizer = new DiffVisualizer(state.modeler);
    }

    bindModelerEvents();
    bindToolbar();
    updateThemeIcon();

    state.sidebar = createSidebar({
      sidebarElement: ui.propertiesSidebar,
      toggleButton: ui.btnToggleProperties,
      initialOpen: state.propertiesPanelOpen,
      onChange: (isOpen: boolean) => {
        state.propertiesPanelOpen = isOpen;
        const workspace = qs('.workspace');
        if (workspace) {
          if (isOpen) workspace.classList.remove('workspace--sidebar-hidden');
          else workspace.classList.add('workspace--sidebar-hidden');
        }
        if (state.modeler) {
          if (isOpen) attachPropertiesPanel(state.modeler, ui.properties);
          else detachPropertiesPanel(state.modeler);
        }
      },
    });

    initLogisticsSidebar(state);

    on(ui.btnAddTab, 'click', () => handleNewTab(state));
    on(ui.btnCloseModal, 'click', () => ui.shortcutsModal.close());
    on(ui.btnCloseCloudModal, 'click', () => ui.cloudModal.close());
    on(ui.btnCloseLogisticsModal, 'click', () => ui.logisticsModal.close());

    const cloudForm = qs('#cloudForm');
    if (cloudForm) {
      on(cloudForm, 'submit', (e: Event) => {
        e.preventDefault();
        handleCloudSync();
      });
    }

    const canvasEl = ui.canvas;
    on<DragEvent>(canvasEl, 'dragover', handleDragOver);
    on<DragEvent>(canvasEl, 'drop', handleDrop);

    const searchInput = document.getElementById('diagramSearch') as HTMLInputElement;
    if (searchInput) {
      on(
        searchInput,
        'input',
        debounce(() => {
          const term = searchInput.value;
          if (state.modeler && term.length > 2) {
            const results = searchElements(state.modeler, term);
            if (results.length > 0) {
              highlightElement(state.modeler, results[0]);
              Toast.show(`Encontrado: ${results[0].businessObject.name || results[0].id}`, 'info');
            }
          }
        }, 500)
      );
    }

    const savedSession = await loadTabsSession(APP_CONFIG.storage.keys);
    if (savedSession && savedSession.tabs && savedSession.tabs.length > 0) {
      state.tabs = savedSession.tabs;
      await handleSwitchTab(state, savedSession.activeTabId || state.tabs[0].id);
    } else {
      await handleNewTab(state);
    }

    // Subscribe to BroadcastChannel sync events
    try {
      subscribeToEvents((event) => {
        if (event.type === 'DIAGRAM_SAVED') {
          const payload = event.payload as { name: string } | undefined;
          console.log('Received DIAGRAM_SAVED event from another tab:', payload);
          if (payload) {
            Toast.show(`Diagrama guardado en otra pestaña: ${payload.name}`, 'info');
          }
        } else if (event.type === 'XML_CACHE_UPDATED') {
          console.log('Logistics data synced in another tab:', event.payload);
          Toast.show('Los datos de logística se actualizaron en la nube', 'success');
        } else if (event.type === 'THEME_CHANGED') {
          const payload = event.payload as { theme: 'light' | 'dark' } | undefined;
          console.log('Theme changed in another tab:', payload);
          if (payload) {
            updateTheme(payload.theme, true);
            updateThemeIcon();
          }
        } else if (event.type === 'DIAGRAM_CHANGED') {
          console.log('Diagram changed in another tab');
          if (state.modeler) {
            importDiagram(state.modeler, event.payload as string);
          }
        }
      });
    } catch {
      console.warn('Failed to load shared broadcast service inside BPMN Modeler');
    }

    Toast.show('Bienvenido al Modelador BPMN', 'success');
    setInterval(handleAutoSave, 30000);
  } catch (error) {
    console.error(error);
  }
}

// React Auth Mounting was removed. Authentication is inherited from the host application.
export function mountBPMNModeler() { init(); }


