import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AdminInfo {
  id: string;
  username: string;
  roleKey: string;
  roleNameZh: string;
  permissions: Record<string, "full" | "readonly" | "none">;
}

interface AdminAuthState {
  token: string | null;
  admin: AdminInfo | null;
  setSession: (token: string, admin: AdminInfo) => void;
  logout: () => void;
  hasPermission: (key: string, minAccess?: "readonly" | "full") => boolean;
}

const ACCESS_RANK: Record<string, number> = { none: 0, readonly: 1, full: 2 };

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      token: null,
      admin: null,
      setSession: (token, admin) => set({ token, admin }),
      logout: () => set({ token: null, admin: null }),
      hasPermission: (key, minAccess = "readonly") => {
        const actual = get().admin?.permissions[key] ?? "none";
        return ACCESS_RANK[actual] >= ACCESS_RANK[minAccess];
      },
    }),
    { name: "apcube-admin-auth" }
  )
);
