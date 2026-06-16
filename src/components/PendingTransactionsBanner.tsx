'use client';

import { useState, useEffect } from 'react';
import { getItem } from '@/src/lib/sessionStore';
import { QUEUE_KEY } from '@/src/hooks/useTxRetryQueue';
import type { TxQueueEntry } from '@/src/hooks/useTxRetryQueue';

function truncateHash(hash: string): string {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

function timeSince(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'confirmed':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

export function PendingTransactionsBanner() {
  const [entries, setEntries] = useState<TxQueueEntry[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    function refresh() {
      const stored = getItem<TxQueueEntry[]>(QUEUE_KEY);
      setEntries(stored?.filter(e => e.status === 'pending') || []);
    }
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, []);

  if (entries.length === 0) return null;

  return (
    <div className="border-b border-yellow-300 bg-yellow-50 px-4 py-2">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-sm font-medium text-yellow-800">
            {entries.length} pending transaction{entries.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm font-medium text-yellow-700 underline hover:text-yellow-900"
        >
          {expanded ? 'Hide Details' : 'View Details'}
        </button>
      </div>
      {expanded && (
        <div className="mx-auto mt-2 max-w-5xl">
          <div className="rounded-lg border border-yellow-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-yellow-200 bg-yellow-100">
                  <th className="px-3 py-2 font-medium text-yellow-900">Transaction Hash</th>
                  <th className="px-3 py-2 font-medium text-yellow-900">Submitted</th>
                  <th className="px-3 py-2 font-medium text-yellow-900">Retries</th>
                  <th className="px-3 py-2 font-medium text-yellow-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.txHash || entry.txXDR.slice(0, 16)} className="border-b border-yellow-100 last:border-0">
                    <td className="px-3 py-2 font-mono text-xs text-yellow-900">
                      {entry.txHash ? truncateHash(entry.txHash) : 'Waiting...'}
                    </td>
                    <td className="px-3 py-2 text-yellow-700">{timeSince(entry.createdAt)}</td>
                    <td className="px-3 py-2 text-yellow-700">{entry.retryCount}/3</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(entry.status)}`}>
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
