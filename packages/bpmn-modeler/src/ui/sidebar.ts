import { ensureElement, qs } from '@atlas/ui';

export interface Sidebar {
  toggle: () => void;
  setOpen: (value: boolean) => void;
  isOpen: () => boolean;
  destroy: () => void;
}

export function createSidebar({
  sidebarElement,
  toggleButton = null,
  initialOpen = true,
  onChange = () => {},
}: {
  sidebarElement: HTMLElement | string;
  toggleButton?: HTMLElement | string | null;
  initialOpen?: boolean;
  onChange?: (isOpen: boolean) => void;
}): Sidebar {
  const sidebar =
    typeof sidebarElement === 'string'
      ? ensureElement(qs(sidebarElement), 'panel lateral')
      : ensureElement(sidebarElement, 'panel lateral');

  const button = typeof toggleButton === 'string' ? qs<HTMLElement>(toggleButton) : toggleButton;

  let isOpen = Boolean(initialOpen);

  function render() {
    if (isOpen) {
      sidebar.classList.remove('sidebar--hidden');
      sidebar.setAttribute('aria-hidden', 'false');
    } else {
      sidebar.classList.add('sidebar--hidden');
      sidebar.setAttribute('aria-hidden', 'true');
    }
    if (button) {
      button.setAttribute('aria-expanded', String(isOpen));
      button.textContent = isOpen ? 'Ocultar' : 'Propiedades';
    }
  }

  function setOpen(value: boolean) {
    isOpen = value;
    render();
    onChange(isOpen);
  }

  render();

  return {
    toggle: () => setOpen(!isOpen),
    setOpen,
    isOpen: () => isOpen,
    destroy: () => {
      if (button) ['aria-expanded'].forEach((attr) => button.removeAttribute(attr));
    },
  };
}

