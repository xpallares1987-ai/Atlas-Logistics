const API_BASE_URL = 'http://localhost:3000/api';

export class EdiService {
  public async generateEdi(documentId: string, documentType: string, payload: any) {
    const res = await fetch(`${API_BASE_URL}/edi/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({ documentId, documentType, payload })
    });
    if (!res.ok) throw new Error('Failed to generate EDI');
    return res.json();
  }

  public async transmitEdi(ediMessage: string, destinationEndpoint?: string) {
    const res = await fetch(`${API_BASE_URL}/edi/transmit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({ ediMessage, destinationEndpoint })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to transmit EDI');
    }
    return res.json();
  }
}

export const ediService = new EdiService();
