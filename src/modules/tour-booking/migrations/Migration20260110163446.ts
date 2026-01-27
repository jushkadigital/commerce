import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260110163446 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "tour" add column if not exists "thumbnail" text not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "tour" drop column if exists "thumbnail";`);
  }

}
