import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/admin-api-client";

const D20_LABELS: Record<string, string> = {
  order_auto_cancel_minutes: "訂單自動取消（分鐘）",
  cart_ttl_days: "購物車保留天數",
  receipt_confirm_timeout_days: "自動確認收貨（天）",
  payment_timeout_minutes: "支付超時（分鐘）",
  shipping_first_weight_cents: "運費首重（分）",
  shipping_extra_weight_cents: "運費續重/kg（分）",
  stock_warn_threshold_default: "庫存預警閾值（留空=不預警）",
  purchase_limit_per_order_default: "單品限購件數（留空=不限）",
  total_items_limit_per_order_default: "訂單總件數上限（留空=不限）",
};

interface AuditLog { id: string; action: string; targetType: string | null; targetId: string | null; createdAt: string }
interface Role { id: string; key: string; nameZh: string; isBuiltin: boolean }
interface Permission { key: string; groupZh: string; labelZh: string }
interface RoleGrant { permission: string; access: "full" | "readonly" | "none" }

function RolesTab() {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [showNewRole, setShowNewRole] = useState(false);

  const { data: roles, isLoading: rolesLoading } = useQuery({ queryKey: ["admin-roles-list"], queryFn: () => adminApi.get<Role[]>("/admin/roles") });
  const { data: catalog } = useQuery({ queryKey: ["admin-permissions-catalog"], queryFn: () => adminApi.get<Permission[]>("/admin/permissions/catalog") });
  const { data: grants } = useQuery({
    queryKey: ["admin-role-permissions", selectedRoleId],
    queryFn: () => adminApi.get<RoleGrant[]>(`/admin/roles/${selectedRoleId}/permissions`),
    enabled: !!selectedRoleId,
  });

  const [localGrants, setLocalGrants] = useState<Record<string, "full" | "readonly" | "none">>({});
  useEffect(() => {
    if (grants) setLocalGrants(Object.fromEntries(grants.map((g) => [g.permission, g.access])));
  }, [grants]);

  const createRoleMutation = useMutation({
    mutationFn: () => adminApi.post("/admin/roles", { key: `custom_${Date.now()}`, nameZh: newRoleName, nameEn: newRoleName }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-roles-list"] }); setNewRoleName(""); setShowNewRole(false); },
  });

  const saveGrantsMutation = useMutation({
    mutationFn: () => adminApi.put(`/admin/roles/${selectedRoleId}/permissions`, {
      grants: Object.entries(localGrants).map(([permission, access]) => ({ permission, access })),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-role-permissions", selectedRoleId] }),
  });

  const selectedRole = roles?.find((r) => r.id === selectedRoleId);
  const grouped = catalog?.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.groupZh] ??= []).push(p);
    return acc;
  }, {}) ?? {};

  return (
    <div className="grid md:grid-cols-[220px_1fr] gap-4 mt-4">
      <div className="bg-white rounded-lg border border-border overflow-hidden h-fit">
        <div className="p-3 border-b border-border">
          <Button size="sm" className="w-full" onClick={() => setShowNewRole((s) => !s)}>+ 自訂角色</Button>
        </div>
        {showNewRole && (
          <div className="p-3 border-b border-border flex gap-2">
            <Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="角色名稱" className="h-8 text-xs" />
            <Button size="sm" disabled={!newRoleName || createRoleMutation.isPending} onClick={() => createRoleMutation.mutate()}>建立</Button>
          </div>
        )}
        {rolesLoading && <p className="p-3 text-xs text-muted-foreground">載入中…</p>}
        {roles?.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedRoleId(r.id)}
            className={`w-full text-left px-3 py-2.5 text-sm border-b border-border last:border-0 transition-colors ${selectedRoleId === r.id ? "bg-jade/10 text-jade font-medium" : "hover:bg-paper-dim"}`}
          >
            {r.nameZh} {r.isBuiltin && <span className="text-xs text-muted-foreground">(內置)</span>}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-border p-5">
        {!selectedRole && <p className="text-muted-foreground text-sm">請先在左側選擇一個角色</p>}
        {selectedRole && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold">{selectedRole.nameZh} 權限配置</h3>
              <Button size="sm" onClick={() => saveGrantsMutation.mutate()} disabled={saveGrantsMutation.isPending}>
                {saveGrantsMutation.isPending ? "…" : "保存"}
              </Button>
            </div>
            <div className="space-y-4">
              {Object.entries(grouped).map(([group, perms]) => (
                <div key={group}>
                  <p className="text-xs font-medium text-muted-foreground mb-2">{group}</p>
                  <div className="space-y-1.5">
                    {perms.map((p) => (
                      <div key={p.key} className="flex items-center justify-between py-1">
                        <span className="text-sm">{p.labelZh}</span>
                        <div className="flex gap-1">
                          {(["none", "readonly", "full"] as const).map((access) => (
                            <button
                              key={access}
                              onClick={() => setLocalGrants((s) => ({ ...s, [p.key]: access }))}
                              className={`text-xs px-2 py-1 rounded font-medium ${
                                (localGrants[p.key] ?? "none") === access ? "bg-jade text-paper" : "bg-paper-dim text-muted-foreground hover:bg-border"
                              }`}
                            >
                              {access === "none" ? "無" : access === "readonly" ? "只讀" : "完全"}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="font-display text-2xl font-bold">系統設置</h1>
      <Tabs defaultValue="defaults">
        <TabsList>
          <TabsTrigger value="defaults">默認值配置</TabsTrigger>
          <TabsTrigger value="roles">角色權限</TabsTrigger>
          <TabsTrigger value="platform">平台信息</TabsTrigger>
          <TabsTrigger value="audit">審計日誌</TabsTrigger>
        </TabsList>
        <TabsContent value="defaults"><DefaultsTab /></TabsContent>
        <TabsContent value="roles"><RolesTab /></TabsContent>
        <TabsContent value="platform"><PlatformInfoTab /></TabsContent>
        <TabsContent value="audit"><AuditLogTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function DefaultsTab() {
  const queryClient = useQueryClient();
  const { data: defaults, isLoading } = useQuery({ queryKey: ["admin-defaults"], queryFn: () => adminApi.get<Record<string, unknown>>("/admin/settings/defaults") });
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (defaults) setValues(Object.fromEntries(Object.entries(defaults).map(([k, v]) => [k, v === null ? "" : String(v)])));
  }, [defaults]);

  const saveMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) => adminApi.patch(`/admin/settings/defaults/${key}`, { value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-defaults"] }),
  });

  if (isLoading) return <p className="text-muted-foreground mt-4">載入中…</p>;

  return (
    <div className="bg-white rounded-lg border border-border p-5 mt-4 space-y-3 max-w-xl">
      {Object.keys(D20_LABELS).map((key) => (
        <div key={key} className="flex items-center gap-3">
          <label className="text-sm flex-1">{D20_LABELS[key]}</label>
          <Input
            className="w-32"
            value={values[key] ?? ""}
            onChange={(e) => setValues((s) => ({ ...s, [key]: e.target.value }))}
            onBlur={() => saveMutation.mutate({ key, value: values[key] === "" ? null : Number(values[key]) })}
          />
        </div>
      ))}
      <p className="text-xs text-muted-foreground pt-2">修改後失焦即自動保存</p>
    </div>
  );
}

function PlatformInfoTab() {
  const queryClient = useQueryClient();
  const { data: info } = useQuery({ queryKey: ["admin-platform-info"], queryFn: () => adminApi.get<Record<string, string>>("/admin/settings/platform-info") });
  const [shopNameZh, setShopNameZh] = useState("");
  const [privacyPolicy, setPrivacyPolicy] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (info) { setShopNameZh(info.shop_name_zh ?? ""); setPrivacyPolicy(info.privacy_policy_zh ?? ""); }
  }, [info]);

  const saveMutation = useMutation({
    mutationFn: () => adminApi.patch("/admin/settings/platform-info", { shop_name_zh: shopNameZh, privacy_policy_zh: privacyPolicy }),
    onSuccess: () => { setError(null); queryClient.invalidateQueries({ queryKey: ["admin-platform-info"] }); },
    onError: (err: any) => setError(err.message ?? "保存失敗"),
  });

  return (
    <div className="bg-white rounded-lg border border-border p-5 mt-4 space-y-4 max-w-xl">
      {error && <p className="text-sm text-chili bg-chili/10 rounded px-3 py-2">{error}</p>}
      <div>
        <label className="text-sm font-medium block mb-1">店鋪名稱</label>
        <Input value={shopNameZh} onChange={(e) => setShopNameZh(e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">隱私政策（需包含跨境傳輸披露）</label>
        <textarea
          value={privacyPolicy}
          onChange={(e) => setPrivacyPolicy(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-input px-3 py-2 text-sm"
          placeholder="需提及「跨境」或「境外」等關鍵詞，否則保存會被拒絕"
        />
      </div>
      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>{saveMutation.isPending ? "…" : "保存"}</Button>
    </div>
  );
}

function AuditLogTab() {
  const { data: logs, isLoading } = useQuery({ queryKey: ["admin-audit-logs"], queryFn: () => adminApi.get<AuditLog[]>("/admin/audit-logs") });
  return (
    <div className="bg-white rounded-lg border border-border overflow-hidden mt-4">
      <Table>
        <TableHeader><TableRow><TableHead>操作</TableHead><TableHead>目標</TableHead><TableHead>時間</TableHead></TableRow></TableHeader>
        <TableBody>
          {isLoading && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">載入中…</TableCell></TableRow>}
          {!isLoading && !logs?.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">暫無記錄</TableCell></TableRow>}
          {logs?.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="font-mono text-xs">{l.action}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{l.targetType}:{l.targetId}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{new Date(l.createdAt).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
