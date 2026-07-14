ALTER TABLE "deals" RENAME TO "tracker_deals";--> statement-breakpoint
ALTER TABLE "sponsors" RENAME TO "tracker_sponsors";--> statement-breakpoint
ALTER TABLE "tracker_deals" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tracker_sponsors" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER INDEX "deals_user_id_idx" RENAME TO "tracker_deals_user_id_idx";--> statement-breakpoint
ALTER INDEX "deals_sponsor_id_idx" RENAME TO "tracker_deals_sponsor_id_idx";--> statement-breakpoint
ALTER INDEX "sponsors_user_id_idx" RENAME TO "tracker_sponsors_user_id_idx";--> statement-breakpoint
ALTER TABLE "tracker_deals" RENAME CONSTRAINT "deals_user_id_users_id_fk" TO "tracker_deals_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "tracker_deals" RENAME CONSTRAINT "deals_sponsor_id_sponsors_id_fk" TO "tracker_deals_sponsor_id_tracker_sponsors_id_fk";--> statement-breakpoint
ALTER TABLE "tracker_sponsors" RENAME CONSTRAINT "sponsors_user_id_users_id_fk" TO "tracker_sponsors_user_id_users_id_fk";
