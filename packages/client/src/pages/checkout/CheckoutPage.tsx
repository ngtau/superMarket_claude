import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency } from "@app/shared";

interface CartItem { id: string; checked: boolean }
interface Address { id: string; recipient: string; detail: string; isDefault: boolean }
interface Preview { subtotalCents: number; discountCents: number; shippingFeeCents: number; totalCents: number }

export default function CheckoutPage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: cartItems } = useQuery({ queryKey: ["cart"], queryFn: () => api.get<CartItem[]>("/cart") });
  const { data: addresses, refetch: refetchAddresses } = useQuery({ queryKey: ["addresses"], queryFn: () => api.get<Address[]>("/addresses") });

  const checkedIds = (cartItems ?? []).filter((i) => i.checked).map((i) => i.id);

  useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddressId) {
      setSelectedAddressId(addresses.find((a) => a.isDefault)?.id ?? addresses[0].id);
    }
  }, [addresses, selectedAddressId]);

  const { data: preview } = useQuery({
    queryKey: ["checkout-preview", checkedIds],
    queryFn: () => api.post<Preview>("/checkout/preview", { cartItemIds: checkedIds }),
    enabled: checkedIds.length > 0,
  });

  const placeOrderMutation = useMutation({
    mutationFn: () => api.post<{ order: { id: string } }>("/orders", { cartItemIds: checkedIds, addressId: selectedAddressId, paymentMethod: "bank_transfer" }),
    onSuccess: (data) => navigate(`/orders/${data.order.id}/payment`),
    onError: (err) => setError(err instanceof ApiError ? err.message : "下單失敗"),
  });

  if (checkedIds.length === 0) {
    return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-muted-foreground">{i18n.language === "zh-HK" ? "請先在購物車勾選商品" : "Please select items in your cart first"}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="font-display text-2xl font-bold">{i18n.language === "zh-HK" ? "結算" : "Checkout"}</h1>

      <section className="bg-white rounded-lg border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold">{i18n.language === "zh-HK" ? "收貨地址" : "Shipping Address"}</h2>
          <Button size="sm" variant="outline" onClick={() => setAddressDialogOpen(true)}>+ {i18n.language === "zh-HK" ? "新增地址" : "Add"}</Button>
        </div>
        {!addresses?.length && <p className="text-sm text-muted-foreground">{i18n.language === "zh-HK" ? "尚未有地址，請新增一個" : "No address yet, please add one"}</p>}
        <div className="space-y-2">
          {addresses?.map((a) => (
            <label key={a.id} className={`flex items-start gap-3 p-3 rounded border-2 cursor-pointer ${selectedAddressId === a.id ? "border-jade bg-jade/5" : "border-border"}`}>
              <input type="radio" checked={selectedAddressId === a.id} onChange={() => setSelectedAddressId(a.id)} className="mt-1 accent-jade" />
              <div>
                <p className="text-sm font-medium">{a.recipient}</p>
                <p className="text-xs text-muted-foreground">{a.detail}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-lg border border-border p-4">
        <h2 className="font-display font-bold mb-3">{i18n.language === "zh-HK" ? "付款方式" : "Payment Method"}</h2>
        <div className="flex items-center gap-3 p-3 rounded border-2 border-jade bg-jade/5">
          <div className="h-4 w-4 rounded-full bg-jade" />
          <span className="text-sm font-medium">{i18n.language === "zh-HK" ? "銀行轉賬" : "Bank Transfer"}</span>
          <span className="text-xs text-muted-foreground ml-auto">{i18n.language === "zh-HK" ? "唯一可用渠道，其餘渠道商戶號未就緒" : "Only channel available currently"}</span>
        </div>
      </section>

      {preview && (
        <section className="bg-white rounded-lg border border-border p-4 space-y-2 font-mono text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">{i18n.language === "zh-HK" ? "商品小計" : "Subtotal"}</span><span>{formatCurrency(preview.subtotalCents)}</span></div>
          {preview.discountCents > 0 && <div className="flex justify-between text-chili"><span>{i18n.language === "zh-HK" ? "滿減優惠" : "Discount"}</span><span>-{formatCurrency(preview.discountCents)}</span></div>}
          <div className="flex justify-between"><span className="text-muted-foreground">{i18n.language === "zh-HK" ? "運費" : "Shipping"}</span><span>{formatCurrency(preview.shippingFeeCents)}</span></div>
          <div className="flex justify-between font-bold text-jade text-base pt-2 border-t border-border"><span>{i18n.language === "zh-HK" ? "總計" : "Total"}</span><span>{formatCurrency(preview.totalCents)}</span></div>
        </section>
      )}

      {error && <p className="text-sm text-chili bg-chili/10 rounded px-3 py-2">{error}</p>}

      <Button size="lg" className="w-full" disabled={!selectedAddressId || placeOrderMutation.isPending} onClick={() => { setError(null); placeOrderMutation.mutate(); }}>
        {placeOrderMutation.isPending ? "…" : (i18n.language === "zh-HK" ? "提交訂單" : "Place Order")}
      </Button>

      <AddressFormDialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen} onCreated={() => { refetchAddresses(); setAddressDialogOpen(false); }} />
    </div>
  );
}

function AddressFormDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const { i18n } = useTranslation();
  const [recipient, setRecipient] = useState("");
  const [phone, setPhone] = useState("");
  const [detail, setDetail] = useState("");
  const mutation = useMutation({
    mutationFn: () => api.post("/addresses", { recipient, phoneEncrypted: phone, detail }),
    onSuccess: () => { onCreated(); setRecipient(""); setPhone(""); setDetail(""); },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{i18n.language === "zh-HK" ? "新增收貨地址" : "Add Address"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-3">
          <Input placeholder={i18n.language === "zh-HK" ? "收件人" : "Recipient"} value={recipient} onChange={(e) => setRecipient(e.target.value)} required />
          <Input placeholder={i18n.language === "zh-HK" ? "聯絡電話" : "Phone"} value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <Input placeholder={i18n.language === "zh-HK" ? "詳細地址" : "Address detail"} value={detail} onChange={(e) => setDetail(e.target.value)} required />
          <Button type="submit" className="w-full" disabled={mutation.isPending}>{mutation.isPending ? "…" : (i18n.language === "zh-HK" ? "儲存" : "Save")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
