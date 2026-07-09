CREATE TYPE "public"."container_type" AS ENUM('20DC', '40DC', '40HQ', '45HQ', 'LCL');--> statement-breakpoint
CREATE TYPE "public"."incoterm" AS ENUM('EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP');--> statement-breakpoint
CREATE TYPE "public"."shipment_type" AS ENUM('Direct', 'MBL', 'HBL');--> statement-breakpoint
CREATE TABLE "containers" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_id" integer NOT NULL,
	"container_number" varchar(20) NOT NULL,
	"type" "container_type" NOT NULL,
	"seal_number" varchar(50),
	"gross_weight" numeric(12, 2),
	"volume" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diagram_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"diagram_id" varchar(100) NOT NULL,
	"author_id" varchar(100),
	"xml" jsonb NOT NULL,
	"label" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "house_containers" (
	"id" serial PRIMARY KEY NOT NULL,
	"house_shipment_id" integer NOT NULL,
	"container_id" integer NOT NULL,
	"allocated_weight" numeric(12, 2),
	"allocated_volume" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "tax_id" varchar(100);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "type" varchar(50) DEFAULT 'Cliente';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "street" varchar(255);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "state_prov" varchar(100);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "country" varchar(100);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "postal_code" varchar(50);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "phone" varchar(50);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "contact_person" varchar(255);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "notes" varchar(1000);--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "type" "shipment_type" DEFAULT 'Direct' NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "parent_shipment_id" integer;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "incoterm" "incoterm";--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "origin_agent_id" integer;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "destination_agent_id" integer;--> statement-breakpoint
ALTER TABLE "containers" ADD CONSTRAINT "containers_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "house_containers" ADD CONSTRAINT "house_containers_house_shipment_id_shipments_id_fk" FOREIGN KEY ("house_shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "house_containers" ADD CONSTRAINT "house_containers_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "public"."containers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_origin_agent_id_customers_id_fk" FOREIGN KEY ("origin_agent_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_destination_agent_id_customers_id_fk" FOREIGN KEY ("destination_agent_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "parent_shipment_idx" ON "shipments" USING btree ("parent_shipment_id");