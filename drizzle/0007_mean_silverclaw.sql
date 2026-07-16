CREATE TABLE "mediakit_kits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"template" text DEFAULT 'classic' NOT NULL,
	"niche" text,
	"pitch" text,
	"audience_age" text,
	"audience_gender" text,
	"audience_geo" text,
	"contact_email" text,
	"accent_color" text,
	"rate_card" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"brand_highlights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"show_verified_sponsors" boolean DEFAULT true NOT NULL,
	"slug" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "youtube_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"channel_id" text NOT NULL,
	"handle" text,
	"title" text NOT NULL,
	"thumbnail_url" text,
	"subscriber_count" integer NOT NULL,
	"view_count" bigint NOT NULL,
	"video_count" integer NOT NULL,
	"avg_recent_views" integer,
	"fetched_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mediakit_kits" ADD CONSTRAINT "mediakit_kits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "youtube_channels" ADD CONSTRAINT "youtube_channels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mediakit_kits_user_id_uidx" ON "mediakit_kits" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mediakit_kits_slug_uidx" ON "mediakit_kits" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "youtube_channels_user_id_uidx" ON "youtube_channels" USING btree ("user_id");