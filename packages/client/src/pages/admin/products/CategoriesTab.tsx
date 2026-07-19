import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adminApi } from "@/lib/admin-api-client";

interface AdminCategory { id: string; nameZh: string; nameEn: string; parentId: string | null; sort: number; disabled: boolean }

export function CategoriesTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const { data: categories, isLoading } = useQuery({ queryKey: ["admin-categories"], queryFn: () => adminApi.get<AdminCategory[]>("/admin/categories") });

  const removeMutation = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/admin/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-categories"] }),
    onError: (err: any) => alert(err.message ?? "刪除失敗"),
  });
  const toggleMutation = useMutation({
    mutationFn: ({ id, disabled }: { id: string; disabled: boolean }) => adminApi.patch(`/admin/categories/${id}`, { disabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-categories"] }),
  });

  const parentName = (id: string | null) => categories?.find((c) => c.id === id)?.nameZh ?? "—";

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>+ 新增分類</Button>
      </div>
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow><TableHead>分類名稱</TableHead><TableHead>上級分類</TableHead><TableHead>排序</TableHead><TableHead>狀態</TableHead><TableHead className="text-right">操作</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">載入中…</TableCell></TableRow>}
            {!isLoading && !categories?.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">暫無分類，點擊右上角新增</TableCell></TableRow>}
            {categories?.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nameZh}</TableCell>
                <TableCell className="text-muted-foreground">{parentName(c.parentId)}</TableCell>
                <TableCell className="font-mono text-xs">{c.sort}</TableCell>
                <TableCell>
                  <button onClick={() => toggleMutation.mutate({ id: c.id, disabled: !c.disabled })}
                    className={`text-xs px-2 py-0.5 rounded font-medium ${!c.disabled ? "bg-jade/10 text-jade" : "bg-muted text-muted-foreground"}`}>
                    {c.disabled ? "已停用" : "已啟用"}
                  </button>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(c); setFormOpen(true); }}>編輯</Button>
                  <Button size="sm" variant="outline" onClick={() => { if (confirm(`確定刪除分類「${c.nameZh}」？`)) removeMutation.mutate(c.id); }}>刪除</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        categories={categories ?? []}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["admin-categories"] })}
      />
    </div>
  );
}

function CategoryFormDialog({
  open, onOpenChange, editing, categories, onSaved,
}: { open: boolean; onOpenChange: (v: boolean) => void; editing: AdminCategory | null; categories: AdminCategory[]; onSaved: () => void }) {
  const [nameZh, setNameZh] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [parentId, setParentId] = useState("");
  const [sort, setSort] = useState("0");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNameZh(editing?.nameZh ?? "");
    setNameEn(editing?.nameEn ?? "");
    setParentId(editing?.parentId ?? "");
    setSort(String(editing?.sort ?? 0));
    setError(null);
  }, [open, editing]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { nameZh, nameEn, parentId: parentId || null, sort: Number(sort) };
      return editing ? adminApi.patch(`/admin/categories/${editing.id}`, payload) : adminApi.post("/admin/categories", payload);
    },
    onSuccess: () => { onSaved(); onOpenChange(false); },
    onError: (err: any) => setError(err.message ?? "保存失敗"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "編輯分類" : "新增分類"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }} className="space-y-3">
          {error && <p className="text-sm text-chili bg-chili/10 rounded px-3 py-2">{error}</p>}
          <Input placeholder="分類名稱（中文）" value={nameZh} onChange={(e) => setNameZh(e.target.value)} required />
          <Input placeholder="Category Name (EN)" value={nameEn} onChange={(e) => setNameEn(e.target.value)} required />
          <Select value={parentId} onValueChange={setParentId}>
            <SelectTrigger><SelectValue placeholder="上級分類（不選則為頂級分類）" /></SelectTrigger>
            <SelectContent>
              {categories.filter((c) => c.id !== editing?.id).map((c) => <SelectItem key={c.id} value={c.id}>{c.nameZh}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" placeholder="排序（數字越小越靠前）" value={sort} onChange={(e) => setSort(e.target.value)} />
          <Button type="submit" className="w-full" disabled={mutation.isPending}>{mutation.isPending ? "保存中…" : "保存"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
