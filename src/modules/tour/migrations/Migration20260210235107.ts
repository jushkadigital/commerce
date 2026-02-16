import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260210235107 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`drop index if exists "IDX_tour_destination_available_dates";`);
    this.addSql(`alter table if exists "tour" drop column if exists "available_dates", drop column if exists "type";`);

    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tour_destination" ON "tour" ("destination") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_tour_destination";`);

    this.addSql(`alter table if exists "tour" add column if not exists "available_dates" text[] not null, add column if not exists "type" text check ("type" in ('tour', 'package')) not null default 'tour';`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tour_destination_available_dates" ON "tour" ("destination", "available_dates") WHERE deleted_at IS NULL;`);
  }

}
