import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_exercises_medium" AS ENUM('email', 'message', 'link', 'image', 'video');
  CREATE TYPE "public"."enum_exercises_region" AS ENUM('all', 'ee', 'nl', 'de', 'pt', 'be');
  CREATE TYPE "public"."enum_exercises_message_platform" AS ENUM('sms', 'whatsapp', 'messenger');
  CREATE TYPE "public"."enum_exercises_verdict" AS ENUM('real', 'fake');
  CREATE TYPE "public"."enum_daily_sets_region" AS ENUM('all', 'ee', 'nl', 'de', 'pt', 'be');
  ALTER TYPE "public"."enum_exercises_format" ADD VALUE 'side-by-side' BEFORE 'what-next';
  CREATE TABLE "exercises_message_bubbles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "exercises_flags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"reason" varchar
  );
  
  CREATE TABLE "exercises_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"is_correct" boolean DEFAULT false,
  	"explanation" varchar
  );
  
  CREATE TABLE "daily_sets" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" varchar NOT NULL,
  	"region" "enum_daily_sets_region" DEFAULT 'all' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "daily_sets_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"exercises_id" integer
  );
  
  INSERT INTO "exercises_flags" ("_order", "_parent_id", "id", "text", "reason")
    SELECT "_order", "_parent_id", "id", "text", "reason" FROM "exercises_email_hotspots";
  ALTER TABLE "exercises_email_hotspots" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "exercises_email_hotspots" CASCADE;
  ALTER TABLE "exercises" ADD COLUMN "description" varchar;
  ALTER TABLE "exercises" ADD COLUMN "medium" "enum_exercises_medium";
  UPDATE "exercises" SET "medium" = (CASE "category"
    WHEN 'email' THEN 'email'
    WHEN 'links' THEN 'link'
    WHEN 'messages' THEN 'message'
    WHEN 'fake-screens' THEN 'image'
    WHEN 'ai-media' THEN 'video'
  END)::"enum_exercises_medium";
  ALTER TABLE "exercises" ALTER COLUMN "medium" SET NOT NULL;
  ALTER TABLE "exercises" ADD COLUMN "region" "enum_exercises_region" DEFAULT 'all' NOT NULL;
  ALTER TABLE "exercises" ADD COLUMN "message_platform" "enum_exercises_message_platform";
  ALTER TABLE "exercises" ADD COLUMN "message_sender" varchar;
  ALTER TABLE "exercises" ADD COLUMN "link_context" varchar;
  ALTER TABLE "exercises" ADD COLUMN "link_url" varchar;
  ALTER TABLE "exercises" ADD COLUMN "image_id" integer;
  ALTER TABLE "exercises" ADD COLUMN "video_url" varchar;
  ALTER TABLE "exercises" ADD COLUMN "comparison_real_image_id" integer;
  ALTER TABLE "exercises" ADD COLUMN "comparison_fake_image_id" integer;
  ALTER TABLE "exercises" ADD COLUMN "comparison_real_video_url" varchar;
  ALTER TABLE "exercises" ADD COLUMN "comparison_fake_video_url" varchar;
  ALTER TABLE "exercises" ADD COLUMN "max_wrong_guesses" numeric DEFAULT 3;
  ALTER TABLE "exercises" ADD COLUMN "dots" jsonb;
  ALTER TABLE "exercises" ADD COLUMN "verdict" "enum_exercises_verdict";
  ALTER TABLE "exercises" ADD COLUMN "answer_reason" varchar;
  ALTER TABLE "exercises" ADD COLUMN "scenario" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "daily_sets_id" integer;
  ALTER TABLE "exercises_message_bubbles" ADD CONSTRAINT "exercises_message_bubbles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "exercises_flags" ADD CONSTRAINT "exercises_flags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "exercises_options" ADD CONSTRAINT "exercises_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "daily_sets_rels" ADD CONSTRAINT "daily_sets_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."daily_sets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "daily_sets_rels" ADD CONSTRAINT "daily_sets_rels_exercises_fk" FOREIGN KEY ("exercises_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "exercises_message_bubbles_order_idx" ON "exercises_message_bubbles" USING btree ("_order");
  CREATE INDEX "exercises_message_bubbles_parent_id_idx" ON "exercises_message_bubbles" USING btree ("_parent_id");
  CREATE INDEX "exercises_flags_order_idx" ON "exercises_flags" USING btree ("_order");
  CREATE INDEX "exercises_flags_parent_id_idx" ON "exercises_flags" USING btree ("_parent_id");
  CREATE INDEX "exercises_options_order_idx" ON "exercises_options" USING btree ("_order");
  CREATE INDEX "exercises_options_parent_id_idx" ON "exercises_options" USING btree ("_parent_id");
  CREATE INDEX "daily_sets_updated_at_idx" ON "daily_sets" USING btree ("updated_at");
  CREATE INDEX "daily_sets_created_at_idx" ON "daily_sets" USING btree ("created_at");
  CREATE UNIQUE INDEX "date_region_idx" ON "daily_sets" USING btree ("date","region");
  CREATE INDEX "daily_sets_rels_order_idx" ON "daily_sets_rels" USING btree ("order");
  CREATE INDEX "daily_sets_rels_parent_idx" ON "daily_sets_rels" USING btree ("parent_id");
  CREATE INDEX "daily_sets_rels_path_idx" ON "daily_sets_rels" USING btree ("path");
  CREATE INDEX "daily_sets_rels_exercises_id_idx" ON "daily_sets_rels" USING btree ("exercises_id");
  ALTER TABLE "exercises" ADD CONSTRAINT "exercises_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "exercises" ADD CONSTRAINT "exercises_comparison_real_image_id_media_id_fk" FOREIGN KEY ("comparison_real_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "exercises" ADD CONSTRAINT "exercises_comparison_fake_image_id_media_id_fk" FOREIGN KEY ("comparison_fake_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_daily_sets_fk" FOREIGN KEY ("daily_sets_id") REFERENCES "public"."daily_sets"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "exercises_image_idx" ON "exercises" USING btree ("image_id");
  CREATE INDEX "exercises_comparison_comparison_real_image_idx" ON "exercises" USING btree ("comparison_real_image_id");
  CREATE INDEX "exercises_comparison_comparison_fake_image_idx" ON "exercises" USING btree ("comparison_fake_image_id");
  CREATE INDEX "payload_locked_documents_rels_daily_sets_id_idx" ON "payload_locked_documents_rels" USING btree ("daily_sets_id");
  ALTER TABLE "exercises" DROP COLUMN "category";
  ALTER TABLE "exercises" DROP COLUMN "content";
  DROP TYPE "public"."enum_exercises_category";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_exercises_category" AS ENUM('email', 'links', 'messages', 'fake-screens', 'ai-media');
  CREATE TABLE "exercises_email_hotspots" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"reason" varchar
  );
  
  ALTER TABLE "exercises_message_bubbles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "exercises_flags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "exercises_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "daily_sets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "daily_sets_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "exercises_message_bubbles" CASCADE;
  DROP TABLE "exercises_flags" CASCADE;
  DROP TABLE "exercises_options" CASCADE;
  DROP TABLE "daily_sets" CASCADE;
  DROP TABLE "daily_sets_rels" CASCADE;
  ALTER TABLE "exercises" DROP CONSTRAINT "exercises_image_id_media_id_fk";
  
  ALTER TABLE "exercises" DROP CONSTRAINT "exercises_comparison_real_image_id_media_id_fk";
  
  ALTER TABLE "exercises" DROP CONSTRAINT "exercises_comparison_fake_image_id_media_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_daily_sets_fk";
  
  ALTER TABLE "exercises" ALTER COLUMN "format" SET DATA TYPE text;
  DROP TYPE "public"."enum_exercises_format";
  CREATE TYPE "public"."enum_exercises_format" AS ENUM('spot-red-flags', 'real-or-fake', 'what-next');
  ALTER TABLE "exercises" ALTER COLUMN "format" SET DATA TYPE "public"."enum_exercises_format" USING "format"::"public"."enum_exercises_format";
  DROP INDEX "exercises_image_idx";
  DROP INDEX "exercises_comparison_comparison_real_image_idx";
  DROP INDEX "exercises_comparison_comparison_fake_image_idx";
  DROP INDEX "payload_locked_documents_rels_daily_sets_id_idx";
  ALTER TABLE "exercises" ADD COLUMN "category" "enum_exercises_category" DEFAULT 'email' NOT NULL;
  ALTER TABLE "exercises" ALTER COLUMN "category" DROP DEFAULT;
  ALTER TABLE "exercises" ADD COLUMN "content" jsonb;
  ALTER TABLE "exercises_email_hotspots" ADD CONSTRAINT "exercises_email_hotspots_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "exercises_email_hotspots_order_idx" ON "exercises_email_hotspots" USING btree ("_order");
  CREATE INDEX "exercises_email_hotspots_parent_id_idx" ON "exercises_email_hotspots" USING btree ("_parent_id");
  ALTER TABLE "exercises" DROP COLUMN "description";
  ALTER TABLE "exercises" DROP COLUMN "medium";
  ALTER TABLE "exercises" DROP COLUMN "region";
  ALTER TABLE "exercises" DROP COLUMN "message_platform";
  ALTER TABLE "exercises" DROP COLUMN "message_sender";
  ALTER TABLE "exercises" DROP COLUMN "link_context";
  ALTER TABLE "exercises" DROP COLUMN "link_url";
  ALTER TABLE "exercises" DROP COLUMN "image_id";
  ALTER TABLE "exercises" DROP COLUMN "video_url";
  ALTER TABLE "exercises" DROP COLUMN "comparison_real_image_id";
  ALTER TABLE "exercises" DROP COLUMN "comparison_fake_image_id";
  ALTER TABLE "exercises" DROP COLUMN "comparison_real_video_url";
  ALTER TABLE "exercises" DROP COLUMN "comparison_fake_video_url";
  ALTER TABLE "exercises" DROP COLUMN "max_wrong_guesses";
  ALTER TABLE "exercises" DROP COLUMN "dots";
  ALTER TABLE "exercises" DROP COLUMN "verdict";
  ALTER TABLE "exercises" DROP COLUMN "answer_reason";
  ALTER TABLE "exercises" DROP COLUMN "scenario";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "daily_sets_id";
  DROP TYPE "public"."enum_exercises_medium";
  DROP TYPE "public"."enum_exercises_region";
  DROP TYPE "public"."enum_exercises_message_platform";
  DROP TYPE "public"."enum_exercises_verdict";
  DROP TYPE "public"."enum_daily_sets_region";`)
}
