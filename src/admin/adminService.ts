// src/admin/adminService.ts
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { Argon2id } from 'oslo/password';
import * as schema from '../db/schema/index.js';

const client = createClient({ url: 'file:atlas-erp-v2.db' });
const db = drizzle(client, { schema });

export async function createAdmin() {
  const hashedPassword = await new Argon2id().hash('admin');
  await db
    .insert(schema.users)
    .values({
      id: 'admin_user_id',
      email: 'admin@atlas.com',
      hashedPassword,
      role: 'ADMIN',
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: { hashedPassword },
    });
  console.log('Admin user created/updated successfully!');
}
