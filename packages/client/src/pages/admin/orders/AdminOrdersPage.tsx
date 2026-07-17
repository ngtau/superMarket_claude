import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api-client";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@app/shared";

interface AdminOrder {
  id: string; orderNo: string; status: string; paymentStatus: string; totalCents: number; createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "待付款", paid: "已付款", shipped: "已發貨", completed: "已完成", cancelled: "已取消",
};
const STATUS_COLOR: Record<string, string> = {
  pending_payment: "bg-brass/10 text-brass", paid: "bg-jade/10 text-jade", shipped: "bg-jade/10 text-jade",
  completed: "bg-muted text-muted-foreground", cancelled: "bg-chili/10 text-chili",
};

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders", statusFilter],
    queryFn: () => adminApi.get<AdminOrder[]>(`/admin/orders${statusFilter ? `?status=${statusFilter}` : ""}`),
  });

  const shipMutation = useMutation({
    mutationFn: ({ id, trackingNo }: { id: string; trackingNo: string }) => adminApi.post(`/admin/orders/${id}/ship`, { trackingNo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
  });
  const closeMutation = useMutation({
    mutationFn: (id: string) => adminApi.post(`/admin/orders/${id}/close`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">訂單管理</h1>
        <div className="flex gap-2">
          {["", "pending_payment", "paid", "shipped", "completed", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${statusFilter === s ? "bg-jade text-paper" : "bg-white border border-border hover:border-jade/50"}`}
            >
              {s ? STATUS_LABEL[s] : "全部"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>訂單號</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>金額</TableHead>
              <TableHead>下單時間</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">載入中…</TableCell></TableRow>}
            {!isLoading && orders?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">暫無訂單</TableCell></TableRow>}
            {orders?.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">{o.orderNo}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLOR[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                </TableCell>
                <TableCell className="font-mono text-jade">{formatCurrency(o.totalCents)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(o.createdAt).toLocaleString("zh-HK")}</TableCell>
                <TableCell className="text-right">
                  {o.status === "paid" && (
                    <div className="flex items-center gap-2 justify-end">
                      <Input
                        placeholder="運單號"
                        className="h-8 w-28 text-xs"
                        value={trackingInputs[o.id] ?? ""}
                        onChange={(e) => setTrackingInputs((s) => ({ ...s, [o.id]: e.target.value }))}
                      />
                      <Button size="sm" disabled={!trackingInputs[o.id]} onClick={() => shipMutation.mutate({ id: o.id, trackingNo: trackingInputs[o.id] })}>
                        發貨
                      </Button>
                    </div>
                  )}
                  {(o.status === "pending_payment" || o.status === "paid") && (
                    <Button size="sm" variant="outline" className="ml-2" onClick={() => closeMutation.mutate(o.id)}>關單</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
