import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260603174512 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "package" drop constraint if exists "package_slug_unique";`);
    this.addSql(`alter table if exists "package" add column if not exists "slug" text not null;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_package_slug_unique" ON "package" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_package_slug" ON "package" ("slug") WHERE deleted_at IS NULL;`);

    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_package_booking_package_id_package_date_status" ON "package_booking" ("package_id", "package_date", "status") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_package_slug_unique";`);
    this.addSql(`drop index if exists "IDX_package_slug";`);
    this.addSql(`alter table if exists "package" drop column if exists "slug";`);

    this.addSql(`drop index if exists "IDX_package_booking_package_id_package_date_status";`);
  }

}
