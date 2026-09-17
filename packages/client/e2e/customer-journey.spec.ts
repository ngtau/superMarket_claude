import { test, expect } from "@playwright/test";
import {
  E2E_PASSWORD, DEMO_PRODUCT_NAME, findDemoProduct,
  loginCustomer, orderDetail, uniqueEmail,
} from "./helpers/api";

/**
 * C 端主链路：注册 → 商品详情 → 加购 → 购物车 → 结算下单 → 上传付款凭证
 *
 * 覆盖的高危逻辑点：
 * - 注册即登录（token 落 store，否则后续 401）
 * - 下单时的库存预留（available = stock - locked_stock）
 * - 银行转账上传凭证后订单进入 pending_review（不是直接 paid）
 */

test.describe("C 端购物主链路", () => {
  test("注册 → 加购 → 下单 → 提交付款凭证", async ({ page }) => {
    // ---------- 1. 注册（走 UI，验证注册页本身可用） ----------
    const email = uniqueEmail("buyer");
    await page.goto("/register");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', E2E_PASSWORD);
    await page.getByRole("button", { name: /註冊|Register/ }).click();

    // 注册成功会跳回首页；停在 /register 说明注册失败（邮箱重复等）
    await expect(page).not.toHaveURL(/\/register/);
    await expect(page).toHaveURL(/\/$/);

    // ---------- 2. 进入演示商品详情 ----------
    const { productId } = await findDemoProduct();
    await page.goto(`/product/${productId}`);
    await expect(page.getByText(DEMO_PRODUCT_NAME).first()).toBeVisible();

    // ---------- 3. 加购 ----------
    await page.getByRole("button", { name: /加入購物車|Add to Cart/ }).click();
    await expect(page.getByRole("button", { name: /已加入購物車|Added to cart/ })).toBeVisible({ timeout: 10_000 });

    // ---------- 4. 购物车勾选并结算 ----------
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: /購物車|Cart/ })).toBeVisible();
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (!(await checkbox.isChecked())) await checkbox.check();

    await page.getByRole("button", { name: /去結算|Checkout/ }).click();
    await expect(page).toHaveURL(/\/checkout/);

    // ---------- 5. 新增收货地址（结算页内嵌弹窗） ----------
    await page.getByRole("button", { name: /新增地址|Add/ }).click();
    await page.getByPlaceholder(/收件人|Recipient/).fill("E2E 收件人");
    await page.getByPlaceholder(/聯絡電話|Phone/).fill("61234567");
    await page.getByPlaceholder(/詳細地址|Address detail/).fill("測試地址 1 號");
    await page.getByRole("button", { name: /儲存|Save/ }).click();

    // 地址写库后列表刷新，选中态生效才能提交订单
    await expect(page.getByRole("button", { name: /提交訂單|Place Order/ })).toBeEnabled({ timeout: 15_000 });

    // ---------- 6. 提交订单 → 跳支付页 ----------
    await page.getByRole("button", { name: /提交訂單|Place Order/ }).click();
    await expect(page).toHaveURL(/\/orders\/[^/]+\/payment/, { timeout: 20_000 });

    const orderId = page.url().match(/\/orders\/([^/]+)\/payment/)![1];

    // ---------- 7. 上传付款凭证 ----------
    // 用真实文件上传走通 upload 链路（FileUpload 组件 → POST /upload/voucher）
    await page.setInputFiles('input[type="file"]', {
      name: "voucher.png",
      mimeType: "image/png",
      buffer: Buffer.from("89504e470d0a1a0a0000000d49484452", "hex"),
    });
    await expect(page.getByRole("button", { name: /提交付款憑證|Submit voucher/ })).toBeEnabled({ timeout: 20_000 });
    await page.getByRole("button", { name: /提交付款憑證|Submit voucher/ }).click();

    // ---------- 8. 断言最终状态：等待人工审核 ----------
    // 銀行轉帳不是即时支付。注意「待审核」是支付状态（§7.2），不是订单状态（§7.1）：
    // 此刻 orders.status 仍是 pending_payment，paymentStatus 才是 pending_review。
    const token = await loginCustomer(email);
    await expect
      .poll(async () => (await orderDetail(token, orderId)).paymentStatus, { timeout: 20_000 })
      .toBe("pending_review");
  });
});
