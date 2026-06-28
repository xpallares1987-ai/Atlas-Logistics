CREATE TYPE "public"."customer_status" AS ENUM('Active', 'Inactive');--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"industry" varchar(100),
	"status" "customer_status" DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"booking_ref" varchar(100) NOT NULL,
	"type" varchar(50) NOT NULL,
	"document_number" varchar(100) NOT NULL,
	"issue_date" varchar(100) NOT NULL,
	"status" varchar(50) NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_agreement_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"rate_agreement_id" integer NOT NULL,
	"freight_rate_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_agreements" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "origin_port" varchar(10) DEFAULT 'CNSHA' NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "destination_port" varchar(10) DEFAULT 'ESBCN' NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_agreement_items" ADD CONSTRAINT "rate_agreement_items_rate_agreement_id_rate_agreements_id_fk" FOREIGN KEY ("rate_agreement_id") REFERENCES "public"."rate_agreements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_agreement_items" ADD CONSTRAINT "rate_agreement_items_freight_rate_id_freight_rates_id_fk" FOREIGN KEY ("freight_rate_id") REFERENCES "public"."freight_rates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_agreements" ADD CONSTRAINT "rate_agreements_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;