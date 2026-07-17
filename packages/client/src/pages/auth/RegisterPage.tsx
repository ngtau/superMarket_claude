import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api-client";
import { useCustomerAuthStore } from "@/store/customer-auth-store";

export default function RegisterPage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const setSession = useCustomerAuthStore((s) => s.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(i18n.language === "zh-HK" ? "密碼至少8位" : "Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const { accessToken, refreshToken } = await api.post<{ accessToken: string; refreshToken: string }>("/auth/register", { email, password });
      setSession(accessToken, refreshToken, { id: "", email, locale: i18n.language });
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (i18n.language === "zh-HK" ? "註冊失敗" : "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-lg p-8 space-y-5 border-t-4 border-jade shadow-sm">
        <div>
          <Link to="/" className="font-display text-2xl font-extrabold text-jade">APCube</Link>
          <p className="text-sm text-muted-foreground mt-1">{i18n.language === "zh-HK" ? "建立新帳戶" : "Create your account"}</p>
        </div>

        {error && <p className="text-sm text-chili bg-chili/10 rounded px-3 py-2">{error}</p>}

        <div className="space-y-3">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          <Input
            type="password"
            placeholder={i18n.language === "zh-HK" ? "密碼（至少8位）" : "Password (min 8 chars)"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "…" : (i18n.language === "zh-HK" ? "註冊" : "Register")}
        </Button>

        <p className="text-sm text-center text-muted-foreground">
          {i18n.language === "zh-HK" ? "已經有帳戶？" : "Already have an account?"}{" "}
          <Link to="/login" className="text-jade font-medium hover:underline">{i18n.language === "zh-HK" ? "登入" : "Sign In"}</Link>
        </p>
      </form>
    </div>
  );
}
