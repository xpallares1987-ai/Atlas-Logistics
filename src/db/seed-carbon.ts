import { seedCarbon } from "./seeds/carbon.seed.js";

export { seedCarbon, seedCarbon as seedCarbonModule };

const isMain =
  import.meta.url.includes("seed-carbon.ts") ||
  (process.argv[1] && process.argv[1].includes("seed-carbon.ts"));
if (isMain) {
  seedCarbon()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Error seeding carbon module:", err);
      process.exit(1);
    });
}
