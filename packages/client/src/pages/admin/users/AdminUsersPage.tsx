import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/admin-api-client";

interface CustomerUser { id: string; email: string; status: string; createdAt: string; lastLoginAt: string | null; memberLevelId: string | null }
/** §6.7 行36：用户详情（注册信息 + 登录记录 + 订单历史） */
interface UserDetail extends CustomerUser {
  locale: string;
  memberLevel: { id: string; nameZh: string; nameEn: string } | null;
  stats: { orderCount: number; totalSpentCents: number; addressCount: number };
  orders: { id: string; orderNo: string; status: string; paymentStatus: string; totalCents: number; createdAt: string }[];
}
interface AdminAccount { id: string; username: string; roleId: string; status: string }
interface Role { id: string; key: string; nameZh: string }
interface MemberLevel { id: string; nameZh: string; nameEn: string; sort: number }

export default function AdminUsersPage() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="font-display text-2xl font-bold">用戶管理</h1>
      <Tabs defaultValue="customers">
        <TabsList>
          <TabsTrigger value="customers">C端用戶</TabsTrigger>
          <TabsTrigger value="levels">會員等級</TabsTrigger>
          <TabsTrigger value="admins">後台管理員</TabsTrigger>
        </TabsList>
        <TabsContent value="customers"><CustomersTab /></TabsContent>
        <TabsContent value="levels"><MemberLevelsTab /></TabsContent>
        <TabsContent value="admins"><AdminsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function MemberLevelsTab() {
  const queryClient = useQueryClient();
  const [nameZh, setNameZh] = useState("");
  const [nameEn, setNameEn] = useState("");
  const { data: levels, isLoading } = useQuery({ queryKey: ["admin-member-levels"], queryFn: () => adminApi.get<MemberLevel[]>("/admin/member-levels") });

  const createMutation = useMutation({
    mutationFn: () => adminApi.post("/admin/member-levels", { nameZh, nameEn, sort: (levels?.length ?? 0) + 1 }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-member-levels"] }); setNameZh(""); setNameEn(""); },
  });

  return (
    <div className="space-y-4 mt-4">
      <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="bg-white rounded-lg border border-border p-4 flex gap-3">
        <Input placeholder="等級名稱（中文，如：黃金會員）" value={nameZh} onChange={(e) => setNameZh(e.target.value)} className="flex-1" required />
        <Input placeholder="Level Name (EN)" value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="flex-1" required />
        <Button type="submit" disabled={createMutation.isPending}>+ 新增等級</Button>
      </form>
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>排序</TableHead><TableHead>等級名稱</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">載入中…</TableCell></TableRow>}
            {!isLoading && !levels?.length && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">暫無會員等級，新增第一個吧</TableCell></TableRow>}
            {levels?.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-xs">{l.sort}</TableCell>
                <TableCell>{l.nameZh}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CustomersTab() {
  const queryClient = useQueryClient();
  const [detailId, setDetailId] = useState<string | null>(null);
  const { data: users, isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: () => adminApi.get<CustomerUser[]>("/admin/users") });
  const { data: levels } = useQuery({ queryKey: ["admin-member-levels"], queryFn: () => adminApi.get<MemberLevel[]>("/admin/member-levels") });
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin-user-detail", detailId],
    queryFn: () => adminApi.get<UserDetail>(`/admin/users/${detailId}`),
    enabled: !!detailId,
  });
  const toggleMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "disable" | "enable" }) => adminApi.post(`/admin/users/${id}/${action}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });
  const setLevelMutation = useMutation({
    mutationFn: ({ id, memberLevelId }: { id: string; memberLevelId: string }) => adminApi.patch(`/admin/users/${id}/member-level`, { memberLevelId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <div className="space-y-4 mt-4">
    {detail && (
      <div className="bg-white rounded-lg border border-border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold">{detail.email}</h3>
          <Button size="sm" variant="outline" onClick={() => setDetailId(null)}>關閉</Button>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <div><p className="text-xs text-muted-foreground">註冊時間</p><p>{new Date(detail.createdAt).toLocaleString()}</p></div>
          <div><p className="text-xs text-muted-foreground">最近登入</p><p>{detail.lastLoginAt ? new Date(detail.lastLoginAt).toLocaleString() : "從未登入"}</p></div>
          <div><p className="text-xs text-muted-foreground">會員等級</p><p>{detail.memberLevel?.nameZh ?? "未設定"}</p></div>
          <div><p className="text-xs text-muted-foreground">訂單數</p><p>{detail.stats.orderCount}</p></div>
          <div><p className="text-xs text-muted-foreground">已付款金額</p><p className="font-mono">HK${(detail.stats.totalSpentCents / 100).toFixed(2)}</p></div>
          <div><p className="text-xs text-muted-foreground">收貨地址數</p><p>{detail.stats.addressCount}</p></div>
        </div>
        {detail.orders.length > 0 && (
          <div className="border border-border rounded-md overflow-hidden">
            <p className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">訂單歷史</p>
            <Table>
              <TableHeader><TableRow><TableHead>訂單號</TableHead><TableHead>狀態</TableHead><TableHead>支付</TableHead><TableHead>金額</TableHead><TableHead>下單時間</TableHead></TableRow></TableHeader>
              <TableBody>
                {detail.orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.orderNo}</TableCell>
                    <TableCell className="text-xs">{o.status}</TableCell>
                    <TableCell className="text-xs">{o.paymentStatus}</TableCell>
                    <TableCell className="font-mono text-xs">HK${(o.totalCents / 100).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    )}
    {detailId && detailLoading && <p className="text-sm text-muted-foreground">載入中…</p>}
    <div className="bg-white rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader><TableRow><TableHead>郵箱</TableHead><TableHead>會員等級</TableHead><TableHead>狀態</TableHead><TableHead>註冊時間</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
        <TableBody>
          {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">載入中…</TableCell></TableRow>}
          {!isLoading && !users?.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">暫無用戶</TableCell></TableRow>}
          {users?.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                <button onClick={() => setDetailId(u.id)} className="hover:text-jade hover:underline text-left">
                  {u.email}
                </button>
              </TableCell>
              <TableCell>
                <select
                  value={u.memberLevelId ?? ""}
                  onChange={(e) => setLevelMutation.mutate({ id: u.id, memberLevelId: e.target.value })}
                  className="h-8 text-xs rounded border border-input px-2"
                >
                  <option value="">未設定</option>
                  {levels?.map((l) => <option key={l.id} value={l.id}>{l.nameZh}</option>)}
                </select>
              </TableCell>
              <TableCell>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${u.status === "active" ? "bg-jade/10 text-jade" : "bg-chili/10 text-chili"}`}>
                  {u.status === "active" ? "正常" : "已禁用"}
                </span>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
              <TableCell className="text-right">
                {u.status === "active" ? (
                  <Button size="sm" variant="outline" onClick={() => toggleMutation.mutate({ id: u.id, action: "disable" })}>禁用</Button>
                ) : (
                  <Button size="sm" onClick={() => toggleMutation.mutate({ id: u.id, action: "enable" })}>解封</Button>
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

function AdminsTab() {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const { data: admins, isLoading } = useQuery({ queryKey: ["admin-admins"], queryFn: () => adminApi.get<AdminAccount[]>("/admin/admins") });
  const { data: roles } = useQuery({ queryKey: ["admin-roles"], queryFn: () => adminApi.get<Role[]>("/admin/roles") });

  const createMutation = useMutation({
    mutationFn: () => adminApi.post("/admin/admins", { username, password, roleId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-admins"] }); setUsername(""); setPassword(""); setRoleId(""); },
  });

  const roleName = (id: string) => roles?.find((r) => r.id === id)?.nameZh ?? id;

  return (
    <div className="space-y-4 mt-4">
      <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="bg-white rounded-lg border border-border p-4 flex gap-3 items-end">
        <div className="flex-1"><label className="text-xs text-muted-foreground block mb-1">用戶名</label><Input value={username} onChange={(e) => setUsername(e.target.value)} required /></div>
        <div className="flex-1"><label className="text-xs text-muted-foreground block mb-1">密碼</label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground block mb-1">角色</label>
          <select value={roleId} onChange={(e) => setRoleId(e.target.value)} required className="h-10 w-full rounded-md border border-input px-3 text-sm">
            <option value="">選擇角色</option>
            {roles?.map((r) => <option key={r.id} value={r.id}>{r.nameZh}</option>)}
          </select>
        </div>
        <Button type="submit" disabled={createMutation.isPending}>+ 新增管理員</Button>
      </form>
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>用戶名</TableHead><TableHead>角色</TableHead><TableHead>狀態</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">載入中…</TableCell></TableRow>}
            {admins?.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono">{a.username}</TableCell>
                <TableCell>{roleName(a.roleId)}</TableCell>
                <TableCell><span className="text-xs px-2 py-0.5 rounded bg-jade/10 text-jade font-medium">{a.status === "active" ? "正常" : "已禁用"}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
