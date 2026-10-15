CREATE TABLE "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"kind" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'SUBMITTED' NOT NULL,
	"preferred_at" timestamp with time zone,
	"scheduled_at" timestamp with time zone,
	"details" jsonb NOT NULL,
	"staff_note" text,
	"cancellation_reason" text,
	"handled_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_requests_kind" CHECK ("service_requests"."kind" IN ('telehealth', 'rhu', 'triage', 'prescription', 'transport')),
	CONSTRAINT "service_requests_status" CHECK ("service_requests"."status" IN ('SUBMITTED', 'IN_REVIEW', 'SCHEDULED', 'COMPLETED', 'CANCELLED')),
	CONSTRAINT "service_requests_scheduled_has_time" CHECK ("service_requests"."status" <> 'SCHEDULED' OR "service_requests"."scheduled_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_key" varchar(120) NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"size_bytes" integer NOT NULL,
	"file_name" varchar(255),
	"service_request_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uploads_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_client_id_client_profiles_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_handled_by_user_id_users_id_fk" FOREIGN KEY ("handled_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX "service_requests_client_idx" ON "service_requests" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "service_requests_status_created_idx" ON "service_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "uploads_owner_idx" ON "uploads" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "uploads_service_request_idx" ON "uploads" USING btree ("service_request_id");