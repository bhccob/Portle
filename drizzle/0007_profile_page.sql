CREATE TABLE "profile_experience" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"organisation" text DEFAULT '' NOT NULL,
	"start_year" integer NOT NULL,
	"end_year" integer,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "headline" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "location" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "banner_style" text DEFAULT 'dial' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "links" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "investing_since" integer;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "approach" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "horizon" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "sections" jsonb;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "featured_thesis_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_experience" ADD CONSTRAINT "profile_experience_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_experience_user_id_index" ON "profile_experience" USING btree ("user_id");