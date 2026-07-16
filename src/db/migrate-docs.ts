import { sql } from 'drizzle-orm';
import { db } from './db.config.js';

async function main() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS shipment_documents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        shipment_id uuid NOT NULL REFERENCES shipments(id),
        document_type varchar(100) NOT NULL,
        file_name varchar(255) NOT NULL,
        file_size integer,
        mime_type varchar(100),
        gcs_url varchar(500) NOT NULL,
        uploaded_by uuid REFERENCES users(id),
        created_at timestamp NOT NULL DEFAULT now()
      );
    `);
    console.log("Tabla shipment_documents creada exitosamente.");
    process.exit(0);
  } catch (error) {
    console.error("Error creando tabla:", error);
    process.exit(1);
  }
}

main();
