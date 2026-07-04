import { z } from 'zod';
import { createEnvValidator } from '@atlas/ui';

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
    logisticsSeaExport: './xml/templates/sea-export.bpmn',
    logisticsSeaImport: './xml/templates/sea-import.bpmn',
    logisticsAirExport: './xml/templates/air-export.bpmn',
    logisticsAirImport: './xml/templates/air-import.bpmn',
    logisticsCustoms: './xml/templates/customs-clearance.bpmn',
    logisticsWarehouse: './xml/templates/warehouse-receiving.bpmn',
    logisticsLclConsol: './xml/templates/lcl-consolidation.bpmn',
    logisticsLastMile: './xml/templates/last-mile.bpmn',
    appConfig: './xml/config/app-config.xml',
    elementTemplates: './.camunda/element-templates/',
  },

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

