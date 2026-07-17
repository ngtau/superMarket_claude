import { Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { users } from "../../db/schema/index.js";

@Injectable()
export class UsersService {
  async me(userId: string) {
    const [user] = await db
      .select({ id: users.id, email: users.email, locale: users.locale, memberLevelId: users.memberLevelId, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new NotFoundException("用户不存在");
    return user;
  }

  async updateMe(userId: string, patch: { locale?: string }) {
    const [user] = await db.update(users).set(patch).where(eq(users.id, userId)).returning({
      id: users.id, email: users.email, locale: users.locale,
    });
    return user;
  }
}
