import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260209211229 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_package_destination_available_dates";`);
    this.addSql(`ALTER TABLE "package" DROP COLUMN IF EXISTS "available_dates";`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_package_destination" ON "package" ("destination") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_package_destination";`);
    this.addSql(`ALTER TABLE "package" ADD COLUMN IF NOT EXISTS "available_dates" text[] NOT NULL DEFAULT '{}';`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_package_destination_available_dates" ON "package" ("destination", "available_dates") WHERE deleted_at IS NULL;`);
  }

}
