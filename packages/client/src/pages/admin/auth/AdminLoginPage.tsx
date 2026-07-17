import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi, AdminApiError } from "@/lib/admin-api-client";
import { useAdminAuthStore } from "@/store/admin-auth-store";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const setSession = useAdminAuthStore((s) => s.setSession);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken } = await adminApi.post<{ accessToken: string }>("/admin/auth/login", { username, password });
      // 临时写入store供me接口鉴权使用（此时permissions尚为空，登录成功后立即拉取）
      setSession(accessToken, { id: "", username, roleKey: "", roleNameZh: "", permissions: {} });
      const me = await adminApi.get<any>("/admin/auth/me");
      setSession(accessToken, me);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "登录失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-paper rounded-lg p-8 space-y-5 border-t-4 border-brass">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-jade">APCube 後台管理</h1>
          <p className="text-sm text-muted-foreground mt-1">請使用管理員賬號登入</p>
        </div>

        {error && <p className="text-sm text-chili bg-chili/10 rounded px-3 py-2">{error}</p>}

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1">用戶名</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">密碼</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "登入中…" : "登入"}
        </Button>
      </form>
    </div>
  );
}
