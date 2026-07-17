import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const { i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // 无论邮箱是否存在均返回成功（防枚举，见后端AuthService.forgotPassword注释）
    await api.post("/auth/password/forgot", { email }).catch(() => {});
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-lg p-8 space-y-5 border-t-4 border-jade shadow-sm">
        <Link to="/" className="font-display text-2xl font-extrabold text-jade">APCube</Link>
        {sent ? (
          <p className="text-sm text-jade bg-jade/10 rounded px-3 py-3">
            {i18n.language === "zh-HK" ? "如果該郵箱已註冊，重置連結已發送，請查收郵件。" : "If that email is registered, a reset link has been sent."}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">{i18n.language === "zh-HK" ? "輸入你的郵箱，我們會發送重置密碼連結" : "Enter your email and we'll send a reset link"}</p>
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "…" : (i18n.language === "zh-HK" ? "發送重置連結" : "Send reset link")}</Button>
          </form>
        )}
        <Link to="/login" className="text-xs text-jade hover:underline block">{i18n.language === "zh-HK" ? "返回登入" : "Back to sign in"}</Link>
      </div>
    </div>
  );
}
