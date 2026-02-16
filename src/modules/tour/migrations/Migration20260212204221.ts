import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260212204221 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "tour" add column if not exists "metadata" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "tour" drop column if exists "metadata";`);
  }

}
