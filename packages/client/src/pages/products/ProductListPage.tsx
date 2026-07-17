import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useProductList } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { ProductCard } from "@/components/product/ProductCard";

export default function ProductListPage() {
  const [searchParams] = useSearchParams();
  const { i18n } = useTranslation();
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const keyword = searchParams.get("keyword") ?? undefined;
  const { data, isLoading } = useProductList({ categoryId, keyword });
  const { data: categories } = useCategories();

  const findCategoryName = (id: string, nodes = categories ?? []): string | undefined => {
    for (const n of nodes) {
      if (n.id === id) return n.name;
      const found = findCategoryName(id, n.children);
      if (found) return found;
    }
  };

  const title = keyword
    ? `${i18n.language === "zh-HK" ? "搜尋" : "Search"}: ${keyword}`
    : categoryId
      ? findCategoryName(categoryId) ?? ""
      : i18n.language === "zh-HK" ? "全部商品" : "All Products";

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="font-display text-2xl font-bold mb-6">{title}</h1>

      {isLoading && <div className="text-muted-foreground py-16 text-center">{i18n.language === "zh-HK" ? "載入中…" : "Loading…"}</div>}

      {!isLoading && data?.items.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-display text-xl">{i18n.language === "zh-HK" ? "暫時沒有商品" : "No products found"}</p>
          <p className="text-sm mt-1">{i18n.language === "zh-HK" ? "換個分類或關鍵詞試試" : "Try a different category or keyword"}</p>
        </div>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {data.items.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          <p className="font-mono text-xs text-muted-foreground mt-6 text-center">
            {data.total} {i18n.language === "zh-HK" ? "件商品" : "items"}
          </p>
        </>
      )}
    </div>
  );
}
