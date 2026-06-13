import BpmnModeler from 'bpmn-js/lib/Modeler';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';

export class BPMNEditor {
  private modeler: BpmnModeler;
  private container: HTMLElement;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container ${containerId} not found`);
    this.container = el;
    
    this.modeler = new BpmnModeler({
      container: this.container,
      keyboard: { bindTo: document }
    });
  }

  async loadDiagram(xml: string): Promise<void> {
    try {
      await this.modeler.importXML(xml);
      this.modeler.get('canvas').zoom('fit-viewport');
    } catch (err) {
      console.error('Error rendering BPMN diagram', err);
    }
  }

  async exportDiagram(): Promise<string> {
    try {
      const { xml } = await this.modeler.saveXML({ format: true });
      return xml as string;
    } catch (err) {
      console.error('Error exporting BPMN diagram', err);
      throw err;
    }
  }
}