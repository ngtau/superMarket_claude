import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FileUpload } from "@/components/FileUpload";
import { adminApi } from "@/lib/admin-api-client";

interface AdminCategory { id: string; nameZh: string; nameEn: string }

export function ProductFormDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const { data: categories } = useQuery({ queryKey: ["admin-categories"], queryFn: () => adminApi.get<AdminCategory[]>("/admin/categories") });
  const [nameZh, setNameZh] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priceOriginal, setPriceOriginal] = useState("");
  const [priceAfter, setPriceAfter] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.post("/admin/products", {
        nameZh, nameEn, categoryId,
        priceOriginalCents: Math.round(Number(priceOriginal) * 100),
        priceAfterCents: Math.round(Number(priceAfter) * 100),
        images: imageUrl ? [imageUrl] : [],
        specs: [{ specNameZh: "標準", specNameEn: "Standard", initialStock: Number(stock) }],
      }),
    onSuccess: () => {
      onCreated();
      onOpenChange(false);
      setNameZh(""); setNameEn(""); setCategoryId(""); setPriceOriginal(""); setPriceAfter(""); setStock(""); setImageUrl("");
    },
    onError: (err: any) => setError(err.message ?? "建立失敗"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>新增商品</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); setError(null); createMutation.mutate(); }} className="space-y-4">
          {error && <p className="text-sm text-chili bg-chili/10 rounded px-3 py-2">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">商品名稱（中文）</label>
              <Input value={nameZh} onChange={(e) => setNameZh(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Product Name (EN)</label>
              <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">分類</label>
            <Select value={categoryId} onValueChange={setCategoryId} required>
              <SelectTrigger><SelectValue placeholder="選擇分類" /></SelectTrigger>
              <SelectContent>
                {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nameZh}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">原價 (HK$)</label>
              <Input type="number" step="0.01" value={priceOriginal} onChange={(e) => setPriceOriginal(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">售價 (HK$)</label>
              <Input type="number" step="0.01" value={priceAfter} onChange={(e) => setPriceAfter(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">初始庫存</label>
              <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">商品圖片</label>
            <FileUpload value={imageUrl} onChange={setImageUrl} endpoint="/admin/upload" mode="admin" />
          </div>
          <Button type="submit" className="w-full" disabled={createMutation.isPending || !categoryId}>
            {createMutation.isPending ? "建立中…" : "建立商品"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
