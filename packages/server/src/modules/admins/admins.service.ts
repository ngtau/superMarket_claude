import { Injectable, ConflictException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "../../db/client.js";
import { admins } from "../../db/schema/index.js";

@Injectable()
export class AdminsService {
  findAll() {
    return db.select({ id: admins.id, username: admins.username, roleId: admins.roleId, status: admins.status, createdAt: admins.createdAt }).from(admins);
  }

  async create(input: { username: string; password: string; roleId: string }) {
    const [existing] = await db.select().from(admins).where(eq(admins.username, input.username)).limit(1);
    if (existing) throw new ConflictException("用户名已存在");
    const passwordHash = await bcrypt.hash(input.password, 10);
    const [row] = await db.insert(admins).values({ username: input.username, passwordHash, roleId: input.roleId }).returning();
    return { id: row.id, username: row.username };
  }

  /** ⚠️安全修复：returning()必须限定字段，此前会把passwordHash整条返回给前端（与members.service.ts同款bug，一并排查修复） */
  update(id: string, patch: Partial<{ roleId: string; status: "active" | "disabled" }>) {
    return db.update(admins).set(patch).where(eq(admins.id, id))
      .returning({ id: admins.id, username: admins.username, roleId: admins.roleId, status: admins.status });
  }

  remove(id: string) {
    return db.delete(admins).where(eq(admins.id, id));
  }
}
