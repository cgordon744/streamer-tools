CREATE TABLE "login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tracker_deals" DROP CONSTRAINT "tracker_deals_sponsor_id_tracker_sponsors_id_fk";
--> statement-breakpoint
ALTER TABLE "tracker_deliverables" DROP CONSTRAINT "tracker_deliverables_deal_id_tracker_deals_id_fk";
--> statement-breakpoint
CREATE INDEX "login_attempts_ip_created_at_idx" ON "login_attempts" USING btree ("ip","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tracker_deals_id_user_id_uidx" ON "tracker_deals" USING btree ("id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tracker_sponsors_id_user_id_uidx" ON "tracker_sponsors" USING btree ("id","user_id");--> statement-breakpoint
ALTER TABLE "tracker_deals" ADD CONSTRAINT "tracker_deals_sponsor_owner_fk" FOREIGN KEY ("sponsor_id","user_id") REFERENCES "public"."tracker_sponsors"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracker_deliverables" ADD CONSTRAINT "tracker_deliverables_deal_owner_fk" FOREIGN KEY ("deal_id","user_id") REFERENCES "public"."tracker_deals"("id","user_id") ON DELETE cascade ON UPDATE no action;
