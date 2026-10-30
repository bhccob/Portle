CREATE TABLE "price_bars" (
	"instrument_id" uuid NOT NULL,
	"date" date NOT NULL,
	"close" numeric(28, 10) NOT NULL,
	"source" text NOT NULL,
	CONSTRAINT "price_bars_instrument_id_date_pk" PRIMARY KEY("instrument_id","date")
);
--> statement-breakpoint
CREATE TABLE "price_checks" (
	"instrument_id" uuid PRIMARY KEY NOT NULL,
	"quote_checked_at" timestamp with time zone,
	"history_from" date,
	"history_checked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "price_bars" ADD CONSTRAINT "price_bars_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_checks" ADD CONSTRAINT "price_checks_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;