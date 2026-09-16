import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { eq, desc, or, like } from "drizzle-orm";
import { db } from "../../db/client.js";
import { shippingTemplates, shippingTemplateBindings, auditLogs, orders } from "../../db/schema/index.js";

export interface ShippingTemplateInput {
  nameZh: string;
  nameEn: string;
  firstWeightCents: number;
  firstWeightKg?: number;
  extraWeightCents: number;
  freeShippingThresholdCents?: number | null;
  isDefault?: boolean;
  enabled?: boolean;
}

/**
 * §6.3 行25「物流设置」+ 行26「支付与物流日志」
 * 运费模板：支持多套模板，按 商品级绑定 > 分类级绑定 > 全局默认 匹配（数据库设计文档 §5）。
 * 结算侧实际计算逻辑在 checkout/shipping.util.ts，本模块只负责后台配置与日志查询。
 */
@Injectable()
export class ShippingService {
  findAllTemplates() {
    return db.select().from(shippingTemplates).orderBy(desc(shippingTemplates.createdAt));
  }

  async findOneTemplate(id: string) {
    const [row] = await db.select().from(shippingTemplates).where(eq(shippingTemplates.id, id)).limit(1);
    if (!row) throw new NotFoundException("运费模板不存在");
    return row;
  }

  async createTemplate(input: ShippingTemplateInput) {
    // isDefault 全局唯一：新模板设为默认时，先把其它模板的默认标记清掉
    if (input.isDefault) {
      await db.update(shippingTemplates).set({ isDefault: false }).where(eq(shippingTemplates.isDefault, true));
    }
    const [row] = await db.insert(shippingTemplates).values({
      nameZh: input.nameZh,
      nameEn: input.nameEn,
      firstWeightCents: input.firstWeightCents,
      firstWeightKg: input.firstWeightKg !== undefined ? String(input.firstWeightKg) : "1.00",
      extraWeightCents: input.extraWeightCents,
      freeShippingThresholdCents: input.freeShippingThresholdCents ?? null,
      isDefault: input.isDefault ?? false,
      enabled: input.enabled ?? true,
    }).returning();
    return row;
  }

  async updateTemplate(id: string, patch: Partial<ShippingTemplateInput>) {
    await this.findOneTemplate(id);
    if (patch.isDefault) {
      await db.update(shippingTemplates).set({ isDefault: false }).where(eq(shippingTemplates.isDefault, true));
    }
    const values: Record<string, unknown> = { ...patch };
    if (patch.firstWeightKg !== undefined) values.firstWeightKg = String(patch.firstWeightKg);
    if (patch.freeShippingThresholdCents === null) values.freeShippingThresholdCents = null;
    const [row] = await db.update(shippingTemplates).set(values).where(eq(shippingTemplates.id, id)).returning();
    return row;
  }

  /** 删除保护：已被商品/分类绑定的模板不允许删除，避免结算侧静默回落到默认模板造成运费突变 */
  async removeTemplate(id: string) {
    await this.findOneTemplate(id);
    const bindings = await db.select({ id: shippingTemplateBindings.id })
      .from(shippingTemplateBindings)
      .where(eq(shippingTemplateBindings.templateId, id))
      .limit(1);
    if (bindings.length > 0) {
      throw new BadRequestException("该模板仍被商品或分类绑定，请先解除绑定再删除");
    }
    await db.delete(shippingTemplates).where(eq(shippingTemplates.id, id));
    return { deleted: true };
  }

  findBindings() {
    return db.select().from(shippingTemplateBindings);
  }

  async createBinding(input: { templateId: string; scope: "product" | "category"; productId?: string; categoryId?: string }) {
    if (input.scope === "product" && !input.productId) throw new BadRequestException("scope=product 时 productId 必填");
    if (input.scope === "category" && !input.categoryId) throw new BadRequestException("scope=category 时 categoryId 必填");

    // 同一商品/分类只允许绑一套模板，重复绑定时按 upsert 覆盖，避免唯一索引冲突抛出 500
    const where = input.scope === "product"
      ? eq(shippingTemplateBindings.productId, input.productId!)
      : eq(shippingTemplateBindings.categoryId, input.categoryId!);
    const [existing] = await db.select().from(shippingTemplateBindings).where(where).limit(1);
    if (existing) {
      const [row] = await db.update(shippingTemplateBindings)
        .set({ templateId: input.templateId })
        .where(eq(shippingTemplateBindings.id, existing.id))
        .returning();
      return row;
    }

    const [row] = await db.insert(shippingTemplateBindings).values({
      templateId: input.templateId,
      scope: input.scope,
      productId: input.productId ?? null,
      categoryId: input.categoryId ?? null,
    }).returning();
    return row;
  }

  async removeBinding(id: string) {
    await db.delete(shippingTemplateBindings).where(eq(shippingTemplateBindings.id, id));
    return { deleted: true };
  }

  /**
   * §6.3 行26：支付与物流日志。数据源 = audit_logs（支付状态变更/发货/关单等）+ 已填运单号的订单。
   * 两者合并按时间倒序返回，供后台「支付与物流设置」页查看。
   */
  async logs(limit = 100) {
    const paymentAndShippingActions = [
      like(auditLogs.action, "payment.%"),
      like(auditLogs.action, "order.ship"),
      like(auditLogs.action, "order.close"),
      eq(auditLogs.targetType, "payment"),
    ];
    const logRows = await db.select().from(auditLogs)
      .where(or(...paymentAndShippingActions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    const shippedOrders = await db
      .select({ id: orders.id, orderNo: orders.orderNo, trackingNo: orders.trackingNo, shippedAt: orders.shippedAt })
      .from(orders)
      .where(eq(orders.status, "shipped"))
      .orderBy(desc(orders.shippedAt))
      .limit(limit);

    return {
      auditLogs: logRows,
      shipments: shippedOrders.filter((o) => o.trackingNo),
    };
  }
}
