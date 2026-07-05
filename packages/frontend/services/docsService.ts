import { DocumentRecord } from '@/types/schema';

const API_BASE_URL = 'http://localhost:3000/api';

export class DocumentationService {
  
  public async getAllDocuments(): Promise<DocumentRecord[]> {
    const res = await fetch(`${API_BASE_URL}/documents`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    if (!res.ok) throw new Error('Failed to fetch documents');
    const data = await res.json();
    return data.data;
  }

  public async getDocumentById(id: string): Promise<DocumentRecord | undefined> {
    const docs = await this.getAllDocuments();
    return docs.find(d => d.id === id);
  }

  public async getDocumentsByBooking(bookingRef: string): Promise<DocumentRecord[]> {
    const docs = await this.getAllDocuments();
    return docs.filter(d => d.bookingRef === bookingRef);
  }

  public async createDraftDocument(data: Partial<DocumentRecord>): Promise<DocumentRecord> {
    const res = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        bookingRef: data.bookingRef || 'UNKNOWN',
        type: data.type || 'HBL',
        payload: data.payload || {}
      })
    });
    if (!res.ok) throw new Error('Failed to create document');
    return res.json();
  }

  public async issueDocument(id: string): Promise<DocumentRecord | null> {
    const res = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(id)}/issue`, {
      method: 'PATCH',
      headers: { 'Authorization': 'Bearer test-token' }
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to issue document');
    }
    return res.json();
  }
}

export const docsService = new DocumentationService();
