import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@app/shared";

interface CartItem {
  id: string; skuId: string; qty: number; checked: boolean;
  name: string; specName: string; priceAfterCents: number; available: number;
}

export default function CartPage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: items, isLoading } = useQuery({ queryKey: ["cart"], queryFn: () => api.get<CartItem[]>("/cart") });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<{ qty: number; checked: boolean }> }) => api.patch(`/cart/items/${id}`, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });
  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/cart/items/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  const checkedItems = items?.filter((i) => i.checked) ?? [];
  const subtotal = checkedItems.reduce((s, i) => s + i.priceAfterCents * i.qty, 0);

  if (isLoading) return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-muted-foreground">{i18n.language === "zh-HK" ? "載入中…" : "Loading…"}</div>;

  if (!items?.length) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="font-display text-xl text-muted-foreground">{i18n.language === "zh-HK" ? "購物車是空的" : "Your cart is empty"}</p>
        <Link to="/products"><Button className="mt-4">{i18n.language === "zh-HK" ? "去逛逛" : "Browse products"}</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="font-display text-2xl font-bold mb-6">{i18n.language === "zh-HK" ? "購物車" : "Cart"}</h1>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 bg-white rounded-lg border border-border p-4">
            <input
              type="checkbox"
              checked={item.checked}
              onChange={(e) => updateMutation.mutate({ id: item.id, patch: { checked: e.target.checked } })}
              className="h-4 w-4 accent-jade"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.specName}</p>
              <p className="font-mono text-jade font-semibold mt-1">{formatCurrency(item.priceAfterCents)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateMutation.mutate({ id: item.id, patch: { qty: Math.max(1, item.qty - 1) } })}
                className="h-7 w-7 rounded border border-border flex items-center justify-center hover:bg-paper-dim"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="font-mono text-sm w-6 text-center">{item.qty}</span>
              <button
                onClick={() => updateMutation.mutate({ id: item.id, patch: { qty: Math.min(item.available, item.qty + 1) } })}
                disabled={item.qty >= item.available}
                className="h-7 w-7 rounded border border-border flex items-center justify-center hover:bg-paper-dim disabled:opacity-30"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <button onClick={() => removeMutation.mutate(item.id)} className="text-muted-foreground hover:text-chili">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-white rounded-lg border border-border p-4 flex items-center justify-between sticky bottom-4">
        <div>
          <p className="text-sm text-muted-foreground">{i18n.language === "zh-HK" ? "已選商品小計" : "Selected subtotal"}</p>
          <p className="font-mono text-xl font-bold text-jade">{formatCurrency(subtotal)}</p>
        </div>
        <Button size="lg" disabled={checkedItems.length === 0} onClick={() => navigate("/checkout")}>
          {i18n.language === "zh-HK" ? "去結算" : "Checkout"} ({checkedItems.length})
        </Button>
      </div>
    </div>
  );
}
