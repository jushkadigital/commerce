import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260602040941 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "processed_event" drop constraint if exists "processed_event_event_id_consumer_id_unique";`);
    this.addSql(`create table if not exists "processed_event" ("id" text not null, "event_id" text not null, "consumer_id" text not null, "status" text not null, "stale_lock_until" timestamptz not null, "payload_hash" text null, "processed_at" timestamptz null, "error_message" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "processed_event_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_processed_event_deleted_at" ON "processed_event" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_processed_event_event_id_consumer_id_unique" ON "processed_event" ("event_id", "consumer_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "processed_event" cascade;`);
  }

}
