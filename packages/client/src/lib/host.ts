/**
 * 前端多域名自动路由：镜像后端 CLIENT_ORIGIN/ADMIN_ORIGIN 的思路，
 * 通过 VITE_ADMIN_ORIGIN 判断当前访问的是否为后台域名(admin.apcube.com)，
 * 用于根路径"/"的自动落地页面判断（商城首页 vs 后台登录/看板）。
 * 未配置 VITE_ADMIN_ORIGIN 时（如本地开发单一origin场景）默认按商城域名处理，不影响现有行为。
 */
export function isAdminHost(): boolean {
  const adminOrigin = import.meta.env.VITE_ADMIN_ORIGIN;
  if (!adminOrigin) return false;
  try {
    return window.location.origin === adminOrigin || window.location.hostname === new URL(adminOrigin).hostname;
  } catch {
    return false; // VITE_ADMIN_ORIGIN 配置格式不合法时，安全兜底为商城域名行为，不让整个应用崩溃
  }
}
