import { i18n } from '../core/i18n.js';
import { eventBus } from '../../core/event-bus.js';

interface Shipment {
  id: string;
  trackingNumber: string;
  carrier: string;
  origin: string;
  destination: string;
  status: 'Booked' | 'Received' | 'OnBoard' | 'Discharged' | 'Delivered';
  lastUpdate: string;
}

class ShipmentDashboard extends HTMLElement {
  private shipments: Shipment[] = [
    {
      id: '1',
      trackingNumber: 'AWB-77382910',
      carrier: 'Maersk Line',
      origin: 'CNSHA',
      destination: 'ESBCN',
      status: 'OnBoard',
      lastUpdate: new Date().toISOString()
    },
    {
      id: '2',
      trackingNumber: 'MSC-U8839201',
      carrier: 'MSC',
      origin: 'SGSIN',
      destination: 'ESVLC',
      status: 'Booked',
      lastUpdate: new Date(Date.now() - 86400000).toISOString()
    }
  ];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    i18n.subscribe(() => this.render());
    
    eventBus.subscribe('SHIPMENT_UPDATED', (updatedShipment: Shipment) => {
      const index = this.shipments.findIndex(s => s.id === updatedShipment.id);
      if (index !== -1) {
        this.shipments[index] = updatedShipment;
        this.render();
      }
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.shadowRoot) return;
    
    const updateButtons = this.shadowRoot.querySelectorAll('.update-btn');
    updateButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.target as HTMLElement).dataset.id;
        this.simulateStatusAdvance(id);
      });
    });
  }

  private simulateStatusAdvance(id?: string) {
    if (!id) return;
    const shipment = this.shipments.find(s => s.id === id);
    if (!shipment) return;

    const statusFlow: Shipment['status'][] = ['Booked', 'Received', 'OnBoard', 'Discharged', 'Delivered'];
    const currentIndex = statusFlow.indexOf(shipment.status);
    
    if (currentIndex < statusFlow.length - 1) {
      const updatedShipment = {
        ...shipment,
        status: statusFlow[currentIndex + 1],
        lastUpdate: new Date().toISOString()
      };
      
      eventBus.publish('SHIPMENT_UPDATED', updatedShipment);
    }
  }

  private getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'Booked': '#6b7280',
      'Received': '#3b82f6',
      'OnBoard': '#eab308',
      'Discharged': '#f97316',
      'Delivered': '#22c55e'
    };
    return colors[status] || '#6b7280';
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
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
        }
        th {
          text-align: left;
          padding: 1rem;
          background-color: #f9fafb;
          color: #4b5563;
          font-weight: 600;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid #e5e7eb;
        }
        td {
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
          color: #1f2937;
          font-size: 0.95rem;
        }
        tr:hover {
          background-color: #f9fafb;
        }
        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #ffffff;
        }
        .update-btn {
          background-color: transparent;
          color: #2563eb;
          border: 1px solid #2563eb;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.75rem;
          transition: all 0.2s;
        }
        .update-btn:hover {
          background-color: #2563eb;
          color: #ffffff;
        }
        .update-btn:disabled {
          border-color: #d1d5db;
          color: #9ca3af;
          cursor: not-allowed;
          background-color: transparent;
        }
      </style>

      <h2>
        ${i18n.t('dashboard_title')}
        <span style="font-size: 0.875rem; font-weight: normal; color: #6b7280;">Active: ${this.shipments.length}</span>
      </h2>
      
      <table>
        <thead>
          <tr>
            <th>Tracking No.</th>
            <th>Carrier</th>
            <th>Route</th>
            <th>Status</th>
            <th>Last Update</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${this.shipments.map(shipment => `
            <tr>
              <td style="font-weight: 500;">${shipment.trackingNumber}</td>
              <td>${shipment.carrier}</td>
              <td>${shipment.origin} → ${shipment.destination}</td>
              <td>
                <span class="status-badge" style="background-color: ${this.getStatusColor(shipment.status)}">
                  ${shipment.status}
                </span>
              </td>
              <td style="color: #6b7280; font-size: 0.875rem;">${this.formatDate(shipment.lastUpdate)}</td>
              <td>
                <button 
                  class="update-btn" 
                  data-id="${shipment.id}"
                  ${shipment.status === 'Delivered' ? 'disabled' : ''}
                >
                  Advance
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    this.setupEventListeners();
  }
}

customElements.define('shipment-dashboard', ShipmentDashboard);