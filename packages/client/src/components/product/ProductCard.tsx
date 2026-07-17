import { Link } from "react-router-dom";
import { formatCurrency } from "@app/shared";
import { useTranslation } from "react-i18next";
import type { ProductListItem } from "@/types/api";

export function ProductCard({ product }: { product: ProductListItem }) {
  const { i18n } = useTranslation();
  const locale = i18n.language as "zh-HK" | "en";
  const discountPercent = product.hasActiveDiscount
    ? Math.round((1 - product.priceCents / product.priceOriginalCents) * 100)
    : 0;

  return (
    <Link to={`/product/${product.id}`} className="group block">
      <div className="relative aspect-square bg-paper-dim rounded-md overflow-hidden border border-border">
        {product.images[0] ? (
          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground font-display text-lg">APCube</div>
        )}
        {/* 签名元素：折扣价签贴纸，全站唯一的高调装饰 */}
        {product.hasActiveDiscount && (
          <div className="price-tag absolute -top-1 -right-1 bg-chili text-paper font-mono text-xs font-semibold px-2 py-1 rounded shadow-md">
            -{discountPercent}%
          </div>
        )}
      </div>
      <div className="mt-2 space-y-0.5">
        <h3 className="text-sm font-medium text-ink line-clamp-2">{product.name}</h3>
        <div className="flex items-baseline gap-2">
          <span className="font-mono font-semibold text-jade">{formatCurrency(product.priceCents, locale)}</span>
          {product.hasActiveDiscount && (
            <span className="font-mono text-xs text-muted-foreground line-through">{formatCurrency(product.priceOriginalCents, locale)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
