import { Injectable, BadRequestException } from "@nestjs/common";
import { eq, inArray, desc } from "drizzle-orm";
import fs from "node:fs/promises";
import { db } from "../../db/client.js";
import {
  platformSettings, auditLogs, systemBackups, users, memberLevels, categories,
  products, productSpecs, inventory, orders, orderItems, payments, paymentMethods,
  discounts, fullReductions, shippingTemplates, shippingTemplateBindings, banners,
  announcements, recommendations, faqs, feedbacks, roles, permissions, rolePermissions,
  receipts,
} from "../../db/schema/index.js";

// N5：平台基础信息保存时校验跨境传输披露关键词
const CROSS_BORDER_KEYWORDS = ["跨境", "境外", "海外服务器", "cross-border", "overseas"];

@Injectable()
export class SettingsService {
  async getByKeys(keys: string[]) {
    const rows = await db.select().from(platformSettings).where(inArray(platformSettings.key, keys));
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async set(key: string, value: unknown) {
    const [existing] = await db.select().from(platformSettings).where(eq(platformSettings.key, key)).limit(1);
    if (existing) {
      const [updated] = await db.update(platformSettings).set({ value, updatedAt: new Date() }).where(eq(platformSettings.key, key)).returning();
      return updated;
    }
    const [created] = await db.insert(platformSettings).values({ key, value }).returning();
    return created;
  }

  /** D20默认值面板：一次性读取/写入全部登记册项 */
  private readonly D20_KEYS = [
    "order_auto_cancel_minutes", "cart_ttl_days", "receipt_confirm_timeout_days", "payment_timeout_minutes",
    "shipping_first_weight_cents", "shipping_extra_weight_cents", "stock_warn_threshold_default",
    "purchase_limit_per_order_default", "total_items_limit_per_order_default",
  ];
  getD20Defaults() { return this.getByKeys(this.D20_KEYS); }
  async setD20Default(key: string, value: unknown) {
    if (!this.D20_KEYS.includes(key)) throw new BadRequestException("非法的默认值配置项");
    return this.set(key, value);
  }

  async getPlatformInfo() {
    return this.getByKeys(["shop_name_zh", "shop_name_en", "logo_url", "contact_info", "privacy_policy_zh", "privacy_policy_en"]);
  }

  /** N5：隐私政策内容需包含跨境传输披露关键词才允许保存（简化版关键词校验，非法律审查） */
  async updatePlatformInfo(patch: Record<string, string>) {
    if (patch.privacy_policy_zh !== undefined) {
      const hasDisclosure = CROSS_BORDER_KEYWORDS.some((kw) => patch.privacy_policy_zh.includes(kw));
      if (!hasDisclosure) {
        throw new BadRequestException("隐私政策需包含跨境数据传输披露说明（提及\"跨境\"/\"境外\"等关键词）");
      }
    }
    for (const [key, value] of Object.entries(patch)) {
      await this.set(key, value);
    }
    return this.getPlatformInfo();
  }

  auditLogs(limit = 100) {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }

  /**
   * §6.9 行46「数据备份」：真实 JSON 导出（此前只写一条 pending:// 占位记录）。
   *
   * 设计取舍：
   * - 导出范围 = 业务实体（商品/分类/库存/订单/用户/营销/内容/设置/收款等），
   *   **不含** `admins.password_hash`、`audit_logs`、`email_reset_tokens`、`refresh_tokens`：
   *   备份文件的保管强度通常低于生产库，把凭据哈希与审计流水一起导出去属于扩散风险面。
   * - 顺序：先落盘再写库记录，避免"记录说备份成功、文件其实没写出来"。
   * - 存储：与上传文件同源（local 磁盘 / R2）。local 模式下备份会随实例重启丢失，
   *   所以返回体里带 `persistent: false` 提示，部署环境必须切 R2 才有真实灾备价值。
   * - D14 的 PITR 由托管库侧配置，不在应用层可完成，本方法只覆盖"定时 JSON 导出"这一半。
   */
  async triggerBackup(triggeredBy: "manual" | "scheduled" = "manual") {
    const tables: Record<string, unknown> = {
      users: await db.select({
        id: users.id, email: users.email, phoneEncrypted: users.phoneEncrypted,
        locale: users.locale, memberLevelId: users.memberLevelId, status: users.status,
        lastLoginAt: users.lastLoginAt, createdAt: users.createdAt,
      }).from(users),
      member_levels: await db.select().from(memberLevels),
      categories: await db.select().from(categories),
      products: await db.select().from(products),
      product_specs: await db.select().from(productSpecs),
      inventory: await db.select().from(inventory),
      orders: await db.select().from(orders),
      order_items: await db.select().from(orderItems),
      payments: await db.select().from(payments),
      payment_methods: await db.select({
        id: paymentMethods.id, enabled: paymentMethods.enabled, config: paymentMethods.config,
      }).from(paymentMethods), // 排除 merchant_info_encrypted：商户密钥不进备份文件
      discounts: await db.select().from(discounts),
      full_reductions: await db.select().from(fullReductions),
      shipping_templates: await db.select().from(shippingTemplates),
      shipping_template_bindings: await db.select().from(shippingTemplateBindings),
      banners: await db.select().from(banners),
      announcements: await db.select().from(announcements),
      recommendations: await db.select().from(recommendations),
      faqs: await db.select().from(faqs),
      feedbacks: await db.select().from(feedbacks),
      roles: await db.select().from(roles),
      permissions: await db.select().from(permissions),
      role_permissions: await db.select().from(rolePermissions),
      platform_settings: await db.select().from(platformSettings),
      receipts: await db.select().from(receipts),
    };

    const payload = {
      meta: {
        schema: "apcube-backup-v1",
        exportedAt: new Date().toISOString(),
        triggeredBy,
        // 显式声明排除项，避免恢复时误以为"库里就没有这些表"
        excluded: ["admins", "audit_logs", "email_reset_tokens", "refresh_tokens", "payment_methods.merchant_info_encrypted"],
      },
      tables,
    };

    const filename = `apcube-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    const driver = process.env.STORAGE_DRIVER ?? "local";
    let fileUrl: string;

    if (driver === "r2") {
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
      const client = new S3Client({
        region: "auto",
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
        },
      });
      await client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET ?? "",
        Key: `backups/${filename}`,
        Body: JSON.stringify(payload),
        ContentType: "application/json",
      }));
      fileUrl = `${process.env.R2_PUBLIC_URL}/backups/${filename}`;
    } else {
      const dir = "./uploads/backups";
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(`${dir}/${filename}`, JSON.stringify(payload), "utf-8");
      fileUrl = `/uploads/backups/${filename}`;
    }

    const [row] = await db.insert(systemBackups).values({ triggeredBy, fileUrl }).returning();
    const byteSize = Buffer.byteLength(JSON.stringify(payload), "utf-8");

    return {
      ...row,
      sizeBytes: byteSize,
      tableCount: Object.keys(tables).length,
      // local 磁盘在 Railway/Render 这类无持久卷平台会随实例重启丢失，备份等于没做
      persistent: driver === "r2",
      warning: driver === "r2"
        ? null
        : "本地磁盘存储：备份文件会随实例重启/扩容丢失，生产环境请将 STORAGE_DRIVER 切到 r2",
    };
  }

  backups() {
    return db.select().from(systemBackups).orderBy(desc(systemBackups.createdAt));
  }
}
