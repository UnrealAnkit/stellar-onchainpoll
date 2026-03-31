'use client';

import { Wallet, LogOut, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { shortAddress, STELLAR_EXPLORER_CONTRACT, CONTRACT_ID } from '@/lib/stellar-contract';
import type { WalletState, PollError } from '@/types';

interface WalletSectionProps {
  wallet: WalletState;
  onConnect: () => void;
  onDisconnect: () => void;
  walletError: PollError | null;
  onDismissError: () => void;
  userHasVoted: boolean;
}

const ERROR_ICONS: Record<string, string> = {
  WALLET_NOT_FOUND: '🔍',
  USER_REJECTED: '🚫',
  INSUFFICIENT_BALANCE: '💸',
  ALREADY_VOTED: '✅',
  NETWORK_ERROR: '🌐',
  CONTRACT_ERROR: '⚙️',
  UNKNOWN: '⚠️',
};

const ERROR_HINTS: Partial<Record<string, string>> = {
  WALLET_NOT_FOUND:
    'Install Freighter (freighter.app), xBull (xbull.app), or Albedo (albedo.link) and refresh.',
  USER_REJECTED: 'Open your wallet and approve the connection when prompted.',
  INSUFFICIENT_BALANCE:
    'Fund your testnet account at laboratory.stellar.org/account-creator',
  ALREADY_VOTED: 'Each wallet can only vote once. Results are shown below.',
};

export default function WalletSection({
  wallet,
  onConnect,
  onDisconnect,
  walletError,
  onDismissError,
  userHasVoted,
}: WalletSectionProps) {
  return (
    <section className="animate-slide-up delay-100">
      {/* Card */}
      <div
        className={cn(
          'rounded-2xl border p-6 transition-all duration-300',
          'bg-[#0d1117] border-[#1c2333] card-glow'
        )}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Left: wallet info */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                wallet.connected
                  ? 'bg-emerald-500/10 border border-emerald-500/30'
                  : 'bg-stellar-500/10 border border-stellar-500/30'
              )}
            >
              <Wallet
                size={18}
                className={wallet.connected ? 'text-emerald-400' : 'text-stellar-400'}
              />
            </div>

            <div>
              {wallet.connected && wallet.address ? (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={13} className="text-emerald-400" />
                    <span className="text-xs text-emerald-400 font-medium">Connected</span>
                    {userHasVoted && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-stellar-500/15 text-stellar-400 border border-stellar-500/20">
                        Voted ✓
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-sm text-[#e6edf3] mt-0.5">
                    {shortAddress(wallet.address)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-[#e6edf3]">Wallet</p>
                  <p className="text-xs text-[#8b949e]">Not connected</p>
                </>
              )}
            </div>
          </div>

          {/* Right: action button */}
          {wallet.connected ? (
            <button
              onClick={onDisconnect}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm',
                'bg-red-500/10 border border-red-500/20 text-red-400',
                'hover:bg-red-500/15 hover:border-red-500/30 transition-all duration-200'
              )}
            >
              <LogOut size={14} />
              Disconnect
            </button>
          ) : (
            <button
              onClick={onConnect}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold',
                'bg-stellar-500 text-white hover:bg-stellar-600',
                'shadow-lg shadow-stellar-500/20 hover:shadow-stellar-500/30',
                'transition-all duration-200 active:scale-95'
              )}
            >
              <Wallet size={14} />
              Connect Wallet
            </button>
          )}
        </div>

        {/* Full address (when connected) */}
        {wallet.connected && wallet.address && (
          <div className="mt-4 pt-4 border-t border-[#1c2333]">
            <p className="text-xs text-[#8b949e] mb-1">Full Address</p>
            <p className="font-mono text-xs text-[#e6edf3] break-all leading-relaxed">
              {wallet.address}
            </p>
          </div>
        )}

        {/* Network & Contract info */}
        <div className="mt-4 pt-4 border-t border-[#1c2333] flex flex-wrap gap-4 text-xs text-[#8b949e]">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Stellar Testnet
          </span>
          {CONTRACT_ID && (
            <a
              href={`${STELLAR_EXPLORER_CONTRACT}${CONTRACT_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-stellar-400 transition-colors"
            >
              Contract: {shortAddress(CONTRACT_ID)}
              <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {walletError && (
        <div
          className={cn(
            'mt-3 rounded-xl border p-4 flex items-start gap-3 animate-slide-up',
            'bg-red-500/8 border-red-500/25'
          )}
        >
          <span className="text-lg flex-shrink-0" role="img">
            {ERROR_ICONS[walletError.type] ?? '⚠️'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-red-400 font-medium">{walletError.message}</p>
            {ERROR_HINTS[walletError.type] && (
              <p className="text-xs text-[#8b949e] mt-1 leading-relaxed">
                {ERROR_HINTS[walletError.type]}
              </p>
            )}
          </div>
          <button
            onClick={onDismissError}
            className="text-[#8b949e] hover:text-[#e6edf3] transition-colors flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Wallet install hints when not connected */}
      {!wallet.connected && !walletError && (
        <p className="text-xs text-[#8b949e] mt-2 text-center">
          Supports Freighter · xBull · Albedo · LOBSTR
        </p>
      )}
    </section>
  );
}
