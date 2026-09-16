import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Megaphone } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useBanners, useRecommendations } from "@/hooks/useProducts";
import { useAnnouncements } from "@/hooks/useContent";
import { BannerCarousel } from "@/components/home/BannerCarousel";

export default function HomePage() {
  const { i18n } = useTranslation();
  const { data: categories } = useCategories();
  const { data: banners } = useBanners();
  const { data: announcements } = useAnnouncements();
  const { data: hotItems } = useRecommendations("hot");
  const { data: newItems } = useRecommendations("new");

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-10">
      {/* §5.1 轮播广告：自动轮播 + 手动切换 + 点击跳转（此前只取 banners[0] 做静态主视觉，不满足 DoD） */}
      <BannerCarousel banners={banners ?? []} />

      {/* §6.6 行35：公告/活动，前端首页可见 */}
      {announcements && announcements.length > 0 && (
        <section className="flex items-start gap-3 bg-brass/10 border border-brass/30 rounded-lg px-4 py-3">
          <Megaphone className="h-5 w-5 text-brass shrink-0 mt-0.5" />
          <ul className="text-sm space-y-1 flex-1">
            {announcements.slice(0, 3).map((a) => (
              <li key={a.id} className="leading-relaxed">{a.content}</li>
            ))}
          </ul>
        </section>
      )}

      {/* 分类墙：招牌招纸式的方块导航，而非常规轮播式分类条 */}
      {categories && categories.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
            {i18n.language === "zh-HK" ? "逛逛分類" : "Browse Categories"}
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/products?categoryId=${c.id}`}
                className="aspect-square rounded-md border-2 border-ink/10 bg-paper-dim hover:border-brass hover:bg-brass/10 transition-colors flex items-center justify-center text-center p-2 font-display font-semibold text-sm"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {hotItems && hotItems.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold mb-4">{i18n.language === "zh-HK" ? "熱門推薦" : "Popular Picks"}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {hotItems.map((item) => (
              <Link key={item.productId} to={`/product/${item.productId}`} className="group block">
                <div className="aspect-square bg-paper-dim rounded-md overflow-hidden border border-border">
                  {item.images[0] && <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />}
                </div>
                <h3 className="mt-2 text-sm font-medium line-clamp-2">{item.name}</h3>
              </Link>
            ))}
          </div>
        </section>
      )}

      {newItems && newItems.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold mb-4">{i18n.language === "zh-HK" ? "新品上架" : "New Arrivals"}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {newItems.map((item) => (
              <Link key={item.productId} to={`/product/${item.productId}`} className="group block">
                <div className="aspect-square bg-paper-dim rounded-md overflow-hidden border border-border">
                  {item.images[0] && <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />}
                </div>
                <h3 className="mt-2 text-sm font-medium line-clamp-2">{item.name}</h3>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!categories?.length && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-display text-xl">{i18n.language === "zh-HK" ? "貨架還在整理中" : "Shelves are still being stocked"}</p>
          <p className="text-sm mt-1">{i18n.language === "zh-HK" ? "後台建好分類與商品後，這裡會自動顯示" : "Once categories and products are added, they'll show up here"}</p>
        </div>
      )}
    </div>
  );
}
