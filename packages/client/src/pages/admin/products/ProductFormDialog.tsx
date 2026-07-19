import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FileUpload } from "@/components/FileUpload";
import { RichTextEditor } from "@/components/RichTextEditor";
import { adminApi } from "@/lib/admin-api-client";

interface AdminCategory { id: string; nameZh: string; nameEn: string }

export interface EditingProduct {
  id: string; nameZh: string; nameEn: string; categoryId: string;
  priceOriginalCents: number; priceAfterCents: number; images: string[];
  descriptionZh?: string | null; descriptionEn?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  /** 传入即为编辑模式，不传为新增模式 */
  editingProduct?: EditingProduct | null;
}

const emptyForm = { nameZh: "", nameEn: "", categoryId: "", priceOriginal: "", priceAfter: "", stock: "", imageUrl: "", descriptionZh: "", descriptionEn: "" };

export function ProductFormDialog({ open, onOpenChange, onSaved, editingProduct }: Props) {
  const isEdit = !!editingProduct;
  const { data: categories } = useQuery({ queryKey: ["admin-categories"], queryFn: () => adminApi.get<AdminCategory[]>("/admin/categories") });
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  // 打开弹窗/切换编辑对象时，回填或清空表单
  useEffect(() => {
    if (!open) return;
    if (editingProduct) {
      setForm({
        nameZh: editingProduct.nameZh, nameEn: editingProduct.nameEn, categoryId: editingProduct.categoryId,
        priceOriginal: String(editingProduct.priceOriginalCents / 100), priceAfter: String(editingProduct.priceAfterCents / 100),
        stock: "", imageUrl: editingProduct.images[0] ?? "",
        descriptionZh: editingProduct.descriptionZh ?? "", descriptionEn: editingProduct.descriptionEn ?? "",
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [open, editingProduct]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        nameZh: form.nameZh, nameEn: form.nameEn, categoryId: form.categoryId,
        priceOriginalCents: Math.round(Number(form.priceOriginal) * 100),
        priceAfterCents: Math.round(Number(form.priceAfter) * 100),
        images: form.imageUrl ? [form.imageUrl] : [],
        descriptionZh: form.descriptionZh, descriptionEn: form.descriptionEn,
      };
      if (isEdit) return adminApi.patch(`/admin/products/${editingProduct!.id}`, payload);
      return adminApi.post("/admin/products", {
        ...payload,
        specs: [{ specNameZh: "標準", specNameEn: "Standard", initialStock: Number(form.stock) }],
      });
    },
    onSuccess: () => { onSaved(); onOpenChange(false); },
    onError: (err: any) => setError(err.message ?? "保存失敗"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "編輯商品" : "新增商品"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); setError(null); saveMutation.mutate(); }} className="space-y-4">
          {error && <p className="text-sm text-chili bg-chili/10 rounded px-3 py-2">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">商品名稱（中文）</label>
              <Input value={form.nameZh} onChange={(e) => set("nameZh", e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Product Name (EN)</label>
              <Input value={form.nameEn} onChange={(e) => set("nameEn", e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">分類</label>
            <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)} required>
              <SelectTrigger><SelectValue placeholder="選擇分類" /></SelectTrigger>
              <SelectContent>
                {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nameZh}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={`grid ${isEdit ? "grid-cols-2" : "grid-cols-3"} gap-3`}>
            <div>
              <label className="text-sm font-medium block mb-1">原價 (HK$)</label>
              <Input type="number" step="0.01" value={form.priceOriginal} onChange={(e) => set("priceOriginal", e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">售價 (HK$)</label>
              <Input type="number" step="0.01" value={form.priceAfter} onChange={(e) => set("priceAfter", e.target.value)} required />
            </div>
            {!isEdit && (
              <div>
                <label className="text-sm font-medium block mb-1">初始庫存</label>
                <Input type="number" value={form.stock} onChange={(e) => set("stock", e.target.value)} required />
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">商品圖片</label>
            <FileUpload value={form.imageUrl} onChange={(v) => set("imageUrl", v)} endpoint="/admin/upload" mode="admin" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">商品詳情（中文）</label>
            <RichTextEditor value={form.descriptionZh} onChange={(v) => set("descriptionZh", v)} placeholder="輸入商品詳情，支持圖片與HTML源代碼編輯" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Product Details (EN)</label>
            <RichTextEditor value={form.descriptionEn} onChange={(v) => set("descriptionEn", v)} />
          </div>
          <Button type="submit" className="w-full" disabled={saveMutation.isPending || !form.categoryId}>
            {saveMutation.isPending ? "保存中…" : isEdit ? "保存修改" : "建立商品"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
