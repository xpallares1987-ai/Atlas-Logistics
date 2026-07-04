import { DiagramVersion } from '../services/history-service';
import Modeler from 'bpmn-js/lib/Modeler';
import { fitViewport } from '../services/modeler-service';

/**
 * Visual Diff UI for BPMN versions.
 */
export class DiffVisualizer {
  private container: HTMLDialogElement;
  private canvas: HTMLElement;
  private currentModeler: Modeler;

  constructor(currentModeler: Modeler) {
    this.currentModeler = currentModeler;
    this.container = document.createElement('dialog');
    this.container.className = 'modal modal--large diff-modal';
    this.container.innerHTML = `
      <div class="modal__header">
        <h2 class="modal__title">Comparación Visual de Versiones</h2>
        <button class="btn--close" type="button">&times;</button>
      </div>
      <div class="modal__body diff-body">
        <div class="diff-controls">
          <select id="versionSelect" class="input"></select>
          <div class="diff-legend">
            <span class="legend-item added">Añadido</span>
            <span class="legend-item changed">Modificado</span>
            <span class="legend-item removed">Eliminado</span>
          </div>
        </div>
        <div id="diffCanvas" class="diff-canvas"></div>
      </div>
    `;

    document.body.appendChild(this.container);
    this.canvas = this.container.querySelector('#diffCanvas') as HTMLElement;

    this.container.querySelector('.btn--close')?.addEventListener('click', () => this.close());
  }

  async open(versions: DiagramVersion[]) {
    const select = this.container.querySelector('#versionSelect') as HTMLSelectElement;
    select.innerHTML = versions
      .map(
        (v) =>
          `<option value="${v.id}">${v.label} (${new Date(v.timestamp).toLocaleString()})</option>`
      )
      .join('');

    select.onchange = async () => {
      const version = versions.find((v) => v.id === select.value);
      if (version) await this.visualizeDiff(version.xml);
    };

    if (versions.length > 0) {
      await this.visualizeDiff(versions[0].xml);
    }

    this.container.showModal();
  }

  private async visualizeDiff(oldXml: string) {
    const { default: BpmnModeler } = await import('bpmn-js/lib/Modeler');
    // @ts-expect-error: bpmn-js-differ lacks type definitions
    const { default: BpmnDiffer } = await import('bpmn-js-differ');

    this.canvas.innerHTML = '';

    const differModeler = new BpmnModeler({
      container: this.canvas,
      additionalModules: [
        {
          __init__: ['changeVisualization'],
          changeVisualization: ['type', function() {}] // Mock for differ
        }
      ]
    });

    const currentXml = await this.currentModeler.saveXML({ format: true });
    
    // In a real implementation with bpmn-js-differ, we would use its visual module
    // For now, we will perform a logic-only diff and highlight elements
    // since bpmn-js-differ is primarily a logical differ.
    
    try {
      await differModeler.importXML(oldXml);
      const oldDefinitions = differModeler.getDefinitions();

      await differModeler.importXML(currentXml.xml!);
      const currentDefinitions = differModeler.getDefinitions();

      const diff = new BpmnDiffer().diff(oldDefinitions, currentDefinitions);

      const canvas = differModeler.get('canvas') as any;
      
      // Highlight changes
      Object.keys(diff.added).forEach(id => {
        canvas.addMarker(id, 'diff-added');
      });
      Object.keys(diff.changed).forEach(id => {
        canvas.addMarker(id, 'diff-changed');
      });
      Object.keys(diff.removed).forEach(id => {
        // Removed elements aren't in the current XML, 
        // a more advanced diff would show them ghosted.
        console.log('Removed:', id);
      });

      fitViewport(differModeler);
    } catch (err) {
      console.error('Diff error:', err);
    }
  }

  close() {
    this.container.close();
  }
}
