'use client';

import { CheckCircle2, XCircle, Clock, ExternalLink, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TxState } from '@/types';

interface TxStatusPanelProps {
  txState: TxState;
  explorerLink: string | null;
}

export default function TxStatusPanel({ txState, explorerLink }: TxStatusPanelProps) {
  if (txState.status === 'idle') return null;

  const copyHash = () => {
    if (txState.hash) navigator.clipboard.writeText(txState.hash);
  };

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 animate-slide-up transition-all duration-300',
        txState.status === 'pending' && 'bg-amber-500/5 border-amber-500/25',
        txState.status === 'success' && 'bg-emerald-500/5 border-emerald-500/25',
        txState.status === 'failed'  && 'bg-red-500/5 border-red-500/25'
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        {/* Icon */}
        {txState.status === 'pending' && (
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <Clock size={16} className="text-amber-400 animate-pulse" />
          </div>
        )}
        {txState.status === 'success' && (
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
        )}
        {txState.status === 'failed' && (
          <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
            <XCircle size={16} className="text-red-400" />
          </div>
        )}

        {/* Title + badge */}
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[#e6edf3]">Transaction Status</p>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full font-mono font-bold',
                txState.status === 'pending' && 'badge-pending',
                txState.status === 'success' && 'badge-success',
                txState.status === 'failed'  && 'badge-failed'
              )}
            >
              {txState.status.toUpperCase()}
            </span>
          </div>

          <p className="text-xs text-[#8b949e] mt-0.5">
            {txState.status === 'pending' && 'Waiting for blockchain confirmation…'}
            {txState.status === 'success' && 'Vote confirmed on Stellar testnet ✓'}
            {txState.status === 'failed'  && (txState.error ?? 'Transaction failed')}
          </p>
        </div>
      </div>

      {/* TX Hash */}
      {txState.hash && (
        <div className="bg-[#050810] rounded-xl p-3 border border-[#1c2333]">
          <p className="text-xs text-[#8b949e] mb-1">Transaction Hash</p>
          <div className="flex items-center gap-2">
            <p className="font-mono text-xs text-[#e6edf3] break-all flex-1">
              {txState.hash}
            </p>
            <button
              onClick={copyHash}
              title="Copy hash"
              className="flex-shrink-0 text-[#8b949e] hover:text-stellar-400 transition-colors p-1"
            >
              <Copy size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Explorer link */}
      {explorerLink && txState.status === 'success' && (
        <a
          href={explorerLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-1.5 text-xs text-stellar-400 hover:text-stellar-300 transition-colors"
        >
          <ExternalLink size={12} />
          View on Stellar Expert
        </a>
      )}
    </div>
  );
}
