import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260206073934 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "tour_variant" drop constraint if exists "tour_variant_tour_id_passenger_type_unique";`);
    this.addSql(`alter table if exists "tour_variant" drop constraint if exists "tour_variant_variant_id_unique";`);
    this.addSql(`alter table if exists "tour" drop constraint if exists "tour_product_id_unique";`);
    this.addSql(`create table if not exists "tour" ("id" text not null, "product_id" text not null, "destination" text not null, "description" text null, "duration_days" integer not null, "max_capacity" integer not null, "thumbnail" text null, "available_dates" text[] not null, "type" text check ("type" in ('tour', 'package')) not null default 'tour', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "tour_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tour_product_id_unique" ON "tour" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tour_deleted_at" ON "tour" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tour_destination_available_dates" ON "tour" ("destination", "available_dates") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "tour_booking" ("id" text not null, "order_id" text not null, "tour_id" text not null, "line_items" jsonb null, "tour_date" timestamptz not null, "status" text check ("status" in ('pending', 'confirmed', 'cancelled', 'completed')) not null default 'pending', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "tour_booking_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tour_booking_tour_id" ON "tour_booking" ("tour_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tour_booking_deleted_at" ON "tour_booking" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tour_booking_order_id" ON "tour_booking" ("order_id") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "tour_service_variant" ("id" text not null, "title" text not null, "description" text null, "is_active" boolean not null default true, "sort_order" integer not null default 0, "metadata" jsonb null, "tour_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "tour_service_variant_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tour_service_variant_tour_id" ON "tour_service_variant" ("tour_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tour_service_variant_deleted_at" ON "tour_service_variant" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "tour_variant" ("id" text not null, "variant_id" text not null, "passenger_type" text check ("passenger_type" in ('adult', 'child', 'infant')) not null, "tour_id" text not null, "service_variant_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "tour_variant_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tour_variant_variant_id_unique" ON "tour_variant" ("variant_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tour_variant_tour_id" ON "tour_variant" ("tour_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tour_variant_service_variant_id" ON "tour_variant" ("service_variant_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tour_variant_deleted_at" ON "tour_variant" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tour_variant_tour_id_passenger_type_unique" ON "tour_variant" ("tour_id", "passenger_type") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tour_variant_service_variant_id_passenger_type" ON "tour_variant" ("service_variant_id", "passenger_type") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "tour_booking" add constraint "tour_booking_tour_id_foreign" foreign key ("tour_id") references "tour" ("id") on update cascade;`);

    this.addSql(`alter table if exists "tour_service_variant" add constraint "tour_service_variant_tour_id_foreign" foreign key ("tour_id") references "tour" ("id") on update cascade;`);

    this.addSql(`alter table if exists "tour_variant" add constraint "tour_variant_tour_id_foreign" foreign key ("tour_id") references "tour" ("id") on update cascade;`);
    this.addSql(`alter table if exists "tour_variant" add constraint "tour_variant_service_variant_id_foreign" foreign key ("service_variant_id") references "tour_service_variant" ("id") on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "tour_booking" drop constraint if exists "tour_booking_tour_id_foreign";`);

    this.addSql(`alter table if exists "tour_service_variant" drop constraint if exists "tour_service_variant_tour_id_foreign";`);

    this.addSql(`alter table if exists "tour_variant" drop constraint if exists "tour_variant_tour_id_foreign";`);

    this.addSql(`alter table if exists "tour_variant" drop constraint if exists "tour_variant_service_variant_id_foreign";`);

    this.addSql(`drop table if exists "tour" cascade;`);

    this.addSql(`drop table if exists "tour_booking" cascade;`);

    this.addSql(`drop table if exists "tour_service_variant" cascade;`);

    this.addSql(`drop table if exists "tour_variant" cascade;`);
  }

}
