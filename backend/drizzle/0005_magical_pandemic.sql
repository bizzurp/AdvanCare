CREATE TYPE "public"."provider_type" AS ENUM('DOCTOR', 'TRANSPORT_DRIVER');--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'DOCTOR' BEFORE 'BHW_PROXY';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'TRANSPORT_DRIVER' BEFORE 'BHW_PROXY';--> statement-breakpoint
CREATE TABLE "providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "provider_type" NOT NULL,
	"municipality" varchar(100) NOT NULL,
	"barangay" varchar(100),
	"specialty" varchar(120),
	"license_number" varchar(50),
	"vehicle_type" varchar(50),
	"plate_number" varchar(20),
	"is_available" boolean DEFAULT true NOT NULL,
	"is_accredited" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "providers_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "assigned_provider_id" uuid;--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX "providers_type_municipality_idx" ON "providers" USING btree ("type","municipality");--> statement-breakpoint
CREATE INDEX "providers_user_id_idx" ON "providers" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_assigned_provider_id_providers_id_fk" FOREIGN KEY ("assigned_provider_id") REFERENCES "public"."providers"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX "service_requests_assigned_provider_idx" ON "service_requests" USING btree ("assigned_provider_id");