import { describe, it, expect } from "vitest";
import { checkPurchaseLimits } from "../purchase-limit.util.js";

describe("限购风控 §7.7/D20⑦", () => {
  it("未配置限制（null,null）：任意数量不拒绝", () => {
    expect(() => checkPurchaseLimits([{ skuId: "a", qty: 999 }], null, null)).not.toThrow();
  });

  it("单品限购：超出即拒绝", () => {
    expect(() => checkPurchaseLimits([{ skuId: "a", qty: 5 }], 3, null)).toThrow();
  });
  it("单品限购：未超出不拒绝", () => {
    expect(() => checkPurchaseLimits([{ skuId: "a", qty: 3 }], 3, null)).not.toThrow();
  });

  it("总件数上限：多个SKU合计超出即拒绝", () => {
    expect(() => checkPurchaseLimits([{ skuId: "a", qty: 3 }, { skuId: "b", qty: 3 }], null, 5)).toThrow();
  });
  it("总件数上限：合计不超出则通过", () => {
    expect(() => checkPurchaseLimits([{ skuId: "a", qty: 2 }, { skuId: "b", qty: 3 }], null, 5)).not.toThrow();
  });

  it("两种限制同时配置，任一超出都拒绝", () => {
    expect(() => checkPurchaseLimits([{ skuId: "a", qty: 2 }], 1, 10)).toThrow(); // 单品超
    expect(() => checkPurchaseLimits([{ skuId: "a", qty: 1 }, { skuId: "b", qty: 1 }, { skuId: "c", qty: 1 }], 2, 2)).toThrow(); // 总量超
  });
});
