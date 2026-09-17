/**
 * E2E 的 API 侧工具：用真实 HTTP 调用做"数据准备"，让 UI 测试只负责验证关键交互。
 *
 * 为什么不全程走 UI：
 * - 主链路（注册/加购/下单/支付/发货/收货）本身很长，若每一步都靠点页面，
 *   任何一处的 UI 微调都会让后续用例连锁失败，排查成本远超收益；
 * - 后台在另一个 host（admin.*），本地与 CI 都拿不到该域名，走 UI 需要改 hosts，不现实。
 *   因此后台动作（审核付款、发货）走 API，C 端关键动作走 UI。
 */

export const API_BASE = process.env.E2E_API_BASE ?? "http://127.0.0.1:3000";
export const ADMIN_USER = process.env.E2E_ADMIN_USER ?? "admin";
export const ADMIN_PASS = process.env.E2E_ADMIN_PASS ?? "ChangeMe123!";
/** 与 packages/server/src/scripts/seed-demo.ts 中的固定商品保持一致 */
export const DEMO_PRODUCT_NAME = "自動化測試商品（勿刪）";
export const E2E_PASSWORD = "Passw0rd!23";

interface CallOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  token?: string;
  body?: unknown;
}

export async function call<T = any>(path: string, options: CallOptions = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`API ${options.method ?? "GET"} ${path} 失败 ${res.status}: ${text}`);
  }
  return data as T;
}

/** 每个用例独立邮箱，避免"该邮箱已注册"导致的假失败 */
export function uniqueEmail(tag: string): string {
  return `e2e+${tag}+${Date.now()}+${Math.random().toString(36).slice(2, 8)}@apcube.test`;
}

export interface Session {
  email: string;
  accessToken: string;
}

export async function registerCustomer(tag: string): Promise<Session> {
  const email = uniqueEmail(tag);
  const { accessToken } = await call<{ accessToken: string }>("/auth/register", {
    method: "POST",
    body: { email, password: E2E_PASSWORD },
  });
  return { email, accessToken };
}

export async function loginCustomer(email: string): Promise<string> {
  const { accessToken } = await call<{ accessToken: string }>("/auth/login", {
    method: "POST",
    body: { email, password: E2E_PASSWORD },
  });
  return accessToken;
}

export async function createAddress(token: string) {
  const [address] = await call<{ id: string }[]>("/addresses", {
    method: "POST",
    token,
    // phoneEncrypted 后端统一 encrypt()，这里传明文即可
    body: { recipient: "E2E 收件人", phoneEncrypted: "61234567", detail: "測試地址 1 號", isDefault: true },
  });
  return address;
}

export async function findDemoProduct(token?: string) {
  const { items } = await call<{ items: { id: string; name: string }[] }>(
    `/products?keyword=${encodeURIComponent(DEMO_PRODUCT_NAME)}&pageSize=20`
  );
  const product = items.find((i) => i.name.includes(DEMO_PRODUCT_NAME));
  if (!product) throw new Error(`未找到演示商品「${DEMO_PRODUCT_NAME}」，请先执行 pnpm db:seed:demo`);
  const detail = await call<{ id: string; specs: { id: string }[] }>(`/products/${product.id}`);
  const skuId = detail.specs[0].id;
  if (!skuId) throw new Error("演示商品没有可用规格");
  return { productId: product.id, skuId };
}

export async function addToCart(token: string, skuId: string, qty = 1) {
  return call("/cart/items", { method: "POST", token, body: { skuId, qty } });
}

export async function cartItems(token: string) {
  return call<{ id: string; checked: boolean }[]>("/cart", { token });
}

export async function placeOrder(token: string, addressId: string) {
  const items = await cartItems(token);
  const cartItemIds = items.filter((i) => i.checked).map((i) => i.id);
  if (cartItemIds.length === 0) throw new Error("购物车没有勾选中的商品");
  const { order } = await call<{ order: { id: string; orderNo: string; status: string } }>("/orders", {
    method: "POST",
    token,
    body: { cartItemIds, addressId, paymentMethod: "bank_transfer" },
  });
  return order;
}

export async function uploadVoucher(token: string, orderId: string) {
  return call(`/payments/${orderId}/voucher`, {
    method: "POST",
    token,
    body: { voucherUrl: "https://example.com/e2e-voucher.png" },
  });
}

export async function adminLogin(): Promise<string> {
  const { accessToken } = await call<{ accessToken: string }>("/admin/auth/login", {
    method: "POST",
    body: { username: ADMIN_USER, password: ADMIN_PASS },
  });
  return accessToken;
}

/** 后台审核通过：从待审队列里精确匹配本次订单，避免误审其他并发用例的单 */
export async function approvePaymentByOrder(adminToken: string, orderId: string) {
  const queue = await call<{ payment: { id: string }; orderId: string }[]>("/admin/payments/review-queue", { token: adminToken });
  const entry = queue.find((q) => q.orderId === orderId);
  if (!entry) throw new Error(`待审队列中找不到订单 ${orderId}`);
  return call(`/admin/payments/${entry.payment.id}/approve`, { method: "POST", token: adminToken });
}

export async function shipOrder(adminToken: string, orderId: string, trackingNo = "E2E-TRACK-001") {
  return call(`/admin/orders/${orderId}/ship`, { method: "POST", token: adminToken, body: { trackingNo } });
}

/**
 * 订单详情。注意两个状态机是分离的（§7.1 订单 / §7.2 支付）：
 * - `status` 没有 pending_review 这一档，上传凭证后仍是 pending_payment，审核通过才 paid
 * - 「待审核」体现在 `paymentStatus` 上
 * E2E 断言"已提交凭证等待审核"必须看 paymentStatus，看 status 会误判。
 */
export async function orderDetail(token: string, orderId: string) {
  return call<{ id: string; status: string; paymentStatus: string }>(`/orders/${orderId}`, { token });
}
