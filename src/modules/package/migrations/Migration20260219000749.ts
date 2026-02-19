import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260219000749 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "package_booking" add column if not exists "metadata" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "package_booking" drop column if exists "metadata";`);
  }

}
