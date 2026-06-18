'use server'
import { z } from 'zod';

import { 
  getStoreRates, appendRate,
  getStoreShipments, appendShipment, updateStoreShipment, addStoreMilestone,
  getStoreDocuments, appendDocument,
  getStoreUsers, appendUser, updateStoreUserStatus
} from '@/lib/store';
import { Rate, Shipment, Milestone, DocumentRecord, User } from '@/types/scm';
import { revalidatePath } from 'next/cache';

// Rates
export async function fetchRates(): Promise<Rate[]> {
  await new Promise(resolve => setTimeout(resolve, 200));
  return getStoreRates();
}


const rateSchema = z.object({
  carrier: z.string().min(2),
  origin: z.string().min(2),
  destination: z.string().min(2),
  mode: z.string(),
  basePrice: z.number().min(0),
  currency: z.string(),
  transitTimeDays: z.number().min(0),
  validity: z.string()
});

export async function createRate(rate: Rate) {
  // Zod Validation
  const parsed = rateSchema.safeParse(rate);
  if (!parsed.success) {
    throw new Error('Validación fallida: ' + parsed.error.issues.map(i => i.path + ' - ' + i.message).join(', '));
  }

  const newRate = { ...rate, id: 'RTE-' + Date.now() };
  appendRate(newRate);
  revalidatePath('/rates');
  return { success: true, rateId: newRate.id };
}

// Shipments (Tracking)
export async function fetchShipments(): Promise<Shipment[]> {
  await new Promise(resolve => setTimeout(resolve, 200));
  return getStoreShipments();
}

export async function fetchShipment(id: string): Promise<Shipment | undefined> {
  const shipments = getStoreShipments();
  return shipments.find(s => s.id === id);
}

export async function createShipment(shipment: Shipment) {
  const newShipment = { ...shipment, id: `SHP-${Date.now()}` };
  appendShipment(newShipment);
  revalidatePath('/tracking');
  return { success: true, shipmentId: newShipment.id };
}

export async function updateShipmentStatusAction(id: string, status: Shipment['status']) {
  updateStoreShipment(id, { status });
  revalidatePath('/tracking');
  return { success: true };
}

export async function recordMilestone(shipmentId: string, milestone: Milestone) {
  const newMilestone = { ...milestone, id: `M-${Date.now()}` };
  addStoreMilestone(shipmentId, newMilestone);
  
  if (milestone.type === 'DELIVERED') {
    updateStoreShipment(shipmentId, { status: 'DELIVERED' });
  } else if (milestone.type === 'DEPARTED') {
    updateStoreShipment(shipmentId, { status: 'IN_TRANSIT' });
  } else if (milestone.type === 'ARRIVED' || milestone.type === 'DISCHARGED') {
    updateStoreShipment(shipmentId, { status: 'ARRIVED' });
  }

  revalidatePath('/tracking');
  return { success: true };
}

// Documents
export async function fetchDocuments(): Promise<DocumentRecord[]> {
  await new Promise(resolve => setTimeout(resolve, 200));
  return getStoreDocuments();
}

export async function createDocument(doc: DocumentRecord) {
  const newDoc = { ...doc, id: `DOC-${Date.now()}` };
  appendDocument(newDoc);
  revalidatePath('/docs');
  return { success: true, docId: newDoc.id };
}

// Users
export async function fetchUsers(): Promise<User[]> {
  await new Promise(resolve => setTimeout(resolve, 100));
  return getStoreUsers();
}

export async function createUser(user: Omit<User, 'id' | 'createdAt'>) {
  const newUser: User = { 
    ...user, 
    id: `USR-${Date.now()}`,
    createdAt: new Date().toISOString().split('T')[0]
  };
  appendUser(newUser);
  revalidatePath('/users');
  return { success: true, userId: newUser.id };
}

export async function toggleUserStatus(id: string, currentStatus: 'ACTIVE' | 'INACTIVE') {
  updateStoreUserStatus(id, currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
  revalidatePath('/users');
  return { success: true };
}
