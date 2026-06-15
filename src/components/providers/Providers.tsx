"use client"

import { type ReactNode, useEffect } from "react"
import { WalletProvider } from "./WalletProvider"
import { SessionGuard } from "./SessionGuard"
import { useAuthStore } from "@/src/store/authStore"
import { useStakingStore } from "@/src/store/stakingStore"

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
      const win = window as Record<string, unknown>
      win.__TEST_STORES__ = {
        auth: useAuthStore,
        staking: useStakingStore,
      }
    }
  }, [])

  return (
    <WalletProvider walletType={null} walletAddress={null}>
      <SessionGuard>{children}</SessionGuard>
    </WalletProvider>
  )
}
