import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMyFeedbacks } from "@/hooks/useFeedbacks";
import type { Feedback } from "@/types/api";

const STATUS_STYLE: Record<Feedback["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  processing: "bg-sky-100 text-sky-800",
  replied: "bg-emerald-100 text-emerald-800",
  closed: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<Feedback["status"], { zh: string; en: string }> = {
  pending: { zh: "待處理", en: "Pending" },
  processing: { zh: "處理中", en: "Processing" },
  replied: { zh: "已回覆", en: "Replied" },
  closed: { zh: "已關閉", en: "Closed" },
};

const TYPE_LABEL: Record<Feedback["type"], { zh: string; en: string }> = {
  inquiry: { zh: "查詢", en: "Enquiry" },
  complaint: { zh: "投訴", en: "Complaint" },
  suggestion: { zh: "建議", en: "Suggestion" },
};

/** §5.14 DoD：用户可在个人中心查看自己反馈的处理状态/回复 */
export default function MyFeedbacksPage() {
  const { i18n } = useTranslation();
  const zh = i18n.language === "zh-HK";
  const { data: list, isLoading } = useMyFeedbacks();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">{zh ? "我的回饋" : "My Feedback"}</h1>
        <Link to="/support" className="text-sm text-jade hover:underline">{zh ? "提交新回饋" : "New feedback"}</Link>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">{zh ? "載入中…" : "Loading…"}</p>}
      {!isLoading && !list?.length && (
        <div className="bg-white rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          {zh ? "尚未提交過回饋" : "No feedback submitted yet"}
        </div>
      )}

      <div className="space-y-3">
        {list?.map((f) => (
          <div key={f.id} className="bg-white rounded-lg border border-border p-4 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-paper-dim">
                {zh ? TYPE_LABEL[f.type].zh : TYPE_LABEL[f.type].en}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_STYLE[f.status]}`}>
                {zh ? STATUS_LABEL[f.status].zh : STATUS_LABEL[f.status].en}
              </span>
              {f.orderId && <span className="text-xs text-muted-foreground font-mono">{f.orderId.slice(0, 8)}…</span>}
              <span className="text-xs text-muted-foreground ml-auto">{new Date(f.createdAt).toLocaleString()}</span>
            </div>

            <p className="text-sm whitespace-pre-wrap">{f.content}</p>

            {f.reply && (
              <div className="bg-paper-dim rounded-md px-3 py-2 border-l-2 border-jade">
                <p className="text-xs text-muted-foreground mb-1">{zh ? "客服回覆" : "Reply"}</p>
                <p className="text-sm whitespace-pre-wrap">{f.reply}</p>
                {f.repliedAt && <p className="text-xs text-muted-foreground mt-1">{new Date(f.repliedAt).toLocaleString()}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
