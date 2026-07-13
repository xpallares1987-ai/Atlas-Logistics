import { TemplateService, Template } from '../services/template-service';

export function initTemplateManager(
  templateService: TemplateService,
  onTemplateLoad: (template: Template) => void
) {
  const btnTemplates = document.getElementById('btnTemplates');
  const modal = document.getElementById('templatesModal') as HTMLDialogElement;
  const list = document.getElementById('templatesList') as HTMLElement;
  const btnClose = document.getElementById('btnCloseTemplatesModal');

  if (!btnTemplates || !modal || !list) return;

  btnTemplates.addEventListener('click', () => {
    const templates = templateService.listTemplates();
    list.innerHTML = templates
      .map(
        (t) => `
      <div class="template-card" data-id="${t.id}">
        <div class="template-card__name">${t.name}</div>
        <div class="template-card__desc">${t.description || ''}</div>
      </div>
    `
      )
      .join('');

    list.querySelectorAll('.template-card').forEach((card) => {
      card.addEventListener('click', async () => {
        const id = card.getAttribute('data-id')!;
        const template = await templateService.loadTemplate(id);
        if (template) {
          onTemplateLoad(template);
          modal.close();
        }
      });
    });

    modal.showModal();
  });

  btnClose?.addEventListener('click', () => modal.close());
}
