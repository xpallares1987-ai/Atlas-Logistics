// src/admin/adminService.ts
import { Argon2id } from 'oslo/password';
import { db } from '../db/index.js';
import * as schema from '../db/schema/index.js';

export async function createAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required');
  }
  const hashedPassword = await new Argon2id().hash(password);
  await db
    .insert(schema.users)
    .values({
      id: 'admin_user_id',
      email,
      hashedPassword,
      role: 'ADMIN',
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: { hashedPassword, role: 'ADMIN' },
    });
  console.log('Admin user created/updated successfully!');
}
