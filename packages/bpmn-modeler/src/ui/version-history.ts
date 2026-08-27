// import { getDiagramVersions, saveDiagramVersion } from '../services/firestoreService';
import { loadDiagramInNewTab } from "../state/tab-manager";
import { state } from "../state";
import { getDiagramXml } from "../services/xml-service";
import { on } from "@atlas/shared";
import { Toast } from "@atlas/ui";

let container: HTMLElement | null = null;
let currentDiagramId: string | null = null;

export function initVersionHistory() {
  container = document.createElement("div");
  container.className = "version-history-panel";
  container.innerHTML = `
    <div class="version-history-header">
      <h3>Historial de Versiones</h3>
      <button id="btn-save-version" class="btn btn-primary btn-sm">Guardar Versión</button>
    </div>
    <div class="version-history-list" id="version-list">
      <div class="empty-state">No hay versiones guardadas todavía.</div>
    </div>
  `;

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

  on(document.getElementById("btn-save-version")!, "click", async () => {
    if (!state.modeler || !state.activeTabId) return;
    const label = prompt("Introduce una etiqueta para esta versión:");
    if (label === null) return;

    const xml = await getDiagramXml(state.modeler);
    try {
      if (!currentDiagramId) {
        // Create new diagram
        const res = await fetch("/api/bpmn/diagrams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: label || "Untitled", xmlContent: xml }),
        });
        const data = await res.json();
        currentDiagramId = data.data.id;
      } else {
        // Save new version
        await fetch(`/api/bpmn/diagrams/${currentDiagramId}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ xmlContent: xml }),
        });
      }
      Toast.show("Versión guardada exitosamente (SQLite)", "success");
      await refreshVersions();
    } catch (e) {
      Toast.show("Error al guardar versión", "error");
    }
  });
}

export function toggleVersionHistory() {
  if (!container) return;
  if (container.style.display === "none") {
    container.style.display = "block";
    refreshVersions();
  } else {
    container.style.display = "none";
  }
}

export async function refreshVersions() {
  if (!state.activeTabId) return;
  // If no known diagram ID, we could map activeTabId, but for simplicity let's use global state or create a new one
  if (!currentDiagramId) {
    const listEl = document.getElementById("version-list");
    if (listEl)
      listEl.innerHTML =
        '<div class="empty-state">Guarda el diagrama primero para ver el historial.</div>';
    return;
  }
  const listEl = document.getElementById("version-list");
  if (!listEl) return;

  listEl.innerHTML = '<div class="loading">Cargando versiones...</div>';

  try {
    const res = await fetch(`/api/bpmn/diagrams/${currentDiagramId}/versions`);
    const data = await res.json();
    const versions = data.data || [];
    if (versions.length === 0) {
      listEl.innerHTML =
        '<div class="empty-state">No hay versiones guardadas todavía.</div>';
      return;
    }

    listEl.innerHTML = versions
      .map((v: any) => {
        const dateStr = v.createdAt
          ? new Date(v.createdAt).toLocaleString()
          : new Date().toLocaleString();
        return `
      <div class="version-item" style="padding: 10px; border-bottom: 1px solid var(--border); margin-bottom: 5px;">
        <div style="font-weight: 500;">${v.label || "Versión sin título"}</div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">${dateStr}</div>
        <button class="btn btn-secondary btn-sm restore-btn" data-id="${v.id}" style="margin-top: 5px;">Restaurar</button>
      </div>
    `;
      })
      .join("");

    listEl.querySelectorAll(".restore-btn").forEach((btn) => {
      on(btn as HTMLElement, "click", async (e: any) => {
        const id = (e.target as HTMLElement).getAttribute("data-id");
        const version = versions.find((v: any) => v.id === id);
        if (version) {
          if (
            confirm(
              "¿Estás seguro de que deseas restaurar esta versión? Los cambios actuales no guardados se perderán.",
            )
          ) {
            await loadDiagramInNewTab(
              state,
              version.xmlContent,
              `Versión ${version.versionNumber}.bpmn`,
            );
            toggleVersionHistory();
          }
        }
      });
    });
  } catch (e) {
    listEl.innerHTML =
      '<div class="error">Error al cargar las versiones (API SQLite).</div>';
  }
}
