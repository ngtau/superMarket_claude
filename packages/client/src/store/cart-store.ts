import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LocalCartItem {
  skuId: string;
  productId: string;
  name: string;
  specName: string;
  priceAfterCents: number;
  qty: number;
  image?: string;
}

interface CartState {
  items: LocalCartItem[];
  addItem: (item: Omit<LocalCartItem, "qty">, qty?: number) => void;
  updateQty: (skuId: string, qty: number) => void;
  removeItem: (skuId: string) => void;
  totalQty: () => number;
}

/**
 * v1：本地购物车（Zustand+持久化），登录后可调用 /cart/merge 同步到服务端（见API契约文档§4）。
 * 本轮仅搭首页/商品页，购物车页与结算页留待下一步接入服务端购物车。
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item, qty = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.skuId === item.skuId);
          if (existing) {
            return { items: state.items.map((i) => (i.skuId === item.skuId ? { ...i, qty: i.qty + qty } : i)) };
          }
          return { items: [...state.items, { ...item, qty }] };
        });
      },
      updateQty: (skuId, qty) => set((state) => ({ items: state.items.map((i) => (i.skuId === skuId ? { ...i, qty } : i)) })),
      removeItem: (skuId) => set((state) => ({ items: state.items.filter((i) => i.skuId !== skuId) })),
      totalQty: () => get().items.reduce((s, i) => s + i.qty, 0),
    }),
    { name: "apcube-cart" }
  )
);
