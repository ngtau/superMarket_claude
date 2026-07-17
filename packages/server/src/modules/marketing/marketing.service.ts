import { Injectable } from "@nestjs/common";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../db/client.js";
import { discounts, fullReductions } from "../../db/schema/index.js";

@Injectable()
export class MarketingService {
  // ===== 单品折扣 §6.4 =====
  findAllDiscounts() {
    return db.select().from(discounts);
  }

  create(input: {
    productId: string; type: "percent" | "special";
    percentValue?: number; specialPriceCents?: number; startAt: string; endAt: string;
  }) {
    return db.insert(discounts).values({
      productId: input.productId, type: input.type,
      percentValue: input.percentValue !== undefined ? String(input.percentValue) : null,
      specialPriceCents: input.specialPriceCents ?? null,
      startAt: new Date(input.startAt), endAt: new Date(input.endAt),
    }).returning();
  }

  update(id: string, patch: Partial<{ percentValue: number; specialPriceCents: number; startAt: string; endAt: string }>) {
    const values: Record<string, unknown> = {};
    if (patch.percentValue !== undefined) values.percentValue = String(patch.percentValue);
    if (patch.specialPriceCents !== undefined) values.specialPriceCents = patch.specialPriceCents;
    if (patch.startAt) values.startAt = new Date(patch.startAt);
    if (patch.endAt) values.endAt = new Date(patch.endAt);
    return db.update(discounts).set(values).where(eq(discounts.id, id)).returning();
  }

  remove(id: string) {
    return db.delete(discounts).where(eq(discounts.id, id));
  }

  /** 批量设折扣：同一折扣配置应用到多个商品 */
  async batchCreate(productIds: string[], input: { type: "percent" | "special"; percentValue?: number; specialPriceCents?: number; startAt: string; endAt: string }) {
    return Promise.all(productIds.map((productId) => this.create({ productId, ...input })));
  }

  // ===== 满减 §7.4 =====
  findAllFullReductions() {
    return db.select().from(fullReductions);
  }

  createFullReduction(input: {
    nameZh: string; nameEn: string; thresholdCents: number; reductionCents: number;
    stackable: boolean; scope: "all" | "category"; categoryId?: string; startAt: string; endAt: string;
  }) {
    return db.insert(fullReductions).values({
      ...input, categoryId: input.categoryId ?? null,
      startAt: new Date(input.startAt), endAt: new Date(input.endAt),
    }).returning();
  }

  updateFullReduction(id: string, patch: Partial<{ thresholdCents: number; reductionCents: number; stackable: boolean; startAt: string; endAt: string }>) {
    const values: Record<string, unknown> = { ...patch };
    if (patch.startAt) values.startAt = new Date(patch.startAt);
    if (patch.endAt) values.endAt = new Date(patch.endAt);
    return db.update(fullReductions).set(values).where(eq(fullReductions.id, id)).returning();
  }

  removeFullReduction(id: string) {
    return db.delete(fullReductions).where(eq(fullReductions.id, id));
  }
}
