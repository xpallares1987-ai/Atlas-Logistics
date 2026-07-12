import { decryptToken, encryptToken } from '@/components';
import { DiagramTab } from '../types';

export { decryptToken, encryptToken };

function isStorageAvailable(): boolean {
  try {
    const storage = window.localStorage;
    const testKey = '__mi_aplicacion_test__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function safeSetItem(key: string, value: string): boolean {
  if (!isStorageAvailable()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeGetItem(key: string): string | null {
  if (!isStorageAvailable()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export interface StorageKeys {
  diagramXml: string;
  diagramName: string;
  uiState: string;
  appConfig: string;
  elementTemplates: string;
  githubToken: string;
  gistId: string;
  tabsState: string;
}

export function saveUiSession(keys: StorageKeys, uiState: { propertiesPanelOpen?: boolean } = {}) {
  if (!keys.uiState) return false;
  return safeSetItem(keys.uiState, JSON.stringify({ propertiesPanelOpen: Boolean(uiState.propertiesPanelOpen) }));
}

export function loadUiSession(keys: StorageKeys) {
  if (!keys.uiState) return null;
  const raw = safeGetItem(keys.uiState);
  if (!raw) return null;
  try {
    return { propertiesPanelOpen: Boolean(JSON.parse(raw).propertiesPanelOpen) };
  } catch {
    return null;
  }
}

export function saveTabsSession(keys: StorageKeys, tabs: DiagramTab[], activeTabId: string) {
  if (!keys.tabsState) return false;
  return safeSetItem(keys.tabsState, JSON.stringify({ tabs, activeTabId }));
}

export function loadTabsSession(keys: StorageKeys): { tabs: DiagramTab[]; activeTabId: string; } | null {
  if (!keys.tabsState) return null;
  const raw = safeGetItem(keys.tabsState);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
