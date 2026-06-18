import { db } from './db';
import { DocumentRecord, DocumentType, DocumentStatus } from '@/types/schema';

export class DocumentationService {
  
  // Data Access layer methods
  public async getAllDocuments(): Promise<DocumentRecord[]> {
    return db.getDocuments();
  }

  public async getDocumentById(id: string): Promise<DocumentRecord | undefined> {
    return db.getDocumentById(id);
  }

  public async getDocumentsByBooking(bookingRef: string): Promise<DocumentRecord[]> {
    const docs = await db.getDocuments();
    return docs.filter(d => d.bookingRef === bookingRef);
  }

  // Business Logic layer methods
  public async createDraftDocument(data: Partial<DocumentRecord>): Promise<DocumentRecord> {
    const docData: Omit<DocumentRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      bookingRef: data.bookingRef || 'UNKNOWN',
      type: data.type || 'HBL',
      documentNumber: data.documentNumber || `DOC-${Math.floor(Math.random() * 10000)}`,
      issueDate: new Date().toISOString(),
      status: 'DRAFT',
      payload: data.payload || {}
    };
    
    return db.createDocument(docData);
  }

  public async issueDocument(id: string): Promise<DocumentRecord | null> {
    const docs = await db.getDocuments();
    const doc = docs.find(d => d.id === id);
    if (!doc) return null;
    
    // Business rule: Only drafts can be issued
    if (doc.status !== 'DRAFT') {
      throw new Error('Solo los documentos en formato DRAFT pueden ser emitidos.');
    }

    doc.status = 'ISSUED';
    doc.updatedAt = new Date().toISOString();
    return doc; // in a real DB this would trigger an update mutation
  }
}

export const docsService = new DocumentationService();
