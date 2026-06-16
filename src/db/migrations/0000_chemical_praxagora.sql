CREATE TYPE "public"."shipment_status" AS ENUM('Booked', 'Received', 'OnBoard', 'Discharged', 'Delivered');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'agent', 'carrier');--> statement-breakpoint
CREATE TABLE "bill_of_ladings" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"shipment_id" integer NOT NULL,
	"version" integer NOT NULL,
	"shipper" text NOT NULL,
	"consignee" text NOT NULL,
	"cargo_details" text NOT NULL,
	"previous_version_id" varchar(36),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_name" varchar(50) NOT NULL,
	"record_id" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_data" jsonb,
	"new_data" jsonb,
	"changed_by" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carriers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "carriers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "freight_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"carrier_id" integer NOT NULL,
	"origin_port" varchar(100) NOT NULL,
	"destination_port" varchar(100) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"base_rate" numeric(12, 2) NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tracking_number" varchar(100) NOT NULL,
	"carrier_id" integer NOT NULL,
	"status" "shipment_status" DEFAULT 'Booked' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipments_tracking_number_unique" UNIQUE("tracking_number")
);
--> statement-breakpoint
CREATE TABLE "surcharge_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "surcharges" (
	"id" serial PRIMARY KEY NOT NULL,
	"freight_rate_id" integer NOT NULL,
	"surcharge_type_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(100) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'agent' NOT NULL,
	"carrier_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "bill_of_ladings" ADD CONSTRAINT "bill_of_ladings_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "freight_rates" ADD CONSTRAINT "freight_rates_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surcharges" ADD CONSTRAINT "surcharges_freight_rate_id_freight_rates_id_fk" FOREIGN KEY ("freight_rate_id") REFERENCES "public"."freight_rates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surcharges" ADD CONSTRAINT "surcharges_surcharge_type_id_surcharge_types_id_fk" FOREIGN KEY ("surcharge_type_id") REFERENCES "public"."surcharge_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_table_record_idx" ON "audit_logs" USING btree ("table_name","record_id");--> statement-breakpoint
CREATE INDEX "fr_carrier_id_idx" ON "freight_rates" USING btree ("carrier_id");--> statement-breakpoint
CREATE INDEX "origin_port_idx" ON "freight_rates" USING btree ("origin_port");--> statement-breakpoint
CREATE INDEX "destination_port_idx" ON "freight_rates" USING btree ("destination_port");--> statement-breakpoint
CREATE INDEX "valid_to_idx" ON "freight_rates" USING btree ("valid_to");--> statement-breakpoint
CREATE INDEX "tracking_number_idx" ON "shipments" USING btree ("tracking_number");--> statement-breakpoint
CREATE INDEX "ship_carrier_id_idx" ON "shipments" USING btree ("carrier_id");--> statement-breakpoint
CREATE INDEX "status_idx" ON "shipments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "surch_fr_id_idx" ON "surcharges" USING btree ("freight_rate_id");--> statement-breakpoint
CREATE INDEX "surch_type_id_idx" ON "surcharges" USING btree ("surcharge_type_id");