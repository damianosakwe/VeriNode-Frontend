import { create } from "zustand"

interface StakingState {
  pendingTransactions: number
  incrementPending: () => void
  decrementPending: () => void
  reset: () => void
}

export const useStakingStore = create<StakingState>((set) => ({
  pendingTransactions: 0,
  incrementPending: () =>
    set((s) => ({ pendingTransactions: s.pendingTransactions + 1 })),
  decrementPending: () =>
    set((s) => ({
      pendingTransactions: Math.max(0, s.pendingTransactions - 1),
    })),
  reset: () => set({ pendingTransactions: 0 }),
}))
