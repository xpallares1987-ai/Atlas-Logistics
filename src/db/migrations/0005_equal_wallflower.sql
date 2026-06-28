CREATE TYPE "public"."customs_status" AS ENUM('Pending', 'Submitted', 'UnderReview', 'Cleared', 'Rejected');--> statement-breakpoint
CREATE TABLE "customs_declaration_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"declaration_id" integer NOT NULL,
	"hs_code_id" integer NOT NULL,
	"commercial_description" varchar(255) NOT NULL,
	"declared_value" numeric(12, 2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"weight_kg" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customs_declarations" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_id" integer NOT NULL,
	"broker_name" varchar(100),
	"status" "customs_status" DEFAULT 'Pending' NOT NULL,
	"submission_date" timestamp with time zone,
	"clearance_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hs_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(20) NOT NULL,
	"description" varchar(255) NOT NULL,
	"duty_rate" numeric(5, 2) NOT NULL,
	CONSTRAINT "hs_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "customs_declaration_items" ADD CONSTRAINT "customs_declaration_items_declaration_id_customs_declarations_id_fk" FOREIGN KEY ("declaration_id") REFERENCES "public"."customs_declarations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customs_declaration_items" ADD CONSTRAINT "customs_declaration_items_hs_code_id_hs_codes_id_fk" FOREIGN KEY ("hs_code_id") REFERENCES "public"."hs_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customs_declarations" ADD CONSTRAINT "customs_declarations_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;