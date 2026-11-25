import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Every scenario is a scam now. A genuine one must not go live as a scam, so it becomes a draft.
  // Its "why is it real?" lists are dropped below. Unfinished flag rows would break SET NOT NULL.
  await db.execute(sql`
  UPDATE "scenarios" SET "status" = 'draft' WHERE "verdict" = 'real';
  DELETE FROM "scenarios_flags" WHERE "text" IS NULL OR "reason" IS NULL;`)
  await db.execute(sql`
   CREATE TYPE "public"."enum_scenarios_wants" AS ENUM('pay', 'details', 'code', 'call');
  CREATE TABLE "scenarios_check_reviews" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "scenarios_wants" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_scenarios_wants",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "scenarios_why_real" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "scenarios_page_why_real" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "scenarios_why_real" CASCADE;
  DROP TABLE "scenarios_page_why_real" CASCADE;
  ALTER TABLE "scenarios_flags" ALTER COLUMN "text" SET NOT NULL;
  ALTER TABLE "scenarios_flags" ALTER COLUMN "reason" SET NOT NULL;
  ALTER TABLE "scenarios" ADD COLUMN "check_query" varchar;
  ALTER TABLE "scenarios" ADD COLUMN "check_site" varchar;
  ALTER TABLE "scenarios" ADD COLUMN "check_rating" varchar;
  ALTER TABLE "scenarios" ADD COLUMN "wants_explanation" varchar;
  ALTER TABLE "scenarios" ADD COLUMN "based_on" varchar;
  ALTER TABLE "scenarios_check_reviews" ADD CONSTRAINT "scenarios_check_reviews_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "scenarios_wants" ADD CONSTRAINT "scenarios_wants_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "scenarios_check_reviews_order_idx" ON "scenarios_check_reviews" USING btree ("_order");
  CREATE INDEX "scenarios_check_reviews_parent_id_idx" ON "scenarios_check_reviews" USING btree ("_parent_id");
  CREATE INDEX "scenarios_wants_order_idx" ON "scenarios_wants" USING btree ("order");
  CREATE INDEX "scenarios_wants_parent_idx" ON "scenarios_wants" USING btree ("parent_id");
  ALTER TABLE "scenarios" DROP COLUMN "verdict";
  DROP TYPE "public"."enum_scenarios_verdict";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_scenarios_verdict" AS ENUM('real', 'fake');
  CREATE TABLE "scenarios_why_real" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"is_correct" boolean DEFAULT false,
  	"explanation" varchar
  );
  
  CREATE TABLE "scenarios_page_why_real" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"is_correct" boolean DEFAULT false,
  	"explanation" varchar
  );
  
  ALTER TABLE "scenarios_check_reviews" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "scenarios_wants" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "scenarios_check_reviews" CASCADE;
  DROP TABLE "scenarios_wants" CASCADE;
  ALTER TABLE "scenarios_flags" ALTER COLUMN "text" DROP NOT NULL;
  ALTER TABLE "scenarios_flags" ALTER COLUMN "reason" DROP NOT NULL;
  ALTER TABLE "scenarios" ADD COLUMN "verdict" "enum_scenarios_verdict";
  ALTER TABLE "scenarios_why_real" ADD CONSTRAINT "scenarios_why_real_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "scenarios_page_why_real" ADD CONSTRAINT "scenarios_page_why_real_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "scenarios_why_real_order_idx" ON "scenarios_why_real" USING btree ("_order");
  CREATE INDEX "scenarios_why_real_parent_id_idx" ON "scenarios_why_real" USING btree ("_parent_id");
  CREATE INDEX "scenarios_page_why_real_order_idx" ON "scenarios_page_why_real" USING btree ("_order");
  CREATE INDEX "scenarios_page_why_real_parent_id_idx" ON "scenarios_page_why_real" USING btree ("_parent_id");
  ALTER TABLE "scenarios" DROP COLUMN "check_query";
  ALTER TABLE "scenarios" DROP COLUMN "check_site";
  ALTER TABLE "scenarios" DROP COLUMN "check_rating";
  ALTER TABLE "scenarios" DROP COLUMN "wants_explanation";
  ALTER TABLE "scenarios" DROP COLUMN "based_on";
  DROP TYPE "public"."enum_scenarios_wants";`)
}
