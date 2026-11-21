import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Image, video and side-by-side exercises were dropped. Delete them first, or the new
  // enums below can't be applied. Their daily-set links go with them (ON DELETE cascade).
  await db.execute(sql`
  DELETE FROM "exercises" WHERE "format"::text = 'side-by-side' OR "medium"::text IN ('image', 'video');`)
  await db.execute(sql`
   CREATE TYPE "public"."enum_scenarios_medium" AS ENUM('email', 'message', 'ad', 'search');
  CREATE TYPE "public"."enum_scenarios_region" AS ENUM('all', 'ee', 'nl', 'de', 'pt', 'be');
  CREATE TYPE "public"."enum_scenarios_message_platform" AS ENUM('sms', 'whatsapp', 'messenger');
  CREATE TYPE "public"."enum_scenarios_ad_platform" AS ENUM('facebook', 'instagram');
  CREATE TYPE "public"."enum_scenarios_verdict" AS ENUM('real', 'fake');
  CREATE TYPE "public"."enum_scenarios_status" AS ENUM('draft', 'in-review', 'published');
  CREATE TYPE "public"."enum_feedback_region" AS ENUM('all', 'ee', 'nl', 'de', 'pt', 'be');
  CREATE TYPE "public"."enum_game_settings_questions_type" AS ENUM('scale', 'comment');
  CREATE TYPE "public"."enum_game_settings_mode" AS ENUM('three-tasks', 'scenario');
  CREATE TABLE "scenarios_message_bubbles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "scenarios_flags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"reason" varchar
  );
  
  CREATE TABLE "scenarios_why_real" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"is_correct" boolean DEFAULT false,
  	"explanation" varchar
  );
  
  CREATE TABLE "scenarios_next_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"is_correct" boolean DEFAULT false,
  	"explanation" varchar
  );
  
  CREATE TABLE "scenarios" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"medium" "enum_scenarios_medium" NOT NULL,
  	"region" "enum_scenarios_region" DEFAULT 'all' NOT NULL,
  	"email_from_name" varchar,
  	"email_from_address" varchar,
  	"email_subject" varchar,
  	"email_body" varchar,
  	"message_platform" "enum_scenarios_message_platform",
  	"message_sender" varchar,
  	"ad_platform" "enum_scenarios_ad_platform" DEFAULT 'facebook',
  	"ad_page_name" varchar,
  	"ad_text" varchar,
  	"ad_headline" varchar,
  	"ad_display_url" varchar,
  	"ad_button_text" varchar,
  	"search_query" varchar,
  	"search_sponsored" boolean DEFAULT true,
  	"search_title" varchar,
  	"search_display_url" varchar,
  	"search_snippet" varchar,
  	"landing_url" varchar,
  	"landing_site_name" varchar,
  	"landing_headline" varchar,
  	"landing_body" varchar,
  	"landing_button_text" varchar,
  	"verdict" "enum_scenarios_verdict",
  	"verdict_reason" varchar,
  	"max_wrong_guesses" numeric DEFAULT 3,
  	"next_prompt" varchar DEFAULT 'What should Anna do next?',
  	"explanation" jsonb,
  	"status" "enum_scenarios_status" DEFAULT 'draft' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "feedback" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"day" varchar NOT NULL,
  	"region" "enum_feedback_region",
  	"scenario_id" integer,
  	"percent" numeric,
  	"age_group" varchar NOT NULL,
  	"answers" jsonb NOT NULL,
  	"comment" varchar,
  	"device_id" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "game_settings_age_groups" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "game_settings_questions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"type" "enum_game_settings_questions_type" DEFAULT 'scale' NOT NULL,
  	"text" varchar NOT NULL,
  	"low_label" varchar,
  	"high_label" varchar
  );
  
  CREATE TABLE "game_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"mode" "enum_game_settings_mode" DEFAULT 'three-tasks' NOT NULL,
  	"feedback_enabled" boolean DEFAULT true,
  	"feedback_required" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "exercises" DROP CONSTRAINT "exercises_image_id_media_id_fk";
  
  ALTER TABLE "exercises" DROP CONSTRAINT "exercises_comparison_real_image_id_media_id_fk";
  
  ALTER TABLE "exercises" DROP CONSTRAINT "exercises_comparison_fake_image_id_media_id_fk";
  
  ALTER TABLE "exercises" ALTER COLUMN "format" SET DATA TYPE text;
  DROP TYPE "public"."enum_exercises_format";
  CREATE TYPE "public"."enum_exercises_format" AS ENUM('spot-red-flags', 'real-or-fake', 'what-next');
  ALTER TABLE "exercises" ALTER COLUMN "format" SET DATA TYPE "public"."enum_exercises_format" USING "format"::"public"."enum_exercises_format";
  ALTER TABLE "exercises" ALTER COLUMN "medium" SET DATA TYPE text;
  DROP TYPE "public"."enum_exercises_medium";
  CREATE TYPE "public"."enum_exercises_medium" AS ENUM('email', 'message', 'link');
  ALTER TABLE "exercises" ALTER COLUMN "medium" SET DATA TYPE "public"."enum_exercises_medium" USING "medium"::"public"."enum_exercises_medium";
  DROP INDEX "exercises_image_idx";
  DROP INDEX "exercises_comparison_comparison_real_image_idx";
  DROP INDEX "exercises_comparison_comparison_fake_image_idx";
  ALTER TABLE "daily_sets" ADD COLUMN "scenario_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "scenarios_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "feedback_id" integer;
  ALTER TABLE "scenarios_message_bubbles" ADD CONSTRAINT "scenarios_message_bubbles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "scenarios_flags" ADD CONSTRAINT "scenarios_flags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "scenarios_why_real" ADD CONSTRAINT "scenarios_why_real_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "scenarios_next_options" ADD CONSTRAINT "scenarios_next_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "feedback" ADD CONSTRAINT "feedback_scenario_id_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "game_settings_age_groups" ADD CONSTRAINT "game_settings_age_groups_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."game_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "game_settings_questions" ADD CONSTRAINT "game_settings_questions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."game_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "scenarios_message_bubbles_order_idx" ON "scenarios_message_bubbles" USING btree ("_order");
  CREATE INDEX "scenarios_message_bubbles_parent_id_idx" ON "scenarios_message_bubbles" USING btree ("_parent_id");
  CREATE INDEX "scenarios_flags_order_idx" ON "scenarios_flags" USING btree ("_order");
  CREATE INDEX "scenarios_flags_parent_id_idx" ON "scenarios_flags" USING btree ("_parent_id");
  CREATE INDEX "scenarios_why_real_order_idx" ON "scenarios_why_real" USING btree ("_order");
  CREATE INDEX "scenarios_why_real_parent_id_idx" ON "scenarios_why_real" USING btree ("_parent_id");
  CREATE INDEX "scenarios_next_options_order_idx" ON "scenarios_next_options" USING btree ("_order");
  CREATE INDEX "scenarios_next_options_parent_id_idx" ON "scenarios_next_options" USING btree ("_parent_id");
  CREATE INDEX "scenarios_updated_at_idx" ON "scenarios" USING btree ("updated_at");
  CREATE INDEX "scenarios_created_at_idx" ON "scenarios" USING btree ("created_at");
  CREATE INDEX "feedback_day_idx" ON "feedback" USING btree ("day");
  CREATE INDEX "feedback_scenario_idx" ON "feedback" USING btree ("scenario_id");
  CREATE INDEX "feedback_updated_at_idx" ON "feedback" USING btree ("updated_at");
  CREATE INDEX "feedback_created_at_idx" ON "feedback" USING btree ("created_at");
  CREATE UNIQUE INDEX "deviceId_day_idx" ON "feedback" USING btree ("device_id","day");
  CREATE INDEX "game_settings_age_groups_order_idx" ON "game_settings_age_groups" USING btree ("_order");
  CREATE INDEX "game_settings_age_groups_parent_id_idx" ON "game_settings_age_groups" USING btree ("_parent_id");
  CREATE INDEX "game_settings_questions_order_idx" ON "game_settings_questions" USING btree ("_order");
  CREATE INDEX "game_settings_questions_parent_id_idx" ON "game_settings_questions" USING btree ("_parent_id");
  ALTER TABLE "daily_sets" ADD CONSTRAINT "daily_sets_scenario_id_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_scenarios_fk" FOREIGN KEY ("scenarios_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_feedback_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "daily_sets_scenario_idx" ON "daily_sets" USING btree ("scenario_id");
  CREATE INDEX "payload_locked_documents_rels_scenarios_id_idx" ON "payload_locked_documents_rels" USING btree ("scenarios_id");
  CREATE INDEX "payload_locked_documents_rels_feedback_id_idx" ON "payload_locked_documents_rels" USING btree ("feedback_id");
  ALTER TABLE "exercises" DROP COLUMN "image_id";
  ALTER TABLE "exercises" DROP COLUMN "video_url";
  ALTER TABLE "exercises" DROP COLUMN "comparison_real_image_id";
  ALTER TABLE "exercises" DROP COLUMN "comparison_fake_image_id";
  ALTER TABLE "exercises" DROP COLUMN "comparison_real_video_url";
  ALTER TABLE "exercises" DROP COLUMN "comparison_fake_video_url";
  ALTER TABLE "exercises" DROP COLUMN "dots";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_exercises_format" ADD VALUE 'side-by-side' BEFORE 'what-next';
  ALTER TYPE "public"."enum_exercises_medium" ADD VALUE 'image';
  ALTER TYPE "public"."enum_exercises_medium" ADD VALUE 'video';
  ALTER TABLE "scenarios_message_bubbles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "scenarios_flags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "scenarios_why_real" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "scenarios_next_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "scenarios" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "feedback" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "game_settings_age_groups" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "game_settings_questions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "game_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "scenarios_message_bubbles" CASCADE;
  DROP TABLE "scenarios_flags" CASCADE;
  DROP TABLE "scenarios_why_real" CASCADE;
  DROP TABLE "scenarios_next_options" CASCADE;
  DROP TABLE "scenarios" CASCADE;
  DROP TABLE "feedback" CASCADE;
  DROP TABLE "game_settings_age_groups" CASCADE;
  DROP TABLE "game_settings_questions" CASCADE;
  DROP TABLE "game_settings" CASCADE;
  ALTER TABLE "daily_sets" DROP CONSTRAINT "daily_sets_scenario_id_scenarios_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_scenarios_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_feedback_fk";
  
  DROP INDEX "daily_sets_scenario_idx";
  DROP INDEX "payload_locked_documents_rels_scenarios_id_idx";
  DROP INDEX "payload_locked_documents_rels_feedback_id_idx";
  ALTER TABLE "exercises" ADD COLUMN "image_id" integer;
  ALTER TABLE "exercises" ADD COLUMN "video_url" varchar;
  ALTER TABLE "exercises" ADD COLUMN "comparison_real_image_id" integer;
  ALTER TABLE "exercises" ADD COLUMN "comparison_fake_image_id" integer;
  ALTER TABLE "exercises" ADD COLUMN "comparison_real_video_url" varchar;
  ALTER TABLE "exercises" ADD COLUMN "comparison_fake_video_url" varchar;
  ALTER TABLE "exercises" ADD COLUMN "dots" jsonb;
  ALTER TABLE "exercises" ADD CONSTRAINT "exercises_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "exercises" ADD CONSTRAINT "exercises_comparison_real_image_id_media_id_fk" FOREIGN KEY ("comparison_real_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "exercises" ADD CONSTRAINT "exercises_comparison_fake_image_id_media_id_fk" FOREIGN KEY ("comparison_fake_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "exercises_image_idx" ON "exercises" USING btree ("image_id");
  CREATE INDEX "exercises_comparison_comparison_real_image_idx" ON "exercises" USING btree ("comparison_real_image_id");
  CREATE INDEX "exercises_comparison_comparison_fake_image_idx" ON "exercises" USING btree ("comparison_fake_image_id");
  ALTER TABLE "daily_sets" DROP COLUMN "scenario_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "scenarios_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "feedback_id";
  DROP TYPE "public"."enum_scenarios_medium";
  DROP TYPE "public"."enum_scenarios_region";
  DROP TYPE "public"."enum_scenarios_message_platform";
  DROP TYPE "public"."enum_scenarios_ad_platform";
  DROP TYPE "public"."enum_scenarios_verdict";
  DROP TYPE "public"."enum_scenarios_status";
  DROP TYPE "public"."enum_feedback_region";
  DROP TYPE "public"."enum_game_settings_questions_type";
  DROP TYPE "public"."enum_game_settings_mode";`)
}
