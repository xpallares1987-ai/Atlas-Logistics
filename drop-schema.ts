import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

async function drop() {
  console.log('Dropping schema public...');
  await sql`DROP SCHEMA public CASCADE`;
  console.log('Recreating schema public...');
  await sql`CREATE SCHEMA public`;
  console.log('Done!');
  process.exit(0);
}

drop().catch(console.error);
