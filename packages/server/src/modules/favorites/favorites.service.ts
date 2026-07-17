import { Injectable } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/client.js";
import { favorites, products } from "../../db/schema/index.js";
import { resolveBilingual, type Locale } from "@app/shared";

@Injectable()
export class FavoritesService {
  async list(userId: string, locale: Locale) {
    const rows = await db
      .select({ id: favorites.id, productId: products.id, nameZh: products.nameZh, nameEn: products.nameEn, images: products.images, priceAfterCents: products.priceAfterCents })
      .from(favorites)
      .innerJoin(products, eq(products.id, favorites.productId))
      .where(eq(favorites.userId, userId));
    return rows.map((r) => ({ favoriteId: r.id, productId: r.productId, name: resolveBilingual(r.nameZh, r.nameEn, locale), images: r.images, priceAfterCents: r.priceAfterCents }));
  }

  async add(userId: string, productId: string) {
    return db.insert(favorites).values({ userId, productId }).onConflictDoNothing().returning();
  }

  async remove(userId: string, productId: string) {
    await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.productId, productId)));
  }
}
