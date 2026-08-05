import { db } from "../src/db/index.js";
import { rates, shipments, companies, carriers, locations, lanes } from "../src/db/schema/index.js";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding Database for UI Modules...");
  try {
    // 1. Ensure basic company exists
    const c1 = await db.select().from(companies).where(eq(companies.id, 'c-1'));
    if (c1.length === 0) {
       await db.insert(companies).values({ id: 'c-1', name: 'Atlas Corporation' });
    }

    // 2. Clear old module data
    await db.delete(rates);
    await db.delete(shipments);

    // 3. Seed Shipments for ESG Tracker
    const mockShipments = [
      { id: "s-101", trackingNumber: "SHP-9921", serviceType: "Ocean", origin: "Shanghai, CN", destination: "Rotterdam, NL", weight: 24000, distanceKm: 19500, co2eTonnes: 3.8, status: "IN_TRANSIT", companyId: 'c-1' },
      { id: "s-102", trackingNumber: "SHP-9922", serviceType: "Air", origin: "Frankfurt, DE", destination: "New York, US", weight: 2500, distanceKm: 6200, co2eTonnes: 14.2, status: "DELIVERED", companyId: 'c-1' },
      { id: "s-103", trackingNumber: "SHP-9923", serviceType: "Road", origin: "Madrid, ES", destination: "Paris, FR", weight: 18000, distanceKm: 1250, co2eTonnes: 1.4, status: "IN_TRANSIT", companyId: 'c-1' },
      { id: "s-104", trackingNumber: "SHP-9924", serviceType: "Ocean", origin: "Singapore, SG", destination: "Los Angeles, US", weight: 48000, distanceKm: 14000, co2eTonnes: 6.7, status: "PENDING", companyId: 'c-1' },
      { id: "s-105", trackingNumber: "SHP-9925", serviceType: "Air", origin: "Hong Kong, HK", destination: "London, UK", weight: 1200, distanceKm: 9600, co2eTonnes: 10.5, status: "IN_TRANSIT", companyId: 'c-1' },
      { id: "s-106", trackingNumber: "SHP-9926", serviceType: "Road", origin: "Berlin, DE", destination: "Warsaw, PL", weight: 22000, distanceKm: 570, co2eTonnes: 0.8, status: "DELIVERED", companyId: 'c-1' },
    ];
    await db.insert(shipments).values(mockShipments);
    console.log("✅ Seeded shipments");

    // Ensure dummy carrier exists for rates to reference
    const car1 = await db.select().from(carriers).where(eq(carriers.id, 'car-maersk'));
    if (car1.length === 0) {
      await db.insert(carriers).values([
        { id: 'car-maersk', name: 'Maersk', type: 'OCEAN', code: 'MAEU' },
        { id: 'car-msc', name: 'MSC', type: 'OCEAN', code: 'MSCU' },
        { id: 'car-cma', name: 'CMA CGM', type: 'OCEAN', code: 'CMAU' },
        { id: 'car-hl', name: 'Hapag-Lloyd', type: 'OCEAN', code: 'HLCU' }
      ]);
    }
    const loc1 = await db.select().from(locations).where(eq(locations.id, 'loc-cnsha'));
    if (loc1.length === 0) {
        await db.insert(locations).values([
            { id: 'loc-cnsha', name: 'Shanghai', type: 'PORT' },
            { id: 'loc-nlrtm', name: 'Rotterdam', type: 'PORT' }
        ]);
        await db.insert(lanes).values([
            { id: 'lane-1', originLocationId: 'loc-cnsha', destinationLocationId: 'loc-nlrtm', distance: 19500 }
        ]);
    }

    // 4. Seed Rates for Dynamic Pricing Engine
    const mockRates = [
      { id: "r-001", carrierId: "car-maersk", laneId: 'lane-1', containerType: "40HC", baseRate: 2450, baf: 300, pss: 150, thc: 250, serviceLine: "AE1", transitDays: 28, validFrom: new Date(), validTo: new Date(Date.now() + 86400000*30) },
      { id: "r-002", carrierId: "car-msc", laneId: 'lane-1', containerType: "40HC", baseRate: 2320, baf: 280, pss: 200, thc: 200, serviceLine: "Lion", transitDays: 30, validFrom: new Date(), validTo: new Date(Date.now() + 86400000*30) },
      { id: "r-003", carrierId: "car-cma", laneId: 'lane-1', containerType: "40HC", baseRate: 2580, baf: 320, pss: 100, thc: 280, serviceLine: "FAL1", transitDays: 26, validFrom: new Date(), validTo: new Date(Date.now() + 86400000*30) },
      { id: "r-004", carrierId: "car-hl", laneId: 'lane-1', containerType: "40HC", baseRate: 2680, baf: 250, pss: 300, thc: 210, serviceLine: "FE2", transitDays: 32, validFrom: new Date(), validTo: new Date(Date.now() + 86400000*30) },
    ];
    await db.insert(rates).values(mockRates);
    console.log("✅ Seeded rates");

    console.log("Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding DB:", error);
    process.exit(1);
  }
}

seed();
