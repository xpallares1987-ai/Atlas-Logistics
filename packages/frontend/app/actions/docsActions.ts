'use server';

import { docsService } from '@/services/docsService';
import { DocumentRecord } from '@/types/schema';

export async function fetchAllDocuments(): Promise<DocumentRecord[]> {
  return await docsService.getAllDocuments();
}

export async function createDocument(data: Partial<DocumentRecord>): Promise<DocumentRecord> {
  return await docsService.createDraftDocument(data);
}

export async function issueDocument(id: string): Promise<DocumentRecord | null> {
  return await docsService.issueDocument(id);
}
