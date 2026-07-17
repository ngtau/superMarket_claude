import { describe, it, expect } from "vitest";
import { discountInputSchema } from "../business.js";

describe("discountInputSchema（已确认事项2：percent/special互斥校验）", () => {
  const base = { productId: "550e8400-e29b-41d4-a716-446655440000", startAt: new Date(), endAt: new Date() };

  it("percent类型只填percentValue：通过", () => {
    expect(() => discountInputSchema.parse({ ...base, type: "percent", percentValue: 0.85 })).not.toThrow();
  });
  it("special类型只填specialPriceCents：通过", () => {
    expect(() => discountInputSchema.parse({ ...base, type: "special", specialPriceCents: 5000 })).not.toThrow();
  });
  it("percent类型同时填了specialPriceCents：拒绝（混用两种语义）", () => {
    expect(() => discountInputSchema.parse({ ...base, type: "percent", percentValue: 0.85, specialPriceCents: 5000 })).toThrow();
  });
  it("percent类型未填percentValue：拒绝", () => {
    expect(() => discountInputSchema.parse({ ...base, type: "percent" })).toThrow();
  });
});
