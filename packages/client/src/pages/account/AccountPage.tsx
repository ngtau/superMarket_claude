import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Heart, ShoppingBag, MapPin, LogOut } from "lucide-react";
import { api } from "@/lib/api-client";
import { useCustomerAuthStore } from "@/store/customer-auth-store";

interface MeInfo { id: string; email: string; locale: string; memberLevelId: string | null; createdAt: string }

export default function AccountPage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const logout = useCustomerAuthStore((s) => s.logout);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => api.get<MeInfo>("/users/me") });

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const links = [
    { to: "/orders", label: i18n.language === "zh-HK" ? "我的訂單" : "My Orders", icon: ShoppingBag },
    { to: "/favorites", label: i18n.language === "zh-HK" ? "我的收藏" : "My Favorites", icon: Heart },
    { to: "/account/addresses", label: i18n.language === "zh-HK" ? "收貨地址" : "Addresses", icon: MapPin },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div className="bg-white rounded-lg border border-border p-5">
        <p className="font-mono text-sm text-muted-foreground">{me?.email}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {i18n.language === "zh-HK" ? "註冊於" : "Joined"} {me && new Date(me.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="bg-white rounded-lg border border-border divide-y divide-border overflow-hidden">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="flex items-center gap-3 px-5 py-3.5 hover:bg-paper-dim transition-colors">
            <l.icon className="h-5 w-5 text-jade" />
            <span className="text-sm font-medium">{l.label}</span>
          </Link>
        ))}
      </div>

      <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-chili hover:underline px-1">
        <LogOut className="h-4 w-4" /> {i18n.language === "zh-HK" ? "登出" : "Sign out"}
      </button>
    </div>
  );
}
