import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ShoppingCart, Search, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCategories } from "@/hooks/useCategories";
import { useCartStore } from "@/store/cart-store";
import { useCustomerAuthStore } from "@/store/customer-auth-store";

/** 招牌式导航：墨青底+黄铜描边，呼应香港街铺招牌的视觉语言 */
export function Header() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: categories } = useCategories();
  const totalQty = useCartStore((s) => s.totalQty());
  const customer = useCustomerAuthStore((s) => s.customer);
  const [keyword, setKeyword] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/products?keyword=${encodeURIComponent(keyword)}`);
  };

  return (
    <header className="sticky top-0 z-40 bg-ink text-paper border-b-2 border-brass">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* 移动端汉堡菜单 */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <button className="md:hidden p-1" aria-label="打開選單">
              <Menu className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-paper text-ink">
            <SheetHeader><SheetTitle>分類</SheetTitle></SheetHeader>
            <nav className="mt-4 flex flex-col gap-1">
              {categories?.map((c) => (
                <Link key={c.id} to={`/products?categoryId=${c.id}`} onClick={() => setMobileNavOpen(false)}
                  className="py-2 px-2 rounded hover:bg-paper-dim font-medium">
                  {c.name}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <Link to="/" className="font-display text-2xl font-extrabold tracking-wide text-brass shrink-0">
          APCube
        </Link>

        {/* 桌面端分类导航 */}
        <nav className="hidden md:flex items-center gap-5 font-display text-base font-semibold tracking-wide">
          {categories?.slice(0, 6).map((c) => (
            <Link key={c.id} to={`/products?categoryId=${c.id}`} className="hover:text-brass transition-colors">
              {c.name}
            </Link>
          ))}
        </nav>

        <form onSubmit={handleSearch} className="flex-1 max-w-md ml-auto hidden sm:flex">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/50" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={i18n.language === "zh-HK" ? "搜尋商品" : "Search products"}
              className="pl-9 bg-paper text-ink border-0 h-9"
            />
          </div>
        </form>

        <button
          onClick={() => i18n.changeLanguage(i18n.language === "zh-HK" ? "en" : "zh-HK")}
          className="font-mono text-xs px-2 py-1 border border-brass/60 rounded hover:bg-brass/10 shrink-0"
        >
          {i18n.language === "zh-HK" ? "EN" : "繁"}
        </button>

        <Link to="/cart" className="relative shrink-0" aria-label="購物車">
          <ShoppingCart className="h-6 w-6" />
          {totalQty > 0 && (
            <span className="absolute -top-2 -right-2 bg-chili text-paper text-xs font-mono w-5 h-5 rounded-full flex items-center justify-center">
              {totalQty}
            </span>
          )}
        </Link>

        {customer ? (
          <Link to="/account" className="shrink-0" aria-label="會員中心">
            <User className="h-6 w-6" />
          </Link>
        ) : (
          <Link to="/login" className="font-mono text-xs px-3 py-1.5 border border-brass/60 rounded hover:bg-brass/10 shrink-0">
            {i18n.language === "zh-HK" ? "登入" : "Sign In"}
          </Link>
        )}
      </div>
    </header>
  );
}
