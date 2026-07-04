import { db } from './client.js';
import { carriers, surcharge_types, freight_rates, surcharges, shipments, users } from './schema.js';
import { eventBus } from '../core/event-bus.js';
import argon2 from 'argon2';

async function seed() {
  console.log('🌱 Seeding database with realistic logistics data...');

  // 0. Users
  console.log('Inserting default users...');
  const adminPassword = await argon2.hash('control-tower-2027');
  await db.insert(users).values({
    username: 'admin',
    email: 'admin@control-tower.io',
    password_hash: adminPassword,
    role: 'admin'
  });

  // 1. Carriers
  console.log('Inserting carriers...');
  const carrierData = [
    { name: 'Maersk Line', code: 'MAEU' },
    { name: 'MSC (Mediterranean Shipping Company)', code: 'MSCU' },
    { name: 'COSCO Shipping', code: 'COSU' },
    { name: 'Hapag-Lloyd', code: 'HLCU' },
    { name: 'CMA CGM', code: 'CMAC' },
    { name: 'ONE (Ocean Network Express)', code: 'ONEU' },
    { name: 'Evergreen Marine', code: 'EGLV' },
  ];

  const insertedCarriers = await db.insert(carriers).values(carrierData).returning();

  // 2. Surcharge Types
  console.log('Inserting surcharge types...');
  const surchargeTypeData = [
    { name: 'BAF', description: 'Bunker Adjustment Factor (Fuel)' },
    { name: 'THC', description: 'Terminal Handling Charge' },
    { name: 'LSS', description: 'Low Sulfur Surcharge' },
    { name: 'ISPS', description: 'International Ship and Port Facility Security' },
    { name: 'PSS', description: 'Peak Season Surcharge' },
    { name: 'VGM', description: 'Verified Gross Mass' },
  ];

  const insertedSurchargeTypes = await db.insert(surcharge_types).values(surchargeTypeData).returning();

  // 3. Freight Rates & Surcharges
  console.log('Inserting freight rates and surcharges...');
  const routes = [
    { origin: 'CNSHA (Shanghai)', destination: 'ESBCN (Barcelona)' },
    { origin: 'CNSHA (Shanghai)', destination: 'ESVLC (Valencia)' },
    { origin: 'ESBCN (Barcelona)', destination: 'USNYC (New York)' },
    { origin: 'ESVLC (Valencia)', destination: 'USLSA (Los Angeles)' },
    { origin: 'INNSA (Nhava Sheva)', destination: 'ESBCN (Barcelona)' },
  ];

  for (const carrier of insertedCarriers) {
    for (const route of routes) {
      const baseRate = Math.floor(Math.random() * (2500 - 800 + 1) + 800);
      
      const [rate] = await db.insert(freight_rates).values({
        carrier_id: carrier.id,
        origin_port: route.origin,
        destination_port: route.destination,
        currency: 'USD',
        base_rate: baseRate.toString(),
        valid_from: new Date().toISOString().split('T')[0],
        valid_to: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +90 days
      }).returning();

      // Add 2-3 random surcharges per rate
      const selectedTypes = insertedSurchargeTypes.sort(() => 0.5 - Math.random()).slice(0, 3);
      for (const type of selectedTypes) {
        await db.insert(surcharges).values({
          freight_rate_id: rate.id,
          surcharge_type_id: type.id,
          amount: (Math.random() * (300 - 50) + 50).toFixed(2),
          currency: 'USD',
        });
      }
    }
  }

  // 4. Shipments
  console.log('Inserting shipments...');
  const shipmentStatuses = ['Booked', 'Received', 'OnBoard', 'Discharged', 'Delivered'] as const;
  const shipmentModes = ['Ocean FCL', 'Ocean LCL', 'Air', 'Road'] as const;
  const shipmentTypes = ['Direct', 'MBL', 'HBL'] as const;
  
  for (let i = 0; i < 15; i++) {
    const randomCarrier = insertedCarriers[Math.floor(Math.random() * insertedCarriers.length)];
    const randomStatus = shipmentStatuses[Math.floor(Math.random() * shipmentStatuses.length)];
    const randomMode = shipmentModes[Math.floor(Math.random() * shipmentModes.length)];
    const randomType = shipmentTypes[Math.floor(Math.random() * shipmentTypes.length)];
    const trackingNum = `AWB-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const etsDate = new Date();
    etsDate.setDate(etsDate.getDate() + Math.floor(Math.random() * 10)); // ETS en los próximos 10 días
    
    const etaDate = new Date(etsDate);
    etaDate.setDate(etaDate.getDate() + Math.floor(Math.random() * 20) + 15); // ETA 15-35 días después de ETS

    const [newShipment] = await db.insert(shipments).values({
      tracking_number: trackingNum,
      carrier_id: randomCarrier.id,
      status: randomStatus,
      type: randomType,
      mode: randomMode,
      origin_port: 'CNSHA',
      destination_port: 'ESBCN',
      ets: etsDate,
      eta: etaDate,
    }).returning();

    // Sincronización con Firestore mediante el Event Bus usando publish en lugar de emit
    eventBus.publish('shipment:created', newShipment);
  }

  console.log('✅ Seeding completed successfully!');
  
  // Retardo para permitir que las promesas asíncronas de Firestore (Event Bus) se resuelvan antes de matar el proceso
  setTimeout(() => process.exit(0), 2000);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});