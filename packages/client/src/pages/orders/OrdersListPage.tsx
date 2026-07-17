import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@app/shared";

interface OrderItem { id: string; orderNo: string; status: string; totalCents: number; createdAt: string }

const STATUS_LABEL: Record<string, { zh: string; en: string }> = {
  pending_payment: { zh: "待付款", en: "Pending Payment" },
  paid: { zh: "已付款", en: "Paid" },
  shipped: { zh: "已發貨", en: "Shipped" },
  completed: { zh: "已完成", en: "Completed" },
  cancelled: { zh: "已取消", en: "Cancelled" },
};

export default function OrdersListPage() {
  const { i18n } = useTranslation();
  const locale = i18n.language === "zh-HK" ? "zh" : "en";
  const { data: orders, isLoading } = useQuery({ queryKey: ["my-orders"], queryFn: () => api.get<OrderItem[]>("/orders") });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="font-display text-2xl font-bold mb-6">{i18n.language === "zh-HK" ? "我的訂單" : "My Orders"}</h1>

      {isLoading && <p className="text-center text-muted-foreground py-8">{i18n.language === "zh-HK" ? "載入中…" : "Loading…"}</p>}
      {!isLoading && !orders?.length && <p className="text-center text-muted-foreground py-8">{i18n.language === "zh-HK" ? "暫無訂單" : "No orders yet"}</p>}

      <div className="space-y-3">
        {orders?.map((o) => (
          <Link key={o.id} to={o.status === "pending_payment" ? `/orders/${o.id}/payment` : `/orders/${o.id}`}
            className="block bg-white rounded-lg border border-border p-4 hover:border-jade/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">{o.orderNo}</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-jade/10 text-jade">{STATUS_LABEL[o.status]?.[locale] ?? o.status}</span>
            </div>
            <p className="font-mono text-lg font-bold text-jade mt-1">{formatCurrency(o.totalCents)}</p>
            <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
