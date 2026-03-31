/**
 * useAdmin.ts
 * Poll creation hook for initializing a new poll round.
 */

'use client';

import { useState, useCallback } from 'react';
import { initializePoll } from '@/lib/stellar-contract';
import { classifyError, type WalletKitInstance } from '@/lib/wallet';
import type { TxState, PollError } from '@/types';

export function useAdmin(
  walletAddress: string | null,
  walletKit: unknown | null
) {
  const [txState, setTxState] = useState<TxState>({ status: 'idle' });
  const [adminError, setAdminError] = useState<PollError | null>(null);

  const handleInitPoll = useCallback(
    async (question: string, options: string[]) => {
      if (!walletAddress || !walletKit) {
        setAdminError({
          type: 'WALLET_NOT_FOUND',
          message: 'Connect your wallet first.',
        });
        return;
      }

      const kit = walletKit as WalletKitInstance;
      setAdminError(null);
      setTxState({ status: 'pending' });

      try {
        await initializePoll(
          walletAddress,
          question,
          options,
          kit.signTransaction.bind(kit),
          setTxState
        );
      } catch (err) {
        setAdminError(classifyError(err));
      }
    },
    [walletAddress, walletKit]
  );

  return { txState, adminError, handleInitPoll };
}
