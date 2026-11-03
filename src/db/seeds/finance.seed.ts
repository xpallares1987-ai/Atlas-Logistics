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
  // 8. INVOICES (Rich AR / AP Multi-Currency Freight Invoices)
  const invoiceConcepts = [
    { desc: "Flete Marítimo Internacional FCL 40HC", pct: 0.6 },
    { desc: "Recargo por Combustible (BAF / Bunker Adjustment)", pct: 0.15 },
    { desc: "Gastos de Manipulación Portuaria (THC Terminal)", pct: 0.12 },
    { desc: "Acarreo Terrestre Portuario (Drayage Haulage)", pct: 0.08 },
    { desc: "Despacho Aduanero y Emisión de DUA", pct: 0.05 },
  ];

  const currencies = ["EUR", "USD", "EUR", "USD", "GBP"];
  const statuses = ["PAID", "PAID", "ISSUED", "OVERDUE", "DRAFT"];
  const types = ["AR", "AR", "AP", "AR", "AP"];

  let invIndex = 1;
  for (const shipmentId of shipmentIds) {
    if (invIndex > 60) break;

    const invoiceId = `inv_seed_${String(invIndex).padStart(3, "0")}`;
    const invType = types[(invIndex - 1) % types.length];
    const curr = currencies[(invIndex - 1) % currencies.length];
    const status = statuses[(invIndex - 1) % statuses.length];
    const amount = faker.number.int({ min: 1450, max: 8900 });
    const taxRate = curr === "EUR" ? 0.21 : 0.0;
    const taxAmount = Math.round(amount * taxRate * 100) / 100;

    const dueDate =
      status === "OVERDUE"
        ? new Date(
            Date.now() - faker.number.int({ min: 5, max: 45 }) * 86400000,
          )
        : new Date(
            Date.now() + faker.number.int({ min: 10, max: 60 }) * 86400000,
          );

    const paidDate =
      status === "PAID"
        ? new Date(
            Date.now() - faker.number.int({ min: 1, max: 15 }) * 86400000,
          )
        : null;

    const invNumber = `INV-2026-${invType}-${String(1000 + invIndex)}`;

    await db
      .insert(schema.invoices)
      .values({
        id: invoiceId,
        invoiceNumber: invNumber,
        type: invType,
        shipmentId,
        companyId: faker.helpers.arrayElement(companyIds),
        amount,
        taxAmount,
        taxRate,
        currency: curr,
        status,
        dueDate,
        paidDate,
      })
      .onConflictDoNothing();

    // Insert structured realistic line items
    for (const concept of invoiceConcepts) {
      const lineTotal = Math.round(amount * concept.pct * 100) / 100;
      await db
        .insert(schema.invoiceItems)
        .values({
          id: `item_${invoiceId}_${faker.string.alphanumeric(4)}`,
          invoiceId,
          description: concept.desc,
          quantity: 1,
          unitPrice: lineTotal,
          total: lineTotal,
        })
        .onConflictDoNothing();
    }

    invIndex++;
  }
  console.log(
    `✅ Creadas facturas financieras (AR/AP) y conceptos desglosados.`,
  );

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
