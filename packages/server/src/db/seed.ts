import "dotenv/config";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, pool } from "./client.js";
import { roles, permissions, rolePermissions, platformSettings, shippingTemplates, admins } from "./schema/index.js";

// §7.5 七角色矩阵（内置角色，isBuiltin=true，不可删除）
const BUILTIN_ROLES = [
  { key: "super_admin", nameZh: "超级管理员", nameEn: "Super Admin" },
  { key: "product_manager", nameZh: "商品管理员", nameEn: "Product Manager" },
  { key: "order_manager", nameZh: "订单管理员", nameEn: "Order Manager" },
  { key: "marketing_manager", nameZh: "营销管理员", nameEn: "Marketing Manager" },
  { key: "customer_service", nameZh: "客服", nameEn: "Customer Service" },
  { key: "finance", nameZh: "财务", nameEn: "Finance" },
  { key: "auditor", nameZh: "审计员", nameEn: "Auditor" },
] as const;

// 权限点目录（对齐 §7.5 矩阵列 + API契约文档各模块前缀）
const PERMISSIONS = [
  { key: "dashboard:read", groupZh: "仪表盘", groupEn: "Dashboard", labelZh: "查看仪表盘", labelEn: "View Dashboard" },
  { key: "product:manage", groupZh: "商品/分类", groupEn: "Product", labelZh: "商品与分类管理", labelEn: "Manage Products" },
  { key: "order:manage", groupZh: "订单", groupEn: "Order", labelZh: "订单管理", labelEn: "Manage Orders" },
  { key: "order:ship", groupZh: "订单", groupEn: "Order", labelZh: "订单发货", labelEn: "Ship Orders" },
  { key: "marketing:manage", groupZh: "营销/折扣", groupEn: "Marketing", labelZh: "营销管理", labelEn: "Manage Marketing" },
  { key: "user:manage", groupZh: "用户/会员", groupEn: "User", labelZh: "用户与会员管理", labelEn: "Manage Users" },
  { key: "payment:manage", groupZh: "支付/物流设置", groupEn: "Payment & Shipping", labelZh: "支付物流设置", labelEn: "Manage Payment & Shipping" },
  { key: "system:manage", groupZh: "系统/权限", groupEn: "System", labelZh: "系统设置与权限", labelEn: "Manage System & Roles" },
  { key: "audit:read", groupZh: "审计日志", groupEn: "Audit", labelZh: "查看审计日志", labelEn: "View Audit Logs" },
] as const;

// §7.5 矩阵：full=✅ / readonly=只读 / none=⛔
const ROLE_PERMISSION_MATRIX: Record<string, Record<string, "full" | "readonly" | "none">> = {
  super_admin: Object.fromEntries(PERMISSIONS.map((p) => [p.key, "full"])),
  product_manager: { "dashboard:read": "full", "product:manage": "full" },
  order_manager: { "dashboard:read": "full", "order:manage": "full", "order:ship": "full", "user:manage": "readonly", "audit:read": "readonly" },
  marketing_manager: { "dashboard:read": "full", "marketing:manage": "full" },
  customer_service: { "dashboard:read": "readonly", "product:manage": "readonly", "order:manage": "readonly", "user:manage": "readonly" },
  finance: { "dashboard:read": "full", "order:manage": "readonly", "payment:manage": "readonly", "audit:read": "readonly" },
  auditor: { "dashboard:read": "readonly", "order:manage": "readonly", "audit:read": "full" },
};

// D20 默认值登记册
const D20_DEFAULTS: Record<string, unknown> = {
  order_auto_cancel_minutes: 30,
  cart_ttl_days: 7,
  receipt_confirm_timeout_days: 14,
  payment_timeout_minutes: 30,
  shipping_first_weight_cents: 3000,
  shipping_extra_weight_cents: 1000,
  stock_warn_threshold_default: null,
  purchase_limit_per_order_default: null, // D20⑦ 单品限购(每单最多N件)，全局统一值，非按SKU配置
  total_items_limit_per_order_default: null, // D20⑦ 单次购物商品上限(订单内商品总件数上限)
  shop_name_zh: "APCube 生活百货",
  shop_name_en: "APCube Lifestyle",
};

async function main() {
  console.log("[seed] 写入权限点目录...");
  for (const p of PERMISSIONS) {
    await db.insert(permissions).values(p).onConflictDoNothing();
  }

  console.log("[seed] 写入内置角色与权限矩阵...");
  for (const r of BUILTIN_ROLES) {
    const [row] = await db
      .insert(roles)
      .values({ ...r, isBuiltin: true })
      .onConflictDoNothing()
      .returning();
    const roleId = row?.id;
    if (!roleId) continue;
    const matrix = ROLE_PERMISSION_MATRIX[r.key] ?? {};
    for (const p of PERMISSIONS) {
      await db
        .insert(rolePermissions)
        .values({ roleId, permission: p.key, access: matrix[p.key] ?? "none" })
        .onConflictDoNothing();
    }
  }

  console.log("[seed] 写入 D20 默认值...");
  for (const [key, value] of Object.entries(D20_DEFAULTS)) {
    await db.insert(platformSettings).values({ key, value }).onConflictDoNothing();
  }

  console.log("[seed] 写入全局默认运费模板...");
  await db.insert(shippingTemplates).values({
    nameZh: "全局默认运费模板",
    nameEn: "Global Default Shipping Template",
    firstWeightCents: 3000,
    extraWeightCents: 1000,
    isDefault: true,
    enabled: true,
  }).onConflictDoNothing();

  console.log("[seed] 写入初始超级管理员账号...");
  const [superAdminRole] = await db.select().from(roles).where(eq(roles.key, "super_admin")).limit(1);
  if (superAdminRole) {
    const initialUsername = process.env.SEED_ADMIN_USERNAME ?? "admin";
    const initialPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
    const passwordHash = await bcrypt.hash(initialPassword, 10);
    await db.insert(admins).values({ username: initialUsername, passwordHash, roleId: superAdminRole.id }).onConflictDoNothing();
    console.log(`[seed] 初始管理员账号: ${initialUsername} / ${initialPassword}（⚠️生产环境务必首次登录后立即修改密码，或通过SEED_ADMIN_USERNAME/SEED_ADMIN_PASSWORD环境变量覆盖初始值）`);
  }

  console.log("[seed] 完成");
  await pool.end();
}

main().catch((err) => {
  console.error("[seed] 失败", err);
  process.exit(1);
});
