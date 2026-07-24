import { db } from "./src/db/db.config.js";
import { users, companies } from "./src/db/schema.js";

async function main() {
  const [company] = await db
    .insert(companies)
    .values({
      name: "Test Customer Company",
      companyCode: "TEST-CUST-1",
      taxId: "123456789",
      type: "Customer",
    })
    .returning();

  await db
    .insert(users)
    .values({
      id: "00000000-0000-0000-0000-000000000000",
      email: "localdev@atlaslogistics.com",
      name: "Local Dev",
      role: "CUSTOMER",
      companyId: company.id,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { role: "CUSTOMER", companyId: company.id },
    });

  console.log("Customer seeded.");
  process.exit(0);
}
main();
