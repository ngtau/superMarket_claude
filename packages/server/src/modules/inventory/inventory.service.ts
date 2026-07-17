import { Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { db } from "../../db/client.js";

@Injectable()
export class InventoryService {
  /**
   * §7.3 下单占用：单语句原子UPDATE，守卫 (stock - locked_stock) >= n 防超卖。
   * 影响行数=0 即库存不足，调用方应据此抛 INVENTORY_INSUFFICIENT 错误。
   */
  async lock(skuId: string, qty: number): Promise<boolean> {
    const result = await db.execute(sql`
      UPDATE inventory SET locked_stock = locked_stock + ${qty}
      WHERE sku_id = ${skuId} AND (stock - locked_stock) >= ${qty}
    `);
    return (result.rowCount ?? 0) > 0;
  }

  /** 超时/取消释放占用库存 */
  async release(skuId: string, qty: number): Promise<void> {
    await db.execute(sql`
      UPDATE inventory SET locked_stock = locked_stock - ${qty}
      WHERE sku_id = ${skuId}
    `);
  }

  /** 发货出库：真正扣减在库总量，同时释放占用 */
  async fulfill(skuId: string, qty: number): Promise<void> {
    await db.execute(sql`
      UPDATE inventory SET stock = stock - ${qty}, locked_stock = locked_stock - ${qty}
      WHERE sku_id = ${skuId}
    `);
  }
}
