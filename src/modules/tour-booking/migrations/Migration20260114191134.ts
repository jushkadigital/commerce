import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260114191134 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`drop index if exists "IDX_tour_booking_tour_id_tour_date_status_unique";`);
  }

  override async down(): Promise<void> {
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tour_booking_tour_id_tour_date_status_unique" ON "tour_booking" ("tour_id", "tour_date", "status") WHERE deleted_at IS NULL;`);
  }

}
