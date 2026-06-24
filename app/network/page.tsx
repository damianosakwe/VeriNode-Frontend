'use client';

import React from 'react';
import { LightClientSyncIndicator } from '@/src/components/network/LightClientSyncIndicator';
import { NetworkGraph } from '@/src/components/network/NetworkGraph';

export default function NetworkStatus() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-zinc-900 dark:text-zinc-50">Network Status</h1>
      
      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Validator topology</h2>
          <NetworkGraph />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-center h-full min-h-[300px]">
            <p className="text-zinc-500">Other Network Health Panel</p>
          </div>

          <LightClientSyncIndicator />
        </div>
      </div>
    </div>
  );
}
