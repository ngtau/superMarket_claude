import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import {
  LayoutDashboard, Package, ShoppingBag, Tag, Image, Users, CreditCard, Settings, LogOut,
} from "lucide-react";
import { useAdminAuthStore } from "@/store/admin-auth-store";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/admin/dashboard", label: "數據看板", icon: LayoutDashboard, permission: "dashboard:read" },
  { to: "/admin/products", label: "商品管理", icon: Package, permission: "product:manage" },
  { to: "/admin/orders", label: "訂單管理", icon: ShoppingBag, permission: "order:manage" },
  { to: "/admin/marketing", label: "營銷管理", icon: Tag, permission: "marketing:manage" },
  { to: "/admin/content", label: "內容管理", icon: Image, permission: "marketing:manage" },
  { to: "/admin/payment-methods", label: "支付管理", icon: CreditCard, permission: "payment:manage" },
  { to: "/admin/users", label: "用戶管理", icon: Users, permission: "user:manage" },
  { to: "/admin/settings", label: "系統設置", icon: Settings, permission: "system:manage" },
];

/** 后台整体布局：侧边导航按当前管理员权限点动态过滤，无权限项不显示（前端UI层过滤，后端RBACGuard仍是唯一权威） */
export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, token, logout, hasPermission } = useAdminAuthStore();

  useEffect(() => {
    if (!token) navigate("/admin/login");
  }, [token, navigate]);

  if (!token || !admin) return null;

  const visibleItems = NAV_ITEMS.filter((item) => hasPermission(item.permission));

  return (
    <div className="min-h-screen flex bg-paper">
      <aside className="w-56 bg-ink text-paper flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-paper/10">
          <span className="font-display text-xl font-extrabold text-brass">APCube</span>
          <p className="text-xs text-paper/60 mt-0.5">後台管理</p>
        </div>
        <nav className="flex-1 py-3">
          {visibleItems.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-jade text-paper border-l-4 border-brass" : "text-paper/70 hover:bg-paper/5 hover:text-paper"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-paper/10">
          <p className="text-xs text-paper/60 font-mono">{admin.username}</p>
          <p className="text-xs text-brass">{admin.roleNameZh}</p>
          <button
            onClick={() => { logout(); navigate("/admin/login"); }}
            className="mt-2 flex items-center gap-1.5 text-xs text-paper/60 hover:text-chili transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> 登出
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
