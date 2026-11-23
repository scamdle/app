import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "scenarios_page_why_real" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"is_correct" boolean DEFAULT false,
  	"explanation" varchar
  );
  
  ALTER TABLE "scenarios_page_why_real" ADD CONSTRAINT "scenarios_page_why_real_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "scenarios_page_why_real_order_idx" ON "scenarios_page_why_real" USING btree ("_order");
  CREATE INDEX "scenarios_page_why_real_parent_id_idx" ON "scenarios_page_why_real" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "scenarios_page_why_real" CASCADE;`)
}
