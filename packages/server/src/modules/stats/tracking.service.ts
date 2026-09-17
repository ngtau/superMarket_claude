import { Injectable } from "@nestjs/common";
import { eq, and, gte, lte, sql, countDistinct } from "drizzle-orm";
import { db } from "../../db/client.js";
import { trackingEvents, users, orders } from "../../db/schema/index.js";

export type TrackingEventType =
  | "page_view" | "product_view" | "add_to_cart" | "checkout_start" | "register" | "order_placed";

@Injectable()
export class TrackingService {
  /** 埋点写入。失败不抛：埋点属于旁路数据，绝不能因为统计把用户的主流程打断 */
  async track(input: { sessionId: string; eventType: TrackingEventType; path?: string; productId?: string | null }) {
    try {
      await db.insert(trackingEvents).values({
        sessionId: input.sessionId,
        eventType: input.eventType,
        path: input.path ?? null,
        productId: input.productId ?? null,
      });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  /**
   * §6.8 行42：访问与转化统计 —— 真实自采数据（此前为结构化占位）。
   *
   * 口径说明（写清楚避免后续被质疑数字对不上）：
   * - pageViews：page_view + product_view 事件总数（"浏览量"按 SDRS 与访问量分列）
   * - visits：page_view 事件数（会话级浏览起点）
   * - uniqueVisitors：去重 sessionId 数
   * - registrations：register 事件数（与 users 表按时间范围统计结果相互校验，取事件口径）
   * - orders：order_placed 事件数；同时给出 ordersDb 取自订单库，两者应一致，不一致说明埋点漏了
   * - conversionRate = 下单会话数 / 访问会话数（按会话去重算，而非事件数之比——
   *   事件数之比会被"一个人刷了10次页面"严重稀释，是常见错误口径）
   */
  async traffic(from: Date, to: Date) {
    const range = and(gte(trackingEvents.createdAt, from), lte(trackingEvents.createdAt, to));

    const [totals] = await db
      .select({
        visits: sql<number>`count(*) filter (where ${trackingEvents.eventType} = 'page_view')::int`,
        pageViews: sql<number>`count(*) filter (where ${trackingEvents.eventType} in ('page_view','product_view'))::int`,
        productViews: sql<number>`count(*) filter (where ${trackingEvents.eventType} = 'product_view')::int`,
        addToCart: sql<number>`count(*) filter (where ${trackingEvents.eventType} = 'add_to_cart')::int`,
        checkoutStart: sql<number>`count(*) filter (where ${trackingEvents.eventType} = 'checkout_start')::int`,
        registrations: sql<number>`count(*) filter (where ${trackingEvents.eventType} = 'register')::int`,
        orderPlaced: sql<number>`count(*) filter (where ${trackingEvents.eventType} = 'order_placed')::int`,
      })
      .from(trackingEvents)
      .where(range);

    const [visitors] = await db
      .select({ uniqueVisitors: countDistinct(trackingEvents.sessionId) })
      .from(trackingEvents)
      .where(range);

    // 转化漏斗的分母：下单去重会话数（同一会话多单只算一次转化）
    const [converted] = await db
      .select({ convertedSessions: countDistinct(trackingEvents.sessionId) })
      .from(trackingEvents)
      .where(and(range, eq(trackingEvents.eventType, "order_placed")));

    // 交叉校验：订单库真实下单数 vs 埋点数，不一致说明前端埋点有遗漏
    const [dbOrders] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to)));

    const [dbUsers] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(and(gte(users.createdAt, from), lte(users.createdAt, to)));

    const uniqueVisitors = Number(visitors?.uniqueVisitors ?? 0);
    const convertedSessions = Number(converted?.convertedSessions ?? 0);

    return {
      source: "self-collected（tracking_events）+ 订单库交叉校验",
      range: { from: from.toISOString(), to: to.toISOString() },
      visits: totals?.visits ?? 0,
      pageViews: totals?.pageViews ?? 0,
      productViews: totals?.productViews ?? 0,
      uniqueVisitors,
      addToCart: totals?.addToCart ?? 0,
      checkoutStart: totals?.checkoutStart ?? 0,
      registrations: totals?.registrations ?? 0,
      orders: totals?.orderPlaced ?? 0,
      conversionRate: uniqueVisitors > 0 ? Number((convertedSessions / uniqueVisitors).toFixed(4)) : 0,
      // 交叉校验：埋点口径 vs 数据库口径，差异过大说明埋点漏报
      crossCheck: {
        ordersFromDb: dbOrders?.count ?? 0,
        ordersFromTracking: totals?.orderPlaced ?? 0,
        registrationsFromDb: dbUsers?.count ?? 0,
        registrationsFromTracking: totals?.registrations ?? 0,
      },
      // GA4 仍为可选项：SDRS 写的是"GA4 + 必要自采"，自采已能独立支撑看板，GA4 属增强
      ga4: null as null,
      ga4Note: "GA4 属可选增强，需账号与前端 SDK；看板当前指标已由自采数据支撑",
    };
  }
}
