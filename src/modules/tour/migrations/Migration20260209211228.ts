import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260209211228 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_tour_destination_available_dates";`);
    this.addSql(`ALTER TABLE "tour" DROP COLUMN IF EXISTS "available_dates";`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tour_destination" ON "tour" ("destination") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_tour_destination";`);
    this.addSql(`ALTER TABLE "tour" ADD COLUMN IF NOT EXISTS "available_dates" text[] NOT NULL DEFAULT '{}';`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tour_destination_available_dates" ON "tour" ("destination", "available_dates") WHERE deleted_at IS NULL;`);
  }

}
