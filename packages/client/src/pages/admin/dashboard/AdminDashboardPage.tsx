import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api-client";
import { formatCurrency } from "@app/shared";

interface OrderStats { orderCount: number; totalSalesCents: number }
interface ProductSale { productId: string; nameZh: string; totalQty: number; totalSalesCents: number }
interface PaymentShare { method: string; count: number; totalCents: number }

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-border p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-mono text-2xl font-bold text-jade mt-1">{value}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data: orderStats } = useQuery({ queryKey: ["admin-stats-orders"], queryFn: () => adminApi.get<OrderStats>("/admin/stats/orders") });
  const { data: productSales } = useQuery({ queryKey: ["admin-stats-product-sales"], queryFn: () => adminApi.get<ProductSale[]>("/admin/stats/product-sales") });
  const { data: paymentShare } = useQuery({ queryKey: ["admin-stats-payment-share"], queryFn: () => adminApi.get<PaymentShare[]>("/admin/stats/payment-share") });

  return (
    <div className="p-8 space-y-8">
      <h1 className="font-display text-2xl font-bold">數據看板</h1>
      <p className="text-sm text-muted-foreground -mt-6">近30天（可在URL加from/to參數自訂範圍，UI選擇器待後續加入）</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="訂單數" value={String(orderStats?.orderCount ?? 0)} />
        <StatCard label="銷售額" value={formatCurrency(Number(orderStats?.totalSalesCents ?? 0))} />
        <StatCard label="商品銷量排行數" value={String(productSales?.length ?? 0)} />
        <StatCard label="支付渠道數" value={String(paymentShare?.length ?? 0)} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-border p-5">
          <h2 className="font-display font-bold mb-3">商品銷量排行</h2>
          {!productSales?.length && <p className="text-sm text-muted-foreground">暫無銷售數據</p>}
          <table className="w-full text-sm">
            <tbody>
              {productSales?.map((p) => (
                <tr key={p.productId} className="border-t border-border">
                  <td className="py-2">{p.nameZh}</td>
                  <td className="py-2 text-right font-mono">{p.totalQty} 件</td>
                  <td className="py-2 text-right font-mono text-jade">{formatCurrency(Number(p.totalSalesCents))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-lg border border-border p-5">
          <h2 className="font-display font-bold mb-3">支付方式佔比</h2>
          {!paymentShare?.length && <p className="text-sm text-muted-foreground">暫無支付數據</p>}
          <table className="w-full text-sm">
            <tbody>
              {paymentShare?.map((p) => (
                <tr key={p.method} className="border-t border-border">
                  <td className="py-2 font-mono">{p.method}</td>
                  <td className="py-2 text-right font-mono">{p.count} 筆</td>
                  <td className="py-2 text-right font-mono text-jade">{formatCurrency(Number(p.totalCents))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
