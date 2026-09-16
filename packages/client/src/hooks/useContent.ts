import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Faq, SupportContact, Announcement } from "@/types/api";

/** §5.11 FAQ 列表（C端只读启用中的条目） */
export function useFaqs() {
  return useQuery({ queryKey: ["faqs"], queryFn: () => api.get<Faq[]>("/faqs") });
}

/** §5.11 客服联系方式（来自后台平台基础信息） */
export function useSupportContact() {
  return useQuery({ queryKey: ["support-contact"], queryFn: () => api.get<SupportContact>("/support/contact") });
}

/** §6.6 行35 公告/活动，首页与个人中心展示 */
export function useAnnouncements() {
  return useQuery({ queryKey: ["announcements"], queryFn: () => api.get<Announcement[]>("/announcements") });
}
