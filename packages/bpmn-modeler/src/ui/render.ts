import { ensureElement } from '@atlas/ui';
import { DiagramTab } from '../types';

export function setDiagramName(element: HTMLElement | null, name: string) {
  const el = ensureElement(element, 'elemento de nombre de diagrama');
  const safeName = name && name.trim() ? name.trim() : 'diagram.bpmn';
  el.textContent = safeName;
}

export function renderTabs(
  container: HTMLElement,
  tabs: DiagramTab[],
  activeTabId: string,
  onSwitch: (id: string) => void,
  onClose: (id: string) => void
) {
  container.innerHTML = '';
  tabs.forEach((tab) => {
    const tabEl = document.createElement('div');
    tabEl.className = `tab ${tab.id === activeTabId ? 'tab--active' : ''}`;
    tabEl.innerHTML = `
      <span class="tab-name">${tab.name}${tab.isDirty ? '*' : ''}</span>
      <button class="tab-close" title="Cerrar">&times;</button>
    `;

    tabEl.querySelector('.tab-name')?.addEventListener('click', () => onSwitch(tab.id));
    tabEl.querySelector('.tab-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      onClose(tab.id);
    });

    container.appendChild(tabEl);
  });
}

