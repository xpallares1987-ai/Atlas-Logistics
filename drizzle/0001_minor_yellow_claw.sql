CREATE TYPE "public"."ai_review_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."device_type" AS ENUM('TRUCK', 'WAGON', 'CONTAINER_20', 'CONTAINER_40');--> statement-breakpoint
CREATE TYPE "public"."settlement_status" AS ENUM('PENDING', 'SETTLED');--> statement-breakpoint
CREATE TYPE "public"."traffic_status" AS ENUM('WAITING', 'DOCK_ASSIGNED', 'LOADING', 'UNLOADING', 'DISPATCHED');--> statement-breakpoint
CREATE TYPE "public"."warehouse_zone" AS ENUM('DRY', 'COLD', 'HAZMAT', 'CROSS_DOCK');--> statement-breakpoint
ALTER TYPE "public"."invoice_type" ADD VALUE 'CN';--> statement-breakpoint
ALTER TYPE "public"."invoice_type" ADD VALUE 'DN';--> statement-breakpoint
CREATE TABLE "agent_settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"statement_number" varchar(100) NOT NULL,
	"agent_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"net_balance" real NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"status" "settlement_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_settlements_statement_number_unique" UNIQUE("statement_number")
);
--> statement-breakpoint
CREATE TABLE "invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"description" varchar(255) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" real NOT NULL,
	"amount" real NOT NULL,
	"tax_rate" real DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_ai_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"document_url" varchar(500) NOT NULL,
	"extracted_data" jsonb NOT NULL,
	"confidence_score" real,
	"status" "ai_review_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"settlement_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipment_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"document_type" varchar(100) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size" integer,
	"mime_type" varchar(100),
	"gcs_url" varchar(500) NOT NULL,
	"parsed_data" jsonb,
	"uploaded_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"ownership" varchar(20) DEFAULT 'INTERNAL' NOT NULL,
	"customer_id" uuid,
	"buyer_id" uuid,
	"product_code" varchar(100) NOT NULL,
	"description" text,
	"quantity" integer NOT NULL,
	"zone" "warehouse_zone" DEFAULT 'DRY' NOT NULL,
	"grammage" real,
	"diameter" real,
	"roll_width" real,
	"roll_length" real,
	"net_weight" real,
	"gross_weight" real,
	"purchase_order" varchar(100),
	"customer_order" varchar(100),
	"seal_number" varchar(100),
	"received_at" timestamp DEFAULT now() NOT NULL,
	"status" varchar(50) DEFAULT 'IN_STOCK' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_traffic" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid,
	"driver_name" varchar(255),
	"device_number" varchar(100) NOT NULL,
	"device_type" "device_type" NOT NULL,
	"status" "traffic_status" DEFAULT 'WAITING' NOT NULL,
	"eta" timestamp,
	"assigned_dock" varchar(50),
	"cargo_description" text,
	"total_weight_expected" real,
	"expected_quantity" integer,
	"type" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'Pending'::text;--> statement-breakpoint
DROP TYPE "public"."invoice_status";--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('Draft', 'Issued', 'Pending', 'Paid', 'Overdue', 'Cancelled');--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'Pending'::"public"."invoice_status";--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "status" SET DATA TYPE "public"."invoice_status" USING "status"::"public"."invoice_status";--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "company_code" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "subtotal" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "tax_amount" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "total_amount" real NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "issued_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "document_url" varchar(500);--> statement-breakpoint
ALTER TABLE "agent_settlements" ADD CONSTRAINT "agent_settlements_agent_id_companies_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_ai_reviews" ADD CONSTRAINT "pending_ai_reviews_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_invoices" ADD CONSTRAINT "settlement_invoices_settlement_id_agent_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."agent_settlements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_invoices" ADD CONSTRAINT "settlement_invoices_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_documents" ADD CONSTRAINT "shipment_documents_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_documents" ADD CONSTRAINT "shipment_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_inventory" ADD CONSTRAINT "warehouse_inventory_warehouse_id_locations_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_inventory" ADD CONSTRAINT "warehouse_inventory_customer_id_companies_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_inventory" ADD CONSTRAINT "warehouse_inventory_buyer_id_companies_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_traffic" ADD CONSTRAINT "warehouse_traffic_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" DROP COLUMN "amount";--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_company_code_unique" UNIQUE("company_code");--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_tax_id_unique" UNIQUE("tax_id");