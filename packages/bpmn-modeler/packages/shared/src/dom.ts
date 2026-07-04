/**
 * Common DOM and String Utilities
 */

export function qs<T extends HTMLElement>(selector: string, context: HTMLElement | Document = document): T | null {
  return context.querySelector(selector) as T | null;
}

export function qsa(selector: string, context: HTMLElement | Document = document): NodeListOf<HTMLElement> {
  return context.querySelectorAll(selector);
}

export function on<T extends Event>(
  element: HTMLElement | Window | Document | null,
  event: string,
  handler: (e: T) => void,
  options?: boolean | AddEventListenerOptions
): () => void {
  if (!element) return () => {};
  element.addEventListener(event, handler as EventListener, options);
  return () =>
    element.removeEventListener(event, handler as EventListener, options);
}

export function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number = 250) {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function throttle<T extends (...args: unknown[]) => void>(fn: T, delay: number = 250) {
  let waiting = false;
  return (...args: Parameters<T>) => {
    if (waiting) return;
    waiting = true;
    fn(...args);
    setTimeout(() => {
      waiting = false;
    }, delay);
  };
}

export function ensureExtension(fileName: string, ext: string = ".bpmn"): string {
  const safeName = safeTrim(fileName, `file${ext}`);
  return safeName.toLowerCase().endsWith(ext.toLowerCase()) ? safeName : `${safeName}${ext}`;
}

export function formatError(error: unknown, prefix = "Error"): string {
  const msg = error instanceof Error ? error.message : String(error);
  return `${prefix}: ${msg}`;
}

export function safeTrim(str: unknown, fallback: string): string {
  if (typeof str !== "string") return fallback;
  const trimmed = str.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function ensureElement<T extends HTMLElement>(element: T | null, name: string = "element"): T {
  if (!element) throw new Error(`No valid ${name} provided`);
  return element;
}

export function getFileNameFromPath(path: string, fallback: string = ""): string {
  if (!path || typeof path !== "string") return fallback;
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || fallback;
}

export function hexToRgbA(hex: string, alpha = 1): string {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex[1] + hex[2], 16);
    g = parseInt(hex[3] + hex[4], 16);
    b = parseInt(hex[5] + hex[6], 16);
  }
  return `rgba(${r},${g},${b},${alpha})`;
}
