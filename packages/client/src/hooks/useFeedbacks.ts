import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Feedback } from "@/types/api";

/** §5.14：我的反馈列表（含后台回复与处理状态） */
export function useMyFeedbacks() {
  return useQuery({ queryKey: ["my-feedbacks"], queryFn: () => api.get<Feedback[]>("/feedbacks/mine") });
}

/** §5.14：提交反馈。登录用户自动带账号，游客需留联系方式——后端按同一接口区分 */
export function useSubmitFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { type: Feedback["type"]; content: string; contact?: string; orderId?: string }) =>
      api.post<Feedback>("/feedbacks", body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-feedbacks"] }),
  });
}
