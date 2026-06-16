'use client';

import React from 'react';
import { QueryProvider } from '@/src/components/providers/QueryProvider';
import { WalletProvider } from '@/src/components/providers/WalletProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <WalletProvider>
        {children}
      </WalletProvider>
    </QueryProvider>
  );
}
