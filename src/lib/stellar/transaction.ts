// Soroban transaction model + resource→fee math for pre-flight estimation.

import { SorobanBalance } from '@/src/utils/sorobanMath'

export type TransactionType =
  | 'stake'
  | 'unstake'
  | 'delegate'
  | 'registerNode'
  | 'submitAttestation'

export const TRANSACTION_TYPES: TransactionType[] = [
  'stake',
  'unstake',
  'delegate',
  'registerNode',
  'submitAttestation',
]

export interface SorobanOperation {
  type: TransactionType
  label: string
}

export interface SorobanTransaction {
  type: TransactionType
  /** Base64 transaction XDR — the cache key source for pre-flight results. */
  xdr: string
  /** Operations for multi-step transactions (e.g. stake + delegate). */
  operations: SorobanOperation[]
}

// Soroban per-transaction resource ceilings (illustrative mainnet bounds).
export const INSTRUCTION_LIMIT = 100_000_000
export const WRITE_BYTES_LIMIT = 129_024
export const READ_BYTES_LIMIT = 204_800

const FEE_INSTRUCTION_WEIGHT = BigInt(100)
const FEE_WRITE_WEIGHT = BigInt(1000)
const FEE_READ_WEIGHT = BigInt(10)

const TYPE_LABELS: Record<TransactionType, string> = {
  stake: 'Stake',
  unstake: 'Unstake',
  delegate: 'Delegate',
  registerNode: 'Register Node',
  submitAttestation: 'Submit Attestation',
}

export function transactionLabel(type: TransactionType): string {
  return TYPE_LABELS[type]
}

/**
 * Fee in stroops (XLM atomic units, 1e-7 XLM):
 *   fee_XLM = (instructions·100 + writeBytes·1000 + readBytes·10) / 10^7
 * so the numerator is exactly the fee expressed in stroops.
 */
export function computeFeeStroops(
  instructions: number,
  writeBytes: number,
  readBytes: number,
): bigint {
  return (
    BigInt(Math.max(0, Math.trunc(instructions))) * FEE_INSTRUCTION_WEIGHT +
    BigInt(Math.max(0, Math.trunc(writeBytes))) * FEE_WRITE_WEIGHT +
    BigInt(Math.max(0, Math.trunc(readBytes))) * FEE_READ_WEIGHT
  )
}

/** Estimated fee as a SorobanBalance (XLM), ready for <FormattedBalance>. */
export function computeFee(
  instructions: number,
  writeBytes: number,
  readBytes: number,
): SorobanBalance {
  return SorobanBalance.fromAtomicUnits(computeFeeStroops(instructions, writeBytes, readBytes))
}

function toBase64(input: string): string {
  if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(input)))
  // Node / SSR fallback.
  return Buffer.from(input, 'utf-8').toString('base64')
}

/**
 * Build a (demo) Soroban transaction. The XDR is deterministic for a given
 * (type, operations, params) so identical invocations hit the pre-flight cache.
 */
export function buildTransaction(
  type: TransactionType,
  options: { operations?: TransactionType[]; params?: Record<string, unknown> } = {},
): SorobanTransaction {
  const opTypes = options.operations && options.operations.length > 0 ? options.operations : [type]
  const operations: SorobanOperation[] = opTypes.map((t) => ({ type: t, label: transactionLabel(t) }))
  const xdr = toBase64(`${type}|${opTypes.join(',')}|${JSON.stringify(options.params ?? {})}`)
  return { type, xdr, operations }
}
