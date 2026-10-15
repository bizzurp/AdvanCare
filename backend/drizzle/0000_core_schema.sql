CREATE TYPE "public"."payment_method" AS ENUM('GCASH', 'MAYA', 'CASH', 'BANK_TRANSFER');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."shift_status" AS ENUM('REQUESTED', 'MATCHING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ESCALATED');--> statement-breakpoint
CREATE TYPE "public"."shift_tier" AS ENUM('BGAY_HOME_300', 'CVMC_INSTITUTIONAL_500');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('CLIENT', 'FAMILY_SPONSOR', 'CAREGIVER', 'BHW_PROXY', 'COORDINATOR', 'ADMIN');--> statement-breakpoint
CREATE TABLE "care_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shift_id" uuid NOT NULL,
	"caregiver_id" uuid NOT NULL,
	"vitals_recorded" jsonb,
	"tasks_completed" jsonb,
	"raw_caregiver_notes" text,
	"ai_generated_family_summary" text,
	"family_acknowledged" boolean DEFAULT false NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "caregivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sitio" varchar(100),
	"barangay" varchar(100),
	"municipality" varchar(100),
	"is_accredited" boolean DEFAULT false NOT NULL,
	"badges" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"total_shifts_completed" integer DEFAULT 0 NOT NULL,
	"average_rating" numeric(3, 2),
	"is_available" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "caregivers_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "caregivers_average_rating_range" CHECK ("caregivers"."average_rating" IS NULL OR "caregivers"."average_rating" BETWEEN 1 AND 5),
	CONSTRAINT "caregivers_total_shifts_nonnegative" CHECK ("caregivers"."total_shifts_completed" >= 0)
);
--> statement-breakpoint
CREATE TABLE "client_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"date_of_birth" date,
	"gender" varchar(20),
	"sitio" varchar(100),
	"barangay" varchar(100) NOT NULL,
	"municipality" varchar(100) NOT NULL,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"landmark_notes" text,
	"philhealth_id" varchar(50),
	"yakap_id" varchar(50),
	"pwd_id" varchar(50),
	"senior_id" varchar(50),
	"clinical_baseline" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" uuid,
	"relative_name" varchar(255) NOT NULL,
	"relationship" varchar(50) NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"is_emergency_contact" boolean DEFAULT false NOT NULL,
	"is_remote_sponsor" boolean DEFAULT false NOT NULL,
	"location_city_country" varchar(150),
	"notification_channel" varchar(30) DEFAULT 'SMS' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"user_id" uuid,
	"request_method" varchar(10) NOT NULL,
	"request_path" varchar(255) NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"response_status" integer,
	"response_body" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shift_id" uuid NOT NULL,
	"payer_user_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'PHP' NOT NULL,
	"method" "payment_method" NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"provider_reference" varchar(120),
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount" > 0),
	CONSTRAINT "payments_currency_php" CHECK ("payments"."currency" = 'PHP')
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"caregiver_id" uuid,
	"shift_tier" "shift_tier" NOT NULL,
	"status" "shift_status" DEFAULT 'REQUESTED' NOT NULL,
	"scheduled_date" date NOT NULL,
	"scheduled_start_time" time NOT NULL,
	"location_details" text NOT NULL,
	"duration_hours" integer DEFAULT 8 NOT NULL,
	"gross_rate" numeric(10, 2) NOT NULL,
	"caregiver_payout" numeric(10, 2) NOT NULL,
	"platform_margin" numeric(10, 2) NOT NULL,
	"clock_in" timestamp with time zone,
	"clock_out" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shifts_duration_8h" CHECK ("shifts"."duration_hours" = 8),
	CONSTRAINT "shifts_rate_matches_tier" CHECK (("shifts"."shift_tier" = 'BGAY_HOME_300' AND "shifts"."gross_rate" = 300 AND "shifts"."caregiver_payout" = 240 AND "shifts"."platform_margin" = 60)
       OR ("shifts"."shift_tier" = 'CVMC_INSTITUTIONAL_500' AND "shifts"."gross_rate" = 500 AND "shifts"."caregiver_payout" = 400 AND "shifts"."platform_margin" = 100)),
	CONSTRAINT "shifts_clock_order" CHECK ("shifts"."clock_out" IS NULL OR ("shifts"."clock_in" IS NOT NULL AND "shifts"."clock_out" >= "shifts"."clock_in"))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"email" varchar(255),
	"role" "user_role" DEFAULT 'CLIENT' NOT NULL,
	"full_name" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
ALTER TABLE "care_notes" ADD CONSTRAINT "care_notes_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "care_notes" ADD CONSTRAINT "care_notes_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "caregivers" ADD CONSTRAINT "caregivers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "family_profiles" ADD CONSTRAINT "family_profiles_client_id_client_profiles_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "family_profiles" ADD CONSTRAINT "family_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payer_user_id_users_id_fk" FOREIGN KEY ("payer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_client_id_client_profiles_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX "care_notes_shift_id_idx" ON "care_notes" USING btree ("shift_id");--> statement-breakpoint
CREATE INDEX "client_profiles_user_id_idx" ON "client_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "family_profiles_client_id_idx" ON "family_profiles" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_records_key_method_path_uq" ON "idempotency_records" USING btree ("idempotency_key","request_method","request_path");--> statement-breakpoint
CREATE INDEX "idempotency_records_expires_at_idx" ON "idempotency_records" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "payments_shift_id_idx" ON "payments" USING btree ("shift_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_method_provider_reference_uq" ON "payments" USING btree ("method","provider_reference");--> statement-breakpoint
CREATE INDEX "shifts_client_id_idx" ON "shifts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "shifts_caregiver_id_idx" ON "shifts" USING btree ("caregiver_id");--> statement-breakpoint
CREATE INDEX "shifts_status_date_idx" ON "shifts" USING btree ("status","scheduled_date");