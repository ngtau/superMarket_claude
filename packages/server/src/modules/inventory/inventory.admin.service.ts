import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, sql as drizzleSql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { inventory, productSpecs, products } from "../../db/schema/index.js";

@Injectable()
export class InventoryAdminService {
  async findOne(skuId: string) {
    const [row] = await db.select().from(inventory).where(eq(inventory.skuId, skuId)).limit(1);
    if (!row) throw new NotFoundException("库存记录不存在");
    return row;
  }

  update(skuId: string, patch: Partial<{ stock: number; warnThreshold: number | null }>) {
    return db.update(inventory).set(patch).where(eq(inventory.skuId, skuId)).returning();
  }

  /** §6.1：低于预警阈值列表（D20⑥：warn_threshold为空=不参与预警） */
  async warnings() {
    return db
      .select({
        skuId: inventory.skuId,
        stock: inventory.stock,
        lockedStock: inventory.lockedStock,
        warnThreshold: inventory.warnThreshold,
        specNameZh: productSpecs.specNameZh,
        productNameZh: products.nameZh,
      })
      .from(inventory)
      .innerJoin(productSpecs, eq(productSpecs.id, inventory.skuId))
      .innerJoin(products, eq(products.id, productSpecs.productId))
      .where(
        drizzleSql`${inventory.warnThreshold} IS NOT NULL AND (${inventory.stock} - ${inventory.lockedStock}) <= ${inventory.warnThreshold}`
      );
  }
}
