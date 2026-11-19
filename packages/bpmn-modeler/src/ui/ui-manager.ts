/**
 * @file ui-manager.ts
 * @description UI element registry and theme toggle icon renderer using safe SVG DOM creation.
 * @module @atlas/bpmn-modeler/ui/ui-manager
 */

import { qs } from "@atlas/shared";
import { Toast } from "@atlas/ui";
import type { AppUi } from "../types";
import { AppState, updateTheme } from "../state";

const SVG_NS = "http://www.w3.org/2000/svg";
const MOON_PATH =
  "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z";
const SUN_PATH =
  "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z";

let ui: AppUi;
let state: AppState;

function createThemeSvg(pathData: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "18");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("viewBox", "0 0 24 24");

  const pathEl = document.createElementNS(SVG_NS, "path");
  pathEl.setAttribute("stroke-linecap", "round");
  pathEl.setAttribute("stroke-linejoin", "round");
  pathEl.setAttribute("d", pathData);

  svg.appendChild(pathEl);
  return svg;
}

export function resolveUi(selectors: Record<string, string>): AppUi {
  return Object.entries(selectors).reduce((acc, [key, selector]) => {
    const element = qs(selector);
    if (!element) {
      throw new Error(`Required UI element not found: ${selector}`);
    }
    (acc as unknown as Record<string, HTMLElement>)[key] = element;
    return acc;
  }, {} as AppUi);
}

export function updateThemeIcon() {
  const btn = ui.btnTheme;
  if (btn) {
    const iconSvg = createThemeSvg(
      state.theme === "light" ? MOON_PATH : SUN_PATH,
    );
    btn.replaceChildren(iconSvg);
  }
}

export function handleToggleTheme() {
  const newTheme = state.theme === "light" ? "dark" : "light";
  updateTheme(newTheme);
  updateThemeIcon();
  Toast.show(`Theme: ${state.theme}`, "info");
}

export function initUiManager(dependencies: { ui: AppUi; state: AppState }) {
  ui = dependencies.ui;
  state = dependencies.state;
}
