ALTER TABLE "theses" ADD COLUMN "review_on" date;--> statement-breakpoint
ALTER TABLE "theses" ADD COLUMN "review_reminded_on" date;--> statement-breakpoint
CREATE INDEX "theses_user_id_review_on_index" ON "theses" USING btree ("user_id","review_on");