import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db/client.js";
import { memberLevels, users, orders, addresses } from "../../db/schema/index.js";

@Injectable()
export class MembersService {
  findAllLevels() {
    return db.select().from(memberLevels).orderBy(memberLevels.sort);
  }

  createLevel(input: { nameZh: string; nameEn: string; sort?: number }) {
    return db.insert(memberLevels).values(input).returning();
  }

  /** §7.6：手动调整会员等级。⚠️安全修复：returning()必须限定字段，此前曾泄露passwordHash到响应体（实测发现） */
  setUserLevel(userId: string, memberLevelId: string) {
    return db.update(users).set({ memberLevelId }).where(eq(users.id, userId))
      .returning({ id: users.id, email: users.email, memberLevelId: users.memberLevelId });
  }

  findAllUsers() {
    return db.select({ id: users.id, email: users.email, status: users.status, memberLevelId: users.memberLevelId, createdAt: users.createdAt, lastLoginAt: users.lastLoginAt }).from(users);
  }

  /** ⚠️安全修复：同上，限定返回字段 */
  toggleUserStatus(userId: string, status: "active" | "disabled") {
    return db.update(users).set({ status }).where(eq(users.id, userId))
      .returning({ id: users.id, email: users.email, status: users.status });
  }

  /**
   * §6.7 行36「用户管理」：查看注册信息 / 登录记录 / 订单历史。
   * ⚠️安全：只返回安全字段，绝不回传 password_hash（与 setUserLevel/toggleUserStatus 同一原则）。
   */
  async userDetail(userId: string) {
    const [user] = await db.select({
      id: users.id,
      email: users.email,
      status: users.status,
      locale: users.locale,
      memberLevelId: users.memberLevelId,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    }).from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundException("用户不存在");

    const [level] = user.memberLevelId
      ? await db.select().from(memberLevels).where(eq(memberLevels.id, user.memberLevelId)).limit(1)
      : [];

    const history = await db
      .select({
        id: orders.id, orderNo: orders.orderNo, status: orders.status,
        paymentStatus: orders.paymentStatus, totalCents: orders.totalCents, createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt))
      .limit(200);

    const addressCount = await db.select({ id: addresses.id }).from(addresses).where(eq(addresses.userId, userId));

    return {
      ...user,
      memberLevel: level ?? null,
      stats: {
        orderCount: history.length,
        totalSpentCents: history.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + o.totalCents, 0),
        addressCount: addressCount.length,
      },
      orders: history,
    };
  }
}
