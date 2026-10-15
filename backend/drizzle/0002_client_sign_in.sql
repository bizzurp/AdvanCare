CREATE TABLE "client_login_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"ip" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"user_agent" varchar(255),
	CONSTRAINT "client_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_phone_required_for_non_staff";--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN "device_ref" varchar(64);--> statement-breakpoint
ALTER TABLE "client_sessions" ADD CONSTRAINT "client_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX "client_login_codes_email_idx" ON "client_login_codes" USING btree ("email","created_at");--> statement-breakpoint
CREATE INDEX "client_sessions_user_idx" ON "client_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_profiles_user_device_ref_uq" ON "client_profiles" USING btree ("user_id","device_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "users_app_email_uq" ON "users" USING btree (lower("email")) WHERE "users"."email" IS NOT NULL AND "users"."role" IN ('CLIENT', 'FAMILY_SPONSOR', 'CAREGIVER', 'BHW_PROXY', 'COORDINATOR');--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_contact_required" CHECK ("users"."phone_number" IS NOT NULL OR "users"."email" IS NOT NULL);