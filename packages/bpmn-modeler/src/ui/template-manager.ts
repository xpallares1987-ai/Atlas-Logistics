/**
 * @file template-manager.ts
 * @description Modal template picker using safe programmatic DOM nodes.
 * @module @atlas/bpmn-modeler/ui/template-manager
 */

import { TemplateService, Template } from "../services/template-service";

export function initTemplateManager(
  templateService: TemplateService,
  onTemplateLoad: (template: Template) => void,
) {
  const btnTemplates = document.getElementById("btnTemplates");
  const modal = document.getElementById(
    "templatesModal",
  ) as HTMLDialogElement | null;
  const list = document.getElementById("templatesList");
  const btnClose = document.getElementById("btnCloseTemplatesModal");

  if (!btnTemplates || !modal || !list) return;

  btnTemplates.addEventListener("click", () => {
    const templates = templateService.listTemplates();
    const cards = templates.map((t) => {
      const card = document.createElement("div");
      card.className = "template-card";
      card.setAttribute("data-id", t.id);

      const nameEl = document.createElement("div");
      nameEl.className = "template-card__name";
      nameEl.textContent = t.name;

      const descEl = document.createElement("div");
      descEl.className = "template-card__desc";
      descEl.textContent = t.description || "";

      card.append(nameEl, descEl);
      card.addEventListener("click", async () => {
        const template = await templateService.loadTemplate(t.id);
        if (template) {
          onTemplateLoad(template);
          modal.close();
        }
      });

      return card;
    });

    list.replaceChildren(...cards);
    modal.showModal();
  });

  btnClose?.addEventListener("click", () => modal.close());
}
