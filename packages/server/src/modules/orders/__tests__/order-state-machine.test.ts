import { describe, it, expect } from "vitest";
import { assertOrderTransition, assertPaymentTransition } from "../order-state-machine.js";

describe("订单状态机 §7.1", () => {
  it("允许的合法迁移不抛错", () => {
    expect(() => assertOrderTransition("pending_payment", "paid")).not.toThrow();
    expect(() => assertOrderTransition("pending_payment", "cancelled")).not.toThrow();
    expect(() => assertOrderTransition("paid", "shipped")).not.toThrow();
    expect(() => assertOrderTransition("shipped", "completed")).not.toThrow();
  });

  it("非法迁移抛错：未支付直接发货", () => {
    expect(() => assertOrderTransition("pending_payment", "shipped")).toThrow();
  });
  it("非法迁移抛错：已完成订单不可再变更", () => {
    expect(() => assertOrderTransition("completed", "cancelled")).toThrow();
    expect(() => assertOrderTransition("completed", "shipped")).toThrow();
  });
  it("非法迁移抛错：已发货订单不可回退关单（实测Phase5发现的边界场景）", () => {
    expect(() => assertOrderTransition("shipped", "cancelled")).toThrow();
  });
  it("非法迁移抛错：已取消订单不可复活", () => {
    expect(() => assertOrderTransition("cancelled", "paid")).toThrow();
  });
});

describe("支付状态机 §7.2", () => {
  it("允许：pending→pending_review（上传凭证）", () => {
    expect(() => assertPaymentTransition("pending", "pending_review")).not.toThrow();
  });
  it("允许：pending_review→paid（审核通过）", () => {
    expect(() => assertPaymentTransition("pending_review", "paid")).not.toThrow();
  });
  it("允许：failed→pending_review（驳回后重新上传凭证）", () => {
    expect(() => assertPaymentTransition("failed", "pending_review")).not.toThrow();
  });
  it("非法：已paid状态不可再变更（无退款场景）", () => {
    expect(() => assertPaymentTransition("paid", "failed")).toThrow();
    expect(() => assertPaymentTransition("paid", "pending")).toThrow();
  });
});
