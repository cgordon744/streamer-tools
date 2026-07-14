ALTER TABLE "deals" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "deals" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "deals" ALTER COLUMN "content_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."content_type";--> statement-breakpoint
DROP TYPE "public"."deal_status";--> statement-breakpoint
UPDATE "deals" SET "status" = 'lead' WHERE "status" = 'pitched';--> statement-breakpoint
UPDATE "deals" SET "status" = 'contract_signed' WHERE "status" = 'signed';--> statement-breakpoint
UPDATE "deals" SET "status" = 'content_delivered' WHERE "status" = 'delivered';--> statement-breakpoint
ALTER TABLE "deals" ALTER COLUMN "status" SET DEFAULT 'lead';
