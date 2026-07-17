import { useState } from "react";
import { Upload } from "lucide-react";
import { useAdminAuthStore } from "@/store/admin-auth-store";
import { useCustomerAuthStore } from "@/store/customer-auth-store";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

interface Props {
  value: string;
  onChange: (url: string) => void;
  endpoint: "/admin/upload" | "/upload/voucher";
  mode: "admin" | "customer";
}

/** 真实文件上传组件：拖拽/点击选择图片，上传后回填URL。生产环境后端会切换到对象存储，此组件接口不受影响 */
export function FileUpload({ value, onChange, endpoint, mode }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const token = mode === "admin" ? useAdminAuthStore.getState().token : useCustomerAuthStore.getState().accessToken;
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "上傳失敗" }));
        throw new Error(body.message);
      }
      const { url } = await res.json();
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上傳失敗");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="flex items-center gap-3 border-2 border-dashed border-border rounded-md p-4 cursor-pointer hover:border-jade/50 transition-colors">
        <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          {uploading ? (
            <span className="text-sm text-muted-foreground">上傳中…</span>
          ) : value ? (
            <span className="text-sm text-jade truncate block">已上傳：{value.split("/").pop()}</span>
          ) : (
            <span className="text-sm text-muted-foreground">點擊選擇圖片（JPEG/PNG/WEBP/GIF，最大5MB）</span>
          )}
        </div>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </label>
      {error && <p className="text-xs text-chili mt-1">{error}</p>}
      {value && <img src={value} alt="preview" className="mt-2 h-20 w-20 object-cover rounded border border-border" />}
    </div>
  );
}
