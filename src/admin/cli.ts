// src/admin/cli.ts
import { createAdmin } from "./adminService";

(async () => {
  try {
    await createAdmin();
    console.log("✅ Admin user created/updated via CLI.");
  } catch (err) {
    console.error("❌ Admin creation failed:", err);
    process.exit(1);
  }
})();
