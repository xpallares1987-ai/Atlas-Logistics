import BpmnModeler from 'bpmn-js/lib/Modeler';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import { i18n } from '../core/i18n.js';
import { api } from '../core/api.js';
import { eventBus } from '../../core/event-bus.js';

const emptyBpmn = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn" exporter="Atlas Modeler" exporterVersion="1.0.0">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

class BPMNModelerComponent extends HTMLElement {
  private modeler: BpmnModeler | null = null;

  connectedCallback() {
    this.render();
    this.initModeler();
    this.setupEventListeners();
    i18n.subscribe(() => this.updateTexts());
  }

  private render() {
    this.innerHTML = `
      <style>
        .bpmn-container {
          display: flex;
          flex-direction: column;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          padding: 1rem;
          height: 600px;
          margin-bottom: 2rem;
          font-family: system-ui, sans-serif;
        }
        .bpmn-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #eaeaea;
          padding-bottom: 1rem;
          margin-bottom: 1rem;
        }
        .bpmn-header h2 {
          margin: 0;
          color: #1a1a1a;
        }
        .bpmn-canvas {
          flex: 1;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          background-color: #fcfcfc;
        }
        .btn-group button {
          padding: 0.5rem 1rem;
          margin-left: 0.5rem;
          border-radius: 4px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .btn-deploy {
          background-color: #2563eb;
          color: white;
        }
        .btn-deploy:hover {
          background-color: #1d4ed8;
        }
        .btn-download {
          background-color: #e5e7eb;
          color: #374151;
        }
        .btn-download:hover {
          background-color: #d1d5db;
        }
      </style>
      <div class="bpmn-container">
        <div class="bpmn-header">
          <h2 id="modeler-title">${i18n.t('process_modeler')}</h2>
          <div class="btn-group">
            <button class="btn-download" id="btn-download">${i18n.t('download_xml')}</button>
            <button class="btn-deploy" id="btn-deploy">${i18n.t('deploy_process')}</button>
          </div>
        </div>
        <div class="bpmn-canvas" id="canvas"></div>
      </div>
    `;
  }

  private async initModeler() {
    const canvas = this.querySelector('#canvas') as HTMLElement;
    if (!canvas) return;

    this.modeler = new BpmnModeler({
      container: canvas,
      keyboard: { bindTo: document }
    });

    try {
      await this.modeler.importXML(emptyBpmn);
      const canvasMod = this.modeler.get('canvas') as any;
      canvasMod.zoom('fit-viewport');
    } catch (err) {
      console.error('Error rendering BPMN base', err);
    }
  }

  private setupEventListeners() {
    const btnDeploy = this.querySelector('#btn-deploy');
    const btnDownload = this.querySelector('#btn-download');

    btnDeploy?.addEventListener('click', this.handleDeploy.bind(this));
    btnDownload?.addEventListener('click', this.handleDownload.bind(this));
  }

  private async handleDeploy() {
    if (!this.modeler) return;
    try {
      const { xml } = await this.modeler.saveXML({ format: true });
      const response = await api.post<{ status: string }>('/processes/deploy', { xml });
      
      eventBus.publish('BPMN_DEPLOYED', response);
      alert('Process deployed successfully to Zeebe Engine.');
    } catch (error) {
      console.error('Deploy failed', error);
      alert('Failed to deploy process.');
    }
  }

  private async handleDownload() {
    if (!this.modeler) return;
    try {
      const { xml } = await this.modeler.saveXML({ format: true });
      const blob = new Blob([xml as string], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'process.bpmn';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed', error);
    }
  }

  private updateTexts() {
    const title = this.querySelector('#modeler-title');
    const btnDeploy = this.querySelector('#btn-deploy');
    const btnDownload = this.querySelector('#btn-download');

    if (title) title.textContent = i18n.t('process_modeler');
    if (btnDeploy) btnDeploy.textContent = i18n.t('deploy_process');
    if (btnDownload) btnDownload.textContent = i18n.t('download_xml');
  }
}

customElements.define('bpmn-modeler', BPMNModelerComponent);