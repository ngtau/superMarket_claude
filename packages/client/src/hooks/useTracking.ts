import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@/lib/api-client";

/**
 * §6.8 行42：C端自采埋点。
 *
 * 设计原则：
 * - **旁路**：所有上报失败都静默吞掉（catch 空实现），绝不因为统计打断用户主流程。
 * - **匿名**：sessionId 是本地生成的随机串，不是账号ID、不含任何 PII；刷新页面前半小时内复用，
 *   与"会话"语义对齐（转化率的去重分母就是它）。
 * - **不阻塞渲染**：用 queueMicrotask 推迟发送，避免埋点请求挤占首屏关键资源。
 */

const SESSION_KEY = "apcube_session_id";
const SESSION_TTL_MS = 30 * 60 * 1000;

export type TrackingEventType =
  | "page_view" | "product_view" | "add_to_cart" | "checkout_start" | "register" | "order_placed";

function getSessionId(): string {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const { id, ts } = JSON.parse(raw) as { id: string; ts: number };
      if (id && Date.now() - ts < SESSION_TTL_MS) return id;
    }
  } catch {
    // localStorage 不可用（隐私模式/被禁用）时降级为一次性会话ID，不影响功能
  }
  const id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id, ts: Date.now() }));
  } catch { /* 忽略：拿不到持久化就用内存态 */ }
  return id;
}

export function trackEvent(type: TrackingEventType, extra?: { path?: string; productId?: string }) {
  const body = {
    sessionId: getSessionId(),
    eventType: type,
    path: extra?.path ?? window.location.pathname,
    productId: extra?.productId ?? null,
  };
  // 旁路发送：失败静默，不用 await，不阻塞任何交互
  queueMicrotask(() => {
    api.post("/tracking/event", body).catch(() => undefined);
  });
}

/** 路由变化时自动上报 page_view。在 App 根组件挂一次即可 */
export function usePageTracking() {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    // React 严格模式下 effect 会跑两次，用 lastPath 去重避免重复计数
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;
    trackEvent("page_view", { path: location.pathname });
  }, [location.pathname]);
}
