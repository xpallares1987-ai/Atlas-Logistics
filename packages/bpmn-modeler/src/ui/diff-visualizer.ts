/**
 * @file diff-visualizer.ts
 * @description Visual BPMN diagram version diff dialog using safe programmatic DOM construction.
 * @module @atlas/bpmn-modeler/ui/diff-visualizer
 */

import { DiagramVersion } from "../services/history-service";
import Modeler from "bpmn-js/lib/Modeler";
import { fitViewport } from "../services/modeler-service";

interface CanvasMarkerApi {
  addMarker: (elementId: string, marker: string) => void;
}

export class DiffVisualizer {
  private container: HTMLDialogElement;
  private canvas: HTMLElement;
  private versionSelect: HTMLSelectElement;
  private currentModeler: Modeler;

  constructor(currentModeler: Modeler) {
    this.currentModeler = currentModeler;
    this.container = document.createElement("dialog");
    this.container.className = "modal modal--large diff-modal";

    const header = document.createElement("div");
    header.className = "modal__header";

    const title = document.createElement("h2");
    title.className = "modal__title";
    title.textContent = "Visual Version Comparison";

    const closeBtn = document.createElement("button");
    closeBtn.className = "btn--close";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "\u00D7";
    closeBtn.addEventListener("click", () => this.close());

    header.append(title, closeBtn);

    const body = document.createElement("div");
    body.className = "modal__body diff-body";

    const controls = document.createElement("div");
    controls.className = "diff-controls";

    this.versionSelect = document.createElement("select");
    this.versionSelect.id = "versionSelect";
    this.versionSelect.className = "input";

    const legend = document.createElement("div");
    legend.className = "diff-legend";

    const legendEntries: Array<[string, string]> = [
      ["added", "Added"],
      ["changed", "Modified"],
      ["removed", "Removed"],
    ];
    for (const [cls, label] of legendEntries) {
      const span = document.createElement("span");
      span.className = `legend-item ${cls}`;
      span.textContent = label;
      legend.appendChild(span);
    }

    controls.append(this.versionSelect, legend);

    this.canvas = document.createElement("div");
    this.canvas.id = "diffCanvas";
    this.canvas.className = "diff-canvas";

    body.append(controls, this.canvas);
    this.container.append(header, body);
    document.body.appendChild(this.container);
  }

  async open(versions: DiagramVersion[]) {
    const options = versions.map((v) => {
      const option = document.createElement("option");
      option.value = v.id;
      option.textContent = `${v.label} (${new Date(v.timestamp).toLocaleString()})`;
      return option;
    });
    this.versionSelect.replaceChildren(...options);

    this.versionSelect.onchange = async () => {
      const version = versions.find((v) => v.id === this.versionSelect.value);
      if (version) await this.visualizeDiff(version.xml);
    };

    if (versions.length > 0) {
      await this.visualizeDiff(versions[0].xml);
    }

    this.container.showModal();
  }

  private async visualizeDiff(oldXml: string) {
    const { default: BpmnModeler } = await import("bpmn-js/lib/Modeler");
    // @ts-expect-error: bpmn-js-differ lacks type definitions
    const { default: BpmnDiffer } = await import("bpmn-js-differ");

    this.canvas.replaceChildren();

    const differModeler = new BpmnModeler({
      container: this.canvas,
      additionalModules: [
        {
          __init__: ["changeVisualization"],
          changeVisualization: ["type", function () {}],
        },
      ],
    });

    const currentXml = await this.currentModeler.saveXML({ format: true });

    try {
      await differModeler.importXML(oldXml);
      const oldDefinitions = differModeler.getDefinitions();

      if (!currentXml.xml) return;
      await differModeler.importXML(currentXml.xml);
      const currentDefinitions = differModeler.getDefinitions();

      const diff = new BpmnDiffer().diff(oldDefinitions, currentDefinitions);
      const canvas = differModeler.get("canvas") as CanvasMarkerApi;

      Object.keys(diff.added).forEach((id) =>
        canvas.addMarker(id, "diff-added"),
      );
      Object.keys(diff.changed).forEach((id) =>
        canvas.addMarker(id, "diff-changed"),
      );
      Object.keys(diff.removed).forEach((id) => console.log("Removed:", id));

      fitViewport(differModeler);
    } catch {
      // Ignore diff rendering failure on incompatible diagrams
    }
  }

  close() {
    this.container.close();
  }
}
