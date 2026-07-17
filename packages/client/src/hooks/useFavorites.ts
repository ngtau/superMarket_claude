import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useCustomerAuthStore } from "@/store/customer-auth-store";

interface FavoriteItem { favoriteId: string; productId: string; name: string; images: string[]; priceAfterCents: number }

export function useFavorites() {
  const isLoggedIn = !!useCustomerAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const { data: favorites } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => api.get<FavoriteItem[]>("/favorites"),
    enabled: isLoggedIn,
  });

  const addMutation = useMutation({
    mutationFn: (productId: string) => api.post(`/favorites/${productId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favorites"] }),
  });
  const removeMutation = useMutation({
    mutationFn: (productId: string) => api.delete(`/favorites/${productId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favorites"] }),
  });

  const isFavorited = (productId: string) => favorites?.some((f) => f.productId === productId) ?? false;
  const toggle = (productId: string) => {
    if (!isLoggedIn) return false; // 调用方需自行处理未登录跳转
    if (isFavorited(productId)) removeMutation.mutate(productId);
    else addMutation.mutate(productId);
    return true;
  };

  return { favorites, isFavorited, toggle, isLoggedIn };
}
