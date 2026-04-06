import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260405023000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "package" add column if not exists "booking_min_days_ahead" integer not null default 2;`)
    this.addSql(`update "package" set "booking_min_days_ahead" = greatest(coalesce("booking_min_months_ahead", 0) * 30, 0) where "booking_min_months_ahead" is not null;`)
    this.addSql(`alter table if exists "package" drop column if exists "booking_min_months_ahead";`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "package" add column if not exists "booking_min_months_ahead" integer not null default 2;`)
    this.addSql(`update "package" set "booking_min_months_ahead" = greatest(ceil(coalesce("booking_min_days_ahead", 0) / 30.0), 0);`)
    this.addSql(`alter table if exists "package" drop column if exists "booking_min_days_ahead";`)
  }
}
