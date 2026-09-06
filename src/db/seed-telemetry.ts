import { seedTelemetry } from "./seeds/telemetry.seed.js";

export { seedTelemetry };

if (process.argv[1]?.includes("seed-telemetry")) {
  seedTelemetry()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seed failed:", err);
      process.exit(1);
    });
}
