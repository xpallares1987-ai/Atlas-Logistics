import { AppState } from './types';
import APP_CONFIG from './config';
import { loadTheme, saveTheme, applyTheme, publishEvent, Theme } from '@atlas/ui';

export type { AppState };

export const state: AppState = {
  modeler: null,
  tabs: [],
  activeTabId: '',
  propertiesPanelOpen: APP_CONFIG.ui.propertiesPanelOpen,
  theme: loadTheme(),
  toolbar: null,
  sidebar: null,
  cleanups: [],
};

export function getActiveTab() {
  return state.tabs.find((t) => t.id === state.activeTabId);
}

export function updateTheme(theme: Theme, isFromBroadcast: boolean = false) {
  state.theme = theme;
  saveTheme(theme);
  applyTheme(theme);

  if (!isFromBroadcast) {
    try {
      publishEvent({
        type: 'THEME_CHANGED',
        payload: { theme },
      });
    } catch (e) {
      console.warn('Failed to publish theme change event:', e);
    }
  }
}
