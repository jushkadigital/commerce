import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260310010000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      "create table if not exists \"order_notification_recipient\" (\"id\" text not null, \"email\" text not null, \"created_at\" timestamptz not null default now(), \"updated_at\" timestamptz not null default now(), \"deleted_at\" timestamptz null, constraint \"order_notification_recipient_pkey\" primary key (\"id\"));"
    )
    this.addSql(
      "CREATE UNIQUE INDEX IF NOT EXISTS \"IDX_order_notification_recipient_email_unique\" ON \"order_notification_recipient\" (\"email\") WHERE deleted_at IS NULL;"
    )
    this.addSql(
      "CREATE INDEX IF NOT EXISTS \"IDX_order_notification_recipient_deleted_at\" ON \"order_notification_recipient\" (\"deleted_at\") WHERE deleted_at IS NULL;"
    )
  }

  override async down(): Promise<void> {
    this.addSql("drop table if exists \"order_notification_recipient\" cascade;")
  }
}
