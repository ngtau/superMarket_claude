import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@app/shared";

interface OrderItemLine { id: string; qty: number; priceAfterCents: number; productSnapshot: { nameZh: string; nameEn: string } }
interface OrderDetail {
  id: string; orderNo: string; status: string; totalCents: number; subtotalCents: number;
  discountCents: number; shippingFeeCents: number; trackingNo: string | null; items: OrderItemLine[];
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { data: order, isLoading } = useQuery({ queryKey: ["order-detail", id], queryFn: () => api.get<OrderDetail>(`/orders/${id}`) });

  const confirmMutation = useMutation({
    mutationFn: () => api.post(`/orders/${id}/confirm-receipt`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["order-detail", id] }),
  });

  if (isLoading || !order) return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-muted-foreground">{i18n.language === "zh-HK" ? "載入中…" : "Loading…"}</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{i18n.language === "zh-HK" ? "訂單詳情" : "Order Detail"}</h1>
        <p className="font-mono text-sm text-muted-foreground">{order.orderNo}</p>
      </div>

      {order.trackingNo && (
        <div className="bg-jade/10 rounded-lg p-4">
          <p className="text-sm font-medium">{i18n.language === "zh-HK" ? "運單號" : "Tracking No."}: <span className="font-mono">{order.trackingNo}</span></p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-border divide-y divide-border">
        {order.items.map((item) => (
          <div key={item.id} className="p-4 flex justify-between">
            <span className="text-sm">{i18n.language === "zh-HK" ? item.productSnapshot.nameZh : item.productSnapshot.nameEn} × {item.qty}</span>
            <span className="font-mono text-sm">{formatCurrency(item.priceAfterCents * item.qty)}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-border p-4 space-y-2 font-mono text-sm">
        <div className="flex justify-between text-muted-foreground"><span>{i18n.language === "zh-HK" ? "小計" : "Subtotal"}</span><span>{formatCurrency(order.subtotalCents)}</span></div>
        {order.discountCents > 0 && <div className="flex justify-between text-chili"><span>{i18n.language === "zh-HK" ? "優惠" : "Discount"}</span><span>-{formatCurrency(order.discountCents)}</span></div>}
        <div className="flex justify-between text-muted-foreground"><span>{i18n.language === "zh-HK" ? "運費" : "Shipping"}</span><span>{formatCurrency(order.shippingFeeCents)}</span></div>
        <div className="flex justify-between font-bold text-jade text-base pt-2 border-t border-border"><span>{i18n.language === "zh-HK" ? "總計" : "Total"}</span><span>{formatCurrency(order.totalCents)}</span></div>
      </div>

      {order.status === "shipped" && (
        <Button className="w-full" onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}>
          {confirmMutation.isPending ? "…" : (i18n.language === "zh-HK" ? "確認收貨" : "Confirm Receipt")}
        </Button>
      )}
    </div>
  );
}
