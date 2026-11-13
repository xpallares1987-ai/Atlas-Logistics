import { ensureAddressesTables } from "../src/routes/addresses.routes.js";
import { seedContainerIsoTypes } from "../src/db/seeds/containers.seed.js";
import { seedUnlocodeLocations } from "../src/db/seeds/unlocode.seed.js";
import { seedAddressIdentifiers } from "../src/db/seeds/address-identifiers.seed.js";
import { createClient } from "@libsql/client";

async function run() {
  console.log("Ensuring address and catalog tables...");
  await ensureAddressesTables();
  console.log("Seeding container ISO types...");
  await seedContainerIsoTypes();
  console.log("Seeding UNECE UN/LOCODE locations...");
  await seedUnlocodeLocations();
  console.log("Seeding regulatory address identifiers...");
  await seedAddressIdentifiers();

  const c = createClient({ url: "file:./data/dev.db" });
  const c1 = await c.execute("SELECT count(*) n FROM container_iso_types");
  const c2 = await c.execute("SELECT count(*) n FROM unlocode_locations");
  const c3 = await c.execute("SELECT count(*) n FROM address_identifiers");
  const c4 = await c.execute(
    "SELECT id, address_id, facility_code FROM customs_facilities",
  );
  console.log("VERIFICATION_RESULTS:");
  console.log("- container_iso_types count:", c1.rows[0].n);
  console.log("- unlocode_locations count:", c2.rows[0].n);
  console.log("- address_identifiers count:", c3.rows[0].n);
  console.log("- customs_facilities linked:", JSON.stringify(c4.rows));
  c.close();
  console.log("ALL_CATALOGS_SEEDED_SUCCESSFULLY");
  process.exit(0);
}

run().catch((err) => {
  console.error("Error during catalog seeding:", err);
  process.exit(1);
});
