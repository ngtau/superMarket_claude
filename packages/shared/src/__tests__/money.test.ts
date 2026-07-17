import { describe, it, expect } from "vitest";
import { moneyCentsSchema, formatCurrency } from "../money.js";

describe("moneyCentsSchema", () => {
  it("接受非负整数", () => {
    expect(moneyCentsSchema.parse(0)).toBe(0);
    expect(moneyCentsSchema.parse(12345)).toBe(12345);
  });
  it("拒绝浮点数（D19：禁止浮点金额）", () => {
    expect(() => moneyCentsSchema.parse(12.5)).toThrow();
  });
  it("拒绝负数", () => {
    expect(() => moneyCentsSchema.parse(-100)).toThrow();
  });
});

describe("formatCurrency", () => {
  it("整数分格式化为HK$带两位小数", () => {
    expect(formatCurrency(8800, "zh-HK")).toBe("HK$88.00");
    expect(formatCurrency(0, "zh-HK")).toBe("HK$0.00");
  });
  it("§7.4数值示例：8800分*0.85折=7480分", () => {
    const effective = Math.round(8800 * 0.85);
    expect(effective).toBe(7480);
    expect(formatCurrency(effective)).toBe("HK$74.80");
  });
});
