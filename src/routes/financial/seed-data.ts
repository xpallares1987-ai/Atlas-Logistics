import { db } from "../../db/index.js";
import { companies } from "../../db/schema/core.js";
import { invoices, agentSettlements } from "../../db/schema/finance.js";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";

export const ensureFinancialSeedData = async () => {
  const existingCompanies = await db
    .select()
    .from(companies)
    .where(eq(companies.id, "comp-2"))
    .limit(1);

  if (existingCompanies.length === 0) {
    await db
      .insert(companies)
      .values([
        {
          id: "comp-2",
          name: "Oceanic Partners Co.",
          taxId: "ES-B99887766",
          creditLimit: 500000,
        },
        {
          id: "comp-3",
          name: "Global Freight Inc",
          taxId: "ES-B99887755",
          creditLimit: 250000,
        },
      ])
      .onConflictDoNothing();
  }

  const existingInvoices = await db.select().from(invoices).limit(1);
  if (existingInvoices.length === 0) {
    await db.insert(invoices).values([
      {
        id: uuidv4(),
        invoiceNumber: "INV-AP-1001",
        companyId: "comp-2",
        type: "AP",
        amount: 12500,
        currency: "USD",
        status: "Paid",
        dueDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        invoiceNumber: "INV-AP-1002",
        companyId: "comp-2",
        type: "AP",
        amount: 8000,
        currency: "USD",
        status: "Pending",
        dueDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  }

  const existingSettlements = await db.select().from(agentSettlements).limit(1);
  if (existingSettlements.length === 0) {
    await db.insert(agentSettlements).values([
      {
        id: uuidv4(),
        statementNumber: "STMT-2023-11",
        agentId: "comp-2",
        periodStart: new Date("2023-11-01"),
        periodEnd: new Date("2023-11-30"),
        netBalance: 20500,
        currency: "USD",
        status: "Paid",
        createdAt: new Date(),
      },
    ]);
  }
};
