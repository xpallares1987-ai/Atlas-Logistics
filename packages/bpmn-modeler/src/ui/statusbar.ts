import { ensureElement } from '@atlas/ui';

export interface Statusbar {
  setStatus: (message: string, state?: string) => void;
  setSelection: (msg: string) => void;
  setError: (msg: string) => void;
  setSuccess: (msg: string) => void;
  setWarning: (msg: string) => void;
  reset: (status?: string, selection?: string) => void;
}

export function createStatusbar({
  statusElement,
  selectionElement,
}: {
  statusElement: HTMLElement;
  selectionElement: HTMLElement;
}): Statusbar {
  const statusEl = ensureElement(statusElement, 'elemento de estado');
  const selectionEl = ensureElement(selectionElement, 'elemento de selección');

  function setStatus(message: string, state: string = '') {
    statusEl.textContent = message;
    statusEl.className = `statusbar__status ${state ? `is-${state}` : ''}`;
  }

  return {
    setStatus,
    setSelection: (msg: string) => {
      selectionEl.textContent = msg;
    },
    setError: (msg: string) => setStatus(msg, 'error'),
    setSuccess: (msg: string) => setStatus(msg, 'success'),
    setWarning: (msg: string) => setStatus(msg, 'warning'),
    reset: (status = 'Listo', selection = 'Sin selección') => {
      setStatus(status);
      selectionEl.textContent = selection;
    },
  };
}

