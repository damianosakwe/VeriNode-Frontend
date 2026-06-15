import { useCallback } from "react"
import { useAuthStore } from "@/src/store/authStore"
import { useStakingStore } from "@/src/store/stakingStore"

const LOGOUT_URL = "/api/v1/auth/logout"

export function useWeb3Auth() {
  const authLogout = useAuthStore((s) => s.logout)
  const resetStaking = useStakingStore((s) => s.reset)

  const logout = useCallback(async () => {
    try {
      await fetch(LOGOUT_URL, {
        method: "POST",
        credentials: "include",
      })
    } catch {
      // best-effort; clear locally even if network fails
    }

    authLogout()
    resetStaking()
    window.location.href = "/login"
  }, [authLogout, resetStaking])

  return { logout }
}
