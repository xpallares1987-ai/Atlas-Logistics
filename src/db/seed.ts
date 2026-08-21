import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";
import * as schema from "./schema/index.js";
import "dotenv/config";

// Provide fallback since .env might not have TURSO_URL or LOCAL_DB_URL yet.
const client = createClient({ url: "file:atlas-erp-v2.db" });
const db = drizzle(client, { schema });

async function main() {
  console.log("🌱 Comenzando la inyección masiva de datos realistas (Seed)...");

  console.log(
    "⚙️ Creando Triggers e inyectando lógica avanzada (Sequences)...",
  );

  // Create Sequence generator Trigger
  await db.run(sql`DROP TRIGGER IF EXISTS trg_auto_invoice_sequence`);
  await db.run(sql`
    CREATE TRIGGER trg_auto_invoice_sequence
    AFTER INSERT ON invoices
    WHEN NEW.invoiceNumber IS NULL OR NEW.invoiceNumber = ''
    BEGIN
      INSERT INTO system_sequences (name, current_value, prefix)
      VALUES ('invoice_seq', 1, 'INV-')
      ON CONFLICT(name) DO UPDATE SET current_value = current_value + 1;
      
      UPDATE invoices
      SET invoiceNumber = (SELECT prefix || printf('%06d', current_value) FROM system_sequences WHERE name = 'invoice_seq')
      WHERE id = NEW.id;
    END;
  `);

  // Create Audit Trigger for Shipments
  await db.run(sql`DROP TRIGGER IF EXISTS trg_audit_shipment_status`);
  await db.run(sql`
    CREATE TRIGGER trg_audit_shipment_status
    AFTER UPDATE OF status ON shipments
    WHEN OLD.status != NEW.status
    BEGIN
      INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data)
      VALUES (
        'shipments',
        NEW.id,
        'STATUS_CHANGE',
        OLD.status,
        NEW.status
      );
    END;
  `);

  // 1. COMPANIES
  const companyIds = [];
  for (let i = 0; i < 5; i++) {
    const id = faker.string.uuid();
    companyIds.push(id);
    await db.insert(schema.companies).values({
      id,
      name: faker.company.name(),
      taxId: faker.finance.accountNumber(9),
      creditLimit: faker.number.int({ min: 10000, max: 1000000 }),
    });
  }
  console.log(`✅ Creadas ${companyIds.length} compañías.`);

  // 2. USERS & CONTACTS
  const userIds = [];
  for (const companyId of companyIds) {
    // Users
    for (let i = 0; i < 3; i++) {
      const id = faker.string.uuid();
      userIds.push(id);
      await db.insert(schema.users).values({
        id,
        companyId,
        email: faker.internet.email(),
        role: i === 0 ? "ADMIN" : "OPERATOR",
      });
    }

    // Contacts
    for (let i = 0; i < 2; i++) {
      await db.insert(schema.contacts).values({
        id: faker.string.uuid(),
        companyId,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
      });
    }
  }
  console.log(`✅ Creados ${userIds.length} usuarios y contactos.`);

  // 3. LOCATIONS (Ports, Warehouses)
  const locationIds = [];
  const ports = [
    "Port of Shanghai",
    "Port of Singapore",
    "Port of Ningbo-Zhoushan",
    "Port of Shenzhen",
    "Port of Guangzhou",
    "Port of Busan",
    "Port of Qingdao",
    "Port of Hong Kong",
    "Port of Tianjin",
    "Port of Rotterdam",
    "Port of Jebel Ali",
    "Port of Antwerp",
    "Port of Klang",
    "Port of Xiamen",
    "Port of Kaohsiung",
    "Port of Los Angeles",
    "Port of Hamburg",
    "Port of Long Beach",
    "Port of New York/New Jersey",
    "Port of Valencia",
  ];
  for (const port of ports) {
    const id = faker.string.uuid();
    locationIds.push(id);
    await db.insert(schema.locations).values({
      id,
      name: port,
      type: "PORT",
      address: faker.location.streetAddress(),
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    });
  }
  console.log(
    `✅ Creadas ${locationIds.length} ubicaciones (puertos principales).`,
  );

  // 4. LANES (Rutas)
  const laneIds = [];
  for (let i = 0; i < 20; i++) {
    const origin = faker.helpers.arrayElement(locationIds);
    let dest = faker.helpers.arrayElement(locationIds);
    while (dest === origin) dest = faker.helpers.arrayElement(locationIds);

    const id = faker.string.uuid();
    laneIds.push(id);
    await db.insert(schema.lanes).values({
      id,
      originLocationId: origin,
      destinationLocationId: dest,
      distance: faker.number.int({ min: 1000, max: 15000 }),
    });
  }
  console.log(`✅ Creadas ${laneIds.length} rutas (lanes).`);

  // 5. CARRIERS & OTHER AGENTS
  const carrierIds = [];
  const oceanCarriers = [
    "Maersk",
    "MSC",
    "CMA CGM",
    "COSCO",
    "Hapag-Lloyd",
    "ONE",
    "Evergreen",
    "HMM",
    "Yang Ming",
    "ZIM",
  ];
  for (const name of oceanCarriers) {
    const id = faker.string.uuid();
    carrierIds.push(id);
    await db.insert(schema.carriers).values({
      id,
      name,
      scac: name.substring(0, 4).toUpperCase(),
      type: "OCEAN",
    });
  }

  const brokerIds = [];
  for (let i = 0; i < 5; i++) {
    const id = faker.string.uuid();
    brokerIds.push(id);
    await db.insert(schema.customsBrokers).values({
      id,
      name: faker.company.name() + " Customs",
      licenseNumber: faker.string.alphanumeric(8).toUpperCase(),
    });
  }

  // 6. RATES & SCHEDULES
  const rateIds = [];
  const scheduleIds = [];
  for (const laneId of laneIds) {
    const carrierId = faker.helpers.arrayElement(carrierIds);

    // Rate
    const rateId = faker.string.uuid();
    rateIds.push(rateId);
    await db.insert(schema.rates).values({
      id: rateId,
      carrierId,
      laneId,
      containerType: faker.helpers.arrayElement(["20DC", "40HC", "40NOR"]),
      baseRate: faker.number.int({ min: 800, max: 4500 }),
      transitDays: faker.number.int({ min: 10, max: 45 }),
    });

    // Schedule
    for (let i = 0; i < 3; i++) {
      const schedId = faker.string.uuid();
      scheduleIds.push(schedId);
      const departure = faker.date.future();
      const arrival = new Date(departure);
      arrival.setDate(
        arrival.getDate() + faker.number.int({ min: 10, max: 45 }),
      );

      await db.insert(schema.schedules).values({
        id: schedId,
        laneId,
        carrierId,
        vesselName: "MV " + faker.person.lastName().toUpperCase(),
        voyageNumber: faker.string.alphanumeric(6).toUpperCase(),
        departureDate: departure,
        arrivalDate: arrival,
      });
    }
  }
  console.log(
    `✅ Creadas tarifas y ${scheduleIds.length} itinerarios de barcos.`,
  );

  // 7. SHIPMENTS & CUSTOMS & CONTAINERS
  const shipmentIds = [];
  const incoterms = ["FOB", "CIF", "EXW", "DDP", "FAS"];
  for (let i = 0; i < 50; i++) {
    const id = faker.string.uuid();
    shipmentIds.push(id);
    const companyId = faker.helpers.arrayElement(companyIds);

    await db.insert(schema.shipments).values({
      id,
      status: faker.helpers.arrayElement([
        "PENDING",
        "IN_TRANSIT",
        "CUSTOMS",
        "DELIVERED",
      ]),
      incoterm: faker.helpers.arrayElement(incoterms),
      serviceType: faker.helpers.arrayElement(["FCL", "LCL"]),
      laneId: faker.helpers.arrayElement(laneIds),
      scheduleId: faker.helpers.arrayElement(scheduleIds),
      vesselName: "MV " + faker.person.lastName().toUpperCase(),
      voyageNumber: faker.string.alphanumeric(6).toUpperCase(),
      companyId,
      createdBy: faker.helpers.arrayElement(userIds),
    });

    // Containers
    for (let j = 0; j < faker.number.int({ min: 1, max: 5 }); j++) {
      const containerId = faker.string.uuid();
      await db.insert(schema.shipmentContainers).values({
        id: containerId,
        shipmentId: id,
        containerNumber: faker.string.alphanumeric(11).toUpperCase(),
        containerType: faker.helpers.arrayElement(["20DC", "40HC"]),
        sealNumber: faker.string.numeric(6),
        weight: faker.number.int({ min: 5000, max: 28000 }),
      });

      // Cargo Items (LCL Loadout) for the first container
      if (j === 0 && Math.random() > 0.5) {
        for (let k = 0; k < faker.number.int({ min: 3, max: 8 }); k++) {
          await db.insert(schema.cargoItems).values({
            id: faker.string.uuid(),
            shipmentId: id,
            containerId,
            label: `ORD-${faker.string.numeric(3)}`,
            color: faker.helpers.arrayElement([
              "#4ade80",
              "#f43f5e",
              "#60a5fa",
              "#fbbf24",
              "#a78bfa",
            ]),
            width: faker.number.float({
              min: 0.5,
              max: 1.5,
              fractionDigits: 1,
            }),
            height: faker.number.float({
              min: 0.5,
              max: 1.5,
              fractionDigits: 1,
            }),
            depth: faker.number.float({
              min: 0.5,
              max: 1.5,
              fractionDigits: 1,
            }),
            weight: faker.number.int({ min: 100, max: 2000 }),
            // Initial chaotic positions
            x: faker.number.float({ min: -1, max: 1, fractionDigits: 2 }),
            y: faker.number.float({ min: 0, max: 2, fractionDigits: 2 }),
            z: faker.number.float({ min: -5, max: 5, fractionDigits: 2 }),
          });
        }
      }
    }

    // Customs
    if (Math.random() > 0.5) {
      await db.insert(schema.customsDeclarations).values({
        id: faker.string.uuid(),
        shipmentId: id,
        brokerId: faker.helpers.arrayElement(brokerIds),
        dutiesAmount: faker.number.int({ min: 100, max: 5000 }),
        taxesAmount: faker.number.int({ min: 50, max: 2000 }),
        status: faker.helpers.arrayElement(["PENDING", "CLEARED", "HELD"]),
      });
    }
  }
  console.log(
    `✅ Creados ${shipmentIds.length} envíos con sus contenedores y aduanas.`,
  );

  // 8. INVOICES
  for (const shipmentId of shipmentIds) {
    if (Math.random() > 0.2) {
      const invoiceId = faker.string.uuid();
      const amount = faker.number.int({ min: 1000, max: 15000 });
      await db.insert(schema.invoices).values({
        id: invoiceId,
        invoiceNumber: "INV-" + faker.string.numeric(6),
        shipmentId,
        companyId: faker.helpers.arrayElement(companyIds),
        amount,
        currency: "USD",
        status: faker.helpers.arrayElement([
          "ISSUED",
          "PARTIAL",
          "PAID",
          "OVERDUE",
        ]),
        dueDate: faker.date.future(),
      });

      // Invoice Items
      await db.insert(schema.invoiceItems).values({
        id: faker.string.uuid(),
        invoiceId,
        description: "Ocean Freight",
        quantity: 1,
        unitPrice: amount * 0.8,
        total: amount * 0.8,
      });
      await db.insert(schema.invoiceItems).values({
        id: faker.string.uuid(),
        invoiceId,
        description: "Bunker Adjustment Factor (BAF)",
        quantity: 1,
        unitPrice: amount * 0.2,
        total: amount * 0.2,
      });
    }
  }
  console.log(`✅ Creadas facturas financieras y conceptos.`);

  // 9. BPMN DIAGRAMS
  const diagramIds = [];
  for (let i = 0; i < 3; i++) {
    const id = faker.string.uuid();
    diagramIds.push(id);
    await db.insert(schema.bpmnDiagrams).values({
      id,
      name: `Proceso ${faker.commerce.department()} - ${faker.string.alphanumeric(4).toUpperCase()}`,
      description: faker.lorem.sentence(),
    });

    for (let j = 1; j <= 3; j++) {
      await db.insert(schema.bpmnVersions).values({
        id: faker.string.uuid(),
        diagramId: id,
        versionNumber: j,
        xmlContent: `<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions id="Definitions_${faker.string.alphanumeric(4)}"></bpmn:definitions>`,
        authorId: faker.helpers.arrayElement(userIds),
      });
    }
  }
  console.log(
    `✅ Creados ${diagramIds.length} diagramas BPMN con historial de versiones.`,
  );

  // 10. TASKS (Human Tasklist)
  const taskIds = [];
  const taskNames = [
    "Aprobar Despacho Aduanero",
    "Revisión de BAF Anómalo",
    "Liberar BL Marítimo",
    "Confirmar VGM",
    "Verificar Inspección de Sanidad",
    "Conciliar Factura de Naviera",
    "Autorizar Crédito Adicional",
  ];
  for (let i = 0; i < 15; i++) {
    const id = `tsk-${faker.string.numeric(5)}`;
    taskIds.push(id);
    await db.insert(schema.tasks).values({
      id,
      title: faker.helpers.arrayElement(taskNames),
      description: faker.lorem.sentence(),
      assignedTo: faker.helpers.arrayElement(userIds),
      status: faker.helpers.arrayElement(["TODO", "IN_PROGRESS", "DONE"]),
      dueDate: faker.date.soon({ days: 10 }),
      shipmentId: faker.helpers.arrayElement(shipmentIds),
    });
  }
  console.log(`✅ Creadas ${taskIds.length} tareas manuales (Human Tasklist).`);

  // 11. AGENT SETTLEMENTS
  const { agentSettlements } = schema;
  for (let i = 0; i < companyIds.length; i++) {
    await db.insert(agentSettlements).values({
      id: faker.string.uuid(),
      statementNumber: "STMT-GEN-" + i.toString().padStart(3, "0"),
      agentId: companyIds[i],
      periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      periodEnd: new Date(),
      netBalance: (i + 1) * 15000,
      currency: "USD",
      status: i === 0 ? "Pending" : "Paid",
    });
  }
  console.log(
    `✅ Creados ${companyIds.length} settlements de agentes (Agent Settlements).`,
  );

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

  // Ensure admin user exists
  await import("../admin/adminService.js").then((m) => m.createAdmin());
  console.log("✅ Admin user ensured after seeding.");
  console.log("🎉 Seed masivo completado exitosamente.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Error durante el seed:", e);
  process.exit(1);
});
