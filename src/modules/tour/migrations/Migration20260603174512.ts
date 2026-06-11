import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260603174512 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "tour" drop constraint if exists "tour_slug_unique";`);
    this.addSql(`alter table if exists "tour" add column if not exists "slug" text not null;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tour_slug_unique" ON "tour" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tour_slug" ON "tour" ("slug") WHERE deleted_at IS NULL;`);

    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tour_booking_tour_id_tour_date_status" ON "tour_booking" ("tour_id", "tour_date", "status") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_tour_slug_unique";`);
    this.addSql(`drop index if exists "IDX_tour_slug";`);
    this.addSql(`alter table if exists "tour" drop column if exists "slug";`);

    this.addSql(`drop index if exists "IDX_tour_booking_tour_id_tour_date_status";`);
  }

}
