import { Injectable, BadRequestException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { roles, permissions, rolePermissions, admins } from "../../db/schema/index.js";

@Injectable()
export class RolesService {
  findAll() {
    return db.select().from(roles).orderBy(roles.key);
  }

  permissionCatalog() {
    return db.select().from(permissions);
  }

  // ✅已确认支持自定义角色（isBuiltin=false）
  create(input: { key: string; nameZh: string; nameEn: string }) {
    return db.insert(roles).values({ ...input, isBuiltin: false }).returning();
  }

  async update(id: string, input: { nameZh?: string; nameEn?: string }) {
    const [row] = await db.update(roles).set(input).where(eq(roles.id, id)).returning();
    return row;
  }

  async remove(id: string) {
    const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!role) return;
    if (role.isBuiltin) {
      throw new BadRequestException("内置角色不可删除，仅可调整权限点");
    }
    // ⚠️修复：与categories.service.ts同一类问题——admins.role_id外键无onDelete，
    // 若还有管理员绑定此角色，直接删除会撞FK约束抛未处理500，而非友好400。
    const boundAdmins = await db.select().from(admins).where(eq(admins.roleId, id)).limit(1);
    if (boundAdmins.length > 0) {
      throw new BadRequestException("该角色下仍有管理员账号，请先转移或删除这些账号后再删除角色");
    }
    await db.delete(roles).where(eq(roles.id, id));
  }

  rolePermissions(roleId: string) {
    return db.select().from(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  }

  /** 覆盖式更新：整份权限点组合，供自定义角色勾选矩阵UI提交 */
  async setRolePermissions(roleId: string, grants: { permission: string; access: "full" | "readonly" | "none" }[]) {
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    if (grants.length === 0) return [];
    return db.insert(rolePermissions).values(grants.map((g) => ({ roleId, ...g }))).returning();
  }
}
