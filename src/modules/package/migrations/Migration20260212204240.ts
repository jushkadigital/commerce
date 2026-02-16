import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260212204240 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`drop index if exists "IDX_package_destination_available_dates";`);
    this.addSql(`alter table if exists "package" drop column if exists "available_dates";`);

    this.addSql(`alter table if exists "package" add column if not exists "metadata" jsonb null;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_package_destination" ON "package" ("destination") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_package_destination";`);
    this.addSql(`alter table if exists "package" drop column if exists "metadata";`);

    this.addSql(`alter table if exists "package" add column if not exists "available_dates" text[] not null;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_package_destination_available_dates" ON "package" ("destination", "available_dates") WHERE deleted_at IS NULL;`);
  }

}
