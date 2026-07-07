ALTER TABLE "users" ADD COLUMN "tenant_id" varchar(50) DEFAULT 'default' NOT NULL;
ALTER TABLE "shipments" ADD COLUMN "tenant_id" varchar(50) DEFAULT 'default' NOT NULL;
ALTER TABLE "customers" ADD COLUMN "tenant_id" varchar(50) DEFAULT 'default' NOT NULL;
ALTER TABLE "quotes" ADD COLUMN "tenant_id" varchar(50) DEFAULT 'default' NOT NULL;

CREATE INDEX IF NOT EXISTS "ship_tenant_idx" ON "shipments" ("tenant_id");
CREATE INDEX IF NOT EXISTS "cust_tenant_idx" ON "customers" ("tenant_id");
CREATE INDEX IF NOT EXISTS "quote_tenant_idx" ON "quotes" ("tenant_id");