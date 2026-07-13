import 'dotenv/config';
import { db } from './db.config';
import { users, shipments } from './schema';

async function main() {
  console.log('🌱 Starting Database Seed...');
  
  try {
    // 1. Insert User
    const [newUser] = await db.insert(users).values({
      email: `admin_${Date.now()}@atlas-logistics.com`,
      role: 'ADMIN'
    }).returning();
    
    console.log(`✅ User created: ${newUser.id} (${newUser.email})`);

    // 2. Insert Shipment
    const [newShipment] = await db.insert(shipments).values({
      referenceNumber: `SHP-TEST-${Math.floor(Math.random() * 10000)}`,
      origin: 'Shenzhen, CN',
      destination: 'Valencia, ES',
      status: 'BOOKED',
      userId: newUser.id
    }).returning();

    console.log(`✅ Shipment created: ${newShipment.referenceNumber} linked to user ${newShipment.userId}`);
    
    console.log('🎉 Seed completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    process.exit(0);
  }
}

main();
