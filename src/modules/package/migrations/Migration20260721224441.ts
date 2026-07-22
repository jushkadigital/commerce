import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260721224441 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "package_booking" add column if not exists "reserved_passengers" integer not null default 0;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "package_booking" drop column if exists "reserved_passengers";`);
  }

}
