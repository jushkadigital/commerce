import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260318020000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "tour" add column if not exists "slug" text null;`);
    this.addSql(`update "tour" set "slug" = coalesce("slug", "id") where "slug" is null;`);
    this.addSql(`alter table if exists "tour" alter column "slug" set not null;`);
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tour_slug_unique" ON "tour" ("slug") WHERE deleted_at IS NULL;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_tour_slug_unique";`);
    this.addSql(`alter table if exists "tour" drop column if exists "slug";`);
  }
}
