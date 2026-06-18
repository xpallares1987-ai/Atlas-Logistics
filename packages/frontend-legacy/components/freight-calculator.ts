import { i18n } from '../core/i18n.js';
import { eventBus } from '../../core/event-bus.js';

class FreightCalculator extends HTMLElement {
  private calculatedRate: number | null = null;
  private surcharges: { name: string; amount: number }[] = [];

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
    form?.addEventListener('submit', this.handleCalculate.bind(this));
  }

  private async handleCalculate(e: Event) {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const origin = formData.get('origin') as string;
    const destination = formData.get('destination') as string;
    const carrier = formData.get('carrier') as string;

    // Lógica de cálculo mockeada para el MVP. 
    // En producción, esto llama a la API Fastify: POST /api/freight-rates/calculate
    this.calculatedRate = Math.floor(Math.random() * (3000 - 1000 + 1) + 1000);
    this.surcharges = [
      { name: 'BAF', amount: this.calculatedRate * 0.1 },
      { name: 'THC', amount: 250 },
      { name: 'ISPS', amount: 15 }
    ];

    eventBus.publish('RATE_CALCULATED', {
      origin,
      destination,
      carrier,
      total: this.getTotal()
    });

    this.render();
    this.setupEventListeners(); // Re-vincular eventos tras el renderizado del DOM
  }

  private getTotal(): number {
    if (this.calculatedRate === null) return 0;
    const surchargesTotal = this.surcharges.reduce((acc, curr) => acc + curr.amount, 0);
    return this.calculatedRate + surchargesTotal;
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
          max-width: 600px;
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
        input, select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          box-sizing: border-box;
          font-size: 1rem;
          background-color: #f9fafb;
          color: #1a1a1a;
        }
        input:focus, select:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        button {
          background-color: #2563eb;
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
          background-color: #1d4ed8;
        }
        .results {
          margin-top: 2rem;
          padding: 1.5rem;
          background-color: #f3f4f6;
          border-radius: 6px;
          border-left: 4px solid #2563eb;
        }
        .result-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.75rem;
          color: #4b5563;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #d1d5db;
          font-weight: 700;
          font-size: 1.25rem;
          color: #111827;
        }
      </style>

      <h2>${i18n.t('freight_calculator')}</h2>
      
      <form>
        <div class="form-group">
          <label for="carrier">${i18n.t('carrier')}</label>
          <select id="carrier" name="carrier" required>
            <option value="MSK">Maersk Line</option>
            <option value="MSC">MSC</option>
            <option value="CMA">CMA CGM</option>
            <option value="HLAG">Hapag-Lloyd</option>
            <option value="ONE">ONE</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="origin">${i18n.t('origin')}</label>
          <input type="text" id="origin" name="origin" placeholder="e.g. CNSHA" required pattern="[A-Z]{5}" title="UN/LOCODE format (5 uppercase letters)">
        </div>
        
        <div class="form-group">
          <label for="destination">${i18n.t('destination')}</label>
          <input type="text" id="destination" name="destination" placeholder="e.g. ESBCN" required pattern="[A-Z]{5}" title="UN/LOCODE format (5 uppercase letters)">
        </div>

        <button type="submit">Calculate Rate</button>
      </form>

      ${this.calculatedRate !== null ? `
        <div class="results">
          <div class="result-row">
            <span>Base Freight:</span>
            <span>$${this.calculatedRate.toFixed(2)}</span>
          </div>
          ${this.surcharges.map(s => `
            <div class="result-row">
              <span>${s.name} Surcharge:</span>
              <span>$${s.amount.toFixed(2)}</span>
            </div>
          `).join('')}
          <div class="total-row">
            <span>Total Estimated:</span>
            <span>$${this.getTotal().toFixed(2)}</span>
          </div>
        </div>
      ` : ''}
    `;
  }
}

customElements.define('freight-calculator', FreightCalculator);