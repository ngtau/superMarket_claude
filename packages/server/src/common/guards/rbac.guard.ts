import {
  Injectable,
  CanActivate,
  type ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { admins, roles, rolePermissions } from "../../db/schema/index.js";
import { PERMISSIONS_KEY, type PermissionRequirement } from "../decorators/require-permissions.decorator.js";

export interface AdminPrincipal {
  adminId: string;
  username: string;
  roleId: string;
  roleKey: string;
}

const ACCESS_RANK: Record<string, number> = { none: 0, readonly: 1, full: 2 };

/**
 * RBAC 守卫：所有 B 端 Controller/Handler 加 @UseGuards(RBACGuard) + @RequirePermissions(...) 即受保护。
 * 校验流程：解析JWT → 查 admins 表(含状态) → 查该角色在 role_permissions 中的 access → 与要求的 minAccess 比较。
 * 未标注 @RequirePermissions 的 Handler 默认放行（仅要求已登录管理员，不做权限点校验）。
 */
@Injectable()
export class RBACGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers?.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("缺少管理员身份凭证");
    }
    const token = authHeader.slice("Bearer ".length);

    let payload: { adminId: string };
    try {
      payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET ?? "") as { adminId: string };
    } catch {
      throw new UnauthorizedException("凭证无效或已过期");
    }

    const [admin] = await db
      .select({
        id: admins.id,
        username: admins.username,
        status: admins.status,
        roleId: admins.roleId,
        roleKey: roles.key,
      })
      .from(admins)
      .innerJoin(roles, eq(roles.id, admins.roleId))
      .where(eq(admins.id, payload.adminId))
      .limit(1);

    if (!admin || admin.status !== "active") {
      throw new UnauthorizedException("账号不存在或已被禁用");
    }

    const principal: AdminPrincipal = {
      adminId: admin.id,
      username: admin.username,
      roleId: admin.roleId,
      roleKey: admin.roleKey,
    };
    request.admin = principal; // 供 @CurrentAdmin() 取用

    const required = this.reflector.getAllAndOverride<PermissionRequirement[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true; // 未标注权限点：仅要求登录态
    }

    const grants = await db
      .select({ permission: rolePermissions.permission, access: rolePermissions.access })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, admin.roleId));
    const grantMap = new Map(grants.map((g) => [g.permission, g.access]));

    for (const req of required) {
      const key = typeof req === "string" ? req : req.key;
      const minAccess = typeof req === "string" ? "full" : req.minAccess;
      const actual = grantMap.get(key) ?? "none";
      if (ACCESS_RANK[actual] < ACCESS_RANK[minAccess]) {
        throw new ForbiddenException(`缺少权限：${key}（需要 ${minAccess}，当前 ${actual}）`);
      }
    }
    return true;
  }
}
