import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { memberLevels, users } from "../../db/schema/index.js";

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
}
