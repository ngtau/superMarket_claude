import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { eq, inArray, and, isNull, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  cartItems, carts, productSpecs, products, inventory, addresses, orders, orderItems, payments, platformSettings,
} from "../../db/schema/index.js";
import { resolveEffectivePrice } from "../products/pricing.util.js";
import { computeShippingFee } from "./shipping.util.js";
import { computeFullReduction } from "./full-reduction.util.js";
import { checkPurchaseLimits } from "./purchase-limit.util.js";
import { generateOrderNo } from "@app/shared";

interface CheckoutLine {
  skuId: string; productId: string; categoryId: string; qty: number;
  unitPriceCents: number; weightGrams: number; discountedSubtotalCents: number;
  productSnapshot: unknown;
}

@Injectable()
export class CheckoutService {
  /**
   * 结算预览与实际下单共用同一套算价逻辑，确保金额一致（✅已确认：预览不锁库存，只读）。
   * ⚠️安全修复：此前从未校验cartItemIds是否属于当前登录用户，任意用户传入他人的cart_item_id
   * 即可读取其购物车定价（preview）、甚至用他人购物车项下单并悄悄删除对方购物车条目（placeOrder）——
   * 典型IDOR越权漏洞，实测排查发现。现通过join carts表校验cart.user_id=userId修复。
   */
  private async buildLines(userId: string, cartItemIds: string[]): Promise<CheckoutLine[]> {
    const rows = await db
      .select({
        itemId: cartItems.id,
        skuId: cartItems.skuId,
        qty: cartItems.qty,
        specNameZh: productSpecs.specNameZh,
        specNameEn: productSpecs.specNameEn,
        weightGrams: productSpecs.weightGrams,
        specPriceAfter: productSpecs.priceAfterCents,
        productId: products.id,
        categoryId: products.categoryId,
        productNameZh: products.nameZh,
        productNameEn: products.nameEn,
        priceOriginalCents: products.priceOriginalCents,
        priceAfterCents: products.priceAfterCents,
        images: products.images,
      })
      .from(cartItems)
      .innerJoin(carts, eq(carts.id, cartItems.cartId))
      .innerJoin(productSpecs, eq(productSpecs.id, cartItems.skuId))
      .innerJoin(products, eq(products.id, productSpecs.productId))
      .where(and(inArray(cartItems.id, cartItemIds), eq(carts.userId, userId)));

    if (rows.length !== cartItemIds.length) {
      throw new BadRequestException("部分购物车项已失效，请刷新购物车");
    }

    const lines: CheckoutLine[] = [];
    for (const r of rows) {
      const { effectivePriceCents } = await resolveEffectivePrice(r.productId, r.priceOriginalCents, r.priceAfterCents);
      const unitPriceCents = r.specPriceAfter ?? effectivePriceCents;
      lines.push({
        skuId: r.skuId,
        productId: r.productId,
        categoryId: r.categoryId,
        qty: r.qty,
        unitPriceCents,
        weightGrams: r.weightGrams,
        discountedSubtotalCents: unitPriceCents * r.qty,
        productSnapshot: {
          nameZh: r.productNameZh, nameEn: r.productNameEn,
          specNameZh: r.specNameZh, specNameEn: r.specNameEn,
          images: r.images,
        },
      });
    }
    return lines;
  }

  private async getSettings() {
    const keys = ["purchase_limit_per_order_default", "total_items_limit_per_order_default"];
    const rows = await db.select().from(platformSettings).where(inArray(platformSettings.key, keys));
    const map = new Map(rows.map((r) => [r.key, r.value as number | null]));
    return {
      perProductLimit: map.get("purchase_limit_per_order_default") ?? null,
      totalItemsLimit: map.get("total_items_limit_per_order_default") ?? null,
    };
  }

  private async calculate(lines: CheckoutLine[]) {
    const settings = await this.getSettings();
    checkPurchaseLimits(
      lines.map((l) => ({ skuId: l.skuId, qty: l.qty })),
      settings.perProductLimit,
      settings.totalItemsLimit
    );

    const subtotalCents = lines.reduce((s, l) => s + l.discountedSubtotalCents, 0);
    const { reductionCents } = await computeFullReduction(
      lines.map((l) => ({ categoryId: l.categoryId, discountedSubtotalCents: l.discountedSubtotalCents }))
    );
    const shippingFeeCents = await computeShippingFee(
      lines.map((l) => ({ productId: l.productId, categoryId: l.categoryId, weightGrams: l.weightGrams, qty: l.qty })),
      subtotalCents - reductionCents
    );
    const totalCents = subtotalCents - reductionCents + shippingFeeCents;
    return { subtotalCents, discountCents: reductionCents, shippingFeeCents, totalCents };
  }

  async preview(userId: string, cartItemIds: string[]) {
    const lines = await this.buildLines(userId, cartItemIds);
    return this.calculate(lines);
  }

  /** §7.3：下单四表同事务提交 + 单语句原子库存占用 */
  async placeOrder(userId: string, cartItemIds: string[], addressId: string, paymentMethod: string, remark?: string) {
    const lines = await this.buildLines(userId, cartItemIds);
    const amounts = await this.calculate(lines);

    const [address] = await db.select().from(addresses).where(and(eq(addresses.id, addressId), eq(addresses.userId, userId))).limit(1);
    if (!address) throw new NotFoundException("收货地址不存在");

    return db.transaction(async (tx) => {
      // 原子库存占用：单语句UPDATE影响行数=0即库存不足，抛错触发整个事务回滚（§7.3）
      for (const line of lines) {
        const result = await tx.execute(sql`
          UPDATE inventory SET locked_stock = locked_stock + ${line.qty}
          WHERE sku_id = ${line.skuId} AND (stock - locked_stock) >= ${line.qty}
        `);
        if ((result.rowCount ?? 0) === 0) {
          throw new BadRequestException({ code: "INVENTORY_INSUFFICIENT", message: `SKU ${line.skuId} 库存不足` });
        }
      }

      const orderNo = generateOrderNo();
      const [order] = await tx.insert(orders).values({
        orderNo,
        userId,
        status: "pending_payment",
        paymentStatus: "pending",
        addressSnapshot: address,
        subtotalCents: amounts.subtotalCents,
        discountCents: amounts.discountCents,
        shippingFeeCents: amounts.shippingFeeCents,
        totalCents: amounts.totalCents,
        remark,
      }).returning();

      for (const line of lines) {
        await tx.insert(orderItems).values({
          orderId: order.id,
          productSnapshot: line.productSnapshot,
          skuId: line.skuId,
          qty: line.qty,
          priceAfterCents: line.unitPriceCents,
        });
      }

      const [payment] = await tx.insert(payments).values({
        orderId: order.id,
        method: paymentMethod,
        status: "pending",
        amountCents: amounts.totalCents,
      }).returning();

      // 结算完成后清空已勾选的购物车项
      await tx.delete(cartItems).where(inArray(cartItems.id, cartItemIds));

      return { order, payment };
    });
  }
}
