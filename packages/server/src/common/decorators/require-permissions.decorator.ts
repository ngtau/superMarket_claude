import { SetMetadata } from "@nestjs/common";

export const PERMISSIONS_KEY = "requiredPermissions";

/**
 * 标注该 Controller/Handler 所需权限点，RBACGuard 据此校验当前管理员角色的 access 是否满足。
 * 用法：@RequirePermissions('order:manage')  或多个: @RequirePermissions('order:manage', 'order:ship')
 * 默认要求 access='full'；若只需只读权限即可通过，使用 @RequirePermissions({ key: 'order:manage', minAccess: 'readonly' })
 */
export type PermissionRequirement = string | { key: string; minAccess: "readonly" | "full" };

export const RequirePermissions = (...permissions: PermissionRequirement[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
