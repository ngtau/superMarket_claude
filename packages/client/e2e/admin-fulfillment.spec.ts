import { test, expect } from "@playwright/test";
import {
  E2E_PASSWORD, adminLogin, approvePaymentByOrder, shipOrder,
  registerCustomer, createAddress, findDemoProduct, addToCart,
  placeOrder, uploadVoucher, orderDetail,
} from "./helpers/api";

/**
 * 履约链路：付款审核 → 发货 → 买家确认收货
 *
 * 覆盖的高危逻辑点：
 * - §7.2 支付状态机：pending_review →(审核) paid，联动 order.status → paid，不可跳步
 * - §7.2 订单状态机：paid →(发货) shipped →(确认收货) completed
 * - RBAC：审核付款需 payment:manage、发货需 order:ship（用初始超管，权限矩阵已在 seed 中铺好）
 * - D20③ 确认收货超时（14天）是定时任务，此处只验证主动确认路径
 *
 * 为什么这一段主要走 API：后台在 admin.* 独立 host，本地/CI 都不具备该域名，
 * 走 UI 需要改 hosts 文件，维护成本高于收益；仅最后一步"买家确认收货"走 UI，
 * 因为它才是 C 端用户真实接触的闭环终点。
 */

test.describe("订单履约链路", () => {
  test("付款审核 → 发货 → 买家确认收货", async ({ page }) => {
    // ---------- 准备：造一笔"已上传凭证待审核"的订单 ----------
    const buyer = await registerCustomer("fulfill");
    const address = await createAddress(buyer.accessToken);
    const { skuId } = await findDemoProduct();
    await addToCart(buyer.accessToken, skuId, 1);
    const order = await placeOrder(buyer.accessToken, address.id);
    await uploadVoucher(buyer.accessToken, order.id);

    // 「已上传凭证待审核」体现在 paymentStatus 上，订单 status 仍是 pending_payment（§7.1/§7.2 双状态机）
    expect((await orderDetail(buyer.accessToken, order.id)).paymentStatus).toBe("pending_review");

    // ---------- 1. 后台审核付款 ----------
    const adminToken = await adminLogin();
    await approvePaymentByOrder(adminToken, order.id);
    await expect
      .poll(async () => (await orderDetail(buyer.accessToken, order.id)).status, { timeout: 20_000 })
      .toBe("paid");

    // ---------- 2. 后台发货 ----------
    await shipOrder(adminToken, order.id);
    await expect
      .poll(async () => (await orderDetail(buyer.accessToken, order.id)).status, { timeout: 20_000 })
      .toBe("shipped");

    // ---------- 3. 买家在 C 端确认收货 ----------
    await page.goto("/login");
    await page.fill('input[type="email"]', buyer.email);
    await page.fill('input[type="password"]', E2E_PASSWORD);
    await page.getByRole("button", { name: /登入|Sign In/ }).click();
    await expect(page).not.toHaveURL(/\/login/);

    await page.goto(`/orders/${order.id}`);
    await page.getByRole("button", { name: /確認收貨|Confirm Receipt/ }).click();

    // completed 是终态：确认后不可再回退（§7.2）
    await expect
      .poll(async () => (await orderDetail(buyer.accessToken, order.id)).status, { timeout: 20_000 })
      .toBe("completed");
  });
});
