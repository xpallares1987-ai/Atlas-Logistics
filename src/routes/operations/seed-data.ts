import crypto from "crypto";
import { db } from "../../db/index.js";
import {
  shipments,
  shipmentContainers,
  bookings,
  cargoItems,
  warehouseTraffic,
} from "../../db/schema/operations.js";
import { companies, locations } from "../../db/schema/core.js";
import { warehouseInventory } from "../../db/schema/support.js";
import { eq } from "drizzle-orm";

export async function ensureOperationsSeedData() {
  // 1. Companies
  const existingComp = await db
    .select()
    .from(companies)
    .where(eq(companies.id, "c-1"))
    .limit(1);
  if (existingComp.length === 0) {
    await db
      .insert(companies)
      .values([
        { id: "c-1", name: "Demo Customer Ltd", taxId: "ESA12345678" },
        { id: "c-2", name: "Tech Solutions", taxId: "ESB12345678" },
        { id: "c-3", name: "Food Logistics", taxId: "ESC12345678" },
        { id: "c-4", name: "Global Packaging", taxId: "ESD12345678" },
        { id: "comp_1", name: "Atlas Forwarding", taxId: "ESE12345678" },
      ])
      .onConflictDoNothing();
  }

  // 2. Locations
  const existingLoc = await db
    .select()
    .from(locations)
    .where(eq(locations.id, "WH-BCN-01"))
    .limit(1);
  if (existingLoc.length === 0) {
    await db
      .insert(locations)
      .values([
        {
          id: "WH-BCN-01",
          type: "WAREHOUSE",
          name: "Barcelona Hub",
          address: "BCN Port",
          companyId: "c-1",
        },
        {
          id: "WH-EXT-VAL",
          type: "WAREHOUSE",
          name: "Valencia Logistics",
          address: "VAL Port",
          companyId: "c-2",
        },
      ])
      .onConflictDoNothing();
  }

  // 3. Demo Shipment for cargo items / containers
  const existingShip = await db
    .select()
    .from(shipments)
    .where(eq(shipments.id, "sh_demo_master"))
    .limit(1);
  if (existingShip.length === 0) {
    await db
      .insert(shipments)
      .values({
        id: "sh_demo_master",
        status: "Pending",
        serviceType: "LCL",
        origin: "Shanghai, CN",
        destination: "Barcelona, ES",
        companyId: "c-1",
      })
      .onConflictDoNothing();
  }

  // 4. Bookings
  const existingBooking = await db.select().from(bookings).limit(1);
  if (existingBooking.length === 0) {
    const { randomUUID } = crypto;
    const mockBookings = [
      {
        id: randomUUID(),
        referenceNumber: "BKG-A1B2C3",
        customerId: "c-1",
        status: "Pending",
        origin: "Shanghai, CN",
        destination: "Los Angeles, US",
        serviceType: "FCL",
        equipment: "40HC",
        cargoDetails: JSON.stringify([
          { description: "Electronics", grossWeightKg: 12000 },
        ]),
        estimatedDeparture: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        referenceNumber: "BKG-X9Y8Z7",
        customerId: "c-2",
        status: "Pending",
        origin: "Rotterdam, NL",
        destination: "New York, US",
        serviceType: "LCL",
        equipment: "Pallets",
        cargoDetails: JSON.stringify([
          { description: "Machinery Parts", grossWeightKg: 3500 },
        ]),
        estimatedDeparture: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        referenceNumber: "BKG-M5N6O7",
        customerId: "c-1",
        status: "Confirmed",
        origin: "Shenzhen, CN",
        destination: "Hamburg, DE",
        serviceType: "FCL",
        equipment: "20DC",
        vessel: "CMA CGM Marco Polo",
        voyage: "043E",
        cargoDetails: JSON.stringify([
          { description: "Toys", grossWeightKg: 8000 },
        ]),
        estimatedDeparture: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await db.insert(bookings).values(mockBookings);
  }

  // 5. Warehouse Traffic
  const existingTraffic = await db.select().from(warehouseTraffic).limit(1);
  if (existingTraffic.length === 0) {
    const mockTraffic = [
      {
        id: "TRK-901",
        deviceNumber: "7892-LMX",
        deviceType: "TRUCK",
        status: "WAITING",
        eta: "10:30 AM",
        assignedDock: "DOCK-1",
        cargoDescription: "4 Reels (Paper Rolls)",
        totalWeightExpected: 100000,
        expectedQuantity: 4,
        type: "INBOUND",
      },
      {
        id: "TRK-902",
        deviceNumber: "7893-LMX",
        deviceType: "TRUCK",
        status: "DOCK_ASSIGNED",
        eta: "11:00 AM",
        assignedDock: "DOCK-2",
        cargoDescription: "10 Pallets (Electronics)",
        totalWeightExpected: 5000,
        expectedQuantity: 10,
        type: "OUTBOUND",
      },
    ];
    await db.insert(warehouseTraffic).values(mockTraffic);
  }

  // 6. Warehouse Inventory
  const existingInventory = await db.select().from(warehouseInventory).limit(1);
  if (existingInventory.length === 0) {
    const mockInventory = [
      {
        id: "SKU-A101-1",
        locationId: "WH-BCN-01",
        ownership: "INTERNAL",
        customer: "Global Packaging",
        productCode: "SKU-A101",
        itemDescription: "Paper Rolls",
        quantity: 4,
        status: "AVAILABLE",
        zone: "DRY",
      },
      {
        id: "SKU-B202-1",
        locationId: "WH-EXT-VAL",
        ownership: "EXTERNAL",
        customer: "Tech Solutions",
        productCode: "SKU-B202",
        itemDescription: "Electronics",
        quantity: 10,
        status: "RESERVED",
        zone: "DRY",
      },
      {
        id: "SKU-C303-1",
        locationId: "WH-BCN-01",
        ownership: "INTERNAL",
        customer: "Food Logistics",
        productCode: "SKU-C303",
        itemDescription: "Frozen Goods",
        quantity: 2,
        status: "AVAILABLE",
        zone: "COLD",
      },
    ];
    await db.insert(warehouseInventory).values(mockInventory);
  }
}
