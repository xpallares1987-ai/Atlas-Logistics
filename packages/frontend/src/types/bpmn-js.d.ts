declare module "bpmn-js/lib/Modeler" {
  export default class BpmnModeler {
    constructor(options?: any);
    importXML(xml: string): Promise<{ warnings: string[] }>;
    saveXML(options?: { format?: boolean }): Promise<{ xml: string }>;
    saveSVG(options?: any): Promise<{ svg: string }>;
    attachTo(container: HTMLElement | string): void;
    detach(): void;
    on(event: string, callback: (event: any) => void): void;
    get(module: string): any;
  }
}
