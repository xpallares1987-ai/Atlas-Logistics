/**
 * @file version-history.ts
 * @description SQLite-backed BPMN diagram version history panel using safe DOM APIs.
 * @module @atlas/bpmn-modeler/ui/version-history
 */

import { loadDiagramInNewTab } from "../state/tab-manager";
import { state } from "../state";
import { getDiagramXml } from "../services/xml-service";
import { on } from "@atlas/shared";
import { Toast } from "@atlas/ui";

interface RemoteDiagramVersion {
  id: string;
  label?: string;
  createdAt?: string;
  xmlContent: string;
  versionNumber?: number;
}

let container: HTMLElement | null = null;
let currentDiagramId: string | null = null;

function createStatusNode(className: string, message: string): HTMLDivElement {
  const el = document.createElement("div");
  el.className = className;
  el.textContent = message;
  return el;
}

export function initVersionHistory() {
  container = document.createElement("div");
  container.className = "version-history-panel";

  const header = document.createElement("div");
  header.className = "version-history-header";

  const heading = document.createElement("h3");
  heading.textContent = "Version History";

  const saveBtn = document.createElement("button");
  saveBtn.id = "btn-save-version";
  saveBtn.type = "button";
  saveBtn.className = "btn btn-primary btn-sm";
  saveBtn.textContent = "Save Version";

  header.append(heading, saveBtn);

  const listEl = document.createElement("div");
  listEl.className = "version-history-list";
  listEl.id = "version-list";
  listEl.appendChild(createStatusNode("empty-state", "No saved versions yet."));

  container.append(header, listEl);

  container.style.display = "none";
  container.style.position = "absolute";
  container.style.right = "0";
  container.style.top = "50px";
  container.style.width = "300px";
  container.style.bottom = "0";
  container.style.backgroundColor = "var(--surface)";
  container.style.borderLeft = "1px solid var(--border)";
  container.style.zIndex = "100";
  container.style.padding = "1rem";
  container.style.overflowY = "auto";
  container.style.boxShadow = "-2px 0 5px rgba(0,0,0,0.1)";

  document.body.appendChild(container);

  on(saveBtn, "click", async () => {
    if (!state.modeler || !state.activeTabId) return;
    const label = prompt("Enter a label for this version:");
    if (label === null) return;

    const xml = await getDiagramXml(state.modeler);
    try {
      if (!currentDiagramId) {
        const res = await fetch("/api/bpmn/diagrams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: label || "Untitled", xmlContent: xml }),
        });
        const data = (await res.json()) as { data: { id: string } };
        currentDiagramId = data.data.id;
      } else {
        await fetch(`/api/bpmn/diagrams/${currentDiagramId}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ xmlContent: xml }),
        });
      }
      Toast.show("Version saved successfully (SQLite)", "success");
      await refreshVersions();
    } catch {
      Toast.show("Failed to save version", "error");
    }
  });
}

export function toggleVersionHistory() {
  if (!container) return;
  if (container.style.display === "none") {
    container.style.display = "block";
    void refreshVersions();
  } else {
    container.style.display = "none";
  }
}

export async function refreshVersions() {
  if (!state.activeTabId) return;

  const listEl = document.getElementById("version-list");
  if (!listEl) return;

  if (!currentDiagramId) {
    listEl.replaceChildren(
      createStatusNode(
        "empty-state",
        "Save the diagram first to view version history.",
      ),
    );
    return;
  }

  listEl.replaceChildren(createStatusNode("loading", "Loading versions..."));

  try {
    const res = await fetch(`/api/bpmn/diagrams/${currentDiagramId}/versions`);
    const data = (await res.json()) as { data?: RemoteDiagramVersion[] };
    const versions = data.data || [];

    if (versions.length === 0) {
      listEl.replaceChildren(
        createStatusNode("empty-state", "No saved versions yet."),
      );
      return;
    }

    const versionNodes = versions.map((v) => {
      const dateStr = v.createdAt
        ? new Date(v.createdAt).toLocaleString()
        : new Date().toLocaleString();

      const item = document.createElement("div");
      item.className = "version-item";
      item.style.padding = "10px";
      item.style.borderBottom = "1px solid var(--border)";
      item.style.marginBottom = "5px";

      const titleEl = document.createElement("div");
      titleEl.style.fontWeight = "500";
      titleEl.textContent = v.label || "Untitled Version";

      const dateEl = document.createElement("div");
      dateEl.style.fontSize = "0.8rem";
      dateEl.style.color = "var(--text-muted)";
      dateEl.textContent = dateStr;

      const restoreBtn = document.createElement("button");
      restoreBtn.type = "button";
      restoreBtn.className = "btn btn-secondary btn-sm restore-btn";
      restoreBtn.setAttribute("data-id", v.id);
      restoreBtn.style.marginTop = "5px";
      restoreBtn.textContent = "Restore";

      on(restoreBtn, "click", async () => {
        if (
          confirm(
            "Are you sure you want to restore this version? Unsaved current changes will be lost.",
          )
        ) {
          await loadDiagramInNewTab(
            state,
            v.xmlContent,
            `Version ${v.versionNumber ?? v.id}.bpmn`,
          );
          toggleVersionHistory();
        }
      });

      item.append(titleEl, dateEl, restoreBtn);
      return item;
    });

    listEl.replaceChildren(...versionNodes);
  } catch {
    listEl.replaceChildren(
      createStatusNode("error", "Failed to load versions (SQLite API)."),
    );
  }
}
