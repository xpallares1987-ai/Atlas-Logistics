import { ensureElement } from '@atlas/ui';
import { AppUi } from '../types';

export interface Toolbar {
  destroy: () => void;
}

function bindClick(element: HTMLElement, handler: ((ev: MouseEvent) => void) | undefined) {
  if (typeof handler !== 'function') return () => {};
  element.addEventListener('click', handler);
  return () => element.removeEventListener('click', handler);
}

export function createToolbar(
  elements: Partial<AppUi> = {},
  handlers: Record<string, (ev: MouseEvent) => void> = {}
): Toolbar {
  const btns = {
    btnNew: ensureElement(elements.btnNew as HTMLButtonElement, 'botón Nuevo'),
    btnOpen: ensureElement(elements.btnOpen as HTMLButtonElement, 'botón Abrir'),
    btnSave: ensureElement(elements.btnSave as HTMLButtonElement, 'botón Guardar'),
    btnExport: ensureElement(elements.btnExport as HTMLButtonElement, 'botón Exportar'),
    btnTheme: ensureElement(elements.btnTheme as HTMLButtonElement, 'botón Tema'),
    btnShortcuts: ensureElement(elements.btnShortcuts as HTMLButtonElement, 'botón Atajos'),
    btnCloud: ensureElement(elements.btnCloud as HTMLButtonElement, 'botón Nube'),
    btnLogistics: ensureElement(elements.btnLogistics as HTMLButtonElement, 'botón Logística'),
    btnFit: ensureElement(elements.btnFit as HTMLButtonElement, 'botón Ajustar'),
    btnZoomIn: ensureElement(elements.btnZoomIn as HTMLButtonElement, 'botón Zoom +'),
    btnZoomOut: ensureElement(elements.btnZoomOut as HTMLButtonElement, 'botón Zoom -'),
    btnToggleProperties: ensureElement(
      elements.btnToggleProperties as HTMLButtonElement,
      'botón Propiedades'
    ),
    btnDiff: ensureElement(elements.btnDiff as HTMLButtonElement, 'botón Comparar'),
    btnVersions: ensureElement(elements.btnVersions as HTMLButtonElement, 'botón Versiones'),
  };

  const cleanups = [
    bindClick(btns.btnNew, handlers.onNew),
    bindClick(btns.btnOpen, handlers.onOpen),
    bindClick(btns.btnSave, handlers.onSave),
    bindClick(btns.btnExport, handlers.onExport),
    bindClick(btns.btnTheme, handlers.onTheme),
    bindClick(btns.btnShortcuts, handlers.onShortcuts),
    bindClick(btns.btnCloud, handlers.onCloud),
    bindClick(btns.btnLogistics, handlers.onLogistics),
    bindClick(btns.btnFit, handlers.onFit),
    bindClick(btns.btnZoomIn, handlers.onZoomIn),
    bindClick(btns.btnZoomOut, handlers.onZoomOut),
    bindClick(btns.btnToggleProperties, handlers.onToggleProperties),
    bindClick(btns.btnDiff, handlers.onDiff),
    bindClick(btns.btnVersions, handlers.onVersions),
  ];

  return {
    destroy: () => cleanups.forEach((cleanup) => cleanup()),
  };
}

