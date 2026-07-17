import { Injectable, BadRequestException } from "@nestjs/common";
import { eq, isNull } from "drizzle-orm";
import { db } from "../../db/client.js";
import { categories, products } from "../../db/schema/index.js";
import { resolveBilingual, type Locale } from "@app/shared";

export interface CategoryNode {
  id: string;
  name: string;
  sort: number;
  children: CategoryNode[];
}

@Injectable()
export class CategoriesService {
  /** C端：多级分类树，按locale解析双语字段，禁用分类不返回 */
  async tree(locale: Locale): Promise<CategoryNode[]> {
    const all = await db.select().from(categories).where(eq(categories.disabled, false));
    const byParent = new Map<string | null, typeof all>();
    for (const c of all) {
      const key = c.parentId ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(c);
    }
    const build = (parentId: string | null): CategoryNode[] =>
      (byParent.get(parentId) ?? [])
        .sort((a, b) => a.sort - b.sort)
        .map((c) => ({
          id: c.id,
          name: resolveBilingual(c.nameZh, c.nameEn, locale),
          sort: c.sort,
          children: build(c.id),
        }));
    return build(null);
  }

  // B端
  findAllAdmin() {
    return db.select().from(categories).orderBy(categories.sort);
  }

  create(input: { nameZh: string; nameEn: string; parentId?: string; sort?: number }) {
    return db.insert(categories).values(input).returning();
  }

  update(id: string, patch: Partial<{ nameZh: string; nameEn: string; parentId: string | null; sort: number; disabled: boolean }>) {
    return db.update(categories).set(patch).where(eq(categories.id, id)).returning();
  }

  async remove(id: string) {
    const children = await db.select().from(categories).where(eq(categories.parentId, id)).limit(1);
    if (children.length > 0) {
      throw new BadRequestException("该分类下存在子分类，请先删除或转移子分类");
    }
    // ⚠️修复：此前只查了子分类，未查是否有商品挂靠此分类。products.category_id外键未设onDelete，
    // 直接删除会撞FK约束抛出未处理的500"服务器内部错误"（实测复现），而非友好的400提示。
    const dependentProducts = await db.select().from(products).where(eq(products.categoryId, id)).limit(1);
    if (dependentProducts.length > 0) {
      throw new BadRequestException("该分类下存在商品，请先删除或转移商品后再删除分类");
    }
    await db.delete(categories).where(eq(categories.id, id));
  }
}
