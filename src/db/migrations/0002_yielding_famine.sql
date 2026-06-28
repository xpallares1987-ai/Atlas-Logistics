CREATE TYPE "public"."shipment_mode" AS ENUM('Ocean FCL', 'Ocean LCL', 'Air', 'Road');--> statement-breakpoint
CREATE TABLE "shipment_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_id" integer NOT NULL,
	"status" "shipment_status" NOT NULL,
	"location" varchar(255),
	"description" varchar(500),
	"event_time" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "customer_id" integer;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "booking_reference" varchar(100);--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "mode" "shipment_mode" DEFAULT 'Ocean FCL' NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "estimated_departure" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "estimated_arrival" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;