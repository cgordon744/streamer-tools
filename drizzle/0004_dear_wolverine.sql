CREATE TABLE "tracker_deliverables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"title" text NOT NULL,
	"due_date" date,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "tracker_deals" ADD COLUMN "payment_status" text DEFAULT 'not_invoiced' NOT NULL;--> statement-breakpoint
ALTER TABLE "tracker_deliverables" ADD CONSTRAINT "tracker_deliverables_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracker_deliverables" ADD CONSTRAINT "tracker_deliverables_deal_id_tracker_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."tracker_deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tracker_deliverables_user_id_idx" ON "tracker_deliverables" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tracker_deliverables_deal_id_idx" ON "tracker_deliverables" USING btree ("deal_id");--> statement-breakpoint
UPDATE "tracker_deals" SET "payment_status" = 'invoiced' WHERE "status" = 'invoiced';--> statement-breakpoint
UPDATE "tracker_deals" SET "payment_status" = 'paid' WHERE "status" = 'paid';
