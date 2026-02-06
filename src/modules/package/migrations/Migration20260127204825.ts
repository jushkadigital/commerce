import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260127204825 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "package_variant" drop constraint if exists "package_variant_package_id_passenger_type_unique";`);
    this.addSql(`alter table if exists "package_variant" drop constraint if exists "package_variant_variant_id_unique";`);
    this.addSql(`alter table if exists "package" drop constraint if exists "package_product_id_unique";`);
    this.addSql(`create table if not exists "package" ("id" text not null, "product_id" text not null, "destination" text not null, "description" text null, "duration_days" integer not null, "max_capacity" integer not null, "thumbnail" text null, "available_dates" text[] not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "package_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_package_product_id_unique" ON "package" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_package_deleted_at" ON "package" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_package_destination_available_dates" ON "package" ("destination", "available_dates") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "package_booking" ("id" text not null, "order_id" text not null, "package_id" text not null, "line_items" jsonb null, "package_date" timestamptz not null, "status" text check ("status" in ('pending', 'confirmed', 'cancelled', 'completed')) not null default 'pending', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "package_booking_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_package_booking_package_id" ON "package_booking" ("package_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_package_booking_deleted_at" ON "package_booking" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_package_booking_order_id" ON "package_booking" ("order_id") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "package_service_variant" ("id" text not null, "title" text not null, "description" text null, "is_active" boolean not null default true, "sort_order" integer not null default 0, "metadata" jsonb null, "package_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "package_service_variant_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_package_service_variant_package_id" ON "package_service_variant" ("package_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_package_service_variant_deleted_at" ON "package_service_variant" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "package_variant" ("id" text not null, "variant_id" text not null, "passenger_type" text check ("passenger_type" in ('adult', 'child', 'infant')) not null, "package_id" text not null, "service_variant_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "package_variant_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_package_variant_variant_id_unique" ON "package_variant" ("variant_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_package_variant_package_id" ON "package_variant" ("package_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_package_variant_service_variant_id" ON "package_variant" ("service_variant_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_package_variant_deleted_at" ON "package_variant" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_package_variant_package_id_passenger_type_unique" ON "package_variant" ("package_id", "passenger_type") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_package_variant_service_variant_id_passenger_type" ON "package_variant" ("service_variant_id", "passenger_type") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "package_booking" add constraint "package_booking_package_id_foreign" foreign key ("package_id") references "package" ("id") on update cascade;`);

    this.addSql(`alter table if exists "package_service_variant" add constraint "package_service_variant_package_id_foreign" foreign key ("package_id") references "package" ("id") on update cascade;`);

    this.addSql(`alter table if exists "package_variant" add constraint "package_variant_package_id_foreign" foreign key ("package_id") references "package" ("id") on update cascade;`);
    this.addSql(`alter table if exists "package_variant" add constraint "package_variant_service_variant_id_foreign" foreign key ("service_variant_id") references "package_service_variant" ("id") on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "package_booking" drop constraint if exists "package_booking_package_id_foreign";`);

    this.addSql(`alter table if exists "package_service_variant" drop constraint if exists "package_service_variant_package_id_foreign";`);

    this.addSql(`alter table if exists "package_variant" drop constraint if exists "package_variant_package_id_foreign";`);

    this.addSql(`alter table if exists "package_variant" drop constraint if exists "package_variant_service_variant_id_foreign";`);

    this.addSql(`drop table if exists "package" cascade;`);

    this.addSql(`drop table if exists "package_booking" cascade;`);

    this.addSql(`drop table if exists "package_service_variant" cascade;`);

    this.addSql(`drop table if exists "package_variant" cascade;`);
  }

}
