const API_BASE_URL = 'http://localhost:3000/api';

export class CustomsService {
  public async getHsCodes(search?: string) {
    const url = search ? `${API_BASE_URL}/customs/hs-codes?search=${encodeURIComponent(search)}` : `${API_BASE_URL}/customs/hs-codes`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch HS Codes');
    return res.json();
  }

  public async getDeclarations(shipmentId?: number) {
    const url = shipmentId ? `${API_BASE_URL}/customs/declarations?shipment_id=${shipmentId}` : `${API_BASE_URL}/customs/declarations`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch declarations');
    return res.json();
  }

  public async createDeclaration(data: any) {
    const res = await fetch(`${API_BASE_URL}/customs/declarations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create declaration');
    return res.json();
  }

  public async updateDeclarationStatus(id: number, status: string, clearanceDate?: string) {
    const payload: any = { status };
    if (clearanceDate) payload.clearance_date = clearanceDate;
    
    const res = await fetch(`${API_BASE_URL}/customs/declarations/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update declaration status');
    return res.json();
  }
}

export const customsService = new CustomsService();
