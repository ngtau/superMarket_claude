import { useState, useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Bold, Italic, List, ListOrdered, Heading2, ImagePlus, Code2, Undo, Redo } from "lucide-react";
import { useAdminAuthStore } from "@/store/admin-auth-store";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/**
 * 富文本编辑器：TipTap内核，支持粗体/斜体/标题/列表/图片插入，附带"源代码"模式可直接编辑/粘贴HTML。
 * 图片插入复用已有的 /admin/upload 接口（本地磁盘或R2，取决于后端STORAGE_DRIVER配置）。
 * ⚠️安全提醒：此组件产出的HTML在C端商品详情页渲染时，必须经DOMPurify消毒后再用dangerouslySetInnerHTML
 * 渲染（见ProductDetailPage.tsx），否则存在XSS风险——管理员输入本身是可信的，但源码模式允许直接粘贴任意
 * HTML，一旦账号被盗用或误粘贴恶意内容，消毒是最后一道防线。
 */
export function RichTextEditor({ value, onChange, placeholder }: Props) {
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceValue, setSourceValue] = useState(value);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit, Image.configure({ HTMLAttributes: { class: "rounded-md max-w-full" } })],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: "prose prose-sm max-w-none min-h-[160px] px-3 py-2 focus:outline-none" },
    },
  });

  // 外部value变化(如切换编辑的商品)时同步编辑器内容
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
    setSourceValue(value);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const insertImage = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const token = useAdminAuthStore.getState().token;
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/admin/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("圖片上傳失敗");
      const { url } = await res.json();
      editor?.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      alert(err instanceof Error ? err.message : "圖片上傳失敗");
    } finally {
      setUploading(false);
    }
  }, [editor]);

  const toggleSourceMode = () => {
    if (sourceMode) {
      // 源码 -> 富文本：把手改的HTML同步回编辑器
      editor?.commands.setContent(sourceValue);
      onChange(sourceValue);
    } else {
      // 富文本 -> 源码：取当前HTML填入源码框
      setSourceValue(editor?.getHTML() ?? value);
    }
    setSourceMode((s) => !s);
  };

  if (!editor) return null;

  return (
    <div className="border border-input rounded-md overflow-hidden">
      <div className="flex items-center gap-1 border-b border-input bg-paper-dim px-2 py-1.5 flex-wrap">
        <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} disabled={sourceMode}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} disabled={sourceMode}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} disabled={sourceMode}>
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} disabled={sourceMode}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} disabled={sourceMode}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <label className={`p-1.5 rounded hover:bg-border cursor-pointer ${sourceMode ? "opacity-30 pointer-events-none" : ""}`}>
          <ImagePlus className="h-4 w-4" />
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) insertImage(f); }} disabled={sourceMode || uploading} />
        </label>
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={sourceMode}>
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={sourceMode}>
          <Redo className="h-4 w-4" />
        </ToolbarButton>
        <div className="flex-1" />
        <ToolbarButton active={sourceMode} onClick={toggleSourceMode}>
          <Code2 className="h-4 w-4" />
          <span className="text-xs ml-1">源代碼</span>
        </ToolbarButton>
        {uploading && <span className="text-xs text-muted-foreground ml-1">上傳中…</span>}
      </div>

      {sourceMode ? (
        <textarea
          value={sourceValue}
          onChange={(e) => setSourceValue(e.target.value)}
          className="w-full min-h-[160px] px-3 py-2 font-mono text-xs focus:outline-none resize-y"
          placeholder="<p>直接編輯HTML源代碼…</p>"
        />
      ) : (
        <EditorContent editor={editor} placeholder={placeholder} />
      )}
    </div>
  );
}

function ToolbarButton({ children, onClick, active, disabled }: { children: React.ReactNode; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded flex items-center disabled:opacity-30 disabled:cursor-not-allowed ${active ? "bg-jade text-paper" : "hover:bg-border"}`}
    >
      {children}
    </button>
  );
}
