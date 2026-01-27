import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260112032713 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "tour_booking" drop constraint if exists "tour_booking_tour_id_tour_date_status_unique";`);
    this.addSql(`drop index if exists "IDX_tour_booking_tour_id_tour_date_status";`);
    this.addSql(`alter table if exists "tour_booking" drop column if exists "passenger_name", drop column if exists "passenger_email", drop column if exists "passenger_phone";`);

    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tour_booking_tour_id_tour_date_status_unique" ON "tour_booking" ("tour_id", "tour_date", "status") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_tour_booking_tour_id_tour_date_status_unique";`);

    this.addSql(`alter table if exists "tour_booking" add column if not exists "passenger_name" text not null, add column if not exists "passenger_email" text null, add column if not exists "passenger_phone" text null;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tour_booking_tour_id_tour_date_status" ON "tour_booking" ("tour_id", "tour_date", "status") WHERE deleted_at IS NULL;`);
  }

}
