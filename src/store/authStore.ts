import { create } from "zustand"

interface AuthState {
  isAuthenticated: boolean
  walletType: string | null
  walletAddress: string | null
  login: (walletType: string, walletAddress: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  walletType: null,
  walletAddress: null,
  login: (walletType, walletAddress) =>
    set({ isAuthenticated: true, walletType, walletAddress }),
  logout: () =>
    set({ isAuthenticated: false, walletType: null, walletAddress: null }),
}))
