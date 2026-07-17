import { Navigate, useLocation } from "react-router-dom";
import { useCustomerAuthStore } from "@/store/customer-auth-store";

/** 购物车/结算/我的订单等需要登录态的页面统一包裹此组件 */
export function RequireCustomerAuth({ children }: { children: React.ReactNode }) {
  const accessToken = useCustomerAuthStore((s) => s.accessToken);
  const location = useLocation();
  if (!accessToken) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <>{children}</>;
}
