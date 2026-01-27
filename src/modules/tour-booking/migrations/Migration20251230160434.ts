import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20251230160434 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "tour_service_variant" ("id" text not null, "title" text not null, "description" text null, "is_active" boolean not null default true, "sort_order" integer not null default 0, "metadata" jsonb null, "tour_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "tour_service_variant_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tour_service_variant_tour_id" ON "tour_service_variant" ("tour_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tour_service_variant_deleted_at" ON "tour_service_variant" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "tour_service_variant" add constraint "tour_service_variant_tour_id_foreign" foreign key ("tour_id") references "tour" ("id") on update cascade;`);

    this.addSql(`alter table if exists "tour_variant" add column if not exists "service_variant_id" text null;`);
    this.addSql(`alter table if exists "tour_variant" add constraint "tour_variant_service_variant_id_foreign" foreign key ("service_variant_id") references "tour_service_variant" ("id") on update cascade on delete set null;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tour_variant_service_variant_id" ON "tour_variant" ("service_variant_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tour_variant_service_variant_id_passenger_type" ON "tour_variant" ("service_variant_id", "passenger_type") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "tour_variant" drop constraint if exists "tour_variant_service_variant_id_foreign";`);

    this.addSql(`drop table if exists "tour_service_variant" cascade;`);

    this.addSql(`drop index if exists "IDX_tour_variant_service_variant_id";`);
    this.addSql(`drop index if exists "IDX_tour_variant_service_variant_id_passenger_type";`);
    this.addSql(`alter table if exists "tour_variant" drop column if exists "service_variant_id";`);
  }

}
