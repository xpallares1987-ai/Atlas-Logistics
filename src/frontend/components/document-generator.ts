import { i18n } from '../core/i18n.js';
import { eventBus } from '../../core/event-bus.js';

interface DocumentVersion {
  id: string;
  version: number;
  shipmentRef: string;
  shipper: string;
  consignee: string;
  timestamp: string;
}

class DocumentGenerator extends HTMLElement {
  private generatedDocs: DocumentVersion[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    i18n.subscribe(() => this.render());
    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.shadowRoot) return;
    const form = this.shadowRoot.querySelector('form');
    form?.addEventListener('submit', this.handleGenerate.bind(this));
  }

  private handleGenerate(e: Event) {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const shipmentRef = formData.get('shipment_ref') as string;
    const shipper = formData.get('shipper') as string;
    const consignee = formData.get('consignee') as string;
    
    const existingDocs = this.generatedDocs.filter(d => d.shipmentRef === shipmentRef);
    const newVersion = existingDocs.length > 0 ? existingDocs[existingDocs.length - 1].version + 1 : 1;

    const newDoc: DocumentVersion = {
      id: crypto.randomUUID(),
      version: newVersion,
      shipmentRef,
      shipper,
      consignee,
      timestamp: new Date().toISOString()
    };

    this.generatedDocs.push(newDoc);

    eventBus.publish('DOCUMENT_GENERATED', newDoc);

    (e.target as HTMLFormElement).reset();
    this.render();
    this.setupEventListeners();
  }

  private formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          background: var(--bg-color, #ffffff);
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          padding: 2rem;
          font-family: system-ui, -apple-system, sans-serif;
        }
        h2 {
          margin-top: 0;
          color: var(--text-color, #1a1a1a);
          border-bottom: 1px solid #eaeaea;
          padding-bottom: 1rem;
        }
        .form-group {
          margin-bottom: 1.5rem;
        }
        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #4a4a4a;
          font-size: 0.9rem;
        }
        input, textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          box-sizing: border-box;
          font-size: 1rem;
          background-color: #f9fafb;
          color: #1a1a1a;
        }
        input:focus, textarea:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        button {
          background-color: #059669;
          color: white;
          border: none;
          padding: 1rem;
          width: 100%;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        button:hover {
          background-color: #047857;
        }
        .doc-history {
          margin-top: 2rem;
        }
        .doc-card {
          background-color: #f3f4f6;
          border-left: 4px solid #059669;
          padding: 1rem;
          margin-bottom: 1rem;
          border-radius: 4px;
        }
        .doc-header {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          margin-bottom: 0.5rem;
          color: #111827;
        }
        .doc-meta {
          font-size: 0.85rem;
          color: #4b5563;
        }
      </style>

      <h2>${i18n.t('doc_generator')}</h2>
      
      <form>
        <div class="form-group">
          <label for="shipment_ref">${i18n.t('shipment_ref')}</label>
          <input type="text" id="shipment_ref" name="shipment_ref" placeholder="e.g. AWB-77382910" required>
        </div>
        
        <div class="form-group">
          <label for="shipper">${i18n.t('shipper')}</label>
          <input type="text" id="shipper" name="shipper" required>
        </div>
        
        <div class="form-group">
          <label for="consignee">${i18n.t('consignee')}</label>
          <input type="text" id="consignee" name="consignee" required>
        </div>

        <div class="form-group">
          <label for="cargo_details">${i18n.t('cargo_details')}</label>
          <textarea id="cargo_details" name="cargo_details" rows="3" required></textarea>
        </div>

        <button type="submit">${i18n.t('generate_bl')}</button>
      </form>

      ${this.generatedDocs.length > 0 ? `
        <div class="doc-history">
          <h3>Generated Documents</h3>
          ${this.generatedDocs.slice().reverse().map(doc => `
            <div class="doc-card">
              <div class="doc-header">
                <span>Ref: ${doc.shipmentRef}</span>
                <span>v${doc.version}</span>
              </div>
              <div class="doc-meta">
                <div>Shipper: ${doc.shipper}</div>
                <div>Consignee: ${doc.consignee}</div>
                <div style="margin-top: 0.5rem; font-size: 0.75rem;">${this.formatDate(doc.timestamp)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
  }
}

customElements.define('document-generator', DocumentGenerator);