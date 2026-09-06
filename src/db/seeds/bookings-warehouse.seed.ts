import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

export async function seedBookingsWarehouse(ctx: {
  companyIds: string[];
  userIds: string[];
}): Promise<void> {
  const { companyIds, userIds } = ctx;
  // 12. BOOKINGS
  const bookingIds = [];
  for (let i = 0; i < 25; i++) {
    const id = faker.string.uuid();
    bookingIds.push(id);
    await db.insert(schema.bookings).values({
      id,
      customerId: faker.helpers.arrayElement(companyIds),
      status: faker.helpers.arrayElement([
        "Pending",
        "Confirmed",
        "Rejected",
        "Cancelled",
      ]),
      origin: faker.helpers.arrayElement([
        "Shanghai",
        "Ningbo",
        "Shenzhen",
        "Rotterdam",
        "Los Angeles",
      ]),
      destination: faker.helpers.arrayElement([
        "Rotterdam",
        "Los Angeles",
        "New York",
        "Hamburg",
        "Valencia",
      ]),
      serviceType: faker.helpers.arrayElement(["FCL", "LCL", "AIR"]),
      cargoDetails: JSON.stringify({
        description: faker.commerce.productDescription(),
        weight: faker.number.int({ min: 100, max: 20000 }),
      }),
      estimatedDeparture: faker.date.future(),
    });
  }
  console.log(`✅ Creadas ${bookingIds.length} bookings de clientes.`);

  // 13. WAREHOUSE ORDERS & FULFILLMENT TASKS
  const taskStatuses = ["PICK", "PACK", "DISPATCH", "COMPLETED"];
  const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"];
  for (let i = 0; i < 12; i++) {
    const orderId = `ord_${faker.string.uuid().substring(0, 8)}`;
    const customerName = faker.company.name();
    await db.insert(schema.orders).values({
      id: orderId,
      customerName,
      status: i < 4 ? "PENDING" : i < 8 ? "PROCESSING" : "COMPLETED",
      totalAmount: faker.number.float({
        min: 500,
        max: 15000,
        fractionDigits: 2,
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(schema.fulfillmentTasks).values({
      id: `task_${faker.string.uuid().substring(0, 8)}`,
      orderId,
      status: taskStatuses[i % taskStatuses.length],
      priority: priorities[i % priorities.length],
      assignedTo:
        userIds.length > 0 ? faker.helpers.arrayElement(userIds) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  console.log("✅ Creadas órdenes y tareas de fulfillment para almacén.");
}
