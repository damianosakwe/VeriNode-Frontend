'use client'

import { useMemo, useState } from 'react'
import { BalanceReconciliationTable } from '@/src/components/validators/BalanceReconciliationTable'
import { ValidatorUnlockCard } from '@/src/components/validators/ValidatorUnlockCard'
import { useValidatorBalances } from '@/src/hooks/useValidatorBalances'

const DEFAULT_VALIDATORS = [100, 101, 102, 103, 104, 105]

/**
 * Validator dashboard. Hosts the "Balance Reconciliation" accordion: a
 * per-validator effective-vs-actual breakdown table, plus projected-unlock
 * cards for any validators currently over the effective-balance cap.
 */
export function ValidatorDashboard({
  validatorIndices = DEFAULT_VALIDATORS,
  beaconNodeUrl,
}: {
  validatorIndices?: number[]
  beaconNodeUrl?: string
}) {
  const [open, setOpen] = useState(true)
  const { byValidator } = useValidatorBalances(validatorIndices, { beaconNodeUrl })

  const cappedValidators = useMemo(
    () => validatorIndices.filter((vi) => byValidator[vi]?.summary.latest?.capped),
    [validatorIndices, byValidator],
  )

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 text-white">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-4 p-6 text-left"
          aria-expanded={open}
        >
          <div>
            <h2 className="text-xl font-semibold">Balance Reconciliation</h2>
            <p className="text-sm text-slate-400">
              Effective vs actual balance · {validatorIndices.length} validators
              {cappedValidators.length > 0 && ` · ${cappedValidators.length} capped`}
            </p>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-lg text-slate-300">
            {open ? '−' : '+'}
          </span>
        </button>

        {open && (
          <div className="space-y-6 px-6 pb-6">
            <BalanceReconciliationTable validatorIndices={validatorIndices} beaconNodeUrl={beaconNodeUrl} />

            {cappedValidators.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Projected unlocks
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {cappedValidators.map((vi) => (
                    <ValidatorUnlockCard key={vi} validatorIndex={vi} beaconNodeUrl={beaconNodeUrl} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
