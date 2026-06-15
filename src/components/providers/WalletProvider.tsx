"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import type { WalletProviders } from "@/src/services/sessionWatcher"

export interface WalletContextValue {
  providers: WalletProviders
  walletType: string | null
  walletAddress: string | null
}

const WalletContext = createContext<WalletContextValue | null>(null)

export function WalletProvider({
  walletType,
  walletAddress,
  children,
}: {
  walletType: string | null
  walletAddress: string | null
  children: ReactNode
}) {
  const providers: WalletProviders = useMemo(() => {
    if (typeof window === "undefined") return {}

    return {
      freighter: (window as Record<string, unknown>).freighterApi as
        | { isConnected: () => boolean }
        | undefined,
      lobstr: (window as Record<string, unknown>).lobstr as
        | { isConnected: () => boolean }
        | undefined,
      xbull: (window as Record<string, unknown>).xbull as
        | { isConnected: () => boolean }
        | undefined,
      albedo: (window as Record<string, unknown>).albedo as
        | { isConnected: () => boolean }
        | undefined,
    }
  }, [])

  const value = useMemo(
    () => ({ providers, walletType, walletAddress }),
    [providers, walletType, walletAddress],
  )

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  )
}

export function useWalletContext() {
  const ctx = useContext(WalletContext)
  if (!ctx) {
    throw new Error("useWalletContext must be used within a WalletProvider")
  }
  return ctx
}
