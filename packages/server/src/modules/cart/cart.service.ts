import { Injectable } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/client.js";
import { carts, cartItems, productSpecs, products, inventory } from "../../db/schema/index.js";
import { resolveBilingual, type Locale } from "@app/shared";

@Injectable()
export class CartService {
  private async getOrCreateCart(userId: string) {
    const [existing] = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
    if (existing) return existing;
    const [created] = await db.insert(carts).values({ userId }).returning();
    return created;
  }

  async get(userId: string, locale: Locale) {
    const cart = await this.getOrCreateCart(userId);
    const items = await db
      .select({
        id: cartItems.id,
        skuId: cartItems.skuId,
        qty: cartItems.qty,
        checked: cartItems.checked,
        specNameZh: productSpecs.specNameZh,
        specNameEn: productSpecs.specNameEn,
        priceAfterCents: productSpecs.priceAfterCents,
        productId: products.id,
        productNameZh: products.nameZh,
        productNameEn: products.nameEn,
        productPriceAfterCents: products.priceAfterCents,
        stock: inventory.stock,
        lockedStock: inventory.lockedStock,
      })
      .from(cartItems)
      .innerJoin(productSpecs, eq(productSpecs.id, cartItems.skuId))
      .innerJoin(products, eq(products.id, productSpecs.productId))
      .leftJoin(inventory, eq(inventory.skuId, productSpecs.id))
      .where(eq(cartItems.cartId, cart.id));

    return items.map((i) => ({
      id: i.id,
      skuId: i.skuId,
      qty: i.qty,
      checked: i.checked,
      productId: i.productId,
      name: resolveBilingual(i.productNameZh, i.productNameEn, locale),
      specName: resolveBilingual(i.specNameZh, i.specNameEn, locale),
      priceAfterCents: i.priceAfterCents ?? i.productPriceAfterCents,
      available: Math.max(0, (i.stock ?? 0) - (i.lockedStock ?? 0)),
    }));
  }

  async addItem(userId: string, skuId: string, qty: number) {
    const cart = await this.getOrCreateCart(userId);
    // 触碰购物车即刷新 updated_at，用于 D20②的 7天TTL判定（由定时任务按此字段清理，Phase14接入）
    await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));

    const [existing] = await db.select().from(cartItems).where(and(eq(cartItems.cartId, cart.id), eq(cartItems.skuId, skuId))).limit(1);
    if (existing) {
      return db.update(cartItems).set({ qty: existing.qty + qty }).where(eq(cartItems.id, existing.id)).returning();
    }
    return db.insert(cartItems).values({ cartId: cart.id, skuId, qty }).returning();
  }

  async updateItem(userId: string, itemId: string, patch: { qty?: number; checked?: boolean }) {
    const cart = await this.getOrCreateCart(userId);
    return db.update(cartItems).set(patch).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id))).returning();
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getOrCreateCart(userId);
    await db.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)));
  }

  /** 登录后合并本地(游客态)购物车 */
  async merge(userId: string, localItems: { skuId: string; qty: number }[]) {
    for (const item of localItems) {
      await this.addItem(userId, item.skuId, item.qty);
    }
    return this.get(userId, "zh-HK");
  }
}
