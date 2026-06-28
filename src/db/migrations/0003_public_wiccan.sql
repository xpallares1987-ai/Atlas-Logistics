CREATE TYPE "public"."quote_status" AS ENUM('Draft', 'Sent', 'Accepted', 'Rejected', 'Expired');--> statement-breakpoint
CREATE TABLE "quote_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_id" integer NOT NULL,
	"freight_rate_id" integer NOT NULL,
	"margin_percentage" numeric(5, 2),
	"total_price" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"origin_port" varchar(100) NOT NULL,
	"destination_port" varchar(100) NOT NULL,
	"valid_until" date NOT NULL,
	"status" "quote_status" DEFAULT 'Draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quote_options" ADD CONSTRAINT "quote_options_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_options" ADD CONSTRAINT "quote_options_freight_rate_id_freight_rates_id_fk" FOREIGN KEY ("freight_rate_id") REFERENCES "public"."freight_rates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;