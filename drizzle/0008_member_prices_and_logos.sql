CREATE TABLE "logos" (
	"symbol" text PRIMARY KEY NOT NULL,
	"data" text,
	"content_type" text,
	"tile" text DEFAULT '#ffffff' NOT NULL,
	"own_background" boolean DEFAULT false NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_prices" (
	"user_id" text NOT NULL,
	"instrument_id" uuid NOT NULL,
	"price" numeric(28, 10) NOT NULL,
	"currency" text NOT NULL,
	"as_of" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	"own" boolean DEFAULT false NOT NULL,
	CONSTRAINT "member_prices_user_id_instrument_id_pk" PRIMARY KEY("user_id","instrument_id")
);
--> statement-breakpoint
ALTER TABLE "member_prices" ADD CONSTRAINT "member_prices_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_prices" ADD CONSTRAINT "member_prices_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Broker prices used to sit in the shared quotes table, where any member could see them. They now live per member,
-- so the old rows go and linked brokers sync again on the next visit to fill member_prices.
DELETE FROM "quotes" WHERE "source" LIKE '% via %';--> statement-breakpoint
UPDATE "broker_connections" SET "last_sync_at" = NULL WHERE "status" = 'active';
