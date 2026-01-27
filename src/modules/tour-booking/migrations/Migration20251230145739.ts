import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20251230145739 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "tour_variant" add column if not exists "price" numeric not null default 0, add column if not exists "currency_code" text not null default 'PEN', add column if not exists "raw_price" jsonb not null default '{"value":"0","precision":20}';`);
    this.addSql(`alter table if exists "tour_variant" alter column "variant_id" type text using ("variant_id"::text);`);
    this.addSql(`alter table if exists "tour_variant" alter column "variant_id" drop not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "tour_variant" drop column if exists "price", drop column if exists "currency_code", drop column if exists "raw_price";`);

    this.addSql(`alter table if exists "tour_variant" alter column "variant_id" type text using ("variant_id"::text);`);
    this.addSql(`alter table if exists "tour_variant" alter column "variant_id" set not null;`);
  }

}
