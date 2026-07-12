
export interface DiagramVersion {
  id: string;
  tabId: string;
  label: string;
  timestamp: number;
  xml: string;
}

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
  constructor() {}

  async saveVersion(tabId: string, label: string, xml: string): Promise<DiagramVersion> {
    const version: DiagramVersion = {
      id: crypto.randomUUID(),
      tabId,
      label: label.trim() || `Autosave - ${new Date().toLocaleTimeString()}`,
      timestamp: Date.now(),
      xml,
    };

    if (isLocalStorageAvailable()) {
      const history = this.getLocalStorageHistory();
      if (!history[tabId]) {
        history[tabId] = [];
      }
      history[tabId].unshift(version);
      if (history[tabId].length > 50) {
        history[tabId].pop();
      }
      window.localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(history));
    }

    return version;
  }

  async getVersions(tabId: string): Promise<DiagramVersion[]> {
    if (isLocalStorageAvailable()) {
      const history = this.getLocalStorageHistory();
      return history[tabId] || [];
    }
    return [];
  }

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
