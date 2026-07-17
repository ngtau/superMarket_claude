import { Injectable, BadRequestException } from "@nestjs/common";
import { eq, inArray, desc } from "drizzle-orm";
import { db } from "../../db/client.js";
import { platformSettings, auditLogs, systemBackups } from "../../db/schema/index.js";

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

  async triggerBackup() {
    // v1骨架：记录一条备份记录，实际导出逻辑（PITR/定时JSON导出）待部署环境就绪后接入
    const [row] = await db.insert(systemBackups).values({ triggeredBy: "manual", fileUrl: "pending://backup-not-yet-implemented" }).returning();
    return row;
  }

  backups() {
    return db.select().from(systemBackups).orderBy(desc(systemBackups.createdAt));
  }
}
