import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

export async function seedTriggers(): Promise<void> {
  console.log(
    "⚙️ Creando Triggers e inyectando lógica avanzada (Sequences)...",
  );

  // Create Sequence generator Trigger
  await db.run(sql`DROP TRIGGER IF EXISTS trg_auto_invoice_sequence`);
  await db.run(sql`
    CREATE TRIGGER trg_auto_invoice_sequence
    AFTER INSERT ON invoices
    WHEN NEW.invoiceNumber IS NULL OR NEW.invoiceNumber = ''
    BEGIN
      INSERT INTO system_sequences (name, current_value, prefix)
      VALUES ('invoice_seq', 1, 'INV-')
      ON CONFLICT(name) DO UPDATE SET current_value = current_value + 1;
      
      UPDATE invoices
      SET invoiceNumber = (SELECT prefix || printf('%06d', current_value) FROM system_sequences WHERE name = 'invoice_seq')
      WHERE id = NEW.id;
    END;
  `);

  // Create Audit Trigger for Shipments
  await db.run(sql`DROP TRIGGER IF EXISTS trg_audit_shipment_status`);
  await db.run(sql`
    CREATE TRIGGER trg_audit_shipment_status
    AFTER UPDATE OF status ON shipments
    WHEN OLD.status != NEW.status
    BEGIN
      INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data)
      VALUES (
        'shipments',
        NEW.id,
        'STATUS_CHANGE',
        OLD.status,
        NEW.status
      );
    END;
  `);
}
