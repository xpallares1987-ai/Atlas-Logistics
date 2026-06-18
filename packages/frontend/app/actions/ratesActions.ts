"use server";

import { z } from 'zod';
import { ContractRate } from '@/app/rates/types';

// Validation schema using Zod
const contractRateSchema = z.object({
  carrier: z.string().min(2, "El nombre del transportista debe tener al menos 2 caracteres"),
  mode: z.enum(['FCL', 'LCL', 'AIR', 'ROAD']),
  pol: z.string().length(5, "El código POL debe tener exactamente 5 caracteres (UN/LOCODE)"),
  pod: z.string().length(5, "El código POD debe tener exactamente 5 caracteres (UN/LOCODE)"),
  equipment: z.string().min(1, "Especifique el equipo (ej. 40HC, 20GP)"),
  baseRate: z.number().min(0, "La tarifa base no puede ser negativa"),
  bafSurcharge: z.number().min(0, "El recargo no puede ser negativo"),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CNY']),
  validFrom: z.string().min(1, "Especifique fecha de inicio de validez"),
  validTo: z.string().min(1, "Especifique fecha de fin de validez"),
  transitTimeDays: z.number().min(1, "El tiempo de tránsito debe ser mayor a 0"),
  allocationsTeu: z.number().min(0, "La asignación no puede ser negativa")
});

export async function addContractRate(rateData: Omit<ContractRate, 'id'>) {
  // Validate data before persistence
  const parsed = contractRateSchema.safeParse(rateData);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map(e => e.message).join(", "));
  }

  // Generate ID and process save
  const newRate: ContractRate = {
    ...parsed.data,
    id: `RTE-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
  };

  // Here it would persist to DB (e.g. Cloud SQL, Firestore). 
  // For now it serves as the secure backend validation layer before returning to client.
  return newRate;
}

// Proxied third-party API simulation for Brent Oil / FX Data
export async function fetchLiveMarketData() {
  // In a real app, this would securely fetch from Bloomberg / ECB without exposing keys to the client.
  // DO NOT use NEXT_PUBLIC variables for these API keys.
  const API_KEY = process.env.MARKET_API_SECRET_KEY; // Only exists server-side
  
  // Simulated backend response:
  return {
    oilPrices: [74.5, 78.2, 83.1, 88.4, 81.3, 85.0],
    exchangeRates: {
      USD: 1.0,
      EUR: 1.08,
      GBP: 1.25,
      CNY: 0.14
    },
    lastUpdated: new Date().toISOString()
  };
}
