import {
  calculateProcessAnalytics,
  importDiagram,
} from "../services/modeler-service";
import { safeGetMetadata, validateProperty } from "../schemas/metadata";
import type { AppState } from "../state";
import { Toast } from "@atlas/ui";
import { escapeHTML } from "@atlas/shared";

export function initLogisticsSidebar(state: AppState) {
  const sidebar = document.getElementById("propertiesSidebar");
  const propertiesContainer = document.getElementById("properties");
  if (!sidebar || !propertiesContainer) return;

  const header = sidebar.querySelector(".sidebar__header");
  if (header) {
    header.innerHTML = "";
    const titleContainer = document.createElement("div");
    titleContainer.className = "sidebar-tabs";
    titleContainer.innerHTML = `
      <button id="tabCamunda" class="sidebar-tab sidebar-tab--active" type="button">Propiedades</button>
      <button id="tabLogistics" class="sidebar-tab" type="button">Simulador</button>
      <button id="tabHistory" class="sidebar-tab" type="button">Historial</button>
      <button id="tabXml" class="sidebar-tab" type="button">XML Live</button>
    `;
    header.appendChild(titleContainer);
  }

  const logisticsPanel = document.createElement("div");
  logisticsPanel.id = "logisticsPanel";
  logisticsPanel.className = "sidebar-panel hidden";

  const historyPanel = document.createElement("div");
  historyPanel.id = "historyPanel";
  historyPanel.className = "sidebar-panel hidden";

  const xmlPanel = document.createElement("div");
  xmlPanel.id = "xmlPanel";
  xmlPanel.className = "sidebar-panel hidden";

  propertiesContainer.parentNode?.appendChild(logisticsPanel);
  propertiesContainer.parentNode?.appendChild(historyPanel);
  propertiesContainer.parentNode?.appendChild(xmlPanel);

  propertiesContainer.classList.add("sidebar-panel");

  const tabCamunda = document.getElementById("tabCamunda");
  const tabLogistics = document.getElementById("tabLogistics");
  const tabHistory = document.getElementById("tabHistory");
  const tabXml = document.getElementById("tabXml");

  function switchTab(activeTab: HTMLElement, panelToShow: HTMLElement) {
    [tabCamunda, tabLogistics, tabHistory, tabXml].forEach((t) =>
      t?.classList.remove("sidebar-tab--active"),
    );
    [propertiesContainer, logisticsPanel, historyPanel, xmlPanel].forEach((p) =>
      p?.classList.add("hidden"),
    );

    activeTab.classList.add("sidebar-tab--active");
    panelToShow.classList.remove("hidden");
  }

  tabCamunda?.addEventListener("click", () =>
    switchTab(tabCamunda, propertiesContainer),
  );
  tabLogistics?.addEventListener("click", () => {
    switchTab(tabLogistics, logisticsPanel);
    renderLogisticsPanel(state, logisticsPanel);
  });
  tabHistory?.addEventListener("click", () => {
    switchTab(tabHistory, historyPanel);
    renderHistoryPanel(state, historyPanel);
  });
  tabXml?.addEventListener("click", () => {
    switchTab(tabXml, xmlPanel);
    renderXmlPanel(state, xmlPanel);
  });

  if (state.modeler) {
    state.modeler.on("selection.changed", () => {
      if (!logisticsPanel.classList.contains("hidden"))
        renderLogisticsPanel(state, logisticsPanel);
    });

    state.modeler.on("commandStack.changed", () => {
      if (!logisticsPanel.classList.contains("hidden"))
        renderLogisticsPanel(state, logisticsPanel);
      if (!xmlPanel.classList.contains("hidden"))
        renderXmlPanel(state, xmlPanel);
    });
  }
}

interface BpmnElement {
  id: string;
  type: string;
  businessObject: {
    $instanceOf: (type: string) => boolean;
    $type: string;
    name?: string;
    get?: (key: string) => string | undefined;
    [key: string]: unknown;
  };
}

function renderLogisticsPanel(state: AppState, container: HTMLElement) {
  const modeler = state.modeler;
  const analytics = calculateProcessAnalytics(modeler);

  let selectedElement: BpmnElement | null = null;
  if (modeler) {
    const selection = modeler.get("selection") as { get: () => BpmnElement[] };
    selectedElement = selection?.get()?.[0] || null;
  }

  const isTask =
    selectedElement &&
    (selectedElement.businessObject?.$instanceOf?.("bpmn:Task") ||
      selectedElement.businessObject?.$type?.includes?.("Task"));
  const isSequenceFlow =
    selectedElement &&
    (selectedElement.businessObject?.$instanceOf?.("bpmn:SequenceFlow") ||
      selectedElement.businessObject?.$type?.includes?.("SequenceFlow"));

  let elementMetadataHtml = "";

  if (isTask && selectedElement) {
    const bo = selectedElement.businessObject;
    const metadata = safeGetMetadata(bo);

    elementMetadataHtml = `
      <div class="panel-section">
        <h3 class="panel-section__title">Metadatos Logísticos</h3>
        <div class="form-group">
          <label>Elemento Seleccionado</label>
          <div class="selected-badge">${escapeHTML(bo.name || selectedElement.id)} (${escapeHTML(selectedElement.type.replace("bpmn:", ""))})</div>
        </div>
        <div class="form-group">
          <label for="sysCost">Costo Operativo por Hora ($)</label>
          <input type="number" id="sysCost" class="input" placeholder="Ej. 150" value="${metadata.costHR !== undefined ? escapeHTML(String(metadata.costHR)) : ""}" />
        </div>
        <div class="form-group">
          <label for="sysStatus">Estado Operativo</label>
          <select id="sysStatus" class="input">
            <option value="" ${!metadata.status ? "selected" : ""}>Sin asignar</option>
            <option value="Listo" ${metadata.status === "Listo" ? "selected" : ""}>Listo</option>
            <option value="Retrasado" ${metadata.status === "Retrasado" ? "selected" : ""}>Retrasado</option>
            <option value="Bloqueado" ${metadata.status === "Bloqueado" ? "selected" : ""}>Bloqueado</option>
          </select>
        </div>
        <div class="form-group">
          <label for="sysForm">Clave de Formulario (UI)</label>
          <input type="text" id="sysForm" class="input" placeholder="form-id-123" value="${escapeHTML(metadata.formKey || "")}" />
        </div>
        <div class="form-group">
          <label for="sysDecision">ID de Decisión (DMN)</label>
          <input type="text" id="sysDecision" class="input" placeholder="decision-table-id" value="${escapeHTML(metadata.decisionRef || "")}" />
        </div>
      </div>
    `;
  } else if (isSequenceFlow && selectedElement) {
    const bo = selectedElement.businessObject;
    let existingCondition = "";
    if (bo.conditionExpression && (bo.conditionExpression as any).body) {
      existingCondition = escapeHTML((bo.conditionExpression as any).body);
    }

    elementMetadataHtml = `
      <div class="panel-section">
        <h3 class="panel-section__title">Enrutamiento Inteligente (Atlas Engine)</h3>
        <p class="section-desc">Configura reglas de decisión basadas en los datos del Shipment.</p>
        <div class="form-group">
          <label>Elemento Seleccionado</label>
          <div class="selected-badge">${escapeHTML(bo.name || selectedElement.id)} (SequenceFlow)</div>
        </div>
        <div class="form-group">
          <label for="condIncoterm">Incoterm</label>
          <select id="condIncoterm" class="input">
             <option value="">Cualquiera</option>
             <option value="EXW">EXW (Ex Works)</option>
             <option value="FOB">FOB (Free On Board)</option>
             <option value="CIF">CIF</option>
             <option value="DAP">DAP</option>
             <option value="DDP">DDP</option>
          </select>
        </div>
        <div class="form-group">
          <label for="condMovement">Tipo de Carga</label>
          <select id="condMovement" class="input">
             <option value="">Cualquiera</option>
             <option value="FCL">FCL (Contenedor Completo)</option>
             <option value="LCL">LCL (Grupaje)</option>
             <option value="AIR">AIR (Aéreo)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Expresión FEEL Resultante</label>
          <input type="text" id="zeebeCondition" class="input" readonly placeholder="=" value="${escapeHTML(existingCondition)}" />
        </div>
        <button id="btnApplyCondition" class="btn btn--primary btn--full-width" type="button" style="margin-top: 8px;">
          Aplicar Regla al Flujo
        </button>
      </div>
    `;
  } else {
    elementMetadataHtml = `
      <div class="no-selection-alert">
        <div class="no-selection-alert__icon">ℹ️</div>
        <div>Selecciona una <b>Tarea (Task)</b> o una <b>Flecha (SequenceFlow)</b> en el lienzo para configurar sus opciones.</div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="sidebar-scrollable">
      <div class="panel-section">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 class="panel-section__title" style="margin-bottom: 0;">Simulador & KPI</h3>
          <button id="btnGenerateSOP" class="btn btn--transparent" style="padding: 4px 8px; font-size: 10px; font-weight: 700;">GENERAR SOP (MD)</button>
        </div>
        <div class="kpi-dashboard">
          <div class="kpi-card kpi-card--primary">
            <div class="kpi-card__val">$${analytics.totalCost.toLocaleString()}</div>
            <div class="kpi-card__label">Costo Proyectado</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__val">${analytics.totalTasks}</div>
            <div class="kpi-card__label">Tareas</div>
          </div>
        </div>
        <div class="kpi-dashboard">
          <div class="kpi-card ${analytics.delayedTasksCount > 0 ? "kpi-card--warning" : ""}">
            <div class="kpi-card__val">${analytics.delayedTasksCount}</div>
            <div class="kpi-card__label">Retrasadas</div>
          </div>
          <div class="kpi-card ${analytics.blockedTasksCount > 0 ? "kpi-card--danger" : ""}">
            <div class="kpi-card__val">${analytics.blockedTasksCount}</div>
            <div class="kpi-card__label">Bloqueadas</div>
          </div>
        </div>
      </div>
      ${elementMetadataHtml}
      ${
        analytics.bottlenecks.length > 0
          ? `
        <div class="panel-section">
          <h3 class="panel-section__title panel-section__title--danger">Cuellos de Botella Detectados</h3>
          <div class="bottlenecks-list">
            ${analytics.bottlenecks
              .map(
                (b) => `
              <div class="bottleneck-item bottleneck-item--${escapeHTML(b.status === "Bloqueado" ? "blocked" : "delayed")}" data-element-id="${escapeHTML(b.id)}">
                <div class="bottleneck-item__header">
                  <span class="bottleneck-item__status-badge">${escapeHTML(b.status)}</span>
                  <span class="bottleneck-item__id">${escapeHTML(b.id)}</span>
                </div>
                <div class="bottleneck-item__name">${escapeHTML(b.name)}</div>
                <div class="bottleneck-item__cost">Costo: $${escapeHTML(String(b.cost))}/hr</div>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      `
          : ""
      }
    </div>
  `;

  if (isTask && modeler) {
    const sysCost = document.getElementById("sysCost") as HTMLInputElement;
    const sysStatus = document.getElementById("sysStatus") as HTMLSelectElement;
    const sysForm = document.getElementById("sysForm") as HTMLInputElement;
    const sysDecision = document.getElementById(
      "sysDecision",
    ) as HTMLInputElement;

    const updateProp = (key: string, value: string) => {
      try {
        const modeling = modeler.get("modeling") as {
          updateProperties: (
            el: BpmnElement,
            props: Record<string, unknown>,
          ) => void;
        };
        if (selectedElement) {
          try {
            const validatedValue = validateProperty(key, value);
            modeling.updateProperties(selectedElement, {
              [key]: validatedValue,
            });
          } catch (err: any) {
            Toast.show(err.message || "Valor no válido", "error");
          }
        }
      } catch {}
    };

    sysCost?.addEventListener("input", () =>
      updateProp("sys:costHR", sysCost.value),
    );
    sysStatus?.addEventListener("change", () =>
      updateProp("sys:status", sysStatus.value),
    );
    sysForm?.addEventListener("input", () =>
      updateProp("sys:formKey", sysForm.value),
    );
    sysDecision?.addEventListener("input", () =>
      updateProp("sys:decisionRef", sysDecision.value),
    );

    // Connectors removed
  } else if (isSequenceFlow && modeler) {
    const condIncoterm = document.getElementById(
      "condIncoterm",
    ) as HTMLSelectElement;
    const condMovement = document.getElementById(
      "condMovement",
    ) as HTMLSelectElement;
    const zeebeCondition = document.getElementById(
      "zeebeCondition",
    ) as HTMLInputElement;
    const btnApplyCondition = document.getElementById("btnApplyCondition");

    const updateConditionPreview = () => {
      const conditions = [];
      if (condIncoterm.value)
        conditions.push(`incoterm = "${condIncoterm.value}"`);
      if (condMovement.value)
        conditions.push(`movementType = "${condMovement.value}"`);
      zeebeCondition.value =
        conditions.length > 0 ? "=" + conditions.join(" and ") : "";
    };

    condIncoterm?.addEventListener("change", updateConditionPreview);
    condMovement?.addEventListener("change", updateConditionPreview);

    btnApplyCondition?.addEventListener("click", () => {
      if (!selectedElement) return;
      try {
        const modeling = modeler.get("modeling") as any;
        const moddle = modeler.get("moddle") as any;

        let conditionObj = undefined;
        if (zeebeCondition.value) {
          conditionObj = moddle.create("bpmn:FormalExpression", {
            body: zeebeCondition.value,
          });
        }

        modeling.updateProperties(selectedElement, {
          conditionExpression: conditionObj,
        });
        Toast.show("Regla de enrutamiento FEEL aplicada", "success");
      } catch (err) {
        Toast.show("Error al aplicar la regla", "error");
      }
    });
  }

  const btnSOP = document.getElementById("btnGenerateSOP");
  if (btnSOP && state.modeler) {
    btnSOP.addEventListener("click", async () => {
      const { generateSOP } = await import("../services/sop-service");
      const sop = await generateSOP(state.modeler!);
      const blob = new Blob([sop], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SOP_${Date.now()}.md`;
      a.click();
      Toast.show("SOP generado con éxito (Markdown)", "success");
    });
  }

  container.querySelectorAll(".bottleneck-item").forEach((item) => {
    item.addEventListener("click", () => {
      const elementId = item.getAttribute("data-element-id")!;
      const elementRegistry = modeler?.get("elementRegistry") as
        { get: (id: string) => BpmnElement } | undefined;
      const element = elementRegistry?.get(elementId);
      if (modeler && element) {
        const selection = modeler.get("selection") as {
          select: (el: BpmnElement) => void;
        };
        const canvas = modeler.get("canvas") as {
          zoom: (level: number, el: BpmnElement) => void;
        };
        selection.select(element);
        canvas.zoom(1.2, element);
        Toast.show(
          `Visualizando tarea: ${element.businessObject.name || elementId}`,
          "info",
        );
      }
    });
  });
}

async function renderHistoryPanel(state: AppState, container: HTMLElement) {
  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
  if (!activeTab) {
    container.innerHTML = `<div class="no-selection-alert">No hay una pestaña activa para rastrear historial.</div>`;
    return;
  }

  const { historyService } = await import("../services/history-service");
  const versions = await historyService.getVersions(activeTab.id);

  container.innerHTML = "";

  const scrollable = document.createElement("div");
  scrollable.className = "sidebar-scrollable";

  const panelSection = document.createElement("div");
  panelSection.className = "panel-section";

  const title = document.createElement("h3");
  title.className = "panel-section__title";
  title.textContent = "Historial de Versiones";

  const desc = document.createElement("p");
  desc.className = "section-desc";
  desc.textContent =
    "Crea puntos de restauración (commits) locales para esta pestaña.";

  const formGroup = document.createElement("div");
  formGroup.className = "form-group";

  const inputCommit = document.createElement("input");
  inputCommit.type = "text";
  inputCommit.id = "historyCommitMsg";
  inputCommit.className = "input";
  inputCommit.placeholder = "Mensaje de versión...";
  formGroup.appendChild(inputCommit);

  const btnSave = document.createElement("button");
  btnSave.id = "btnSaveHistoryVersion";
  btnSave.className = "btn btn--primary btn--full-width";
  btnSave.type = "button";
  btnSave.style.marginTop = "8px";
  btnSave.textContent = "Guardar Punto de Control";

  panelSection.appendChild(title);
  panelSection.appendChild(desc);
  panelSection.appendChild(formGroup);
  panelSection.appendChild(btnSave);
  scrollable.appendChild(panelSection);

  const timelineSection = document.createElement("div");
  timelineSection.className = "panel-section";

  const timelineTitle = document.createElement("h3");
  timelineTitle.className = "panel-section__title";
  timelineTitle.textContent = "Línea de Tiempo";
  timelineSection.appendChild(timelineTitle);

  if (versions.length === 0) {
    const emptyMsg = document.createElement("div");
    emptyMsg.className = "no-versions-msg";
    emptyMsg.textContent =
      "Sin versiones guardadas todavía. Crea un punto de control arriba.";
    timelineSection.appendChild(emptyMsg);
  } else {
    const timeline = document.createElement("div");
    timeline.className = "history-timeline";

    for (const v of versions) {
      const item = document.createElement("div");
      item.className = "history-timeline__item";

      const point = document.createElement("div");
      point.className = "history-timeline__point";

      const content = document.createElement("div");
      content.className = "history-timeline__content";

      const header = document.createElement("div");
      header.className = "history-timeline__header";

      const dateSpan = document.createElement("span");
      dateSpan.className = "history-timeline__date";
      dateSpan.textContent = new Date(v.timestamp).toLocaleString();
      header.appendChild(dateSpan);

      const label = document.createElement("div");
      label.className = "history-timeline__label";
      label.textContent = v.label; // Secure: textContent never executes as HTML or scripts

      const actions = document.createElement("div");
      actions.className = "history-timeline__actions";
      actions.style.marginTop = "8px";

      const btnRestore = document.createElement("button");
      btnRestore.className = "btn btn-restore btn--transparent";
      btnRestore.type = "button";
      btnRestore.style.cssText = "padding: 2px 6px; font-size:11px;";
      btnRestore.textContent = "Restaurar";
      btnRestore.setAttribute("data-version-id", v.id);

      btnRestore.addEventListener("click", async () => {
        if (
          !confirm(
            "¿Estás seguro de restaurar este punto de restauración? Los cambios no guardados se perderán.",
          )
        )
          return;

        const tabVersions = await historyService.getVersions(activeTab.id);
        const version = tabVersions.find((ver) => ver.id === v.id);
        if (version && state.modeler) {
          try {
            await importDiagram(state.modeler, version.xml);
            activeTab.xml = version.xml;
            activeTab.isDirty = true;
            Toast.show("Punto de control restaurado correctamente", "success");
            renderHistoryPanel(state, container);
          } catch {
            Toast.show("Error al restaurar punto de control", "error");
          }
        }
      });

      const btnDelete = document.createElement("button");
      btnDelete.className = "btn btn-delete btn--transparent";
      btnDelete.type = "button";
      btnDelete.style.cssText =
        "padding: 2px 6px; font-size:11px; color: var(--danger);";
      btnDelete.textContent = "Eliminar";
      btnDelete.setAttribute("data-version-id", v.id);

      btnDelete.addEventListener("click", async () => {
        if (await historyService.deleteVersion(activeTab.id, v.id)) {
          Toast.show("Punto de control eliminado", "success");
          renderHistoryPanel(state, container);
        }
      });

      actions.appendChild(btnRestore);
      actions.appendChild(btnDelete);

      content.appendChild(header);
      content.appendChild(label);
      content.appendChild(actions);

      item.appendChild(point);
      item.appendChild(content);
      timeline.appendChild(item);
    }

    timelineSection.appendChild(timeline);
  }

  scrollable.appendChild(timelineSection);
  container.appendChild(scrollable);

  btnSave.addEventListener("click", async () => {
    const commitLabel =
      inputCommit.value.trim() ||
      `Punto de Control - ${new Date().toLocaleTimeString()}`;
    if (!state.modeler) return;

    try {
      const xml = await state.modeler.saveXML({ format: true });
      if (xml && xml.xml) {
        await historyService.saveVersion(activeTab.id, commitLabel, xml.xml);
        Toast.show("Punto de control guardado con éxito", "success");
        inputCommit.value = "";
        renderHistoryPanel(state, container);
      }
    } catch {
      Toast.show("Error al guardar punto de control", "error");
    }
  });
}

export function refreshLogisticsPanel(state: AppState) {
  const panel = document.getElementById("logisticsPanel");
  if (panel) renderLogisticsPanel(state, panel);
}

export function refreshHistoryPanel(state: AppState) {
  const panel = document.getElementById("historyPanel");
  if (panel) renderHistoryPanel(state, panel);
}

async function renderXmlPanel(state: AppState, container: HTMLElement) {
  if (!state.modeler) return;
  try {
    const { xml } = await state.modeler.saveXML({ format: true });
    if (!xml) throw new Error("XML is empty");

    const escapedXml = xml
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    container.innerHTML = `
      <div class="sidebar-scrollable">
        <div class="panel-section" style="height: 100%; display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h3 class="panel-section__title" style="margin-bottom: 0;">Código XML (Live)</h3>
            <button id="btnCopyLiveXml" class="btn btn--transparent" style="padding: 2px 8px; font-size: 11px;">Copiar</button>
          </div>
          <p class="section-desc">El código se actualiza automáticamente con cada cambio en el lienzo.</p>
          <pre style="flex: 1; background: var(--bg-surface); padding: 8px; border-radius: 4px; overflow: auto; font-size: 11px; border: 1px solid var(--border-color); white-space: pre-wrap; word-break: break-all; margin-top: 8px;"><code>${escapedXml}</code></pre>
        </div>
      </div>
    `;

    const btnCopy = document.getElementById("btnCopyLiveXml");
    btnCopy?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(xml);
        Toast.show("XML copiado al portapapeles", "success");
      } catch {
        Toast.show("No se pudo copiar el XML", "error");
      }
    });
  } catch {
    container.innerHTML = `<div class="no-selection-alert">No se pudo cargar el XML en este momento.</div>`;
  }
}
