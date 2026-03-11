import { Migration } from '@mikro-orm/migrations';

export class Migration20260310120000 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table if not exists "izipay_ipn_event" ("id" text not null, "order_id" text null, "transaction_id" text null, "payload" jsonb not null, "is_valid" boolean not null default false, "processed_at" timestamptz null, "error" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "izipay_ipn_event_pkey" primary key ("id"));');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "izipay_ipn_event";');
  }

}
