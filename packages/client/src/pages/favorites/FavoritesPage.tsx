import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@app/shared";
import { useFavorites } from "@/hooks/useFavorites";
import { Button } from "@/components/ui/button";

export default function FavoritesPage() {
  const { i18n } = useTranslation();
  const { favorites, toggle } = useFavorites();

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="font-display text-2xl font-bold mb-6">{i18n.language === "zh-HK" ? "我的收藏" : "My Favorites"}</h1>

      {!favorites?.length && (
        <div className="text-center py-16">
          <p className="font-display text-xl text-muted-foreground">{i18n.language === "zh-HK" ? "還沒有收藏商品" : "No favorites yet"}</p>
          <Link to="/products"><Button className="mt-4">{i18n.language === "zh-HK" ? "去逛逛" : "Browse products"}</Button></Link>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {favorites?.map((f) => (
          <div key={f.favoriteId} className="relative group">
            <Link to={`/product/${f.productId}`}>
              <div className="aspect-square bg-paper-dim rounded-md overflow-hidden border border-border">
                {f.images[0] && <img src={f.images[0]} alt={f.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />}
              </div>
              <h3 className="mt-2 text-sm font-medium line-clamp-2">{f.name}</h3>
              <p className="font-mono text-jade font-semibold text-sm">{formatCurrency(f.priceAfterCents)}</p>
            </Link>
            <button
              onClick={() => toggle(f.productId)}
              className="absolute top-1 right-1 bg-white/90 rounded-full p-1.5 text-chili hover:bg-white"
              aria-label="取消收藏"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
