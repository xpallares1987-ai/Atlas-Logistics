const API_BASE_URL = 'http://localhost:3000/api';

export class FinancialService {
  public async getInvoices() {
    const res = await fetch(`${API_BASE_URL}/financial/invoices`);
    if (!res.ok) throw new Error('Failed to fetch invoices');
    return res.json();
  }

  public async getInvoiceById(id: number) {
    const res = await fetch(`${API_BASE_URL}/financial/invoices/${id}`);
    if (!res.ok) throw new Error('Failed to fetch invoice');
    return res.json();
  }

  public async createInvoice(data: any) {
    const res = await fetch(`${API_BASE_URL}/financial/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create invoice');
    return res.json();
  }

  public async getShipmentPnL(shipmentId: number) {
    const res = await fetch(`${API_BASE_URL}/financial/shipments/${shipmentId}/pnl`);
    if (!res.ok) throw new Error('Failed to fetch PnL');
    return res.json();
  }
}

export const financialService = new FinancialService();
