/**
 * @file render.ts
 * @description Safe DOM rendering utilities for BPMN diagram title and workspace tab strip.
 * @module @atlas/bpmn-modeler/ui/render
 */

import { ensureElement } from "@atlas/shared";
import { DiagramTab } from "../types";

export function setDiagramName(element: HTMLElement | null, name: string) {
  const el = ensureElement(element, "diagram name element");
  const safeName = name && name.trim() ? name.trim() : "diagram.bpmn";
  el.textContent = safeName;
}

export function renderTabs(
  container: HTMLElement,
  tabs: DiagramTab[],
  activeTabId: string,
  onSwitch: (id: string) => void,
  onClose: (id: string) => void,
) {
  const nodes = tabs.map((tab) => {
    const tabEl = document.createElement("div");
    tabEl.className = `tab ${tab.id === activeTabId ? "tab--active" : ""}`;

    const nameSpan = document.createElement("span");
    nameSpan.className = "tab-name";
    nameSpan.textContent = `${tab.name}${tab.isDirty ? "*" : ""}`;
    nameSpan.addEventListener("click", () => onSwitch(tab.id));

    const closeBtn = document.createElement("button");
    closeBtn.className = "tab-close";
    closeBtn.type = "button";
    closeBtn.title = "Close";
    closeBtn.textContent = "\u00D7";
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      onClose(tab.id);
    });

    tabEl.append(nameSpan, closeBtn);
    return tabEl;
  });

  container.replaceChildren(...nodes);
}
