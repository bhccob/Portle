ALTER TABLE "user_relics" ADD COLUMN "level" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_relics" ADD COLUMN "level_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "user_relics" SET "level_at" = "awarded_at";
