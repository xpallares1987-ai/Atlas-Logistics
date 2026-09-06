import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

export async function seedFinance(ctx: {
  companyIds: string[];
  shipmentIds: string[];
  userIds: string[];
}): Promise<void> {
  const { companyIds, shipmentIds, userIds } = ctx;
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
    await db
      .insert(schema.tasks)
      .values({
        id,
        title: faker.helpers.arrayElement(taskNames),
        description: faker.lorem.sentence(),
        assignedTo: faker.helpers.arrayElement(userIds),
        status: faker.helpers.arrayElement(["TODO", "IN_PROGRESS", "DONE"]),
        dueDate: faker.date.soon({ days: 10 }),
        shipmentId: faker.helpers.arrayElement(shipmentIds),
      })
      .onConflictDoNothing();
  }
  console.log(`✅ Creadas ${taskIds.length} tareas manuales (Human Tasklist).`);

  // 11. AGENT SETTLEMENTS
  const { agentSettlements } = schema;
  for (let i = 0; i < companyIds.length; i++) {
    await db
      .insert(agentSettlements)
      .values({
        id: faker.string.uuid(),
        statementNumber:
          "STMT-" +
          faker.string.alphanumeric(6).toUpperCase() +
          "-" +
          i.toString().padStart(3, "0"),
        agentId: companyIds[i],
        periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        periodEnd: new Date(),
        netBalance: (i + 1) * 15000,
        currency: "USD",
        status: i === 0 ? "Pending" : "Paid",
      })
      .onConflictDoNothing();
  }
  console.log(
    `✅ Creados ${companyIds.length} settlements de agentes (Agent Settlements).`,
  );
}
