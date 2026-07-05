/**
 * data-store.ts
 * Zustand store for the dashboard data.
 * Persists to IndexedDB via a simple serialisation layer.
 */
'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  DashboardStore,
  OperationalRow,
  FinancialRow,
  ExceptionRow,
  UploadedFile,
  KpiMetrics,
  LaneVolume,
} from '../types/dashboard';

// ─── IndexedDB storage adapter ────────────────────────────────────────────────

// Cache the DB instance so we don't pay the open() overhead on every read/write.
let _dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!_dbPromise) {
    _dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('shipment-dashboard', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        _dbPromise = null; // allow retry on next call
        reject(req.error);
      };
    });
  }
  return _dbPromise;
}

const idbStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof indexedDB === 'undefined') return null;
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const get = db.transaction('kv', 'readonly').objectStore('kv').get(name);
        get.onsuccess = () => resolve(get.result ?? null);
        get.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (typeof indexedDB === 'undefined') return;
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(value, name);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // ignore storage failures
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (typeof indexedDB === 'undefined') return;
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').delete(name);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // ignore storage failures
    }
  },
};

// ─── Store actions ─────────────────────────────────────────────────────────────

interface StoreActions {
  addOperational: (rows: OperationalRow[], file: UploadedFile) => void;
  addFinancial:   (rows: FinancialRow[],   file: UploadedFile) => void;
  addExceptions:  (rows: ExceptionRow[],   file: UploadedFile) => void;
  clearAll: () => void;
  removeFile: (id: string, type: UploadedFile['type']) => void;
}

const EMPTY_STATE: DashboardStore = {
  operational: [],
  financial:   [],
  exceptions:  [],
  uploadedFiles: [],
  lastImported: null,
};

// Merge rows: keep existing rows whose shipment_ref is NOT in the new set,
// then append all new rows. This implements "upsert by shipment_ref".
function mergeByRef<T extends { shipment_ref: string }>(existing: T[], incoming: T[]): T[] {
  const newRefs = new Set(incoming.map((r) => r.shipment_ref));
  return [...existing.filter((r) => !newRefs.has(r.shipment_ref)), ...incoming];
}

export const useDashboardStore = create<DashboardStore & StoreActions>()(
  persist(
    (set) => ({
      ...EMPTY_STATE,

      addOperational: (rows, file) =>
        set((s) => ({
          operational: mergeByRef(s.operational, rows),
          uploadedFiles: [...s.uploadedFiles.filter((f) => f.id !== file.id), file],
          lastImported: new Date().toISOString(),
        })),

      addFinancial: (rows, file) =>
        set((s) => ({
          financial: mergeByRef(s.financial, rows),
          uploadedFiles: [...s.uploadedFiles.filter((f) => f.id !== file.id), file],
          lastImported: new Date().toISOString(),
        })),

      addExceptions: (rows, file) =>
        set((s) => ({
          exceptions: mergeByRef(s.exceptions, rows),
          uploadedFiles: [...s.uploadedFiles.filter((f) => f.id !== file.id), file],
          lastImported: new Date().toISOString(),
        })),

      removeFile: (id, type) =>
        set((s) => {
          const newFiles = s.uploadedFiles.filter((f) => f.id !== id);
          const remaining = new Set(newFiles.filter((f) => f.type === type).map((f) => f.id));
          // If there are still files of that type, keep all data from those files
          // (simplified: just clear data for the type if no more files remain)
          const cleared = remaining.size === 0;
          return {
            uploadedFiles: newFiles,
            operational: type === 'operational' && cleared ? [] : s.operational,
            financial:   type === 'financial'   && cleared ? [] : s.financial,
            exceptions:  type === 'exception'   && cleared ? [] : s.exceptions,
          };
        }),

      clearAll: () => set(() => ({ ...EMPTY_STATE })),
    }),
    {
      name: 'shipment-dashboard-store',
      storage: createJSONStorage(() => idbStorage as any),
      partialize: (s) => ({
        operational: s.operational,
        financial:   s.financial,
        exceptions:  s.exceptions,
        uploadedFiles: s.uploadedFiles,
        lastImported: s.lastImported,
      }),
    },
  ),
);

// ─── KPI computation (pure, derived from store state) ─────────────────────────

function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  // Support dd/mm/yyyy and ISO formats
  const parts = s.split('/');
  if (parts.length === 3) {
    return new Date(+parts[2], +parts[1] - 1, +parts[0]);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function computeKpis(
  operational: OperationalRow[],
  financial: FinancialRow[],
  exceptions: ExceptionRow[],
): KpiMetrics {
  // On-time: shipments where ata <= eta
  const withAta = operational.filter((r) => r.ata && r.eta);
  const onTime = withAta.filter((r) => {
    const ata = parseDate(r.ata);
    const eta = parseDate(r.eta);
    return ata && eta && ata <= eta;
  });
  const onTimePercent = withAta.length > 0 ? (onTime.length / withAta.length) * 100 : 0;

  // Cost per shipment
  const totalCost = financial.reduce((s, r) => s + (r.cost ?? 0), 0);
  const totalRevenue = financial.reduce((s, r) => s + (r.revenue ?? 0), 0);
  const totalProfit = financial.reduce((s, r) => s + (r.profit ?? 0), 0);
  const costPerShipment = financial.length > 0 ? totalCost / financial.length : 0;

  // Volume by trade lane
  const laneMap = new Map<string, number>();
  for (const r of operational) {
    if (!r.trade_lane) continue;
    laneMap.set(r.trade_lane, (laneMap.get(r.trade_lane) ?? 0) + (r.weight_kg ?? 0));
  }
  const volumeByLane: LaneVolume[] = Array.from(laneMap.entries())
    .map(([lane, weight_kg]) => ({ lane, weight_kg }))
    .sort((a, b) => b.weight_kg - a.weight_kg)
    .slice(0, 10);

  // Financial MTD
  const now = new Date();
  const mtd = financial.filter((r) => {
    const d = parseDate(r.invoice_date);
    return d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const revenueMtd = mtd.reduce((s, r) => s + (r.revenue ?? 0), 0);
  const costMtd    = mtd.reduce((s, r) => s + (r.cost ?? 0), 0);
  const profitMtd  = mtd.reduce((s, r) => s + (r.profit ?? 0), 0);

  const profitMarginPercent = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const outstandingInvoices = financial.filter((r) => r.paid === false).length;

  const activeExceptions   = exceptions.filter((r) => !r.resolved).length;
  const criticalExceptions = exceptions.filter(
    (r) => !r.resolved && r.severity === 'CRITICAL',
  ).length;

  return {
    onTimePercent,
    costPerShipment,
    totalShipments: operational.length,
    volumeByLane,
    revenueMtd,
    costMtd,
    profitMtd,
    profitMarginPercent,
    outstandingInvoices,
    activeExceptions,
    criticalExceptions,
  };
}
