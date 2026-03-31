/**
 * usePoll.ts
 * Core React hook — manages poll state, voting, and real-time sync.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getPoll,
  hasVoted,
  submitVote,
  STELLAR_EXPLORER_TX,
} from '@/lib/stellar-contract';
import { connectWallet, disconnectWallet, classifyError, type WalletKitInstance } from '@/lib/wallet';
import { startEventListener } from '@/lib/events';
import type { PollData, PollError, TxState, WalletState, PollEvent } from '@/types';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePoll() {
  // Wallet state
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: null,
    kit: null,
  });

  // Poll state
  const [poll, setPoll] = useState<PollData | null>(null);
  const [pollLoading, setPollLoading] = useState(true);
  const [pollError, setPollError] = useState<string | null>(null);

  // Voting state
  const [userHasVoted, setUserHasVoted] = useState(false);
  const [votingOptionIndex, setVotingOptionIndex] = useState<number | null>(null);
  const [txState, setTxState] = useState<TxState>({ status: 'idle' });
  const [walletError, setWalletError] = useState<PollError | null>(null);

  // Events feed
  const [events, setEvents] = useState<PollEvent[]>([]);

  // Cleanup ref for event listener
  const stopListenerRef = useRef<(() => void) | null>(null);

  // ── Load Poll Data ──────────────────────────────────────────────────────────

  const loadPoll = useCallback(async () => {
    try {
      setPollLoading(true);
      const data = await getPoll();
      setPoll(data);
      setPollError(null);
    } catch (err) {
      setPollError('Failed to load poll data. Ensure NEXT_PUBLIC_CONTRACT_ID is set and the contract is deployed.');
      console.error('loadPoll error:', err);
    } finally {
      setPollLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadPoll();
  }, [loadPoll]);

  // ── Check If User Has Voted ─────────────────────────────────────────────────

  const checkVoteStatus = useCallback(async (address: string) => {
    try {
      const voted = await hasVoted(address);
      setUserHasVoted(voted);
    } catch {
      setUserHasVoted(false);
    }
  }, []);

  // ── Connect Wallet ──────────────────────────────────────────────────────────

  const handleConnect = useCallback(async () => {
    setWalletError(null);
    try {
      const { address, kit } = await connectWallet();
      setWallet({ connected: true, address, kit });
      await checkVoteStatus(address);
    } catch (err) {
      const pollErr = err as PollError;
      if (pollErr.type) {
        setWalletError(pollErr);
      } else {
        setWalletError(classifyError(err));
      }
    }
  }, [checkVoteStatus]);

  // ── Disconnect Wallet ───────────────────────────────────────────────────────

  const handleDisconnect = useCallback(() => {
    disconnectWallet();
    setWallet({ connected: false, address: null, kit: null });
    setUserHasVoted(false);
    setTxState({ status: 'idle' });
    setWalletError(null);
  }, []);

  // ── Submit Vote ─────────────────────────────────────────────────────────────

  const handleVote = useCallback(
    async (optionIndex: number) => {
      if (!wallet.connected || !wallet.address || !wallet.kit) {
        setWalletError({
          type: 'WALLET_NOT_FOUND',
          message: 'Please connect your wallet before voting.',
        });
        return;
      }

      if (userHasVoted) return;

      setWalletError(null);
      setVotingOptionIndex(optionIndex);
      setTxState({ status: 'pending' });

      const kit = wallet.kit as WalletKitInstance;

      try {
        const txHash = await submitVote(
          wallet.address,
          optionIndex,
          kit.signTransaction.bind(kit),
          setTxState
        );

        // Mark user as voted
        setUserHasVoted(true);

        // Refresh poll data
        await loadPoll();

        // Fire confetti via custom event
        window.dispatchEvent(new Event('poll:vote-success'));

        setTxState({
          status: 'success',
          hash: txHash,
        });
      } catch (err) {
        const pollErr = classifyError(err);
        setWalletError(pollErr);
        setTxState({ status: 'failed', error: pollErr.message });
      } finally {
        setVotingOptionIndex(null);
      }
    },
    [wallet, userHasVoted, loadPoll]
  );

  // ── Real-time Event Listener ────────────────────────────────────────────────

  useEffect(() => {
    // Stop previous listener if any
    stopListenerRef.current?.();

    const stop = startEventListener({
      onEvents: (newEvents) => {
        setEvents((prev) => {
          // Merge and deduplicate, newest first
          const all = [...newEvents, ...prev];
          const seen = new Set<string>();
          const unique = all.filter((e) => {
            if (seen.has(e.id)) return false;
            seen.add(e.id);
            return true;
          });
          return unique.slice(0, 20); // keep max 20 events
        });

        // Refresh poll counts if a new vote came in
        if (newEvents.some((e) => e.type === 'vote')) {
          loadPoll();
          // Also re-check if the current user voted from another tab
          if (wallet.address) {
            checkVoteStatus(wallet.address);
          }
        }
      },
      onError: (err) => {
        console.warn('Event listener error:', err);
      },
    });

    stopListenerRef.current = stop;

    return () => {
      stop();
    };
  }, [loadPoll, wallet.address, checkVoteStatus]);

  // ── Derived values ──────────────────────────────────────────────────────────

  const pollOptions = poll
    ? poll.options.map((label, index) => ({
        index,
        label,
        votes: poll.voteCounts[index] ?? 0,
        percentage:
          poll.totalVotes > 0
            ? Math.round(((poll.voteCounts[index] ?? 0) / poll.totalVotes) * 100)
            : 0,
      }))
    : [];

  const explorerLink = txState.hash
    ? `${STELLAR_EXPLORER_TX}${txState.hash}`
    : null;

  return {
    // Wallet
    wallet,
    handleConnect,
    handleDisconnect,
    walletError,
    setWalletError,

    // Poll
    poll,
    pollOptions,
    pollLoading,
    pollError,
    loadPoll,

    // Voting
    userHasVoted,
    votingOptionIndex,
    handleVote,

    // Transaction
    txState,
    setTxState,
    explorerLink,

    // Events
    events,
  };
}
