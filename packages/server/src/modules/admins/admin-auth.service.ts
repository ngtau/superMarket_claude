import { Injectable, UnauthorizedException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../../db/client.js";
import { admins, roles, rolePermissions } from "../../db/schema/index.js";

const ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? "15m";

@Injectable()
export class AdminAuthService {
  /** 管理员登录：之前各Phase测试均绕过此步骤直接写库签发token，这里补上真正的登录入口 */
  async login(username: string, password: string) {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username)).limit(1);
    if (!admin || admin.status !== "active") {
      throw new UnauthorizedException("用户名或密码错误");
    }
    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("用户名或密码错误");
    }
    const accessToken = jwt.sign({ adminId: admin.id }, process.env.JWT_ACCESS_SECRET ?? "", { expiresIn: ACCESS_TTL as any });
    return { accessToken };
  }

  /** 供前端渲染RBAC导航：返回当前管理员信息+角色+完整权限点组合 */
  async me(adminId: string) {
    const [admin] = await db
      .select({ id: admins.id, username: admins.username, roleId: admins.roleId, roleKey: roles.key, roleNameZh: roles.nameZh })
      .from(admins)
      .innerJoin(roles, eq(roles.id, admins.roleId))
      .where(eq(admins.id, adminId))
      .limit(1);
    if (!admin) throw new UnauthorizedException("账号不存在");

    const grants = await db
      .select({ permission: rolePermissions.permission, access: rolePermissions.access })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, admin.roleId));

    return { ...admin, permissions: Object.fromEntries(grants.map((g) => [g.permission, g.access])) };
  }
}
