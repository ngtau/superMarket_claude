import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { eq, and, ilike, gte, lte, sql as drizzleSql, desc, asc, inArray } from "drizzle-orm";
import { db } from "../../db/client.js";
import { products, productSpecs, inventory, categories, recommendations, orderItems, discounts } from "../../db/schema/index.js";
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
    nameZh: string; nameEn: string; descriptionZh?: string | null; descriptionEn?: string | null;
    priceOriginalCents: number; priceAfterCents: number; categoryId: string; images?: string[];
    specs: {
      specNameZh: string; specNameEn: string; priceOriginalCents?: number; priceAfterCents?: number;
      initialStock: number;
      /** §7.4 运费按重量计费；缺省回落到 1000g（=D20⑤首重档位） */
      weightGrams?: number;
    }[];
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
        // 非法值（0/负数/NaN）一律回落到 1000g，避免运费算出 0 或 NaN
        weightGrams: Number.isFinite(s.weightGrams) && (s.weightGrams as number) > 0 ? s.weightGrams! : 1000,
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

  /**
   * §6.1 行17「批量操作」：批量设折扣。
   * 走 marketing 的 discounts 表（与后台「营销管理→折扣」同一真值来源），
   * 避免同一业务在两处各写一份插入逻辑导致语义漂移。
   */
  batchDiscount(productIds: string[], input: {
    type: "percent" | "special"; percentValue?: number; specialPriceCents?: number; startAt: string; endAt: string;
  }) {
    return Promise.all(productIds.map((productId) =>
      db.insert(discounts).values({
        productId,
        type: input.type,
        percentValue: input.percentValue !== undefined ? String(input.percentValue) : null,
        specialPriceCents: input.specialPriceCents ?? null,
        startAt: new Date(input.startAt),
        endAt: new Date(input.endAt),
      }).returning()
    ));
  }

  // ===== §6.1 行17：批量导出/导入（双语 CSV 模板） =====
  // 说明：SDRS DoD 写的是「xlsx/csv」。v1 先落 CSV（UTF-8 BOM，Excel 直接打开中文不乱码，与订单导出一致），
  // xlsx 需引入 exceljs/xlsx 依赖，留作后续增量，不影响数据结构。

  private static readonly CSV_HEADER =
    "name_zh,name_en,description_zh,description_en,price_original_cents,price_after_cents,category_id,status,sku_name_zh,sku_name_en,weight_grams,initial_stock";

  /** 批量导出：每个商品导出其首个 SKU 的重量与库存，供模板回填后导入 */
  async exportCsv(): Promise<string> {
    const rows = await db.select().from(products).orderBy(desc(products.createdAt));
    const lines: string[] = [ProductsService.CSV_HEADER];
    for (const p of rows) {
      const [spec] = await db.select().from(productSpecs).where(eq(productSpecs.productId, p.id)).limit(1);
      const [inv] = spec
        ? await db.select().from(inventory).where(eq(inventory.skuId, spec.id)).limit(1)
        : [];
      lines.push([
        p.nameZh, p.nameEn, p.descriptionZh ?? "", p.descriptionEn ?? "",
        p.priceOriginalCents, p.priceAfterCents, p.categoryId, p.status,
        spec?.specNameZh ?? "", spec?.specNameEn ?? "",
        spec?.weightGrams ?? 1000, inv?.stock ?? 0,
      ].map(ProductsService.csvCell).join(","));
    }
    return lines.join("\n");
  }

  /** CSV 单元格转义：含逗号/引号/换行时加双引号并把内部引号翻倍（RFC 4180） */
  private static csvCell(value: unknown): string {
    const s = String(value ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  /** 反向解析 CSV 单行（支持引号包裹与 "" 转义），不引入第三方解析依赖 */
  private static parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
        } else cur += ch;
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        out.push(cur); cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out;
  }

  /**
   * 批量导入：逐行校验，任一行不合法即整批回滚（避免"导入一半"造成的脏数据）。
   * 返回逐行结果，便于后台展示"第 N 行失败：原因"。
   */
  async importCsv(csvText: string) {
    const lines = csvText.replace(/^\uFEFF/, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) throw new BadRequestException("CSV 内容为空或仅有表头");

    const header = ProductsService.parseCsvLine(lines[0]).map((h) => h.trim());
    const expected = ProductsService.CSV_HEADER.split(",");
    const missing = expected.filter((h) => !header.includes(h));
    if (missing.length > 0) {
      throw new BadRequestException(`CSV 表头缺少必需列：${missing.join(", ")}（请使用导出功能下载标准模板）`);
    }
    const col = (name: string) => header.indexOf(name);

    const results: { row: number; ok: boolean; productId?: string; error?: string }[] = [];
    const createdIds: string[] = [];

    try {
      for (let i = 1; i < lines.length; i++) {
        const cells = ProductsService.parseCsvLine(lines[i]);
        const rowNo = i + 1;
        try {
          const nameZh = cells[col("name_zh")]?.trim();
          const nameEn = cells[col("name_en")]?.trim();
          const categoryId = cells[col("category_id")]?.trim();
          const priceOriginal = Number(cells[col("price_original_cents")]);
          const priceAfter = Number(cells[col("price_after_cents")]);
          const weightGrams = Number(cells[col("weight_grams")] ?? 1000);
          const initialStock = Number(cells[col("initial_stock")] ?? 0);
          const statusRaw = cells[col("status")]?.trim() || "draft";

          if (!nameZh || !nameEn) throw new Error("名称（中/英）不可为空");
          if (!categoryId) throw new Error("category_id 不可为空");
          if (!Number.isInteger(priceOriginal) || priceOriginal < 0) throw new Error("price_original_cents 必须为非负整数（分）");
          if (!Number.isInteger(priceAfter) || priceAfter < 0) throw new Error("price_after_cents 必须为非负整数（分）");
          if (!["draft", "on_shelf", "off_shelf"].includes(statusRaw)) throw new Error("status 必须为 draft/on_shelf/off_shelf");
          if (!Number.isInteger(initialStock) || initialStock < 0) throw new Error("initial_stock 必须为非负整数");

          const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, categoryId)).limit(1);
          if (!category) throw new Error(`分类不存在：${categoryId}`);

          const [product] = await db.insert(products).values({
            nameZh, nameEn,
            descriptionZh: cells[col("description_zh")] || null,
            descriptionEn: cells[col("description_en")] || null,
            priceOriginalCents: priceOriginal,
            priceAfterCents: priceAfter,
            categoryId,
            status: statusRaw as "draft" | "on_shelf" | "off_shelf",
            images: [],
          }).returning();

          // 导入的商品统一建一个默认 SKU + 库存行，保证能立即被加购/结算（无 SKU 的商品在结算侧取不到库存）
          const [spec] = await db.insert(productSpecs).values({
            productId: product.id,
            specNameZh: cells[col("sku_name_zh")]?.trim() || "默認規格",
            specNameEn: cells[col("sku_name_en")]?.trim() || "Default",
            weightGrams: Number.isFinite(weightGrams) && weightGrams > 0 ? weightGrams : 1000,
          }).returning();
          await db.insert(inventory).values({ skuId: spec.id, stock: initialStock, lockedStock: 0 });

          createdIds.push(product.id);
          results.push({ row: rowNo, ok: true, productId: product.id });
        } catch (err) {
          // 单行失败即整批回滚：抛到外层统一清理，保证不留半成品
          throw Object.assign(new Error(`第 ${rowNo} 行：${(err as Error).message}`), { partialResults: results });
        }
      }
      return { importedCount: createdIds.length, results };
    } catch (err) {
      for (const id of createdIds) await db.delete(products).where(eq(products.id, id));
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException((err as Error).message);
    }
  }
}
