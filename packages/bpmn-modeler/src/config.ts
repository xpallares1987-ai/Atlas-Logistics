import { z } from 'zod';
import { createEnvValidator } from '@atlas/shared';

const envSchema = {
  VITE_GITHUB_GIST_ID: z.string().optional(),
};

const validateEnv = createEnvValidator(envSchema);
export const env = validateEnv(import.meta.env);

const APP_CONFIG = {
  app: {
    name: 'BPMN 2.0 Interactive Modeler',
    version: '1.0.0',
    engine: 'camunda 8',
    language: 'es',
  },

  paths: {
    defaultDiagram: './xml/diagrams/blank-process.bpmn',
    mainDiagram: './xml/diagrams/process-main.bpmn',
    appConfig: './xml/config/app-config.xml',
    elementTemplates: './.camunda/element-templates/',
  },

  logisticsTemplates: [
    { id: 'scm-ocean-export', name: 'Ocean Export Full', path: './xml/templates/scm-ocean-export-full.bpmn', icon: '🚢', desc: 'Proceso integral de exportación marítima.' },
    { id: 'sea-export', name: 'Exportación Marítima (Simp)', path: './xml/templates/sea-export.bpmn', icon: '🌊', desc: 'Gestión simplificada de envíos FCL/LCL.' },
    { id: 'sea-import', name: 'Importación Marítima', path: './xml/templates/sea-import.bpmn', icon: '⚓', desc: 'Recepción y seguimiento de carga.' },
    { id: 'air-export', name: 'Exportación Aérea', path: './xml/templates/air-export.bpmn', icon: '✈️', desc: 'Procesos para carga aérea urgente.' },
    { id: 'air-import', name: 'Importación Aérea', path: './xml/templates/air-import.bpmn', icon: '🛬', desc: 'Recepción y despacho de carga aérea.' },
    { id: 'customs', name: 'Despacho de Aduanas', path: './xml/templates/customs-clearance.bpmn', icon: '🛂', desc: 'Validación y liberación de mercancía.' },
    { id: 'warehouse', name: 'Recepción Almacén', path: './xml/templates/warehouse-receiving.bpmn', icon: '🏢', desc: 'Control de entrada en bodega.' },
    { id: 'lcl-consol', name: 'Consolidación LCL', path: './xml/templates/lcl-consolidation.bpmn', icon: '📦', desc: 'Agrupación de carga parcial en contenedor.' },
    { id: 'last-mile', name: 'Última Milla', path: './xml/templates/last-mile.bpmn', icon: '🚚', desc: 'Entrega final al cliente consignatario.' },
    { id: 'wms-flow', name: 'Flujo WMS', path: './xml/templates/wms-flow.bpmn', icon: '⚙️', desc: 'Gestión avanzada de almacenes.' },
    { id: 'scm-track-trace', name: 'Track & Trace', path: './xml/templates/scm-track-trace.bpmn', icon: '📍', desc: 'Seguimiento y trazabilidad de carga.' },
    { id: 'scm-claims', name: 'Gestión de Reclamos', path: './xml/templates/scm-claims.bpmn', icon: '⚠️', desc: 'Procesamiento de incidencias y reclamos.' },
    { id: 'scm-invoice-handling', name: 'Gestión de Facturas', path: './xml/templates/scm-invoice-handling.bpmn', icon: '🧾', desc: 'Procesamiento y control de facturas.' },
    { id: 'crm-flow', name: 'Flujo CRM', path: './xml/templates/crm-flow.bpmn', icon: '👥', desc: 'Gestión de relaciones con clientes.' },
    { id: 'scm-cross-trade', name: 'Cross Trade', path: './xml/templates/scm-cross-trade.bpmn', icon: '🌐', desc: 'Operaciones de comercio triangulado.' },
  ],

  selectors: {
    canvas: '#canvas',
    properties: '#properties',
    propertiesSidebar: '#propertiesSidebar',
    statusText: '#statusText',
    selectionText: '#selectionText',
    diagramName: '#diagramName',
    fileInput: '#fileInput',
    btnNew: '#btnNew',
    btnOpen: '#btnOpen',
    btnSave: '#btnSave',
    btnExport: '#btnExport',
    btnTheme: '#btnTheme',
    btnShortcuts: '#btnShortcuts',
    btnCloud: '#btnCloud',
    btnLogistics: '#btnLogistics',
    btnFit: '#btnFit',
    btnZoomIn: '#btnZoomIn',
    btnZoomOut: '#btnZoomOut',
    btnToggleProperties: '#btnToggleProperties',
    btnDiff: '#btnDiff',
    btnVersions: '#btnVersions',
    shortcutsModal: '#shortcutsModal',
    btnCloseModal: '#btnCloseModal',
    cloudModal: '#cloudModal',
    btnCloseCloudModal: '#btnCloseCloudModal',
    githubTokenInput: '#githubToken',
    btnCloudSync: '#btnCloudSync',
    tabsContainer: '#tabsContainer',
    btnAddTab: '#btnAddTab',
    toastContainer: '#toastContainer',
    logisticsModal: '#logisticsModal',
    btnCloseLogisticsModal: '#btnCloseLogisticsModal',
    logisticsTemplatesList: '#logisticsTemplatesList',
  },

  storage: {
    enabled: true,
    keys: {
      diagramXml: 'bpmn.diagram-xml',
      diagramName: 'bpmn.diagram-name',
      uiState: 'bpmn.ui-state',
      appConfig: 'bpmn.app-config',
      elementTemplates: 'bpmn.element-templates',
      githubToken: 'bpmn.github-token',
      gistId: 'bpmn.gist-id',
      tabsState: 'bpmn.tabs-state',
    },
  },

  ui: {
    propertiesPanelOpen: true,
    fitViewportOnLoad: true,
    autoSave: true,
    statusReady: 'Listo',
    statusLoading: 'Cargando diagrama...',
    statusImported: 'Diagrama cargado',
    statusSaved: 'Diagrama guardado',
    statusUnsaved: 'Cambios sin guardar',
    statusNoSelection: 'Sin selección',
  },

  zoom: {
    min: 0.2,
    max: 4,
    step: 0.1,
  },

  download: {
    defaultFileName: 'diagram.bpmn',
    mimeType: 'application/xml;charset=utf-8',
  },

  modeler: {
    keyboardBindToWindow: true,
    camunda8: true,
    propertiesPanel: true,
    zeebeSupport: true,
  },
};

export default APP_CONFIG;

