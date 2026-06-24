'use client'

import { useMemo, useState } from 'react'
import { SyncCommitteeHeatmap } from '@/src/components/canvas/SyncCommitteeHeatmap'
import { SyncCommitteeSummary } from '@/src/components/validators/SyncCommitteeSummary'
import { useSyncCommitteeHistory } from '@/src/hooks/useSyncCommitteeHistory'

type TabKey = 'overview' | 'sync-committee'

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'sync-committee', label: 'Sync Committee' },
]

/**
 * Validator detail view with a tabbed layout. The "Sync Committee" tab mounts
 * the participation summary and the canvas heatmap. App Router integration
 * point — render from a route (see app/validators/page.tsx) or embed directly.
 */
export function ValidatorDetail({
  validatorIndex,
  beaconNodeUrl,
}: {
  validatorIndex: number
  beaconNodeUrl?: string
}) {
  const [tab, setTab] = useState<TabKey>('sync-committee')
  const history = useSyncCommitteeHistory(validatorIndex, { beaconNodeUrl })
  const { periods, currentPeriod, loadPeriod } = history

  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null)

  // Default the heatmap to the most recent assigned period (else most recent
  // loaded), adjusting state during render rather than in an effect.
  if (selectedPeriod === null && periods.length > 0) {
    const assigned = periods.filter((p) => p.assigned)
    const list = assigned.length ? assigned : periods
    setSelectedPeriod(list[list.length - 1].period)
  }

  const selected = useMemo(
    () => periods.find((p) => p.period === selectedPeriod) ?? null,
    [periods, selectedPeriod],
  )

  const earliestPeriod = periods.length ? periods[0].period : currentPeriod ?? 0

  return (
    <div className="space-y-6">
      <nav className="flex gap-1 border-b border-white/10">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? 'border-sky-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 text-slate-300">
          <h2 className="text-xl font-semibold text-white">Validator #{validatorIndex}</h2>
          <p className="mt-2 text-sm text-slate-400">
            Open the Sync Committee tab to review historical sync committee duties.
          </p>
        </section>
      )}

      {tab === 'sync-committee' && (
        <div className="space-y-6">
          <SyncCommitteeSummary validatorIndex={validatorIndex} history={history} />

          <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 text-white">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h3 className="mr-auto text-lg font-semibold">Per-slot participation</h3>
              <button
                type="button"
                onClick={() => loadPeriod(earliestPeriod - 1)}
                className="rounded-md border border-white/10 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-white/5"
              >
                Load earlier period
              </button>
            </div>

            {periods.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {periods.map((p) => {
                  const isActive = p.period === selectedPeriod
                  return (
                    <button
                      key={p.period}
                      type="button"
                      onClick={() => setSelectedPeriod(p.period)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        isActive
                          ? 'border-sky-400 bg-sky-400/10 text-white'
                          : 'border-white/10 text-slate-300 hover:bg-white/5'
                      }`}
                      title={p.assigned ? `${(p.participationRate * 100).toFixed(2)}%` : 'Not assigned'}
                    >
                      P{p.period}
                      {p.period === currentPeriod ? ' (now)' : ''}
                      <span className="ml-1 text-slate-500">
                        {p.assigned ? `${(p.participationRate * 100).toFixed(1)}%` : '—'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {selected ? (
              selected.assigned ? (
                <SyncCommitteeHeatmap period={selected} />
              ) : (
                <p className="py-10 text-center text-sm text-slate-400">
                  Validator was not assigned to a sync committee in period {selected.period}.
                </p>
              )
            ) : (
              <p className="py-10 text-center text-sm text-slate-400">Loading sync committee history…</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
