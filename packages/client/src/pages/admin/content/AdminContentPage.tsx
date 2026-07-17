import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/FileUpload";
import { adminApi } from "@/lib/admin-api-client";

interface Banner { id: string; copyZh: string | null; imageUrl: string; enabled: boolean }
interface Announcement { id: string; contentZh: string | null; enabled: boolean }
interface Faq { id: string; questionZh: string; answerZh: string; enabled: boolean }

export default function AdminContentPage() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="font-display text-2xl font-bold">內容管理</h1>
      <Tabs defaultValue="banners">
        <TabsList>
          <TabsTrigger value="banners">輪播圖</TabsTrigger>
          <TabsTrigger value="announcements">公告</TabsTrigger>
          <TabsTrigger value="faqs">FAQ</TabsTrigger>
        </TabsList>
        <TabsContent value="banners"><BannersTab /></TabsContent>
        <TabsContent value="announcements"><AnnouncementsTab /></TabsContent>
        <TabsContent value="faqs"><FaqsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function BannersTab() {
  const queryClient = useQueryClient();
  const [copyZh, setCopyZh] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const { data: banners, isLoading } = useQuery({ queryKey: ["admin-banners"], queryFn: () => adminApi.get<Banner[]>("/admin/banners") });

  const createMutation = useMutation({
    mutationFn: () => adminApi.post("/admin/banners", { copyZh, imageUrl, enabled: true }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-banners"] }); setCopyZh(""); setImageUrl(""); },
  });
  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => adminApi.patch(`/admin/banners/${id}`, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-banners"] }),
  });
  const removeMutation = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/admin/banners/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-banners"] }),
  });

  return (
    <div className="space-y-4 mt-4">
      <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="bg-white rounded-lg border border-border p-4 space-y-3">
        <Input placeholder="輪播文案" value={copyZh} onChange={(e) => setCopyZh(e.target.value)} />
        <FileUpload value={imageUrl} onChange={setImageUrl} endpoint="/admin/upload" mode="admin" />
        <Button type="submit" disabled={createMutation.isPending || !imageUrl}>+ 新增</Button>
      </form>
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>文案</TableHead><TableHead>圖片</TableHead><TableHead>狀態</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">載入中…</TableCell></TableRow>}
            {!isLoading && !banners?.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">暫無輪播圖</TableCell></TableRow>}
            {banners?.map((b) => (
              <TableRow key={b.id}>
                <TableCell>{b.copyZh}</TableCell>
                <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">{b.imageUrl}</TableCell>
                <TableCell>
                  <button onClick={() => toggleMutation.mutate({ id: b.id, enabled: !b.enabled })}
                    className={`text-xs px-2 py-0.5 rounded font-medium ${b.enabled ? "bg-jade/10 text-jade" : "bg-muted text-muted-foreground"}`}>
                    {b.enabled ? "已啟用" : "已停用"}
                  </button>
                </TableCell>
                <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => removeMutation.mutate(b.id)}>刪除</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AnnouncementsTab() {
  const queryClient = useQueryClient();
  const [contentZh, setContentZh] = useState("");
  const { data: announcements, isLoading } = useQuery({ queryKey: ["admin-announcements"], queryFn: () => adminApi.get<Announcement[]>("/admin/announcements") });
  const createMutation = useMutation({
    mutationFn: () => adminApi.post("/admin/announcements", { contentZh, enabled: true, publishedAt: new Date().toISOString() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-announcements"] }); setContentZh(""); },
  });
  const removeMutation = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/admin/announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-announcements"] }),
  });

  return (
    <div className="space-y-4 mt-4">
      <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="bg-white rounded-lg border border-border p-4 flex gap-3">
        <Input placeholder="公告內容" value={contentZh} onChange={(e) => setContentZh(e.target.value)} className="flex-1" required />
        <Button type="submit" disabled={createMutation.isPending}>+ 發布</Button>
      </form>
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>內容</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">載入中…</TableCell></TableRow>}
            {!isLoading && !announcements?.length && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">暫無公告</TableCell></TableRow>}
            {announcements?.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.contentZh}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => removeMutation.mutate(a.id)}>刪除</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function FaqsTab() {
  const queryClient = useQueryClient();
  const [questionZh, setQuestionZh] = useState("");
  const [answerZh, setAnswerZh] = useState("");
  const { data: faqs, isLoading } = useQuery({ queryKey: ["admin-faqs"], queryFn: () => adminApi.get<Faq[]>("/admin/faqs") });
  const createMutation = useMutation({
    mutationFn: () => adminApi.post("/admin/faqs", { questionZh, questionEn: questionZh, answerZh, answerEn: answerZh, enabled: true }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-faqs"] }); setQuestionZh(""); setAnswerZh(""); },
  });
  const removeMutation = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/admin/faqs/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-faqs"] }),
  });

  return (
    <div className="space-y-4 mt-4">
      <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="bg-white rounded-lg border border-border p-4 space-y-3">
        <Input placeholder="問題" value={questionZh} onChange={(e) => setQuestionZh(e.target.value)} required />
        <Input placeholder="答案" value={answerZh} onChange={(e) => setAnswerZh(e.target.value)} required />
        <Button type="submit" disabled={createMutation.isPending}>+ 新增FAQ</Button>
      </form>
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>問題</TableHead><TableHead>答案</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">載入中…</TableCell></TableRow>}
            {!isLoading && !faqs?.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">暫無FAQ</TableCell></TableRow>}
            {faqs?.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{f.questionZh}</TableCell>
                <TableCell className="text-muted-foreground">{f.answerZh}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => removeMutation.mutate(f.id)}>刪除</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
