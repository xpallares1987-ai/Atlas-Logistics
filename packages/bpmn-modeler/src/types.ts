import Modeler from 'bpmn-js/lib/Modeler';
import { Sidebar } from './ui/sidebar';
import { Toolbar } from './ui/toolbar';
import { Theme } from '@atlas/ui';

export type { Theme };

export interface DiagramTab {
  id: string;
  name: string;
  xml: string;
  isDirty: boolean;
}

export interface AppUi {
  canvas: HTMLElement;
  properties: HTMLElement;
  propertiesSidebar: HTMLElement;
  statusText: HTMLElement;
  selectionText: HTMLElement;
  diagramName: HTMLElement;
  fileInput: HTMLInputElement;
  btnNew: HTMLButtonElement;
  btnOpen: HTMLButtonElement;
  btnSave: HTMLButtonElement;
  btnExport: HTMLButtonElement;
  btnTheme: HTMLButtonElement;
  btnShortcuts: HTMLButtonElement;
  btnCloud: HTMLButtonElement;
  btnLogistics: HTMLButtonElement;
  btnFit: HTMLButtonElement;
  btnZoomIn: HTMLButtonElement;
  btnZoomOut: HTMLButtonElement;
  btnToggleProperties: HTMLButtonElement;
  btnDiff: HTMLButtonElement;
  btnVersions: HTMLButtonElement;
  shortcutsModal: HTMLDialogElement;
  btnCloseModal: HTMLButtonElement;
  cloudModal: HTMLDialogElement;
  btnCloseCloudModal: HTMLButtonElement;
  githubTokenInput: HTMLInputElement;
  btnCloudSync: HTMLButtonElement;
  tabsContainer: HTMLElement;
  btnAddTab: HTMLButtonElement;
  toastContainer: HTMLElement;
  logisticsModal: HTMLDialogElement;
  btnCloseLogisticsModal: HTMLButtonElement;
  logisticsTemplatesList: HTMLElement;
}

export interface AppState {
  modeler: Modeler | null;
  tabs: DiagramTab[];
  activeTabId: string;
  propertiesPanelOpen: boolean;
  theme: Theme;
  toolbar: Toolbar | null;
  sidebar: Sidebar | null;
  cleanups: (() => void)[];
}
