import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { banners, announcements, recommendations, faqs, products } from "../../db/schema/index.js";
import { resolveBilingual, type Locale } from "@app/shared";

@Injectable()
export class ContentService {
  // ===== C端 =====
  async bannersPublic() {
    return db.select().from(banners).where(eq(banners.enabled, true));
  }
  async announcementsPublic() {
    return db.select().from(announcements).where(eq(announcements.enabled, true));
  }
  async faqsPublic(locale: Locale) {
    const rows = await db.select().from(faqs).where(eq(faqs.enabled, true));
    return rows.map((f) => ({
      id: f.id,
      question: resolveBilingual(f.questionZh, f.questionEn, locale),
      answer: resolveBilingual(f.answerZh, f.answerEn, locale),
      sort: f.sort,
    }));
  }
  async recommendationsPublic(slot: string, locale: Locale) {
    const rows = await db
      .select({ productId: recommendations.productId, sort: recommendations.sort, nameZh: products.nameZh, nameEn: products.nameEn, images: products.images, priceAfterCents: products.priceAfterCents })
      .from(recommendations)
      .innerJoin(products, eq(products.id, recommendations.productId))
      .where(eq(recommendations.slot, slot));
    return rows.map((r) => ({ productId: r.productId, name: resolveBilingual(r.nameZh, r.nameEn, locale), images: r.images, priceAfterCents: r.priceAfterCents }));
  }

  // ===== B端：Banners =====
  findAllBanners() { return db.select().from(banners); }
  createBanner(input: any) { return db.insert(banners).values(input).returning(); }
  updateBanner(id: string, patch: any) { return db.update(banners).set(patch).where(eq(banners.id, id)).returning(); }
  removeBanner(id: string) { return db.delete(banners).where(eq(banners.id, id)); }

  // ===== B端：Announcements =====
  findAllAnnouncements() { return db.select().from(announcements); }
  createAnnouncement(input: any) { return db.insert(announcements).values(input).returning(); }
  updateAnnouncement(id: string, patch: any) { return db.update(announcements).set(patch).where(eq(announcements.id, id)).returning(); }
  removeAnnouncement(id: string) { return db.delete(announcements).where(eq(announcements.id, id)); }

  // ===== B端：Recommendations =====
  findAllRecommendations() { return db.select().from(recommendations); }
  setRecommendation(input: { productId: string; slot: string; sort?: number }) {
    return db.insert(recommendations).values(input).returning();
  }
  removeRecommendation(id: string) { return db.delete(recommendations).where(eq(recommendations.id, id)); }

  // ===== B端：FAQ =====
  findAllFaqs() { return db.select().from(faqs); }
  createFaq(input: any) { return db.insert(faqs).values(input).returning(); }
  updateFaq(id: string, patch: any) { return db.update(faqs).set(patch).where(eq(faqs.id, id)).returning(); }
  removeFaq(id: string) { return db.delete(faqs).where(eq(faqs.id, id)); }
}
