import { SharedDatabase } from '@atlas/ui';

export interface DiagramVersion {
  id: string;
  tabId: string;
  label: string;
  timestamp: number;
  xml: string;
}

// Local storage key for fallback
const LOCAL_STORAGE_HISTORY_KEY = 'bpmn.diagram-history';

function isLocalStorageAvailable(): boolean {
  try {
    const storage = window.localStorage;
    const testKey = '__mi_history_test__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export class HistoryService {
  private db: SharedDatabase | null = null;

  constructor() {
    try {
      this.db = new SharedDatabase('ControlTowerDB');
    } catch (err) {
      console.warn(
        'HistoryService: Failed to initialize Dexie SharedDatabase, falling back to localStorage:',
        err
      );
    }
  }

  /**
   * Saves a new version checkpoint for a diagram tab.
   */
  async saveVersion(tabId: string, label: string, xml: string): Promise<DiagramVersion> {
    const version: DiagramVersion = {
      id: crypto.randomUUID(),
      tabId,
      label: label.trim() || `Autosave - ${new Date().toLocaleTimeString()}`,
      timestamp: Date.now(),
      xml,
    };

    if (this.db) {
      try {
        // We will store history in IndexedDB under a dedicated key in xmlCache or diagrams if we want,
        // or we can store it in a custom table, or fallback to localStorage.
        // Let's use a robust localStorage approach specifically for history, or standard IndexedDB.
        // Since Dexie SharedDatabase is defined in @atlas/ui and might not have a specific history table,
        // we can store all history serialized in localstorage or dexie xmlCache.
        // Let's store it serialized in a single key or in localstorage, which is very reliable and fast.
      } catch (err) {
        console.warn('Failed to store history in IndexedDB:', err);
      }
    }

    // Always keep LocalStorage fallback or primary history store for extreme reliability
    if (isLocalStorageAvailable()) {
      const history = this.getLocalStorageHistory();
      if (!history[tabId]) {
        history[tabId] = [];
      }
      // Cap history at 50 versions per tab to prevent storage overflows
      history[tabId].unshift(version);
      if (history[tabId].length > 50) {
        history[tabId].pop();
      }
      window.localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(history));
    }

    return version;
  }

  /**
   * Retrieves all chronological versions for a specific diagram tab.
   */
  async getVersions(tabId: string): Promise<DiagramVersion[]> {
    if (isLocalStorageAvailable()) {
      const history = this.getLocalStorageHistory();
      return history[tabId] || [];
    }
    return [];
  }

  /**
   * Deletes a specific version from history.
   */
  async deleteVersion(tabId: string, versionId: string): Promise<boolean> {
    if (isLocalStorageAvailable()) {
      const history = this.getLocalStorageHistory();
      if (history[tabId]) {
        history[tabId] = history[tabId].filter((v: DiagramVersion) => v.id !== versionId);
        window.localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(history));
        return true;
      }
    }
    return false;
  }

  /**
   * Clears the entire version history for a tab.
   */
  async clearHistory(tabId: string): Promise<boolean> {
    if (isLocalStorageAvailable()) {
      const history = this.getLocalStorageHistory();
      delete history[tabId];
      window.localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(history));
      return true;
    }
    return false;
  }

  private getLocalStorageHistory(): Record<string, DiagramVersion[]> {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
}

export const historyService = new HistoryService();
