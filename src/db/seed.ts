import "dotenv/config";
import { db } from "./db.config.js";
import {
  users,
  shipments,
  rates,
  quotes,
  invoices,
  locations,
  companies,
  companyTypeEnum,
} from "./schema.js";
import { faker } from "@faker-js/faker";

async function main() {
  console.log("🌱 Starting Realistic Database Seed with new schema...");

  try {
    // 1. Delete existing data (reverse order of dependencies)
    console.log("Clearing existing data...");
    await db.delete(invoices);
    await db.delete(quotes);
    await db.delete(rates);
    await db.delete(shipments);
    await db.delete(companies);
    await db.delete(locations);
    await db.delete(users);

    // 2. Generate 15 Users
    console.log("Generating Users...");
    const roles = [
      "ADMIN",
      "EXECUTIVE",
      "MANAGER",
      "SALES",
      "OPERATIONS",
      "CUSTOMER",
    ];
    const insertedUsers = [];

    for (let i = 0; i < 15; i++) {
      const [user] = await db
        .insert(users)
        .values({
          email: faker.internet.email(),
          role: faker.helpers.arrayElement(roles),
          createdAt: faker.date.past(),
        })
        .returning();
      insertedUsers.push(user);
    }
    console.log(`✅ ${insertedUsers.length} Users created.`);

    // 2.1 Generate Locations
    console.log("Generating Locations...");
    const insertedLocations = [];
    for (let i = 0; i < 15; i++) {
      const [loc] = await db
        .insert(locations)
        .values({
          unlocode: faker.string.alpha({ length: 5, casing: "upper" }),
          name: faker.location.city(),
          country: faker.location.countryCode(),
          isSeaport: true,
          isAirport: false,
        })
        .returning();
      insertedLocations.push(loc);
    }

    // 2.2 Generate Companies
    console.log("Generating Companies...");
    const insertedCompanies = [];
    const insertedCarriers = [];
    for (let i = 0; i < 20; i++) {
      const type = faker.helpers.arrayElement([
        "Customer",
        "Supplier",
        "Carrier",
      ]);
      const [comp] = await db
        .insert(companies)
        .values({
          companyCode: `COMP-${faker.string.alphanumeric(6).toUpperCase()}`,
          name: faker.company.name(),
          type: type as any,
        })
        .returning();
      insertedCompanies.push(comp);
      if (type === "Carrier") insertedCarriers.push(comp);
    }
    if (insertedCarriers.length === 0) {
      const [comp] = await db
        .insert(companies)
        .values({
          companyCode: `COMP-CARRIER1`,
          name: "Maersk",
          type: "Carrier",
        })
        .returning();
      insertedCarriers.push(comp);
      insertedCompanies.push(comp);
    }

    // 3. Generate 150 Shipments
    console.log("Generating Shipments...");
    const statuses = [
      "DRAFT",
      "CONFIRMED",
      "DOCUMENTATION",
      "ON_BOARD",
      "BOOKED",
      "IN_TRANSIT",
      "ARRIVED",
      "CUSTOMS_CLEARED",
      "DELIVERED",
      "CANCELLED",
    ];
    const equipments = ["1x 20DC", "2x 40HC", "10x 40RF", "1x 40OT", "5x 20DC"];

    const insertedShipments = [];
    for (let i = 0; i < 150; i++) {
      const origin = faker.helpers.arrayElement(insertedLocations);
      let destination = faker.helpers.arrayElement(insertedLocations);
      while (origin.id === destination.id) {
        destination = faker.helpers.arrayElement(insertedLocations);
      }

      const randomUser = faker.helpers.arrayElement(insertedUsers);
      const supplier = faker.helpers.arrayElement(insertedCompanies);
      const billingParty = faker.helpers.arrayElement(insertedCompanies);

      const [shipment] = await db
        .insert(shipments)
        .values({
          referenceNumber: `BKG-${faker.string.alphanumeric(8).toUpperCase()}`,
          originLocationId: origin.id,
          destinationLocationId: destination.id,
          supplierId: supplier.id,
          billingPartyId: billingParty.id,
          vessel: `MSC ${faker.person.firstName()}`,
          voyage: faker.string.alphanumeric(5).toUpperCase(),
          status: faker.helpers.arrayElement(statuses) as any,
          userId: randomUser.id,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
        })
        .returning();
      insertedShipments.push(shipment);
    }
    console.log(`✅ ${insertedShipments.length} Shipments created.`);

    // 4. Generate 20 Rates
    console.log("Generating Rates...");
    const serviceLines = ["AE1", "Silk", "FE2", "FAL1", "CEM", "MD1"];

    for (let i = 0; i < 20; i++) {
      await db.insert(rates).values({
        carrierId: faker.helpers.arrayElement(insertedCarriers).id,
        serviceLine: faker.helpers.arrayElement(serviceLines),
        originLocationId: faker.helpers.arrayElement(insertedLocations).id,
        destinationLocationId: faker.helpers.arrayElement(insertedLocations).id,
        transitTime: faker.number.int({ min: 14, max: 45 }),
        validTo: faker.date.future().toISOString().split("T")[0],
        baseOceanFreight: faker.number.int({ min: 800, max: 2500 }),
        baf: faker.number.int({ min: 100, max: 300 }),
        pss: faker.number.int({ min: 0, max: 200 }),
        thc: faker.number.int({ min: 150, max: 400 }),
      });
    }
    console.log(`✅ 20 Rates created.`);

    // 5. Generate 50 Quotes
    console.log("Generating Quotes...");
    const quoteStatuses = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"];

    for (let i = 0; i < 50; i++) {
      const buyRate = faker.number.int({ min: 1200, max: 3500 });
      const margin = faker.number.int({ min: 150, max: 500 });
      await db.insert(quotes).values({
        quoteNumber: `QT-${faker.string.alphanumeric(8).toUpperCase()}`,
        customerId: faker.helpers.arrayElement(insertedCompanies).id,
        originLocationId: faker.helpers.arrayElement(insertedLocations).id,
        destinationLocationId: faker.helpers.arrayElement(insertedLocations).id,
        equipment: faker.helpers.arrayElement(equipments),
        buyRateTotal: buyRate,
        sellMargin: margin,
        sellRateTotal: buyRate + margin,
        status: faker.helpers.arrayElement(quoteStatuses) as any,
        validTo: faker.date.future().toISOString().split("T")[0],
        userId: faker.helpers.arrayElement(insertedUsers).id,
      });
    }
    console.log(`✅ 50 Quotes created.`);

    // 6. Generate 100 Invoices
    console.log("Generating Invoices...");
    const invoiceStatuses = ["Paid", "Pending", "Overdue"];
    const invoiceTypes = ["AR", "AP"];

    for (let i = 0; i < 100; i++) {
      const type = faker.helpers.arrayElement(invoiceTypes);
      const isAR = type === "AR";
      await db.insert(invoices).values({
        invoiceNumber: `INV-${type}-${faker.string.alphanumeric(8).toUpperCase()}`,
        type: type as any,
        partyId: faker.helpers.arrayElement(insertedCompanies).id,
        totalAmount: faker.number.int({ min: 500, max: 15000 }),
        currency: faker.helpers.arrayElement(["USD", "EUR"]),
        status: faker.helpers.arrayElement(invoiceStatuses) as any,
        dueDate: faker.date.soon({ days: 30 }).toISOString().split("T")[0],
        shipmentId: faker.helpers.arrayElement(insertedShipments).id,
      });
    }
    console.log(`✅ 100 Invoices created.`);

    console.log("🎉 Realistic Seed completed successfully!");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
  } finally {
    process.exit(0);
  }
}

main();
