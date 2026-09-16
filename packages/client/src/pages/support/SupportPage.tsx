import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown, Phone, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFaqs, useSupportContact } from "@/hooks/useContent";
import { useSubmitFeedback } from "@/hooks/useFeedbacks";
import { useCustomerAuthStore } from "@/store/customer-auth-store";
import type { Feedback } from "@/types/api";

const TYPE_LABELS: Record<Feedback["type"], { zh: string; en: string }> = {
  inquiry: { zh: "查詢", en: "Enquiry" },
  complaint: { zh: "投訴", en: "Complaint" },
  suggestion: { zh: "建議", en: "Suggestion" },
};

/**
 * §5.11 客服/帮助 + §5.14 用户反馈提交入口
 * 数据来源：FAQ（/faqs）+ 客服联系方式（/support/contact，后台平台基础信息）。
 * 反馈表单对游客开放（需留联系方式），登录用户自动带出账号。
 */
export default function SupportPage() {
  const { i18n } = useTranslation();
  const zh = i18n.language === "zh-HK";
  const customer = useCustomerAuthStore((s) => s.customer);

  const { data: faqs, isLoading: faqsLoading } = useFaqs();
  const { data: contactInfo } = useSupportContact();
  const submit = useSubmitFeedback();

  const [openId, setOpenId] = useState<string | null>(null);
  const [type, setType] = useState<Feedback["type"]>("inquiry");
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [orderId, setOrderId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const contactEntries = Object.entries(contactInfo?.contact ?? {}).filter(([, v]) => v);

  const handleSubmit = () => {
    setError(null);
    if (content.trim().length < 5) {
      setError(zh ? "請至少填寫 5 個字的內容" : "Please write at least 5 characters");
      return;
    }
    if (!customer && !contact.trim()) {
      setError(zh ? "未登入請留下聯繫方式，方便我們回覆你" : "Please leave a contact so we can reply");
      return;
    }
    submit.mutate(
      { type, content: content.trim(), contact: contact.trim() || undefined, orderId: orderId.trim() || undefined },
      {
        onSuccess: () => { setDone(true); setContent(""); setOrderId(""); },
        onError: (err: any) => setError(err.message ?? (zh ? "提交失敗" : "Submit failed")),
      }
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">
      <section>
        <h1 className="font-display text-2xl font-bold">{zh ? "客服與幫助" : "Help & Support"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {zh ? "常見問題、聯繫方式與意見回饋" : "FAQs, contact details and feedback"}
        </p>
      </section>

      {/* 客服联系方式：后台「平台基础信息」配置，C端只读展示 */}
      <section className="bg-white rounded-lg border border-border p-5">
        <h2 className="font-display font-bold mb-3">{zh ? "聯繫我們" : "Contact Us"}</h2>
        {contactEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {zh ? "尚未配置客服聯繫方式（後台 → 系統設置 → 平台信息）" : "No contact configured yet (Admin → Settings → Platform Info)"}
          </p>
        ) : (
          <ul className="space-y-2">
            {contactEntries.map(([k, v]) => (
              <li key={k} className="flex items-center gap-2 text-sm">
                {/phone|whatsapp|tel/i.test(k) ? <Phone className="h-4 w-4 text-jade" /> : <Mail className="h-4 w-4 text-jade" />}
                <span className="text-muted-foreground capitalize">{k}</span>
                <span className="font-medium">{String(v)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* FAQ 折叠列表 */}
      <section>
        <h2 className="font-display font-bold mb-3">{zh ? "常見問題" : "FAQs"}</h2>
        <div className="bg-white rounded-lg border border-border divide-y divide-border overflow-hidden">
          {faqsLoading && <p className="p-4 text-sm text-muted-foreground">{zh ? "載入中…" : "Loading…"}</p>}
          {!faqsLoading && !faqs?.length && (
            <p className="p-4 text-sm text-muted-foreground">{zh ? "暫無常見問題" : "No FAQs yet"}</p>
          )}
          {faqs?.map((f) => (
            <div key={f.id}>
              <button
                onClick={() => setOpenId(openId === f.id ? null : f.id)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-paper-dim transition-colors"
              >
                <span className="text-sm font-medium pr-4">{f.question}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${openId === f.id ? "rotate-180" : ""}`} />
              </button>
              {openId === f.id && (
                <div className="px-5 pb-4 text-sm text-muted-foreground whitespace-pre-wrap">{f.answer}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* §5.14 反馈提交：游客可提交（留联系方式），登录用户自动带账号 */}
      <section className="bg-white rounded-lg border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-jade" />
          <h2 className="font-display font-bold">{zh ? "意見回饋" : "Send Feedback"}</h2>
        </div>

        {done ? (
          <div className="text-sm space-y-2">
            <p className="text-jade font-medium">{zh ? "已提交，我們會盡快跟進。" : "Submitted. We'll follow up shortly."}</p>
            {customer ? (
              <Link to="/account/feedbacks" className="text-sm underline">{zh ? "查看我的回饋" : "View my feedback"}</Link>
            ) : (
              <button className="text-sm underline" onClick={() => { setDone(false); }}>{zh ? "再提交一則" : "Submit another"}</button>
            )}
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              {(Object.keys(TYPE_LABELS) as Feedback["type"][]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`text-sm px-3 py-1.5 rounded font-medium transition-colors ${
                    type === t ? "bg-jade text-paper" : "bg-paper-dim text-muted-foreground hover:bg-border"
                  }`}
                >
                  {zh ? TYPE_LABELS[t].zh : TYPE_LABELS[t].en}
                </button>
              ))}
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-input px-3 py-2 text-sm"
              placeholder={zh ? "請描述你的問題或建議…" : "Describe your issue or suggestion…"}
            />

            {!customer && (
              <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder={zh ? "聯繫方式（電郵或電話）" : "Email or phone"} />
            )}
            <Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder={zh ? "關聯訂單號（選填）" : "Related order no. (optional)"} />

            {error && <p className="text-sm text-chili bg-chili/10 rounded px-3 py-2">{error}</p>}

            <Button onClick={handleSubmit} disabled={submit.isPending}>
              {submit.isPending ? "…" : zh ? "提交" : "Submit"}
            </Button>
          </>
        )}
      </section>
    </div>
  );
}
