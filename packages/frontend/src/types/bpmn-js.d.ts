declare module "bpmn-js/lib/Modeler" {
  export default class BpmnModeler {
    constructor(options?: Record<string, unknown>);
    importXML(xml: string): Promise<{ warnings: string[] }>;
    saveXML(options?: { format?: boolean }): Promise<{ xml: string }>;
    saveSVG(options?: Record<string, unknown>): Promise<{ svg: string }>;
    attachTo(container: HTMLElement | string): void;
    detach(): void;
    on(event: string, callback: (event: Record<string, unknown>) => void): void;
    get<T = unknown>(module: string): T;
  }
}
