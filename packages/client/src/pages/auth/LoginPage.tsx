import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api-client";
import { useCustomerAuthStore } from "@/store/customer-auth-store";
import { useCartStore } from "@/store/cart-store";

export default function LoginPage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useCustomerAuthStore((s) => s.setSession);
  const localCartItems = useCartStore((s) => s.items);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken, refreshToken } = await api.post<{ accessToken: string; refreshToken: string }>("/auth/login", { email, password });
      setSession(accessToken, refreshToken, { id: "", email, locale: i18n.language });

      // 登录后合并本地(游客态)购物车到服务端，见API契约文档§4 /cart/merge
      if (localCartItems.length > 0) {
        await api.post("/cart/merge", { items: localCartItems.map((i) => ({ skuId: i.skuId, qty: i.qty })) }).catch(() => {});
      }

      navigate(searchParams.get("redirect") ?? "/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (i18n.language === "zh-HK" ? "登入失敗" : "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-lg p-8 space-y-5 border-t-4 border-jade shadow-sm">
        <div>
          <Link to="/" className="font-display text-2xl font-extrabold text-jade">APCube</Link>
          <p className="text-sm text-muted-foreground mt-1">{i18n.language === "zh-HK" ? "登入你的帳戶" : "Sign in to your account"}</p>
        </div>

        {error && <p className="text-sm text-chili bg-chili/10 rounded px-3 py-2">{error}</p>}

        <div className="space-y-3">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          <Input type="password" placeholder={i18n.language === "zh-HK" ? "密碼" : "Password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs text-jade hover:underline">
            {i18n.language === "zh-HK" ? "忘記密碼？" : "Forgot password?"}
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "…" : (i18n.language === "zh-HK" ? "登入" : "Sign In")}
        </Button>

        <p className="text-sm text-center text-muted-foreground">
          {i18n.language === "zh-HK" ? "還沒有帳戶？" : "No account yet?"}{" "}
          <Link to="/register" className="text-jade font-medium hover:underline">{i18n.language === "zh-HK" ? "立即註冊" : "Register"}</Link>
        </p>
      </form>
    </div>
  );
}
