import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "exercises_email_hotspots" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"reason" varchar
  );
  
  ALTER TABLE "exercises" ADD COLUMN "email_from_name" varchar;
  ALTER TABLE "exercises" ADD COLUMN "email_from_address" varchar;
  ALTER TABLE "exercises" ADD COLUMN "email_subject" varchar;
  ALTER TABLE "exercises" ADD COLUMN "email_body" varchar;
  ALTER TABLE "exercises_email_hotspots" ADD CONSTRAINT "exercises_email_hotspots_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "exercises_email_hotspots_order_idx" ON "exercises_email_hotspots" USING btree ("_order");
  CREATE INDEX "exercises_email_hotspots_parent_id_idx" ON "exercises_email_hotspots" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "exercises_email_hotspots" CASCADE;
  ALTER TABLE "exercises" DROP COLUMN "email_from_name";
  ALTER TABLE "exercises" DROP COLUMN "email_from_address";
  ALTER TABLE "exercises" DROP COLUMN "email_subject";
  ALTER TABLE "exercises" DROP COLUMN "email_body";`)
}
