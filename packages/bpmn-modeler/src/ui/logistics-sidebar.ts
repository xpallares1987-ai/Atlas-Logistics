/**
 * @file logistics-sidebar.ts
 * @description Logistics simulator, metadata inspector, local version history, and live XML sidebar
 *              constructed exclusively via safe programmatic DOM APIs.
 * @module @atlas/bpmn-modeler/ui/logistics-sidebar
 */

import {
  calculateProcessAnalytics,
  importDiagram,
} from "../services/modeler-service";
import { safeGetMetadata, validateProperty } from "../schemas/metadata";
import type { AppState } from "../state";
import { Toast } from "@atlas/ui";

// ============================================================================
// 1. TYPES
// ============================================================================

interface ConditionExpressionLike {
  body?: string;
}

interface BpmnElement {
  id: string;
  type: string;
  businessObject: {
    $instanceOf: (type: string) => boolean;
    $type: string;
    name?: string;
    conditionExpression?: ConditionExpressionLike;
    get?: (key: string) => string | undefined;
    [key: string]: unknown;
  };
}

interface ModelingService {
  updateProperties: (el: BpmnElement, props: Record<string, unknown>) => void;
}

interface ModdleService {
  create: (type: string, attrs: Record<string, unknown>) => unknown;
}

// ============================================================================
// 2. DOM HELPER BUILDERS
// ============================================================================

function createTabButton(
  id: string,
  label: string,
  active = false,
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.id = id;
  btn.className = active ? "sidebar-tab sidebar-tab--active" : "sidebar-tab";
  btn.type = "button";
  btn.textContent = label;
  return btn;
}

function createAlertBox(message: string): HTMLDivElement {
  const alert = document.createElement("div");
  alert.className = "no-selection-alert";
  alert.textContent = message;
  return alert;
}

function createKpiCard(
  valueText: string,
  labelText: string,
  modifierClass = "",
): HTMLDivElement {
  const card = document.createElement("div");
  card.className = modifierClass ? `kpi-card ${modifierClass}` : "kpi-card";

  const val = document.createElement("div");
  val.className = "kpi-card__val";
  val.textContent = valueText;

  const lbl = document.createElement("div");
  lbl.className = "kpi-card__label";
  lbl.textContent = labelText;

  card.append(val, lbl);
  return card;
}

function createSelectOption(
  value: string,
  label: string,
  selected = false,
): HTMLOptionElement {
  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = label;
  opt.selected = selected;
  return opt;
}

function createLabeledInputGroup(
  labelText: string,
  inputId: string,
  type: "text" | "number",
  placeholder: string,
  value: string,
  readOnly = false,
): { group: HTMLDivElement; input: HTMLInputElement } {
  const group = document.createElement("div");
  group.className = "form-group";

  const label = document.createElement("label");
  label.htmlFor = inputId;
  label.textContent = labelText;

  const input = document.createElement("input");
  input.type = type;
  input.id = inputId;
  input.className = "input";
  input.placeholder = placeholder;
  input.value = value;
  input.readOnly = readOnly;

  group.append(label, input);
  return { group, input };
}

function createLabeledSelectGroup(
  labelText: string,
  selectId: string,
  options: Array<{ value: string; label: string; selected?: boolean }>,
): { group: HTMLDivElement; select: HTMLSelectElement } {
  const group = document.createElement("div");
  group.className = "form-group";

  const label = document.createElement("label");
  label.htmlFor = selectId;
  label.textContent = labelText;

  const select = document.createElement("select");
  select.id = selectId;
  select.className = "input";
  for (const item of options) {
    select.appendChild(
      createSelectOption(item.value, item.label, Boolean(item.selected)),
    );
  }

  group.append(label, select);
  return { group, select };
}

// ============================================================================
// 3. SIDEBAR INITIALIZATION
// ============================================================================

export function initLogisticsSidebar(state: AppState) {
  const sidebar = document.getElementById("propertiesSidebar");
  const propertiesContainer = document.getElementById("properties");
  if (!sidebar || !propertiesContainer) return;

  const tabCamunda = createTabButton("tabCamunda", "Properties", true);
  const tabLogistics = createTabButton("tabLogistics", "Simulator");
  const tabHistory = createTabButton("tabHistory", "History");
  const tabXml = createTabButton("tabXml", "XML Live");

  const header = sidebar.querySelector(".sidebar__header");
  if (header) {
    const titleContainer = document.createElement("div");
    titleContainer.className = "sidebar-tabs";
    titleContainer.append(tabCamunda, tabLogistics, tabHistory, tabXml);
    header.replaceChildren(titleContainer);
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

  propertiesContainer.parentNode?.append(
    logisticsPanel,
    historyPanel,
    xmlPanel,
  );
  propertiesContainer.classList.add("sidebar-panel");

  function switchTab(activeTab: HTMLElement, panelToShow: HTMLElement) {
    [tabCamunda, tabLogistics, tabHistory, tabXml].forEach((t) =>
      t.classList.remove("sidebar-tab--active"),
    );
    [propertiesContainer, logisticsPanel, historyPanel, xmlPanel].forEach((p) =>
      p?.classList.add("hidden"),
    );

    activeTab.classList.add("sidebar-tab--active");
    panelToShow.classList.remove("hidden");
  }

  tabCamunda.addEventListener("click", () =>
    switchTab(tabCamunda, propertiesContainer),
  );
  tabLogistics.addEventListener("click", () => {
    switchTab(tabLogistics, logisticsPanel);
    renderLogisticsPanel(state, logisticsPanel);
  });
  tabHistory.addEventListener("click", () => {
    switchTab(tabHistory, historyPanel);
    void renderHistoryPanel(state, historyPanel);
  });
  tabXml.addEventListener("click", () => {
    switchTab(tabXml, xmlPanel);
    void renderXmlPanel(state, xmlPanel);
  });

  if (state.modeler) {
    state.modeler.on("selection.changed", () => {
      if (!logisticsPanel.classList.contains("hidden")) {
        renderLogisticsPanel(state, logisticsPanel);
      }
    });

    state.modeler.on("commandStack.changed", () => {
      if (!logisticsPanel.classList.contains("hidden")) {
        renderLogisticsPanel(state, logisticsPanel);
      }
      if (!xmlPanel.classList.contains("hidden")) {
        void renderXmlPanel(state, xmlPanel);
      }
    });
  }
}

// ============================================================================
// 4. LOGISTICS SIMULATOR & METADATA PANEL
// ============================================================================

function renderLogisticsPanel(state: AppState, container: HTMLElement) {
  const modeler = state.modeler;
  const analytics = calculateProcessAnalytics(modeler);

  let selectedElement: BpmnElement | null = null;
  if (modeler) {
    const selection = modeler.get("selection") as { get: () => BpmnElement[] };
    selectedElement = selection?.get()?.[0] || null;
  }

  const isTask = Boolean(
    selectedElement &&
    (selectedElement.businessObject?.$instanceOf?.("bpmn:Task") ||
      selectedElement.businessObject?.$type?.includes?.("Task")),
  );
  const isSequenceFlow = Boolean(
    selectedElement &&
    (selectedElement.businessObject?.$instanceOf?.("bpmn:SequenceFlow") ||
      selectedElement.businessObject?.$type?.includes?.("SequenceFlow")),
  );

  const scrollable = document.createElement("div");
  scrollable.className = "sidebar-scrollable";

  // KPI Overview section
  const kpiSection = document.createElement("div");
  kpiSection.className = "panel-section";

  const kpiHeader = document.createElement("div");
  kpiHeader.style.display = "flex";
  kpiHeader.style.justifyContent = "space-between";
  kpiHeader.style.alignItems = "center";
  kpiHeader.style.marginBottom = "12px";

  const kpiTitle = document.createElement("h3");
  kpiTitle.className = "panel-section__title";
  kpiTitle.style.marginBottom = "0";
  kpiTitle.textContent = "Simulator & KPIs";

  const btnSOP = document.createElement("button");
  btnSOP.id = "btnGenerateSOP";
  btnSOP.type = "button";
  btnSOP.className = "btn btn--transparent";
  btnSOP.style.padding = "4px 8px";
  btnSOP.style.fontSize = "10px";
  btnSOP.style.fontWeight = "700";
  btnSOP.textContent = "GENERATE SOP (MD)";
  btnSOP.addEventListener("click", async () => {
    if (!state.modeler) return;
    const { generateSOP } = await import("../services/sop-service");
    const sop = await generateSOP(state.modeler);
    const blob = new Blob([sop], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SOP_${Date.now()}.md`;
    a.click();
    Toast.show("SOP generated successfully (Markdown)", "success");
  });

  kpiHeader.append(kpiTitle, btnSOP);

  const kpiRow1 = document.createElement("div");
  kpiRow1.className = "kpi-dashboard";
  kpiRow1.append(
    createKpiCard(
      `$${analytics.totalCost.toLocaleString()}`,
      "Projected Cost",
      "kpi-card--primary",
    ),
    createKpiCard(String(analytics.totalTasks), "Tasks"),
  );

  const kpiRow2 = document.createElement("div");
  kpiRow2.className = "kpi-dashboard";
  kpiRow2.append(
    createKpiCard(
      String(analytics.delayedTasksCount),
      "Delayed",
      analytics.delayedTasksCount > 0 ? "kpi-card--warning" : "",
    ),
    createKpiCard(
      String(analytics.blockedTasksCount),
      "Blocked",
      analytics.blockedTasksCount > 0 ? "kpi-card--danger" : "",
    ),
  );

  kpiSection.append(kpiHeader, kpiRow1, kpiRow2);
  scrollable.appendChild(kpiSection);

  // Selected element section
  if (isTask && selectedElement) {
    const bo = selectedElement.businessObject;
    const metadata = safeGetMetadata(bo);

    const metaSection = document.createElement("div");
    metaSection.className = "panel-section";

    const metaTitle = document.createElement("h3");
    metaTitle.className = "panel-section__title";
    metaTitle.textContent = "Logistics Metadata";

    const selectedGroup = document.createElement("div");
    selectedGroup.className = "form-group";
    const selectedLabel = document.createElement("label");
    selectedLabel.textContent = "Selected Element";
    const selectedBadge = document.createElement("div");
    selectedBadge.className = "selected-badge";
    selectedBadge.textContent = `${bo.name || selectedElement.id} (${selectedElement.type.replace("bpmn:", "")})`;
    selectedGroup.append(selectedLabel, selectedBadge);

    const { group: costGroup, input: sysCost } = createLabeledInputGroup(
      "Hourly Operating Cost ($)",
      "sysCost",
      "number",
      "e.g. 150",
      metadata.costHR !== undefined ? String(metadata.costHR) : "",
    );

    // Underlying schema enum values ("Listo" | "Retrasado" | "Bloqueado") preserved for SysMetadataSchema compatibility
    const { group: statusGroup, select: sysStatus } = createLabeledSelectGroup(
      "Operational Status",
      "sysStatus",
      [
        { value: "", label: "Unassigned", selected: !metadata.status },
        {
          value: "Listo",
          label: "Ready",
          selected: metadata.status === "Listo",
        },
        {
          value: "Retrasado",
          label: "Delayed",
          selected: metadata.status === "Retrasado",
        },
        {
          value: "Bloqueado",
          label: "Blocked",
          selected: metadata.status === "Bloqueado",
        },
      ],
    );

    const { group: formGroup, input: sysForm } = createLabeledInputGroup(
      "Form Key (UI)",
      "sysForm",
      "text",
      "form-id-123",
      metadata.formKey || "",
    );

    const { group: decisionGroup, input: sysDecision } =
      createLabeledInputGroup(
        "Decision ID (DMN)",
        "sysDecision",
        "text",
        "decision-table-id",
        metadata.decisionRef || "",
      );

    const updateProp = (key: string, value: string) => {
      if (!modeler || !selectedElement) return;
      try {
        const modeling = modeler.get("modeling") as ModelingService;
        try {
          const validatedValue = validateProperty(key, value);
          modeling.updateProperties(selectedElement, { [key]: validatedValue });
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : "Invalid property value";
          Toast.show(message, "error");
        }
      } catch {
        // Ignore modeler lookup errors on detached canvas
      }
    };

    sysCost.addEventListener("input", () =>
      updateProp("sys:costHR", sysCost.value),
    );
    sysStatus.addEventListener("change", () =>
      updateProp("sys:status", sysStatus.value),
    );
    sysForm.addEventListener("input", () =>
      updateProp("sys:formKey", sysForm.value),
    );
    sysDecision.addEventListener("input", () =>
      updateProp("sys:decisionRef", sysDecision.value),
    );

    metaSection.append(
      metaTitle,
      selectedGroup,
      costGroup,
      statusGroup,
      formGroup,
      decisionGroup,
    );
    scrollable.appendChild(metaSection);
  } else if (isSequenceFlow && selectedElement) {
    const bo = selectedElement.businessObject;
    const existingCondition = bo.conditionExpression?.body || "";

    const flowSection = document.createElement("div");
    flowSection.className = "panel-section";

    const flowTitle = document.createElement("h3");
    flowTitle.className = "panel-section__title";
    flowTitle.textContent = "Smart Routing (Atlas Engine)";

    const flowDesc = document.createElement("p");
    flowDesc.className = "section-desc";
    flowDesc.textContent =
      "Configure decision rules based on Shipment attributes.";

    const selectedGroup = document.createElement("div");
    selectedGroup.className = "form-group";
    const selectedLabel = document.createElement("label");
    selectedLabel.textContent = "Selected Element";
    const selectedBadge = document.createElement("div");
    selectedBadge.className = "selected-badge";
    selectedBadge.textContent = `${bo.name || selectedElement.id} (SequenceFlow)`;
    selectedGroup.append(selectedLabel, selectedBadge);

    const { group: incotermGroup, select: condIncoterm } =
      createLabeledSelectGroup("Incoterm", "condIncoterm", [
        { value: "", label: "Any" },
        { value: "EXW", label: "EXW (Ex Works)" },
        { value: "FOB", label: "FOB (Free On Board)" },
        { value: "CIF", label: "CIF" },
        { value: "DAP", label: "DAP" },
        { value: "DDP", label: "DDP" },
      ]);

    const { group: movementGroup, select: condMovement } =
      createLabeledSelectGroup("Cargo Type", "condMovement", [
        { value: "", label: "Any" },
        { value: "FCL", label: "FCL (Full Container Load)" },
        { value: "LCL", label: "LCL (Less than Container Load)" },
        { value: "AIR", label: "AIR (Air Freight)" },
      ]);

    const { group: feelGroup, input: zeebeCondition } = createLabeledInputGroup(
      "Resulting FEEL Expression",
      "zeebeCondition",
      "text",
      "=",
      existingCondition,
      true,
    );

    const btnApplyCondition = document.createElement("button");
    btnApplyCondition.id = "btnApplyCondition";
    btnApplyCondition.className = "btn btn--primary btn--full-width";
    btnApplyCondition.type = "button";
    btnApplyCondition.style.marginTop = "8px";
    btnApplyCondition.textContent = "Apply Rule to Flow";

    const updateConditionPreview = () => {
      const conditions: string[] = [];
      if (condIncoterm.value)
        conditions.push(`incoterm = "${condIncoterm.value}"`);
      if (condMovement.value)
        conditions.push(`movementType = "${condMovement.value}"`);
      zeebeCondition.value =
        conditions.length > 0 ? "=" + conditions.join(" and ") : "";
    };

    condIncoterm.addEventListener("change", updateConditionPreview);
    condMovement.addEventListener("change", updateConditionPreview);

    btnApplyCondition.addEventListener("click", () => {
      if (!selectedElement || !modeler) return;
      try {
        const modeling = modeler.get("modeling") as ModelingService;
        const moddle = modeler.get("moddle") as ModdleService;

        const conditionObj = zeebeCondition.value
          ? moddle.create("bpmn:FormalExpression", {
              body: zeebeCondition.value,
            })
          : undefined;

        modeling.updateProperties(selectedElement, {
          conditionExpression: conditionObj,
        });
        Toast.show("FEEL routing rule applied", "success");
      } catch {
        Toast.show("Failed to apply routing rule", "error");
      }
    });

    flowSection.append(
      flowTitle,
      flowDesc,
      selectedGroup,
      incotermGroup,
      movementGroup,
      feelGroup,
      btnApplyCondition,
    );
    scrollable.appendChild(flowSection);
  } else {
    const noSel = document.createElement("div");
    noSel.className = "no-selection-alert";

    const iconDiv = document.createElement("div");
    iconDiv.className = "no-selection-alert__icon";
    iconDiv.textContent = "\u2139\uFE0F";

    const textDiv = document.createElement("div");
    textDiv.append("Select a ");
    const boldTask = document.createElement("b");
    boldTask.textContent = "Task";
    textDiv.append(boldTask, " or a ");
    const boldFlow = document.createElement("b");
    boldFlow.textContent = "SequenceFlow";
    textDiv.append(boldFlow, " on the canvas to configure its properties.");

    noSel.append(iconDiv, textDiv);
    scrollable.appendChild(noSel);
  }

  // Bottlenecks section
  if (analytics.bottlenecks.length > 0) {
    const bnSection = document.createElement("div");
    bnSection.className = "panel-section";

    const bnTitle = document.createElement("h3");
    bnTitle.className = "panel-section__title panel-section__title--danger";
    bnTitle.textContent = "Detected Bottlenecks";

    const bnList = document.createElement("div");
    bnList.className = "bottlenecks-list";

    for (const b of analytics.bottlenecks) {
      const item = document.createElement("div");
      const severityClass = b.status === "Bloqueado" ? "blocked" : "delayed";
      item.className = `bottleneck-item bottleneck-item--${severityClass}`;
      item.setAttribute("data-element-id", b.id);

      const itemHeader = document.createElement("div");
      itemHeader.className = "bottleneck-item__header";

      const statusBadge = document.createElement("span");
      statusBadge.className = "bottleneck-item__status-badge";
      statusBadge.textContent =
        b.status === "Bloqueado"
          ? "Blocked"
          : b.status === "Retrasado"
            ? "Delayed"
            : b.status;

      const idSpan = document.createElement("span");
      idSpan.className = "bottleneck-item__id";
      idSpan.textContent = b.id;

      itemHeader.append(statusBadge, idSpan);

      const nameDiv = document.createElement("div");
      nameDiv.className = "bottleneck-item__name";
      nameDiv.textContent = b.name;

      const costDiv = document.createElement("div");
      costDiv.className = "bottleneck-item__cost";
      costDiv.textContent = `Cost: $${String(b.cost)}/hr`;

      item.append(itemHeader, nameDiv, costDiv);
      item.addEventListener("click", () => {
        const elementRegistry = modeler?.get("elementRegistry") as
          { get: (id: string) => BpmnElement } | undefined;
        const element = elementRegistry?.get(b.id);
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
            `Viewing task: ${element.businessObject.name || b.id}`,
            "info",
          );
        }
      });

      bnList.appendChild(item);
    }

    bnSection.append(bnTitle, bnList);
    scrollable.appendChild(bnSection);
  }

  container.replaceChildren(scrollable);
}

// ============================================================================
// 5. LOCAL VERSION HISTORY PANEL
// ============================================================================

async function renderHistoryPanel(state: AppState, container: HTMLElement) {
  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
  if (!activeTab) {
    container.replaceChildren(
      createAlertBox("No active tab available to track version history."),
    );
    return;
  }

  const { historyService } = await import("../services/history-service");
  const versions = await historyService.getVersions(activeTab.id);

  const scrollable = document.createElement("div");
  scrollable.className = "sidebar-scrollable";

  const panelSection = document.createElement("div");
  panelSection.className = "panel-section";

  const title = document.createElement("h3");
  title.className = "panel-section__title";
  title.textContent = "Version History";

  const desc = document.createElement("p");
  desc.className = "section-desc";
  desc.textContent = "Create local restore checkpoints (commits) for this tab.";

  const formGroup = document.createElement("div");
  formGroup.className = "form-group";

  const inputCommit = document.createElement("input");
  inputCommit.type = "text";
  inputCommit.id = "historyCommitMsg";
  inputCommit.className = "input";
  inputCommit.placeholder = "Version message...";
  formGroup.appendChild(inputCommit);

  const btnSave = document.createElement("button");
  btnSave.id = "btnSaveHistoryVersion";
  btnSave.className = "btn btn--primary btn--full-width";
  btnSave.type = "button";
  btnSave.style.marginTop = "8px";
  btnSave.textContent = "Save Checkpoint";

  panelSection.append(title, desc, formGroup, btnSave);
  scrollable.appendChild(panelSection);

  const timelineSection = document.createElement("div");
  timelineSection.className = "panel-section";

  const timelineTitle = document.createElement("h3");
  timelineTitle.className = "panel-section__title";
  timelineTitle.textContent = "Timeline";
  timelineSection.appendChild(timelineTitle);

  if (versions.length === 0) {
    const emptyMsg = document.createElement("div");
    emptyMsg.className = "no-versions-msg";
    emptyMsg.textContent = "No saved versions yet. Create a checkpoint above.";
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
      label.textContent = v.label;

      const actions = document.createElement("div");
      actions.className = "history-timeline__actions";
      actions.style.marginTop = "8px";

      const btnRestore = document.createElement("button");
      btnRestore.className = "btn btn-restore btn--transparent";
      btnRestore.type = "button";
      btnRestore.style.cssText = "padding: 2px 6px; font-size:11px;";
      btnRestore.textContent = "Restore";
      btnRestore.setAttribute("data-version-id", v.id);

      btnRestore.addEventListener("click", async () => {
        if (
          !confirm(
            "Are you sure you want to restore this checkpoint? Unsaved changes will be lost.",
          )
        ) {
          return;
        }

        const tabVersions = await historyService.getVersions(activeTab.id);
        const version = tabVersions.find((ver) => ver.id === v.id);
        if (version && state.modeler) {
          try {
            await importDiagram(state.modeler, version.xml);
            activeTab.xml = version.xml;
            activeTab.isDirty = true;
            Toast.show("Checkpoint restored successfully", "success");
            void renderHistoryPanel(state, container);
          } catch {
            Toast.show("Failed to restore checkpoint", "error");
          }
        }
      });

      const btnDelete = document.createElement("button");
      btnDelete.className = "btn btn-delete btn--transparent";
      btnDelete.type = "button";
      btnDelete.style.cssText =
        "padding: 2px 6px; font-size:11px; color: var(--danger);";
      btnDelete.textContent = "Delete";
      btnDelete.setAttribute("data-version-id", v.id);

      btnDelete.addEventListener("click", async () => {
        if (await historyService.deleteVersion(activeTab.id, v.id)) {
          Toast.show("Checkpoint deleted", "success");
          void renderHistoryPanel(state, container);
        }
      });

      actions.append(btnRestore, btnDelete);
      content.append(header, label, actions);
      item.append(point, content);
      timeline.appendChild(item);
    }

    timelineSection.appendChild(timeline);
  }

  scrollable.appendChild(timelineSection);
  container.replaceChildren(scrollable);

  btnSave.addEventListener("click", async () => {
    const commitLabel =
      inputCommit.value.trim() ||
      `Checkpoint - ${new Date().toLocaleTimeString()}`;
    if (!state.modeler) return;

    try {
      const xml = await state.modeler.saveXML({ format: true });
      if (xml && xml.xml) {
        await historyService.saveVersion(activeTab.id, commitLabel, xml.xml);
        Toast.show("Checkpoint saved successfully", "success");
        inputCommit.value = "";
        void renderHistoryPanel(state, container);
      }
    } catch {
      Toast.show("Failed to save checkpoint", "error");
    }
  });
}

// ============================================================================
// 6. REFRESH HOOKS & LIVE XML PANEL
// ============================================================================

export function refreshLogisticsPanel(state: AppState) {
  const panel = document.getElementById("logisticsPanel");
  if (panel) renderLogisticsPanel(state, panel);
}

export function refreshHistoryPanel(state: AppState) {
  const panel = document.getElementById("historyPanel");
  if (panel) void renderHistoryPanel(state, panel);
}

async function renderXmlPanel(state: AppState, container: HTMLElement) {
  if (!state.modeler) return;
  try {
    const { xml } = await state.modeler.saveXML({ format: true });
    if (!xml) throw new Error("XML is empty");

    const scrollable = document.createElement("div");
    scrollable.className = "sidebar-scrollable";

    const section = document.createElement("div");
    section.className = "panel-section";
    section.style.height = "100%";
    section.style.display = "flex";
    section.style.flexDirection = "column";

    const headerRow = document.createElement("div");
    headerRow.style.display = "flex";
    headerRow.style.justifyContent = "space-between";
    headerRow.style.alignItems = "center";
    headerRow.style.marginBottom = "8px";

    const heading = document.createElement("h3");
    heading.className = "panel-section__title";
    heading.style.marginBottom = "0";
    heading.textContent = "Live XML Source";

    const btnCopy = document.createElement("button");
    btnCopy.id = "btnCopyLiveXml";
    btnCopy.type = "button";
    btnCopy.className = "btn btn--transparent";
    btnCopy.style.padding = "2px 8px";
    btnCopy.style.fontSize = "11px";
    btnCopy.textContent = "Copy";
    btnCopy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(xml);
        Toast.show("XML copied to clipboard", "success");
      } catch {
        Toast.show("Failed to copy XML", "error");
      }
    });

    headerRow.append(heading, btnCopy);

    const desc = document.createElement("p");
    desc.className = "section-desc";
    desc.textContent = "Source updates automatically with every canvas change.";

    const pre = document.createElement("pre");
    pre.style.flex = "1";
    pre.style.background = "var(--bg-surface)";
    pre.style.padding = "8px";
    pre.style.borderRadius = "4px";
    pre.style.overflow = "auto";
    pre.style.fontSize = "11px";
    pre.style.border = "1px solid var(--border-color)";
    pre.style.whiteSpace = "pre-wrap";
    pre.style.wordBreak = "break-all";
    pre.style.marginTop = "8px";

    const code = document.createElement("code");
    code.textContent = xml;
    pre.appendChild(code);

    section.append(headerRow, desc, pre);
    scrollable.appendChild(section);
    container.replaceChildren(scrollable);
  } catch {
    container.replaceChildren(
      createAlertBox("Unable to load XML at this time."),
    );
  }
}
