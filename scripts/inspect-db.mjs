import { createClient } from "@libsql/client";

async function main() {
  const client = createClient({ url: "file:./data/dev.db" });
  const tablesResult = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  
  console.log(`Found ${tablesResult.rows.length} tables in database:`);
  for (const row of tablesResult.rows) {
    const tableName = row.name;
    try {
      const countRes = await client.execute(`SELECT count(*) as cnt FROM "${tableName}"`);
      console.log(`${String(tableName).padEnd(35)} : ${countRes.rows[0].cnt} rows`);
    } catch (err) {
      console.log(`${String(tableName).padEnd(35)} : Error: ${err.message}`);
    }
  }
}

main();
