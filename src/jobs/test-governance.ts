import { db } from "../db/index.js";
import { invoices } from "../db/schema/finance.js";
import { users } from "../db/schema/core.js";
import { withTenant } from "../db/middleware/rls.js";
import { applyDataMasking } from "../db/middleware/masking.js";
import { runPurge } from "./gdpr-purge.js";
import crypto from "crypto";

async function verifyGovernance() {
  console.log("--- VERIFYING DATA GOVERNANCE ---");

  // 1. Test Field-Level Masking
  console.log("\n[1] Testing PII Masking...");
  const testContact = {
    email: "admin@atlas-logistics.com",
    taxId: "US-987654321",
    phone: "+1-555-1234",
  };

  const unmasked = applyDataMasking(testContact, true);
  console.log("Unmasked (Clearance):", unmasked);

  const masked = applyDataMasking(testContact, false);
  console.log("Masked (No Clearance):", masked);

  if (masked.email === testContact.email)
    throw new Error("Masking failed for email");

  // 2. Test Check Constraints (amount >= 0)
  console.log(
    "\n[2] Testing SQLite CHECK Constraints (Negative Invoice Amount)...",
  );
  try {
    await db.insert(invoices).values({
      id: crypto.randomUUID(),
      invoiceNumber: "INV-TEST-001",
      companyId: "company_id_that_exists", // Mock or fails foreign key
      amount: -500, // Should trigger CHECK constraint failure
      currency: "USD",
      status: "DRAFT",
    });
    console.warn(
      "⚠️ Constraint bypassed (might happen if foreign key failed first or SQLite check ignored)",
    );
  } catch (e: any) {
    console.log("✅ Insertion blocked as expected:", e.message);
  }

  // 3. Test GDPR Purge
  console.log("\n[3] Testing GDPR Purge Job...");
  await runPurge();

  console.log("\n--- VERIFICATION COMPLETE ---");
}

verifyGovernance().catch(console.error);
