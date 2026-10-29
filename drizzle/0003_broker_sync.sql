CREATE TABLE "broker_users" (
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"external_user_id" text NOT NULL,
	"encrypted_secret" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "broker_users_user_id_provider_pk" PRIMARY KEY("user_id","provider")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "broker_connections" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "broker_users" ADD CONSTRAINT "broker_users_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_externalId_unique" UNIQUE("user_id","external_id");--> statement-breakpoint
ALTER TABLE "broker_connections" ADD CONSTRAINT "broker_connections_userId_provider_externalId_unique" UNIQUE("user_id","provider","external_id");