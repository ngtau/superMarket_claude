import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCategories } from "@/hooks/useCategories";
import { useBanners, useRecommendations } from "@/hooks/useProducts";
import { ProductCard } from "@/components/product/ProductCard";

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const { data: categories } = useCategories();
  const { data: banners } = useBanners();
  const { data: hotItems } = useRecommendations("hot");
  const { data: newItems } = useRecommendations("new");

  const hero = banners?.[0];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-10">
      {/* 招牌式主视觉：非满版大图轮播，用文字招牌感承载"这是一家什么店" */}
      <section className="relative bg-jade rounded-lg overflow-hidden min-h-[220px] flex items-center">
        {hero?.imageUrl && (
          <img src={hero.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        )}
        <div className="relative z-10 px-8 py-10 text-paper">
          <p className="font-mono text-xs tracking-widest uppercase text-brass mb-2">
            {i18n.language === "zh-HK" ? "香港生活百貨" : "Hong Kong Lifestyle Goods"}
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold leading-tight max-w-lg">
            {hero?.copyZh ?? (i18n.language === "zh-HK" ? "由街坊挑選，送到你家" : "Curated by neighbours, delivered to you")}
          </h1>
        </div>
      </section>

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
