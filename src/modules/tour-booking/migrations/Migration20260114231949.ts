import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260114231949 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "tour_booking" drop constraint if exists "tour_booking_tour_variant_id_foreign";`);

    this.addSql(`drop index if exists "IDX_tour_booking_tour_variant_id";`);
    this.addSql(`alter table if exists "tour_booking" drop column if exists "tour_variant_id";`);

    this.addSql(`alter table if exists "tour_booking" add column if not exists "line_items" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "tour_booking" drop column if exists "line_items";`);

    this.addSql(`alter table if exists "tour_booking" add column if not exists "tour_variant_id" text not null;`);
    this.addSql(`alter table if exists "tour_booking" add constraint "tour_booking_tour_variant_id_foreign" foreign key ("tour_variant_id") references "tour_variant" ("id") on update cascade;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tour_booking_tour_variant_id" ON "tour_booking" ("tour_variant_id") WHERE deleted_at IS NULL;`);
  }

}
