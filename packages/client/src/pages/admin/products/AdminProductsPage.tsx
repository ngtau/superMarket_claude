import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api-client";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrency } from "@app/shared";
import { ProductFormDialog } from "./ProductFormDialog";

interface AdminProduct {
  id: string; nameZh: string; nameEn: string;
  priceOriginalCents: number; priceAfterCents: number; status: string;
}

const STATUS_LABEL: Record<string, string> = { draft: "草稿", on_shelf: "已上架", off_shelf: "已下架" };

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const { data: products, isLoading } = useQuery({ queryKey: ["admin-products"], queryFn: () => adminApi.get<AdminProduct[]>("/admin/products") });

  const toggleShelf = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "on_shelf" | "off_shelf" }) =>
      adminApi.post(`/admin/products/${id}/shelf`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">商品管理</h1>
        <Button onClick={() => setFormOpen(true)}>+ 新增商品</Button>
      </div>

      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>商品名稱</TableHead>
              <TableHead>原價</TableHead>
              <TableHead>售價</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">載入中…</TableCell></TableRow>}
            {!isLoading && products?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">暫無商品，點擊右上角新增</TableCell></TableRow>}
            {products?.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nameZh}</TableCell>
                <TableCell className="font-mono">{formatCurrency(p.priceOriginalCents)}</TableCell>
                <TableCell className="font-mono text-jade">{formatCurrency(p.priceAfterCents)}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${p.status === "on_shelf" ? "bg-jade/10 text-jade" : "bg-muted text-muted-foreground"}`}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {p.status === "on_shelf" ? (
                    <Button size="sm" variant="outline" onClick={() => toggleShelf.mutate({ id: p.id, status: "off_shelf" })}>下架</Button>
                  ) : (
                    <Button size="sm" onClick={() => toggleShelf.mutate({ id: p.id, status: "on_shelf" })}>上架</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} onCreated={() => queryClient.invalidateQueries({ queryKey: ["admin-products"] })} />
    </div>
  );
}
