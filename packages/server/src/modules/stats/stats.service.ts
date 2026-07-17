import { Injectable } from "@nestjs/common";
import { sql, and, gte, lte, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { orders, orderItems, payments, products, productSpecs } from "../../db/schema/index.js";

@Injectable()
export class StatsService {
  /** §6.8：订单数/销售额统计。按status排除cancelled，避免虚增销售额 */
  async orderStats(from: Date, to: Date) {
    const rows = await db
      .select({
        orderCount: sql<number>`count(*)::int`,
        totalSalesCents: sql<number>`coalesce(sum(${orders.totalCents}),0)::bigint`,
      })
      .from(orders)
      .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to), sql`${orders.status} != 'cancelled'`));
    return rows[0];
  }

  /** 商品销量排行：按order_items聚合数量，仅统计已付款以上状态订单 */
  async productSales(from: Date, to: Date, categoryId?: string) {
    const conditions = [gte(orders.createdAt, from), lte(orders.createdAt, to), sql`${orders.status} != 'cancelled'`];
    if (categoryId) conditions.push(eq(products.categoryId, categoryId));

    return db
      .select({
        productId: products.id,
        nameZh: products.nameZh,
        totalQty: sql<number>`sum(${orderItems.qty})::int`,
        totalSalesCents: sql<number>`sum(${orderItems.qty} * ${orderItems.priceAfterCents})::bigint`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .innerJoin(productSpecs, eq(productSpecs.id, orderItems.skuId))
      .innerJoin(products, eq(products.id, productSpecs.productId))
      .where(and(...conditions))
      .groupBy(products.id, products.nameZh)
      .orderBy(sql`sum(${orderItems.qty}) DESC`);
  }

  /** 支付方式占比 */
  async paymentShare(from: Date, to: Date) {
    return db
      .select({ method: payments.method, count: sql<number>`count(*)::int`, totalCents: sql<number>`coalesce(sum(${payments.amountCents}),0)::bigint` })
      .from(payments)
      .where(and(gte(payments.createdAt, from), lte(payments.createdAt, to), eq(payments.status, "paid")))
      .groupBy(payments.method);
  }

  /** 访问/转化统计：v1无自建埋点管道，GA4接入留待前端SDK+Measurement Protocol，此处先返回结构化占位供前端联调 */
  async traffic(_from: Date, _to: Date) {
    return {
      note: "GA4/自采访问数据管道尚未接入，需前端埋点SDK就绪后对接",
      pageViews: null, uniqueVisitors: null, conversionRate: null,
    };
  }
}
