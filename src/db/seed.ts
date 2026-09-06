import "dotenv/config";
import { databaseUrl } from "./index.js";
import { runAllSeeds } from "./seeds/index.js";

async function main() {
  console.log(
    `🌱 Comenzando la inyección masiva de datos realistas (Seed) en: ${databaseUrl}...`,
  );
  await runAllSeeds();

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
