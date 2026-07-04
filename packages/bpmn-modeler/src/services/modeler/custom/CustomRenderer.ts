import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil';

const ICONS: Record<string, string> = {
  'Despacho Aduanas': 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',
  'Recepción Almacén': 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  'Consolidación LCL': 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12',
  'Operación Cross-dock': 'M7 10l5 5 5-5 M12 3v12 M21 18H3'
};

export default class CustomRenderer {
  static $inject: string[];
  bpmnRenderer: any;

  constructor(eventBus: any, bpmnRenderer: any) {
    this.bpmnRenderer = bpmnRenderer;

    eventBus.on('render.shape', (event: any) => {
      const { type, element, gfx } = event;

      if (type === 'bpmn:Task') {
        return this.drawShape(gfx, element);
      }
    });
  }

  drawShape(parentNode: SVGElement, element: any) {
    const shape = this.bpmnRenderer.drawShape(parentNode, element);
    const bo = getBusinessObject(element);

    const pathData = ICONS[bo.name];

    if (pathData) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('transform', 'translate(5, 5) scale(0.6)');

      parentNode.appendChild(path);
    }

    return shape;
  }
}

CustomRenderer.$inject = ['eventBus', 'bpmnRenderer'];
