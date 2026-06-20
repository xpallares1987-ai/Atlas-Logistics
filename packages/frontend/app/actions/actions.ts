'use server'
import { z } from 'zod';
import { Rate, Shipment, Milestone, User } from '@/types/scm';
import { DocumentRecord } from '@/types/schema';
import { revalidatePath } from 'next/cache';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
let authToken: string | null = null;

async function getAuthToken(): Promise<string> {
  if (authToken) return authToken;

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'control-tower-2027' })
    });
    if (!res.ok) {
      throw new Error(`Login failed with status ${res.status}`);
    }
    const data = await res.json();
    authToken = data.token;
    return authToken as string;
  } catch (error) {
    console.error('Failed to authenticate Next.js server with Fastify backend:', error);
    throw error;
  }
}

async function authenticatedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  return fetch(`${BACKEND_URL}${path}`, { ...options, headers });
}

// Rates
export async function fetchRates(): Promise<Rate[]> {
  try {
    const res = await authenticatedFetch('/api/freight-rates');
    if (!res.ok) throw new Error('Failed to fetch rates');
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error(error);
    return [];
  }
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
  const parsed = rateSchema.safeParse(rate);
  if (!parsed.success) {
    throw new Error('Validación fallida: ' + parsed.error.issues.map(i => i.path + ' - ' + i.message).join(', '));
  }

  const res = await authenticatedFetch('/api/freight-rates', {
    method: 'POST',
    body: JSON.stringify(rate)
  });
  if (!res.ok) throw new Error('Failed to create rate');
  const data = await res.json();
  revalidatePath('/rates');
  return data;
}

// Shipments (Tracking)
export async function fetchShipments(): Promise<Shipment[]> {
  try {
    const res = await authenticatedFetch('/api/shipments');
    if (!res.ok) throw new Error('Failed to fetch shipments');
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function fetchShipment(id: string): Promise<Shipment | undefined> {
  const shipments = await fetchShipments();
  return shipments.find(s => s.id === id);
}

export async function createShipment(shipment: Shipment) {
  const res = await authenticatedFetch('/api/shipments', {
    method: 'POST',
    body: JSON.stringify(shipment)
  });
  if (!res.ok) throw new Error('Failed to create shipment');
  const data = await res.json();
  revalidatePath('/tracking');
  return data;
}

export async function updateShipmentStatusAction(id: string, status: Shipment['status']) {
  // Fastify expects PATCH /api/shipments/:id/advance, let's call it to advance status
  const res = await authenticatedFetch(`/api/shipments/${id}/advance`, {
    method: 'PATCH'
  });
  if (!res.ok) throw new Error('Failed to advance shipment status');
  revalidatePath('/tracking');
  return { success: true };
}

export async function recordMilestone(shipmentId: string, milestone: Milestone) {
  // We can also advance or just simulate it for now, since Fastify doesn't have a direct milestone API.
  // We can call PATCH to advance status if milestone type maps to status change:
  if (milestone.type === 'DELIVERED' || milestone.type === 'DEPARTED' || milestone.type === 'ARRIVED') {
    await updateShipmentStatusAction(shipmentId, milestone.type as any);
  }
  revalidatePath('/tracking');
  return { success: true };
}

// Documents
export async function fetchDocuments(): Promise<DocumentRecord[]> {
  try {
    const res = await authenticatedFetch('/api/documents');
    if (!res.ok) throw new Error('Failed to fetch documents');
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function createDocument(doc: DocumentRecord) {
  const res = await authenticatedFetch('/api/documents', {
    method: 'POST',
    body: JSON.stringify({
      bookingRef: doc.bookingRef,
      type: doc.type,
      payload: doc.payload
    })
  });
  if (!res.ok) throw new Error('Failed to create document');
  const newDoc = await res.json();
  revalidatePath('/docs');
  return { success: true, docId: newDoc.id };
}

// Users
export async function fetchUsers(): Promise<User[]> {
  try {
    const res = await authenticatedFetch('/api/users');
    if (!res.ok) throw new Error('Failed to fetch users');
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function createUser(user: Omit<User, 'id' | 'createdAt'>) {
  const res = await authenticatedFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: user.name.toLowerCase().replace(/\s+/g, '_'),
      password: 'TemporaryPassword123!',
      email: user.email,
      role: user.role === 'ADMIN' ? 'admin' : 'agent'
    })
  });
  if (!res.ok) throw new Error('Failed to register user');
  revalidatePath('/users');
  return { success: true };
}

export async function toggleUserStatus(id: string, currentStatus: 'ACTIVE' | 'INACTIVE') {
  const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  const res = await authenticatedFetch(`/api/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: newStatus })
  });
  if (!res.ok) throw new Error('Failed to toggle user status');
  revalidatePath('/users');
  return { success: true };
}
