import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";

interface Address { id: string; recipient: string; detail: string; isDefault: boolean }

export default function AddressesPage() {
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [phone, setPhone] = useState("");
  const [detail, setDetail] = useState("");

  const { data: addresses, isLoading } = useQuery({ queryKey: ["addresses"], queryFn: () => api.get<Address[]>("/addresses") });

  const createMutation = useMutation({
    mutationFn: () => api.post("/addresses", { recipient, phoneEncrypted: phone, detail }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["addresses"] }); setShowForm(false); setRecipient(""); setPhone(""); setDetail(""); },
  });
  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/addresses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
  });

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">{i18n.language === "zh-HK" ? "收貨地址" : "Addresses"}</h1>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>+ {i18n.language === "zh-HK" ? "新增" : "Add"}</Button>
      </div>

      {showForm && (
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="bg-white rounded-lg border border-border p-4 space-y-3">
          <Input placeholder={i18n.language === "zh-HK" ? "收件人" : "Recipient"} value={recipient} onChange={(e) => setRecipient(e.target.value)} required />
          <Input placeholder={i18n.language === "zh-HK" ? "聯絡電話" : "Phone"} value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <Input placeholder={i18n.language === "zh-HK" ? "詳細地址" : "Address detail"} value={detail} onChange={(e) => setDetail(e.target.value)} required />
          <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? "…" : (i18n.language === "zh-HK" ? "儲存" : "Save")}</Button>
        </form>
      )}

      {isLoading && <p className="text-center text-muted-foreground py-8">{i18n.language === "zh-HK" ? "載入中…" : "Loading…"}</p>}
      {!isLoading && !addresses?.length && <p className="text-center text-muted-foreground py-8">{i18n.language === "zh-HK" ? "尚未有地址" : "No addresses yet"}</p>}

      <div className="space-y-2">
        {addresses?.map((a) => (
          <div key={a.id} className="flex items-start justify-between bg-white rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium">{a.recipient}</p>
              <p className="text-xs text-muted-foreground">{a.detail}</p>
            </div>
            <button onClick={() => removeMutation.mutate(a.id)} className="text-muted-foreground hover:text-chili">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
