import { promises as fs } from "node:fs";
import path from "node:path";

const TEST_DATABASE_PATH = path.resolve("atlas-unit-tests.db");

export default async function globalSetup() {
  process.env.DATABASE_URL = `file:${TEST_DATABASE_PATH}`;

  await Promise.all(
    ["", "-shm", "-wal"].map((suffix) =>
      fs.rm(`${TEST_DATABASE_PATH}${suffix}`, { force: true }),
    ),
  );

  const [{ runMigrations }, { seedDatabase }, { client }] = await Promise.all([
    import("../db/migrate.js"),
    import("../db/seed.js"),
    import("../db/index.js"),
  ]);

  await runMigrations();
  await seedDatabase();
  client.close();
}
