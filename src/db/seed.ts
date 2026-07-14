import 'dotenv/config';
import { db } from './db.config.js';
import { users, shipments, rates, quotes, invoices } from './schema.js';
import { faker } from '@faker-js/faker';

async function main() {
  console.log('🌱 Starting Realistic Database Seed...');
  
  try {
    // 1. Delete existing data (reverse order of dependencies)
    console.log('Clearing existing data...');
    await db.delete(invoices);
    await db.delete(quotes);
    await db.delete(rates);
    await db.delete(shipments);
    await db.delete(users);

    // 2. Generate 15 Users
    console.log('Generating Users...');
    const roles = ['ADMIN', 'EXECUTIVE', 'MANAGER', 'SALES', 'OPERATIONS', 'CUSTOMER'];
    const insertedUsers = [];
    
    for (let i = 0; i < 15; i++) {
      const [user] = await db.insert(users).values({
        email: faker.internet.email(),
        role: faker.helpers.arrayElement(roles),
        createdAt: faker.date.past()
      }).returning();
      insertedUsers.push(user);
    }
    console.log(`✅ ${insertedUsers.length} Users created.`);

    // 3. Generate 150 Shipments
    console.log('Generating Shipments...');
    const statuses = ['DRAFT', 'CONFIRMED', 'DOCUMENTATION', 'ON_BOARD', 'BOOKED', 'IN_TRANSIT', 'ARRIVED', 'CUSTOMS_CLEARED', 'DELIVERED', 'CANCELLED'];
    const ports = ['Shanghai, CN', 'Singapore, SG', 'Rotterdam, NL', 'Los Angeles, US', 'Hamburg, DE', 'Antwerp, BE', 'Valencia, ES', 'Dubai, AE', 'Shenzhen, CN', 'New York, US', 'Miami, US', 'Santos, BR', 'Tokyo, JP'];
    const equipments = ['1x 20DC', '2x 40HC', '10x 40RF', '1x 40OT', '5x 20DC'];
    
    const insertedShipments = [];
    for (let i = 0; i < 150; i++) {
      const origin = faker.helpers.arrayElement(ports);
      let destination = faker.helpers.arrayElement(ports);
      while (origin === destination) {
        destination = faker.helpers.arrayElement(ports);
      }
      
      const randomUser = faker.helpers.arrayElement(insertedUsers);
      
      const [shipment] = await db.insert(shipments).values({
        referenceNumber: `BKG-${faker.string.numeric(5)}`,
        customer: faker.company.name(),
        origin,
        destination,
        equipment: faker.helpers.arrayElement(equipments),
        vessel: `MSC ${faker.person.firstName()}`,
        voyage: faker.string.alphanumeric(5).toUpperCase(),
        status: faker.helpers.arrayElement(statuses) as any,
        userId: randomUser.id,
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
      }).returning();
      insertedShipments.push(shipment);
    }
    console.log(`✅ ${insertedShipments.length} Shipments created.`);

    // 4. Generate 20 Rates
    console.log('Generating Rates...');
    const carriers = ['Maersk', 'MSC', 'Hapag-Lloyd', 'CMA CGM', 'Evergreen', 'ONE'];
    const serviceLines = ['AE1', 'Silk', 'FE2', 'FAL1', 'CEM', 'MD1'];
    
    for (let i = 0; i < 20; i++) {
      await db.insert(rates).values({
        carrier: faker.helpers.arrayElement(carriers),
        serviceLine: faker.helpers.arrayElement(serviceLines),
        origin: faker.helpers.arrayElement(ports),
        destination: faker.helpers.arrayElement(ports),
        transitTime: faker.number.int({ min: 14, max: 45 }),
        validTo: faker.date.future().toISOString().split('T')[0],
        baseOceanFreight: faker.number.int({ min: 800, max: 2500 }),
        baf: faker.number.int({ min: 100, max: 300 }),
        pss: faker.number.int({ min: 0, max: 200 }),
        thc: faker.number.int({ min: 150, max: 400 }),
      });
    }
    console.log(`✅ 20 Rates created.`);

    // 5. Generate 50 Quotes
    console.log('Generating Quotes...');
    const quoteStatuses = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'];
    
    for (let i = 0; i < 50; i++) {
      const buyRate = faker.number.int({ min: 1200, max: 3500 });
      const margin = faker.number.int({ min: 150, max: 500 });
      await db.insert(quotes).values({
        quoteNumber: `QT-${faker.string.numeric(6)}`,
        customer: faker.company.name(),
        origin: faker.helpers.arrayElement(ports),
        destination: faker.helpers.arrayElement(ports),
        equipment: faker.helpers.arrayElement(equipments),
        buyRateTotal: buyRate,
        sellMargin: margin,
        sellRateTotal: buyRate + margin,
        status: faker.helpers.arrayElement(quoteStatuses) as any,
        validTo: faker.date.future().toISOString().split('T')[0],
        userId: faker.helpers.arrayElement(insertedUsers).id,
      });
    }
    console.log(`✅ 50 Quotes created.`);

    // 6. Generate 100 Invoices
    console.log('Generating Invoices...');
    const invoiceStatuses = ['Paid', 'Pending', 'Overdue'];
    const invoiceTypes = ['AR', 'AP'];
    
    for (let i = 0; i < 100; i++) {
      const type = faker.helpers.arrayElement(invoiceTypes);
      const isAR = type === 'AR';
      await db.insert(invoices).values({
        invoiceNumber: `INV-${type}-${faker.string.numeric(5)}`,
        type: type as any,
        party: isAR ? faker.company.name() : faker.helpers.arrayElement(carriers),
        amount: faker.number.int({ min: 500, max: 15000 }),
        currency: faker.helpers.arrayElement(['USD', 'EUR']),
        status: faker.helpers.arrayElement(invoiceStatuses) as any,
        dueDate: faker.date.soon({ days: 30 }).toISOString().split('T')[0],
        shipmentId: faker.helpers.arrayElement(insertedShipments).id,
      });
    }
    console.log(`✅ 100 Invoices created.`);

    console.log('🎉 Realistic Seed completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    process.exit(0);
  }
}

main();
