import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, client } from './db.config.js';

export async function runMigrations() {
  console.log('Running database migrations...');
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Database migrations completed successfully.');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
}

// Automatically run if executed directly
runMigrations().then(() => {
  client.end();
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
