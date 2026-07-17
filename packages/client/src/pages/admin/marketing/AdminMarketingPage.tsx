import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { adminApi } from "@/lib/admin-api-client";
import { formatCurrency } from "@app/shared";

interface Discount { id: string; productId: string; type: string; percentValue: string | null; specialPriceCents: number | null; startAt: string; endAt: string }
interface FullReduction { id: string; nameZh: string; thresholdCents: number; reductionCents: number; stackable: boolean; scope: string; startAt: string; endAt: string }
interface AdminProduct { id: string; nameZh: string }

export default function AdminMarketingPage() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="font-display text-2xl font-bold">營銷管理</h1>
      <Tabs defaultValue="discounts">
        <TabsList>
          <TabsTrigger value="discounts">單品折扣</TabsTrigger>
          <TabsTrigger value="reductions">滿減規則</TabsTrigger>
        </TabsList>
        <TabsContent value="discounts"><DiscountsTab /></TabsContent>
        <TabsContent value="reductions"><ReductionsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function DiscountsTab() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: discounts, isLoading } = useQuery({ queryKey: ["admin-discounts"], queryFn: () => adminApi.get<Discount[]>("/admin/discounts") });
  const { data: products } = useQuery({ queryKey: ["admin-products"], queryFn: () => adminApi.get<AdminProduct[]>("/admin/products") });
  const removeMutation = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/admin/discounts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-discounts"] }),
  });
  const productName = (id: string) => products?.find((p) => p.id === id)?.nameZh ?? id;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end"><Button onClick={() => setOpen(true)}>+ 新增折扣</Button></div>
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>商品</TableHead><TableHead>類型</TableHead><TableHead>折扣值</TableHead><TableHead>時間範圍</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">載入中…</TableCell></TableRow>}
            {!isLoading && !discounts?.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">暫無折扣配置</TableCell></TableRow>}
            {discounts?.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{productName(d.productId)}</TableCell>
                <TableCell>{d.type === "percent" ? "折扣率" : "特價"}</TableCell>
                <TableCell className="font-mono">{d.type === "percent" ? `${Number(d.percentValue) * 100}%` : formatCurrency(d.specialPriceCents ?? 0)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(d.startAt).toLocaleDateString()} ~ {new Date(d.endAt).toLocaleDateString()}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => removeMutation.mutate(d.id)}>刪除</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <DiscountFormDialog open={open} onOpenChange={setOpen} products={products ?? []} onCreated={() => queryClient.invalidateQueries({ queryKey: ["admin-discounts"] })} />
    </div>
  );
}

function DiscountFormDialog({ open, onOpenChange, products, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; products: AdminProduct[]; onCreated: () => void }) {
  const [productId, setProductId] = useState("");
  const [type, setType] = useState<"percent" | "special">("percent");
  const [percentValue, setPercentValue] = useState("");
  const [specialPrice, setSpecialPrice] = useState("");
  const [days, setDays] = useState("7");

  const mutation = useMutation({
    mutationFn: () => {
      const startAt = new Date().toISOString();
      const endAt = new Date(Date.now() + Number(days) * 86400000).toISOString();
      return adminApi.post("/admin/discounts", {
        productId, type,
        ...(type === "percent" ? { percentValue: Number(percentValue) / 100 } : { specialPriceCents: Math.round(Number(specialPrice) * 100) }),
        startAt, endAt,
      });
    },
    onSuccess: () => { onCreated(); onOpenChange(false); },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>新增單品折扣</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-3">
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger><SelectValue placeholder="選擇商品" /></SelectTrigger>
            <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.nameZh}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={type} onValueChange={(v) => setType(v as "percent" | "special")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">折扣率（如85折填85）</SelectItem>
              <SelectItem value="special">特價（直接定價）</SelectItem>
            </SelectContent>
          </Select>
          {type === "percent" ? (
            <Input type="number" placeholder="折扣率 0-100" value={percentValue} onChange={(e) => setPercentValue(e.target.value)} required />
          ) : (
            <Input type="number" step="0.01" placeholder="特價 (HK$)" value={specialPrice} onChange={(e) => setSpecialPrice(e.target.value)} required />
          )}
          <Input type="number" placeholder="持續天數" value={days} onChange={(e) => setDays(e.target.value)} required />
          <Button type="submit" className="w-full" disabled={!productId || mutation.isPending}>{mutation.isPending ? "…" : "建立"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReductionsTab() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: reductions, isLoading } = useQuery({ queryKey: ["admin-reductions"], queryFn: () => adminApi.get<FullReduction[]>("/admin/full-reductions") });
  const removeMutation = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/admin/full-reductions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-reductions"] }),
  });

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end"><Button onClick={() => setOpen(true)}>+ 新增滿減規則</Button></div>
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>名稱</TableHead><TableHead>門檻/減額</TableHead><TableHead>範圍</TableHead><TableHead>可疊加</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">載入中…</TableCell></TableRow>}
            {!isLoading && !reductions?.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">暫無滿減規則</TableCell></TableRow>}
            {reductions?.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.nameZh}</TableCell>
                <TableCell className="font-mono text-xs">滿{formatCurrency(r.thresholdCents)}減{formatCurrency(r.reductionCents)}</TableCell>
                <TableCell>{r.scope === "all" ? "全店" : "指定分類"}</TableCell>
                <TableCell>{r.stackable ? "✓ 可疊加" : "互斥"}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => removeMutation.mutate(r.id)}>刪除</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ReductionFormDialog open={open} onOpenChange={setOpen} onCreated={() => queryClient.invalidateQueries({ queryKey: ["admin-reductions"] })} />
    </div>
  );
}

function ReductionFormDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [nameZh, setNameZh] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [threshold, setThreshold] = useState("");
  const [reduction, setReduction] = useState("");
  const [stackable, setStackable] = useState(false);
  const [days, setDays] = useState("30");

  const mutation = useMutation({
    mutationFn: () => {
      const startAt = new Date().toISOString();
      const endAt = new Date(Date.now() + Number(days) * 86400000).toISOString();
      return adminApi.post("/admin/full-reductions", {
        nameZh, nameEn, thresholdCents: Math.round(Number(threshold) * 100), reductionCents: Math.round(Number(reduction) * 100),
        stackable, scope: "all", startAt, endAt,
      });
    },
    onSuccess: () => { onCreated(); onOpenChange(false); },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>新增滿減規則（範圍：全店）</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-3">
          <Input placeholder="規則名稱（中文）" value={nameZh} onChange={(e) => setNameZh(e.target.value)} required />
          <Input placeholder="Rule Name (EN)" value={nameEn} onChange={(e) => setNameEn(e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" step="0.01" placeholder="滿額門檻 (HK$)" value={threshold} onChange={(e) => setThreshold(e.target.value)} required />
            <Input type="number" step="0.01" placeholder="減免金額 (HK$)" value={reduction} onChange={(e) => setReduction(e.target.value)} required />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={stackable} onChange={(e) => setStackable(e.target.checked)} className="accent-jade" />
            可與其他可疊加規則同時生效
          </label>
          <Input type="number" placeholder="持續天數" value={days} onChange={(e) => setDays(e.target.value)} required />
          <Button type="submit" className="w-full" disabled={mutation.isPending}>{mutation.isPending ? "…" : "建立"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
