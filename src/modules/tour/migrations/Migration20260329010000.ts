import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260329010000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_product_external_id" ON "product" ("external_id") WHERE deleted_at IS NULL AND external_id IS NOT NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_product_external_id";`)
  }
}
