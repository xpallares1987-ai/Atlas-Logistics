export interface TemplateMetadata {
  id: string;
  name: string;
  description?: string;
  category: 'bpmn' | 'dmn' | 'form';
}

export interface Template {
  metadata: TemplateMetadata;
  xml: string;
}

export class TemplateService {
  private templates: Map<string, Template> = new Map();

  async loadTemplate(id: string): Promise<Template | undefined> {
    return this.templates.get(id);
  }

  registerTemplate(template: Template) {
    this.templates.set(template.metadata.id, template);
  }

  listTemplates(): TemplateMetadata[] {
    return Array.from(this.templates.values()).map((t) => t.metadata);
  }
}
