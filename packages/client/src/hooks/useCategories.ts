import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CategoryNode } from "@/types/api";

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: () => api.get<CategoryNode[]>("/categories") });
}
