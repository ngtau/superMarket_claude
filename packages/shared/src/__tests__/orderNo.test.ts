import { describe, it, expect } from "vitest";
import { generateOrderNo } from "../orderNo.js";

describe("generateOrderNo (D20⑨)", () => {
  it("生成18位数字字符串：14位时间戳+4位随机数", () => {
    const orderNo = generateOrderNo(new Date("2026-07-11T10:30:05Z"));
    expect(orderNo).toHaveLength(18);
    expect(orderNo).toMatch(/^\d{18}$/);
  });
  it("时间戳部分精确匹配YYYYMMDDHHmmss", () => {
    const orderNo = generateOrderNo(new Date(2026, 6, 11, 14, 32, 5)); // 本地时间构造避免时区偏移
    expect(orderNo.slice(0, 14)).toBe("20260711143205");
  });
  it("连续生成不产生完全相同的订单号（随机段大概率不同）", () => {
    const a = generateOrderNo();
    const b = generateOrderNo();
    // 同一毫秒内时间戳段可能相同，但18位整体因随机段而大概率不同；用100次生成验证无重复
    const set = new Set(Array.from({ length: 100 }, () => generateOrderNo()));
    expect(set.size).toBeGreaterThan(90); // 允许极小概率碰撞，但不应大量重复
  });
});
