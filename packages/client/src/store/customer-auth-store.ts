import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CustomerInfo {
  id: string;
  email: string;
  locale: string;
}

interface CustomerAuthState {
  accessToken: string | null;
  refreshToken: string | null;
  customer: CustomerInfo | null;
  setSession: (accessToken: string, refreshToken: string, customer: CustomerInfo) => void;
  logout: () => void;
}

export const useCustomerAuthStore = create<CustomerAuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      customer: null,
      setSession: (accessToken, refreshToken, customer) => set({ accessToken, refreshToken, customer }),
      logout: () => set({ accessToken: null, refreshToken: null, customer: null }),
    }),
    { name: "apcube-customer-auth" }
  )
);
