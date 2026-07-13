import { qs } from '@atlas/shared';
import { Toast } from '@atlas/ui';
import type { AppUi } from '../types';
import { AppState, updateTheme } from '../state';

let ui: AppUi;
let state: AppState;

export function resolveUi(selectors: Record<string, string>): AppUi {
  return Object.entries(selectors).reduce((acc, [key, selector]) => {
    const element = qs(selector);
    if (!element) throw new Error(`No se encontró el elemento requerido: ${selector}`);
    (acc as unknown as Record<string, HTMLElement>)[key] = element;
    return acc;
  }, {} as AppUi);
}

export function updateThemeIcon() {
  const btn = ui.btnTheme;
  if (btn) {
    btn.innerHTML =
      state.theme === 'light'
        ? `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>`
        : `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"></path></svg>`;
  }
}

export function handleToggleTheme() {
  const newTheme = state.theme === 'light' ? 'dark' : 'light';
  updateTheme(newTheme);
  updateThemeIcon();
  Toast.show(`Tema: ${state.theme}`, 'info');
}

export function initUiManager(dependencies: { ui: AppUi; state: AppState }) {
  ui = dependencies.ui;
  state = dependencies.state;
}


