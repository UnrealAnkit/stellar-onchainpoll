'use client';

import { CheckCircle, Loader2, Lock, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PollData, TxState } from '@/types';

interface PollOption {
  index: number;
  label: string;
  votes: number;
  percentage: number;
}

interface PollCardProps {
  poll: PollData | null;
  pollOptions: PollOption[];
  pollLoading: boolean;
  pollError: string | null;
  userHasVoted: boolean;
  walletConnected: boolean;
  votingOptionIndex: number | null;
  txState: TxState;
  onVote: (index: number) => void;
}

const OPTION_COLORS = [
  { bar: 'from-sky-500 to-blue-600',    badge: 'bg-sky-500/15 text-sky-400 border-sky-500/25' },
  { bar: 'from-violet-500 to-purple-600', badge: 'bg-violet-500/15 text-violet-400 border-violet-500/25' },
  { bar: 'from-emerald-500 to-teal-600', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  { bar: 'from-rose-500 to-pink-600',   badge: 'bg-rose-500/15 text-rose-400 border-rose-500/25' },
];

export default function PollCard({
  poll,
  pollOptions,
  pollLoading,
  pollError,
  userHasVoted,
  walletConnected,
  votingOptionIndex,
  txState,
  onVote,
}: PollCardProps) {
  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (pollLoading) {
    return (
      <div className="rounded-2xl border border-[#1c2333] bg-[#0d1117] p-6 animate-pulse">
        <div className="h-5 bg-[#1c2333] rounded-lg w-3/4 mb-4" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-[#1c2333] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (pollError || !poll) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <p className="text-4xl mb-3">⚙️</p>
        <p className="text-red-400 font-semibold mb-1">Poll not available</p>
        <p className="text-xs text-[#8b949e] leading-relaxed">
          {pollError ?? 'Could not load poll data. Make sure the contract is deployed and CONTRACT_ID is set.'}
        </p>
      </div>
    );
  }

  const isVoting = txState.status === 'pending';
  const canVote = walletConnected && !userHasVoted && !isVoting;

  return (
    <div className="rounded-2xl border border-[#1c2333] bg-[#0d1117] overflow-hidden card-glow animate-slide-up delay-200">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-[#1c2333]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-stellar-500/10 text-stellar-400 border border-stellar-500/20">
                LIVE POLL
              </span>
              <span className="live-dot" />
            </div>
            <h2
              className="text-lg font-bold leading-snug text-[#e6edf3]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {poll.question}
            </h2>
          </div>

          <div className="flex-shrink-0 text-right">
            <div className="flex items-center gap-1 text-[#8b949e] text-xs justify-end">
              <Users size={12} />
              <span>{poll.totalVotes}</span>
            </div>
            <p className="text-xs text-[#8b949e]">votes</p>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="p-6 space-y-3">
        {pollOptions.map((option, i) => {
          const color = OPTION_COLORS[i % OPTION_COLORS.length];
          const isThisVoting = votingOptionIndex === option.index;
          const isLeading = option.votes === Math.max(...pollOptions.map((o) => o.votes)) && option.votes > 0;

          return (
            <button
              key={option.index}
              onClick={() => canVote && onVote(option.index)}
              disabled={!canVote}
              className={cn(
                'vote-btn w-full rounded-xl border p-4 text-left transition-all duration-200',
                'bg-[#0d1117] border-[#1c2333]',
                canVote && 'cursor-pointer hover:border-stellar-500/40',
                !canVote && 'cursor-default',
                isThisVoting && 'border-stellar-500/50 stellar-glow'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {/* Option label */}
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      isThisVoting ? 'text-stellar-300' : 'text-[#e6edf3]'
                    )}
                  >
                    {option.label}
                  </span>

                  {isLeading && poll.totalVotes > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                      <TrendingUp size={10} /> Leading
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Vote count badge */}
                  {userHasVoted && (
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full border font-mono',
                        color.badge
                      )}
                    >
                      {option.votes} vote{option.votes !== 1 ? 's' : ''}
                    </span>
                  )}

                  {/* Status indicator */}
                  {isThisVoting ? (
                    <Loader2 size={15} className="animate-spin text-stellar-400" />
                  ) : userHasVoted ? (
                    <span className="font-mono text-sm font-bold text-[#8b949e]">
                      {option.percentage}%
                    </span>
                  ) : !walletConnected ? (
                    <Lock size={13} className="text-[#8b949e]" />
                  ) : null}
                </div>
              </div>

              {/* Progress bar — always shown if votes exist, otherwise empty track */}
              <div className="progress-track">
                <div
                  className={cn('progress-fill', `bg-gradient-to-r ${color.bar}`)}
                  style={{
                    width: userHasVoted || poll.totalVotes === 0
                      ? `${option.percentage}%`
                      : '0%',
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer CTA */}
      <div className="px-6 pb-6">
        {!walletConnected && (
          <p className="text-center text-xs text-[#8b949e] py-2">
            🔐 Connect your wallet above to cast your vote
          </p>
        )}
        {walletConnected && userHasVoted && (
          <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm">
            <CheckCircle size={15} />
            <span>Your vote has been recorded on-chain</span>
          </div>
        )}
        {walletConnected && !userHasVoted && !isVoting && (
          <p className="text-center text-xs text-[#8b949e]">
            ⚡ Click an option to submit your vote via Stellar blockchain
          </p>
        )}
        {isVoting && (
          <div className="flex items-center justify-center gap-2 text-stellar-400 text-sm">
            <Loader2 size={14} className="animate-spin" />
            <span>Submitting to Stellar testnet…</span>
          </div>
        )}
      </div>
    </div>
  );
}
