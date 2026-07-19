import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/admin-api-client";

interface PaymentMethod { id: string; enabled: boolean; config: Record<string, unknown>; hasMerchantInfo: boolean }

const CHANNEL_META: Record<string, { label: string; fields: { key: string; label: string; type?: string }[]; note?: string }> = {
  bank_transfer: {
    label: "銀行轉賬",
    fields: [
      { key: "bankName", label: "銀行名稱" },
      { key: "accountNo", label: "收款帳號" },
      { key: "accountName", label: "收款人姓名" },
    ],
    note: "v1唯一完整實現的支付鏈路：用戶轉賬後上傳憑證，後台人工審核通過即完成支付。",
  },
  fps: {
    label: "轉數快 FPS",
    fields: [
      { key: "merchantId", label: "商戶號 Merchant ID" },
      { key: "apiKey", label: "API Key" },
    ],
    note: "商戶號未就緒前，此渠道即使開啟，前端結算頁也不會展示（門控保護）。",
  },
  payme: {
    label: "PayMe",
    fields: [
      { key: "merchantId", label: "商戶號 Merchant ID" },
      { key: "apiKey", label: "API Key" },
    ],
    note: "商戶號未就緒前，此渠道即使開啟，前端結算頁也不會展示（門控保護）。",
  },
  alipayhk: {
    label: "AlipayHK",
    fields: [
      { key: "merchantId", label: "商戶號 Merchant ID" },
      { key: "apiKey", label: "API Key" },
    ],
    note: "商戶號未就緒前，此渠道即使開啟，前端結算頁也不會展示（門控保護）。",
  },
};
const CHANNEL_ORDER = ["bank_transfer", "fps", "payme", "alipayhk"];

export default function AdminPaymentMethodsPage() {
  const queryClient = useQueryClient();
  const { data: methods, isLoading } = useQuery({ queryKey: ["admin-payment-methods"], queryFn: () => adminApi.get<PaymentMethod[]>("/admin/payment-methods") });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => adminApi.patch(`/admin/payment-methods/${id}`, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-payment-methods"] }),
  });

  const findMethod = (id: string) => methods?.find((m) => m.id === id);

  return (
    <div className="p-8 space-y-6">
      <h1 className="font-display text-2xl font-bold">支付方式管理</h1>
      {isLoading && <p className="text-muted-foreground">載入中…</p>}

      <div className="space-y-4">
        {CHANNEL_ORDER.map((id) => {
          const meta = CHANNEL_META[id];
          const method = findMethod(id);
          return (
            <div key={id} className="bg-white rounded-lg border border-border p-5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <h2 className="font-display font-bold text-lg">{meta.label}</h2>
                  {method?.hasMerchantInfo && <span className="text-xs px-2 py-0.5 rounded bg-jade/10 text-jade font-medium">已配置</span>}
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-sm text-muted-foreground">{method?.enabled ? "已啟用" : "已停用"}</span>
                  <button
                    type="button"
                    onClick={() => toggleMutation.mutate({ id, enabled: !method?.enabled })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${method?.enabled ? "bg-jade" : "bg-muted"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${method?.enabled ? "translate-x-5" : ""}`} />
                  </button>
                </label>
              </div>
              {meta.note && <p className="text-xs text-muted-foreground mb-3">{meta.note}</p>}
              <MerchantInfoForm channelId={id} fields={meta.fields} onSaved={() => queryClient.invalidateQueries({ queryKey: ["admin-payment-methods"] })} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MerchantInfoForm({ channelId, fields, onSaved }: { channelId: string; fields: { key: string; label: string }[]; onSaved: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState(false);
  const { data: current } = useQuery({
    queryKey: ["admin-payment-merchant-info", channelId],
    queryFn: () => adminApi.get<Record<string, string> | null>(`/admin/payment-methods/${channelId}/merchant-info`),
    enabled: expanded,
  });

  useEffect(() => {
    if (current) setValues(current);
  }, [current]);

  const saveMutation = useMutation({
    mutationFn: () => adminApi.patch(`/admin/payment-methods/${channelId}`, { merchantInfo: values }),
    onSuccess: onSaved,
  });

  if (!expanded) {
    return (
      <button onClick={() => setExpanded(true)} className="text-xs text-jade hover:underline">
        {"展開設置具體收款信息 ▾"}
      </button>
    );
  }

  return (
    <div className="space-y-3 mt-2 pt-3 border-t border-border">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="text-xs text-muted-foreground block mb-1">{f.label}</label>
          <Input
            value={values[f.key] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            placeholder={/key|secret|token/i.test(f.key) ? "填入後保存，不完整回顯" : ""}
          />
        </div>
      ))}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "保存中…" : "保存"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setExpanded(false)}>收起</Button>
      </div>
    </div>
  );
}
