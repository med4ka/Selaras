import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Outlet } from "@/services/data";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

interface User {
  id: string;
  username: string;
  role: "owner" | "manager" | "kasir";
  outlet_id: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  activeOutletId: string | null;
  outlets: Outlet[];
  login: (user: User) => void;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  setOutlets: (outlets: Outlet[]) => void;
  setActiveOutlet: (outletId: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      activeOutletId: null,
      outlets: [],
      login: (user) => {
        set({
          user,
          isAuthenticated: true,
          activeOutletId: user.outlet_id,
        });
      },
      logout: async () => {
        try {
          await fetch(`${API_URL}/auth/logout`, {
            method: "POST",
            credentials: "include",
          });
        } catch {}
        set({
          user: null,
          isAuthenticated: false,
          activeOutletId: null,
          outlets: [],
        });
      },
      setUser: (user) => set({ user, activeOutletId: user.outlet_id }),
      setOutlets: (outlets) => set({ outlets }),
      setActiveOutlet: (outletId) => set({ activeOutletId: outletId }),
    }),
    {
      name: "selaras-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        activeOutletId: state.activeOutletId,
        outlets: state.outlets,
      }),
    }
  )
);
