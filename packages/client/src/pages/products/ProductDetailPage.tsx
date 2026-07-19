import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Heart } from "lucide-react";
import DOMPurify from "dompurify";
import { formatCurrency } from "@app/shared";
import { Button } from "@/components/ui/button";
import { useProductDetail } from "@/hooks/useProducts";
import { useCartStore } from "@/store/cart-store";
import { useFavorites } from "@/hooks/useFavorites";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const locale = i18n.language as "zh-HK" | "en";
  const { data: product, isLoading } = useProductDetail(id);
  const addItem = useCartStore((s) => s.addItem);
  const { isFavorited, toggle, isLoggedIn } = useFavorites();
  const [selectedSpecId, setSelectedSpecId] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  if (isLoading) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-muted-foreground">{i18n.language === "zh-HK" ? "載入中…" : "Loading…"}</div>;
  }
  if (!product) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-muted-foreground">{i18n.language === "zh-HK" ? "商品不存在" : "Product not found"}</div>;
  }

  const selectedSpec = product.specs.find((s) => s.id === selectedSpecId) ?? product.specs[0];
  const discountPercent = product.hasActiveDiscount
    ? Math.round((1 - product.priceCents / product.priceOriginalCents) * 100)
    : 0;

  const handleAddToCart = () => {
    if (!selectedSpec) return;
    addItem({
      skuId: selectedSpec.id,
      productId: product.id,
      name: product.name,
      specName: selectedSpec.name,
      priceAfterCents: selectedSpec.priceAfterCents,
      image: product.images[0],
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 grid md:grid-cols-2 gap-8">
      <div className="relative aspect-square bg-paper-dim rounded-lg overflow-hidden border border-border">
        {product.images[0] ? (
          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-display text-2xl text-muted-foreground">APCube</div>
        )}
        {product.hasActiveDiscount && (
          <div className="price-tag absolute top-3 -right-1 bg-chili text-paper font-mono text-sm font-semibold px-3 py-1.5 rounded shadow-md">
            -{discountPercent}%
          </div>
        )}
      </div>

      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-2xl font-bold">{product.name}</h1>
          <button
            onClick={() => { if (!toggle(product.id)) navigate(`/login?redirect=/product/${product.id}`); }}
            className="shrink-0 mt-1"
            aria-label={i18n.language === "zh-HK" ? "收藏" : "Favorite"}
          >
            <Heart className={`h-6 w-6 transition-colors ${isFavorited(product.id) ? "fill-chili text-chili" : "text-muted-foreground"}`} />
          </button>
        </div>

        <div className="flex items-baseline gap-3">
          <span className="font-mono text-2xl font-bold text-jade">{formatCurrency(selectedSpec?.priceAfterCents ?? product.priceCents, locale)}</span>
          {product.hasActiveDiscount && (
            <span className="font-mono text-base text-muted-foreground line-through">{formatCurrency(product.priceOriginalCents, locale)}</span>
          )}
        </div>

        {/* ⚠️修复：此前description被当纯文本渲染，富文本编辑器产出的HTML标签会原样显示为文字而非格式化内容。
            现改为dangerouslySetInnerHTML渲染，但必须先经DOMPurify消毒防XSS——管理员输入本身可信，
            但富文本编辑器的"源代码"模式允许直接粘贴任意HTML，消毒是防止恶意脚本注入的最后一道防线。 */}
        {product.description && (
          <div
            className="prose prose-sm max-w-none text-sm text-muted-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description) }}
          />
        )}

        {product.specs.length > 1 && (
          <div>
            <p className="text-sm font-medium mb-2">{i18n.language === "zh-HK" ? "規格" : "Options"}</p>
            <div className="flex flex-wrap gap-2">
              {product.specs.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSpecId(s.id)}
                  disabled={s.available === 0}
                  className={`px-3 py-1.5 text-sm rounded border-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    (selectedSpec?.id ?? product.specs[0].id) === s.id ? "border-jade bg-jade/10 font-semibold" : "border-border hover:border-jade/50"
                  }`}
                >
                  {s.name} {s.available === 0 && `(${i18n.language === "zh-HK" ? "缺貨" : "Sold out"})`}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="font-mono text-xs text-muted-foreground">
          {i18n.language === "zh-HK" ? "庫存" : "In stock"}: {selectedSpec?.available ?? 0}
        </p>

        <Button size="lg" className="w-full" disabled={!selectedSpec || selectedSpec.available === 0} onClick={handleAddToCart}>
          {added
            ? (i18n.language === "zh-HK" ? "已加入購物車 ✓" : "Added to cart ✓")
            : selectedSpec?.available === 0
              ? (i18n.language === "zh-HK" ? "暫時缺貨" : "Out of stock")
              : (i18n.language === "zh-HK" ? "加入購物車" : "Add to Cart")}
        </Button>
      </div>
    </div>
  );
}
