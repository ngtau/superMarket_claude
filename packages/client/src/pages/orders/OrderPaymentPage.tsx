import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/FileUpload";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@app/shared";

interface OrderDetail { id: string; orderNo: string; status: string; totalCents: number }
interface BankInfo { bankName: string; accountNo: string; accountName: string }
interface PaymentStatus { status: string; method: string; amountCents: number; bankInfo?: BankInfo }

export default function OrderPaymentPage() {
  const { id } = useParams<{ id: string }>();
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [voucherUrl, setVoucherUrl] = useState("");

  const { data: order } = useQuery({ queryKey: ["order", id], queryFn: () => api.get<OrderDetail>(`/orders/${id}`) });
  const { data: payment } = useQuery({ queryKey: ["payment", id], queryFn: () => api.get<PaymentStatus>(`/payments/${id}`), refetchInterval: 5000 });

  const uploadMutation = useMutation({
    mutationFn: () => api.post(`/payments/${id}/voucher`, { voucherUrl }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payment", id] }),
  });

  if (!order || !payment) return <div className="max-w-lg mx-auto px-4 py-16 text-center text-muted-foreground">{i18n.language === "zh-HK" ? "載入中…" : "Loading…"}</div>;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">{i18n.language === "zh-HK" ? "訂單已建立" : "Order placed"}</p>
        <p className="font-mono text-sm text-muted-foreground">{order.orderNo}</p>
        <p className="font-mono text-3xl font-bold text-jade mt-2">{formatCurrency(order.totalCents)}</p>
      </div>

      {payment.status === "paid" ? (
        <div className="bg-jade/10 rounded-lg p-6 text-center">
          <p className="font-display text-lg font-bold text-jade">{i18n.language === "zh-HK" ? "付款已確認 ✓" : "Payment confirmed ✓"}</p>
          <Link to="/orders"><Button className="mt-4">{i18n.language === "zh-HK" ? "查看我的訂單" : "View my orders"}</Button></Link>
        </div>
      ) : payment.status === "pending_review" ? (
        <div className="bg-brass/10 rounded-lg p-6 text-center">
          <p className="font-medium text-brass">{i18n.language === "zh-HK" ? "憑證已上傳，等待審核中…" : "Voucher uploaded, awaiting review…"}</p>
          <p className="text-xs text-muted-foreground mt-2">{i18n.language === "zh-HK" ? "此頁面每5秒自動刷新狀態" : "This page auto-refreshes every 5s"}</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-border p-5 space-y-2">
            <h2 className="font-display font-bold mb-2">{i18n.language === "zh-HK" ? "銀行轉賬資料" : "Bank Transfer Details"}</h2>
            <p className="text-sm text-muted-foreground">{i18n.language === "zh-HK" ? "請轉賬後上傳付款憑證截圖" : "Please transfer and upload a screenshot of your receipt"}</p>
            <div className="font-mono text-sm bg-paper-dim rounded p-3 space-y-1 mt-2">
              <p>{i18n.language === "zh-HK" ? "銀行" : "Bank"}: {payment.bankInfo?.bankName ?? "—"}</p>
              <p>{i18n.language === "zh-HK" ? "戶口" : "Account"}: {payment.bankInfo?.accountNo ?? "—"}</p>
              <p>{i18n.language === "zh-HK" ? "收款人" : "Account Name"}: {payment.bankInfo?.accountName ?? "—"}</p>
              <p>{i18n.language === "zh-HK" ? "金額" : "Amount"}: {formatCurrency(payment.amountCents)}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-border p-5 space-y-3">
            <FileUpload value={voucherUrl} onChange={setVoucherUrl} endpoint="/upload/voucher" mode="customer" />
            <Button className="w-full" disabled={!voucherUrl || uploadMutation.isPending} onClick={() => uploadMutation.mutate()}>
              {uploadMutation.isPending ? "…" : (i18n.language === "zh-HK" ? "提交付款憑證" : "Submit voucher")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
