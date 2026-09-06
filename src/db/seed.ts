import "dotenv/config";
import { databaseUrl } from "./index.js";
import { runAllSeeds } from "./seeds/index.js";

export async function seedDatabase() {
  console.log(
    `🌱 Comenzando la inyección masiva de datos realistas (Seed) en: ${databaseUrl}...`,
  );
  await runAllSeeds();

  // Ensure admin user exists
  await import("../admin/adminService.js").then((m) => m.createAdmin());
  console.log("✅ Admin user ensured after seeding.");
  console.log("🎉 Seed masivo completado exitosamente.");
}

if (process.argv[1]?.endsWith("seed.ts")) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error("Error durante el seed:", e);
      process.exit(1);
    });
}
