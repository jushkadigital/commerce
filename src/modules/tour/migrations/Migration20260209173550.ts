import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260209173550 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "tour" add column if not exists "is_special" boolean not null default false, add column if not exists "blocked_dates" text[] not null default '{}', add column if not exists "blocked_week_days" text[] not null default '{}', add column if not exists "cancellation_deadline_hours" integer not null default 12, add column if not exists "booking_min_days_ahead" integer not null default 2;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "tour" drop column if exists "is_special", drop column if exists "blocked_dates", drop column if exists "blocked_week_days", drop column if exists "cancellation_deadline_hours", drop column if exists "booking_min_days_ahead";`);
  }

}
