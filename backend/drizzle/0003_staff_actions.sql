ALTER TABLE "shifts" ADD COLUMN "escalation_reason" text;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "payout_paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "payout_reference" varchar(120);--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "payout_marked_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_payout_marked_by_user_id_users_id_fk" FOREIGN KEY ("payout_marked_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE restrict;