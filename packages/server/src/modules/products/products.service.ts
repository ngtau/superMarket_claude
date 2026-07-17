import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { eq, and, ilike, gte, lte, sql as drizzleSql, desc, asc, inArray } from "drizzle-orm";
import { db } from "../../db/client.js";
import { products, productSpecs, inventory, categories, recommendations, orderItems } from "../../db/schema/index.js";
import { resolveBilingual, type Locale } from "@app/shared";
import { resolveEffectivePrice } from "./pricing.util.js";

export interface ListProductsQuery {
  categoryId?: string;
  keyword?: string;
  priceMin?: number;
  priceMax?: number;
  sort?: "sales" | "new" | "discount";
  page: number;
  pageSize: number;
}

@Injectable()
export class ProductsService {
  /** C端商品列表：仅返回 on_shelf，支持分类/关键词/价格区间筛选与排序，附实时折扣价 */
  async list(query: ListProductsQuery, locale: Locale) {
    const conditions = [eq(products.status, "on_shelf")];
    if (query.categoryId) conditions.push(eq(products.categoryId, query.categoryId));
    if (query.keyword) {
      // 双语关键词：zh或en任一命中即可
      conditions.push(
        drizzleSql`(${products.nameZh} ILIKE ${"%" + query.keyword + "%"} OR ${products.nameEn} ILIKE ${"%" + query.keyword + "%"})`
      );
    }
    if (query.priceMin !== undefined) conditions.push(gte(products.priceAfterCents, query.priceMin));
    if (query.priceMax !== undefined) conditions.push(lte(products.priceAfterCents, query.priceMax));

    const orderBy =
      query.sort === "new" ? desc(products.createdAt) :
      query.sort === "discount" ? asc(products.priceAfterCents) : // sales 排序依赖订单聚合，v1先用创建时间兜底
      desc(products.createdAt);

    const offset = (query.page - 1) * query.pageSize;
    const rows = await db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(query.pageSize)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: drizzleSql<number>`count(*)::int` })
      .from(products)
      .where(and(...conditions));

    const items = await Promise.all(
      rows.map(async (p) => {
        const { effectivePriceCents, hasActiveDiscount } = await resolveEffectivePrice(p.id, p.priceOriginalCents, p.priceAfterCents);
        return {
          id: p.id,
          name: resolveBilingual(p.nameZh, p.nameEn, locale),
          priceOriginalCents: p.priceOriginalCents,
          priceCents: effectivePriceCents,
          hasActiveDiscount,
          images: p.images,
        };
      })
    );

    return { items, total: count, page: query.page, pageSize: query.pageSize };
  }

  async detail(id: string, locale: Locale) {
    const [p] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!p) throw new NotFoundException("商品不存在");

    const specs = await db
      .select({
        id: productSpecs.id,
        specName: productSpecs.specNameZh, // 下方按locale重新解析
        specNameZh: productSpecs.specNameZh,
        specNameEn: productSpecs.specNameEn,
        priceOriginalCents: productSpecs.priceOriginalCents,
        priceAfterCents: productSpecs.priceAfterCents,
        stock: inventory.stock,
        lockedStock: inventory.lockedStock,
      })
      .from(productSpecs)
      .leftJoin(inventory, eq(inventory.skuId, productSpecs.id))
      .where(eq(productSpecs.productId, id));

    const { effectivePriceCents, hasActiveDiscount } = await resolveEffectivePrice(p.id, p.priceOriginalCents, p.priceAfterCents);

    return {
      id: p.id,
      name: resolveBilingual(p.nameZh, p.nameEn, locale),
      description: resolveBilingual(p.descriptionZh, p.descriptionEn, locale),
      priceOriginalCents: p.priceOriginalCents,
      priceCents: effectivePriceCents,
      hasActiveDiscount,
      images: p.images,
      categoryId: p.categoryId,
      specs: specs.map((s) => ({
        id: s.id,
        name: resolveBilingual(s.specNameZh, s.specNameEn, locale),
        priceOriginalCents: s.priceOriginalCents ?? p.priceOriginalCents,
        priceAfterCents: s.priceAfterCents ?? p.priceAfterCents,
        available: Math.max(0, (s.stock ?? 0) - (s.lockedStock ?? 0)),
      })),
    };
  }

  async recommendations(slot: string, locale: Locale) {
    // Phase8接入：联查recommendations+products，替换Phase3阶段的占位实现
    const rows = await db
      .select({ productId: recommendations.productId, sort: recommendations.sort, nameZh: products.nameZh, nameEn: products.nameEn, images: products.images, priceAfterCents: products.priceAfterCents })
      .from(recommendations)
      .innerJoin(products, eq(products.id, recommendations.productId))
      .where(eq(recommendations.slot, slot))
      .orderBy(recommendations.sort);
    return rows.map((r) => ({ productId: r.productId, name: resolveBilingual(r.nameZh, r.nameEn, locale), images: r.images, priceAfterCents: r.priceAfterCents }));
  }

  // ============ B端 ============

  findAllAdmin() {
    return db.select().from(products).orderBy(desc(products.createdAt));
  }

  async findOneAdmin(id: string) {
    const [p] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!p) throw new NotFoundException("商品不存在");
    const specs = await db.select().from(productSpecs).where(eq(productSpecs.productId, id));
    return { ...p, specs };
  }

  async create(input: {
    nameZh: string; nameEn: string; descriptionZh?: string; descriptionEn?: string;
    priceOriginalCents: number; priceAfterCents: number; categoryId: string; images?: string[];
    specs: { specNameZh: string; specNameEn: string; priceOriginalCents?: number; priceAfterCents?: number; initialStock: number }[];
  }) {
    const [product] = await db.insert(products).values({
      nameZh: input.nameZh, nameEn: input.nameEn,
      descriptionZh: input.descriptionZh, descriptionEn: input.descriptionEn,
      priceOriginalCents: input.priceOriginalCents, priceAfterCents: input.priceAfterCents,
      categoryId: input.categoryId, images: input.images ?? [],
      status: "draft",
    }).returning();

    for (const s of input.specs) {
      const [spec] = await db.insert(productSpecs).values({
        productId: product.id, specNameZh: s.specNameZh, specNameEn: s.specNameEn,
        priceOriginalCents: s.priceOriginalCents, priceAfterCents: s.priceAfterCents,
      }).returning();
      await db.insert(inventory).values({ skuId: spec.id, stock: s.initialStock, lockedStock: 0 });
    }
    return this.findOneAdmin(product.id);
  }

  async update(id: string, patch: Partial<{
    nameZh: string; nameEn: string; descriptionZh: string; descriptionEn: string;
    priceOriginalCents: number; priceAfterCents: number; categoryId: string; images: string[];
  }>) {
    const [row] = await db.update(products).set(patch).where(eq(products.id, id)).returning();
    return row;
  }

  /**
   * ⚠️修复：与categories/roles同一类问题——order_items.sku_id引用product_specs但无onDelete，
   * 若该商品的任一规格曾被下单，直接删除会撞FK约束抛未处理500。
   * 这里的正确业务语义本就应该是"有订单历史的商品不可删除"（保护历史订单数据完整性），
   * 只是需要给出友好提示而非原始数据库错误。
   */
  async remove(id: string) {
    const specs = await db.select({ id: productSpecs.id }).from(productSpecs).where(eq(productSpecs.productId, id));
    if (specs.length > 0) {
      const specIds = specs.map((s) => s.id);
      const orderedCount = await db.select({ id: orderItems.id }).from(orderItems).where(inArray(orderItems.skuId, specIds)).limit(1);
      if (orderedCount.length > 0) {
        throw new BadRequestException("该商品存在历史订单记录，不可删除，请改为下架");
      }
    }
    await db.delete(products).where(eq(products.id, id)); // FK cascade 会一并删除 specs/inventory
  }

  async toggleShelf(id: string, status: "on_shelf" | "off_shelf") {
    const [row] = await db.update(products).set({ status }).where(eq(products.id, id)).returning();
    return row;
  }

  async batchShelf(ids: string[], status: "on_shelf" | "off_shelf") {
    return Promise.all(ids.map((id) => this.toggleShelf(id, status)));
  }
}
