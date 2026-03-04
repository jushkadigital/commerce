import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260304230000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'alter table if exists "tour_booking" add column if not exists "metadata" jsonb null;'
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      'alter table if exists "tour_booking" drop column if exists "metadata";'
    )
  }
}
