import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema/index.js';

const client = createClient({ url: 'file:atlas-erp.db' });
export const db = drizzle(client, { schema });
