import type { StoreApi } from "zustand"

interface AuthStore {
  isAuthenticated: boolean
  walletType: string | null
  walletAddress: string | null
  login: (walletType: string, walletAddress: string) => void
  logout: () => void
}

interface StakingStore {
  pendingTransactions: number
  incrementPending: () => void
  decrementPending: () => void
  reset: () => void
}

declare global {
  interface Window {
    __TEST_STORES__?: {
      auth: StoreApi<AuthStore>
      staking: StoreApi<StakingStore>
    }
    freighterApi?: { isConnected: () => boolean }
    lobstr?: { isConnected: () => boolean }
    xbull?: { isConnected: () => boolean }
    albedo?: { isConnected: () => boolean }
  }
}
