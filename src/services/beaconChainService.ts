import type { FinalityCheckpointInput } from '@/src/utils/compositeScore'

export type BeaconFinalityProvider = {
  fetchCheckpoint(slot: number): Promise<FinalityCheckpointInput>
  subscribeToHead(onCheckpoint: (checkpoint: FinalityCheckpointInput) => void): () => void
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function createDemoBeaconChainService(): BeaconFinalityProvider {
  return {
    async fetchCheckpoint(slot) {
      const finalizedEpoch = Math.max(1, Math.floor(slot / 32) - 1)
      return {
        slot,
        finalizedEpoch,
        justifiedEpoch: finalizedEpoch + 1,
        participationRate: 96 + Math.sin(slot / 8) * 2,
      }
    },
    subscribeToHead() {
      return () => undefined
    },
  }
}

export function createBeaconChainService(baseUrl: string): BeaconFinalityProvider {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')

  return {
    async fetchCheckpoint(slot) {
      const [finalityResponse, participationResponse] = await Promise.all([
        fetch(`${normalizedBaseUrl}/eth/v1/beacon/states/head/finality_checkpoints`),
        fetch(`${normalizedBaseUrl}/eth/v1/beacon/states/head/validator_participation`),
      ])
      if (!finalityResponse.ok) throw new Error('Unable to fetch beacon finality checkpoints')
      const finality = await finalityResponse.json() as {
        data?: { finalized?: { epoch?: string | number }; current_justified?: { epoch?: string | number } }
      }
      const participation = participationResponse.ok
        ? await participationResponse.json() as { data?: { current_epoch_active_gwei?: string | number; current_epoch_target_attesting_gwei?: string | number } }
        : null
      const active = toNumber(participation?.data?.current_epoch_active_gwei)
      const attesting = toNumber(participation?.data?.current_epoch_target_attesting_gwei)

      return {
        slot,
        finalizedEpoch: toNumber(finality.data?.finalized?.epoch),
        justifiedEpoch: toNumber(finality.data?.current_justified?.epoch),
        participationRate: active > 0 ? (attesting / active) * 100 : 0,
      }
    },
    subscribeToHead(onCheckpoint) {
      const socket = new WebSocket(`${normalizedBaseUrl.replace(/^http/, 'ws')}/eth/v1/events?topics=head`)
      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data) as { data?: { slot?: string | number } }
        const slot = toNumber(payload.data?.slot)
        if (slot > 0) this.fetchCheckpoint(slot).then(onCheckpoint).catch(console.error)
      }
      return () => socket.close()
    },
  }
}
