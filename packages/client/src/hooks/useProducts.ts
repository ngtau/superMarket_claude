import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ProductListItem, ProductDetail, PaginatedResult, Banner, RecommendationItem } from "@/types/api";

export function useProductList(params: { categoryId?: string; keyword?: string; page?: number }) {
  const qs = new URLSearchParams();
  if (params.categoryId) qs.set("categoryId", params.categoryId);
  if (params.keyword) qs.set("keyword", params.keyword);
  qs.set("page", String(params.page ?? 1));
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => api.get<PaginatedResult<ProductListItem>>(`/products?${qs.toString()}`),
  });
}

export function useProductDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => api.get<ProductDetail>(`/products/${id}`),
    enabled: !!id,
  });
}

export function useBanners() {
  return useQuery({ queryKey: ["banners"], queryFn: () => api.get<Banner[]>("/banners") });
}

export function useRecommendations(slot: string) {
  return useQuery({ queryKey: ["recommendations", slot], queryFn: () => api.get<RecommendationItem[]>(`/products/recommendations?slot=${slot}`) });
}
