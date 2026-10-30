CREATE TYPE "public"."access_status" AS ENUM('requested', 'granted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."cost_category" AS ENUM('housing', 'groceries', 'insurance', 'bills', 'subscriptions', 'transport', 'other');--> statement-breakpoint
CREATE TYPE "public"."cost_frequency" AS ENUM('weekly', 'monthly', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TABLE "access_invites" (
	"email" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "full_access" (
	"user_id" text PRIMARY KEY NOT NULL,
	"status" "access_status" NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"requested_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(28, 10) NOT NULL,
	"currency" text NOT NULL,
	"frequency" "cost_frequency" NOT NULL,
	"category" "cost_category" NOT NULL,
	"next_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "full_access" ADD CONSTRAINT "full_access_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "costs" ADD CONSTRAINT "costs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "costs_user_id_index" ON "costs" USING btree ("user_id");