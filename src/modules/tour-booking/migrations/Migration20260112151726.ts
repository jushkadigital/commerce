import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260112151726 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "tour_variant" drop constraint if exists "tour_variant_product_variant_id_unique";`);
    this.addSql(`drop index if exists "IDX_tour_variant_variant_id_unique";`);

    this.addSql(`alter table if exists "tour_variant" rename column "variant_id" to "product_variant_id";`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tour_variant_product_variant_id_unique" ON "tour_variant" ("product_variant_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_tour_variant_product_variant_id_unique";`);

    this.addSql(`alter table if exists "tour_variant" rename column "product_variant_id" to "variant_id";`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tour_variant_variant_id_unique" ON "tour_variant" ("variant_id") WHERE deleted_at IS NULL;`);
  }

}
