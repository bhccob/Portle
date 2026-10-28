CREATE TYPE "public"."audience" AS ENUM('private', 'friends', 'guild', 'public');--> statement-breakpoint
CREATE TYPE "public"."account_kind" AS ENUM('brokerage', 'retirement', 'crypto', 'savings', 'other');--> statement-breakpoint
CREATE TYPE "public"."asset_class" AS ENUM('equity', 'etf', 'fund', 'bond', 'crypto', 'cash', 'other');--> statement-breakpoint
CREATE TYPE "public"."broker_connection_status" AS ENUM('pending', 'active', 'error', 'disconnected');--> statement-breakpoint
CREATE TYPE "public"."data_source" AS ENUM('manual', 'csv', 'broker', 'demo');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('buy', 'sell', 'dividend', 'interest', 'fee', 'deposit', 'withdrawal', 'split', 'transfer_in', 'transfer_out');--> statement-breakpoint
CREATE TYPE "public"."collection_item_type" AS ENUM('thesis', 'post', 'instrument', 'link', 'journal', 'guide');--> statement-breakpoint
CREATE TYPE "public"."thesis_status" AS ENUM('researching', 'active', 'under_review', 'validated', 'invalidated', 'archived');--> statement-breakpoint
CREATE TYPE "public"."paper_ledger_kind" AS ENUM('deposit', 'buy', 'sell', 'fee', 'reset');--> statement-breakpoint
CREATE TYPE "public"."paper_order_side" AS ENUM('buy', 'sell');--> statement-breakpoint
CREATE TYPE "public"."paper_order_status" AS ENUM('open', 'filled', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."paper_order_type" AS ENUM('market', 'limit');--> statement-breakpoint
CREATE TYPE "public"."friendship_status" AS ENUM('pending', 'accepted');--> statement-breakpoint
CREATE TYPE "public"."post_kind" AS ENUM('text', 'thesis', 'insight');--> statement-breakpoint
CREATE TYPE "public"."reaction_kind" AS ENUM('insightful', 'agree', 'challenge', 'question');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'actioned', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."target_type" AS ENUM('post', 'thesis', 'comment', 'user', 'guild', 'journal');--> statement-breakpoint
CREATE TYPE "public"."guild_invite_kind" AS ENUM('request', 'invite');--> statement-breakpoint
CREATE TYPE "public"."guild_invite_status" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."guild_join_policy" AS ENUM('open', 'request', 'invite');--> statement-breakpoint
CREATE TYPE "public"."guild_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."guild_visibility" AS ENUM('discoverable', 'private');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"granted" boolean NOT NULL,
	"version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"to" text NOT NULL,
	"subject" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"actor_id" text,
	"entity_type" text,
	"entity_id" text,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"href" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "privacy_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"profile_visibility" "audience" DEFAULT 'friends' NOT NULL,
	"allocation_visibility" "audience" DEFAULT 'private' NOT NULL,
	"holdings_visibility" "audience" DEFAULT 'private' NOT NULL,
	"activity_visibility" "audience" DEFAULT 'private' NOT NULL,
	"theses_default_visibility" "audience" DEFAULT 'private' NOT NULL,
	"journal_default_visibility" "audience" DEFAULT 'private' NOT NULL,
	"guilds_visibility" "audience" DEFAULT 'friends' NOT NULL,
	"relics_visibility" "audience" DEFAULT 'friends' NOT NULL,
	"discoverable" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"handle" text NOT NULL,
	"display_name" text NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"avatar_hue" text DEFAULT '262' NOT NULL,
	"base_currency" text DEFAULT 'EUR' NOT NULL,
	"interests" text[] DEFAULT '{}'::text[] NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"onboarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_blocks" (
	"blocker_id" text NOT NULL,
	"blocked_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_blocks_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"institution" text DEFAULT '' NOT NULL,
	"kind" "account_kind" DEFAULT 'brokerage' NOT NULL,
	"currency" text NOT NULL,
	"source" "data_source" DEFAULT 'manual' NOT NULL,
	"broker_connection_id" uuid,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broker_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"institution" text DEFAULT '' NOT NULL,
	"status" "broker_connection_status" DEFAULT 'pending' NOT NULL,
	"encrypted_secret" text,
	"last_sync_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "fx_rates" (
	"base" text NOT NULL,
	"quote" text NOT NULL,
	"rate_date" date NOT NULL,
	"rate" numeric(28, 10) NOT NULL,
	"source" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fx_rates_base_quote_rate_date_pk" PRIMARY KEY("base","quote","rate_date")
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"row_count" integer NOT NULL,
	"imported_count" integer NOT NULL,
	"duplicate_count" integer NOT NULL,
	"error_count" integer NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instruments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" text NOT NULL,
	"exchange" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"asset_class" "asset_class" DEFAULT 'equity' NOT NULL,
	"currency" text NOT NULL,
	"sector" text,
	"region" text,
	"country" text,
	"isin" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instruments_symbol_exchange_unique" UNIQUE("symbol","exchange")
);
--> statement-breakpoint
CREATE TABLE "portfolios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"base_currency" text DEFAULT 'EUR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"instrument_id" uuid PRIMARY KEY NOT NULL,
	"price" numeric(28, 10) NOT NULL,
	"previous_close" numeric(28, 10),
	"currency" text NOT NULL,
	"as_of" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	"delay_minutes" integer DEFAULT 0 NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"instrument_id" uuid,
	"type" "transaction_type" NOT NULL,
	"trade_date" date NOT NULL,
	"quantity" numeric(28, 10),
	"price" numeric(28, 10),
	"amount" numeric(28, 10),
	"fee" numeric(28, 10) DEFAULT '0' NOT NULL,
	"currency" text NOT NULL,
	"split_ratio" numeric(28, 10),
	"source" "data_source" DEFAULT 'manual' NOT NULL,
	"external_id" text,
	"import_batch_id" uuid,
	"dedupe_hash" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_accountId_dedupeHash_unique" UNIQUE("account_id","dedupe_hash")
);
--> statement-breakpoint
CREATE TABLE "watchlist_items" (
	"watchlist_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watchlist_items_watchlist_id_instrument_id_pk" PRIMARY KEY("watchlist_id","instrument_id")
);
--> statement-breakpoint
CREATE TABLE "watchlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"visibility" "audience" DEFAULT 'private' NOT NULL,
	"guild_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"item_type" "collection_item_type" NOT NULL,
	"item_id" text,
	"url" text,
	"title" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"source_name" text DEFAULT '' NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"visibility" "audience" DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"entry_date" date NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"prompt" text,
	"visibility" "audience" DEFAULT 'private' NOT NULL,
	"thesis_id" uuid,
	"instrument_id" uuid,
	"paper_order_id" uuid,
	"transaction_id" uuid,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "theses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"instrument_id" uuid,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"status" "thesis_status" DEFAULT 'researching' NOT NULL,
	"visibility" "audience" DEFAULT 'private' NOT NULL,
	"guild_id" uuid,
	"time_horizon" text DEFAULT '' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"current_revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thesis_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thesis_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thesis_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thesis_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"status" "thesis_status" NOT NULL,
	"rationale" text DEFAULT '' NOT NULL,
	"bull_case" text DEFAULT '' NOT NULL,
	"bear_case" text DEFAULT '' NOT NULL,
	"assumptions" text DEFAULT '' NOT NULL,
	"catalysts" text DEFAULT '' NOT NULL,
	"risks" text DEFAULT '' NOT NULL,
	"valuation" text DEFAULT '' NOT NULL,
	"invalidation_criteria" text DEFAULT '' NOT NULL,
	"time_horizon" text DEFAULT '' NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"change_note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "thesis_revisions_thesisId_revision_unique" UNIQUE("thesis_id","revision")
);
--> statement-breakpoint
CREATE TABLE "thesis_transaction_links" (
	"thesis_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "thesis_transaction_links_thesisId_transactionId_unique" UNIQUE("thesis_id","transaction_id")
);
--> statement-breakpoint
CREATE TABLE "paper_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text DEFAULT 'Paper Lab' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"starting_cash" numeric(28, 10) NOT NULL,
	"fee_flat" numeric(28, 10) DEFAULT '1' NOT NULL,
	"fee_bps" numeric(28, 10) DEFAULT '5' NOT NULL,
	"slippage_bps" numeric(28, 10) DEFAULT '10' NOT NULL,
	"epoch" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paper_fills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"paper_account_id" uuid NOT NULL,
	"epoch" integer NOT NULL,
	"instrument_id" uuid NOT NULL,
	"side" "paper_order_side" NOT NULL,
	"quantity" numeric(28, 10) NOT NULL,
	"price" numeric(28, 10) NOT NULL,
	"fee" numeric(28, 10) NOT NULL,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "paper_fills_orderId_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "paper_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seq" bigserial NOT NULL,
	"paper_account_id" uuid NOT NULL,
	"epoch" integer NOT NULL,
	"order_id" uuid,
	"kind" "paper_ledger_kind" NOT NULL,
	"amount" numeric(28, 10) NOT NULL,
	"balance_after" numeric(28, 10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paper_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paper_account_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"epoch" integer NOT NULL,
	"instrument_id" uuid NOT NULL,
	"side" "paper_order_side" NOT NULL,
	"type" "paper_order_type" NOT NULL,
	"quantity" numeric(28, 10) NOT NULL,
	"limit_price" numeric(28, 10),
	"status" "paper_order_status" NOT NULL,
	"reject_reason" text,
	"thesis_id" uuid,
	"idempotency_key" text NOT NULL,
	"quote_price" numeric(28, 10),
	"quote_as_of" timestamp with time zone,
	"quote_source" text,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "paper_orders_paperAccountId_idempotencyKey_unique" UNIQUE("paper_account_id","idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"user_id" text NOT NULL,
	"target_type" "target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_user_id_target_type_target_id_pk" PRIMARY KEY("user_id","target_type","target_id")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"target_type" "target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"user_low" text NOT NULL,
	"user_high" text NOT NULL,
	"requested_by" text NOT NULL,
	"status" "friendship_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	CONSTRAINT "friendships_user_low_user_high_pk" PRIMARY KEY("user_low","user_high"),
	CONSTRAINT "friendship_order" CHECK ("friendships"."user_low" < "friendships"."user_high")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" "post_kind" DEFAULT 'text' NOT NULL,
	"body" text NOT NULL,
	"thesis_id" uuid,
	"insight" jsonb,
	"audience" "audience" DEFAULT 'friends' NOT NULL,
	"guild_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"user_id" text NOT NULL,
	"target_type" "target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"kind" "reaction_kind" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reactions_user_id_target_type_target_id_kind_pk" PRIMARY KEY("user_id","target_type","target_id","kind")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" text NOT NULL,
	"target_type" "target_type" NOT NULL,
	"target_id" text NOT NULL,
	"reason" text NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guild_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"invited_by" text,
	"kind" "guild_invite_kind" NOT NULL,
	"status" "guild_invite_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "guild_invites_guildId_userId_kind_unique" UNIQUE("guild_id","user_id","kind")
);
--> statement-breakpoint
CREATE TABLE "guild_members" (
	"guild_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "guild_role" DEFAULT 'member' NOT NULL,
	"share_allocation" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guild_members_guild_id_user_id_pk" PRIMARY KEY("guild_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "guild_moderation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"target_user_id" text,
	"target_post_id" uuid,
	"action" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guilds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"topic" text DEFAULT '' NOT NULL,
	"visibility" "guild_visibility" DEFAULT 'discoverable' NOT NULL,
	"join_policy" "guild_join_policy" DEFAULT 'request' NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guilds_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_relics" (
	"user_id" text NOT NULL,
	"relic_key" text NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"evidence" text DEFAULT '' NOT NULL,
	"displayed" boolean DEFAULT true NOT NULL,
	CONSTRAINT "user_relics_user_id_relic_key_pk" PRIMARY KEY("user_id","relic_key")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_settings" ADD CONSTRAINT "privacy_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_user_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_user_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_connections" ADD CONSTRAINT "broker_connections_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_watchlist_id_watchlists_id_fk" FOREIGN KEY ("watchlist_id") REFERENCES "public"."watchlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_thesis_id_theses_id_fk" FOREIGN KEY ("thesis_id") REFERENCES "public"."theses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theses" ADD CONSTRAINT "theses_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theses" ADD CONSTRAINT "theses_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thesis_notes" ADD CONSTRAINT "thesis_notes_thesis_id_theses_id_fk" FOREIGN KEY ("thesis_id") REFERENCES "public"."theses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thesis_notes" ADD CONSTRAINT "thesis_notes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thesis_revisions" ADD CONSTRAINT "thesis_revisions_thesis_id_theses_id_fk" FOREIGN KEY ("thesis_id") REFERENCES "public"."theses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thesis_transaction_links" ADD CONSTRAINT "thesis_transaction_links_thesis_id_theses_id_fk" FOREIGN KEY ("thesis_id") REFERENCES "public"."theses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thesis_transaction_links" ADD CONSTRAINT "thesis_transaction_links_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_accounts" ADD CONSTRAINT "paper_accounts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_fills" ADD CONSTRAINT "paper_fills_order_id_paper_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."paper_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_fills" ADD CONSTRAINT "paper_fills_paper_account_id_paper_accounts_id_fk" FOREIGN KEY ("paper_account_id") REFERENCES "public"."paper_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_fills" ADD CONSTRAINT "paper_fills_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_ledger" ADD CONSTRAINT "paper_ledger_paper_account_id_paper_accounts_id_fk" FOREIGN KEY ("paper_account_id") REFERENCES "public"."paper_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_ledger" ADD CONSTRAINT "paper_ledger_order_id_paper_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."paper_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_orders" ADD CONSTRAINT "paper_orders_paper_account_id_paper_accounts_id_fk" FOREIGN KEY ("paper_account_id") REFERENCES "public"."paper_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_orders" ADD CONSTRAINT "paper_orders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_orders" ADD CONSTRAINT "paper_orders_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_orders" ADD CONSTRAINT "paper_orders_thesis_id_theses_id_fk" FOREIGN KEY ("thesis_id") REFERENCES "public"."theses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_low_user_id_fk" FOREIGN KEY ("user_low") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_high_user_id_fk" FOREIGN KEY ("user_high") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_thesis_id_theses_id_fk" FOREIGN KEY ("thesis_id") REFERENCES "public"."theses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_invites" ADD CONSTRAINT "guild_invites_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_invites" ADD CONSTRAINT "guild_invites_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_invites" ADD CONSTRAINT "guild_invites_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_moderation_actions" ADD CONSTRAINT "guild_moderation_actions_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_moderation_actions" ADD CONSTRAINT "guild_moderation_actions_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_moderation_actions" ADD CONSTRAINT "guild_moderation_actions_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guilds" ADD CONSTRAINT "guilds_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_relics" ADD CONSTRAINT "user_relics_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_index" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_index" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_index" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "audit_events_user_id_created_at_index" ON "audit_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "consents_user_id_kind_index" ON "consents" USING btree ("user_id","kind");--> statement-breakpoint
CREATE INDEX "notifications_user_id_created_at_index" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_handle_lower_idx" ON "profiles" USING btree (lower("handle"));--> statement-breakpoint
CREATE INDEX "user_blocks_blocked_id_index" ON "user_blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE INDEX "accounts_user_id_index" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "accounts_portfolio_id_index" ON "accounts" USING btree ("portfolio_id");--> statement-breakpoint
CREATE INDEX "broker_connections_user_id_index" ON "broker_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "import_batches_user_id_index" ON "import_batches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "instruments_isin_index" ON "instruments" USING btree ("isin");--> statement-breakpoint
CREATE INDEX "portfolios_user_id_index" ON "portfolios" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_user_id_trade_date_index" ON "transactions" USING btree ("user_id","trade_date");--> statement-breakpoint
CREATE INDEX "transactions_account_id_instrument_id_index" ON "transactions" USING btree ("account_id","instrument_id");--> statement-breakpoint
CREATE INDEX "watchlists_user_id_index" ON "watchlists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "watchlists_guild_id_index" ON "watchlists" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "collection_items_collection_id_index" ON "collection_items" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "collections_user_id_index" ON "collections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "journal_entries_user_id_entry_date_index" ON "journal_entries" USING btree ("user_id","entry_date");--> statement-breakpoint
CREATE INDEX "theses_user_id_updated_at_index" ON "theses" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "theses_instrument_id_index" ON "theses" USING btree ("instrument_id");--> statement-breakpoint
CREATE INDEX "theses_guild_id_index" ON "theses" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "thesis_notes_thesis_id_index" ON "thesis_notes" USING btree ("thesis_id");--> statement-breakpoint
CREATE INDEX "paper_accounts_user_id_index" ON "paper_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "paper_fills_paper_account_id_epoch_index" ON "paper_fills" USING btree ("paper_account_id","epoch");--> statement-breakpoint
CREATE INDEX "paper_ledger_paper_account_id_epoch_created_at_index" ON "paper_ledger" USING btree ("paper_account_id","epoch","created_at");--> statement-breakpoint
CREATE INDEX "paper_orders_paper_account_id_status_index" ON "paper_orders" USING btree ("paper_account_id","status");--> statement-breakpoint
CREATE INDEX "comments_target_type_target_id_created_at_index" ON "comments" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
CREATE INDEX "friendships_user_high_index" ON "friendships" USING btree ("user_high");--> statement-breakpoint
CREATE INDEX "posts_user_id_created_at_index" ON "posts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "posts_guild_id_created_at_index" ON "posts" USING btree ("guild_id","created_at");--> statement-breakpoint
CREATE INDEX "reactions_target_type_target_id_index" ON "reactions" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "reports_status_created_at_index" ON "reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "guild_invites_user_id_index" ON "guild_invites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "guild_members_user_id_index" ON "guild_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "guild_moderation_actions_guild_id_created_at_index" ON "guild_moderation_actions" USING btree ("guild_id","created_at");