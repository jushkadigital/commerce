import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260110170207 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "tour" alter column "thumbnail" type text using ("thumbnail"::text);`);
    this.addSql(`alter table if exists "tour" alter column "thumbnail" drop not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "tour" alter column "thumbnail" type text using ("thumbnail"::text);`);
    this.addSql(`alter table if exists "tour" alter column "thumbnail" set not null;`);
  }

}
