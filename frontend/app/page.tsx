'use client';

import dynamic from 'next/dynamic';
import Hero from '@/components/Hero';
import WalletSection from '@/components/WalletSection';
import PollCard from '@/components/PollCard';
import TxStatusPanel from '@/components/TxStatusPanel';
import StatsBar from '@/components/StatsBar';
import AdminPanel from '@/components/AdminPanel';
import { usePoll } from '@/hooks/usePoll';

// Dynamically import confetti (browser-only)
const SuccessConfetti = dynamic(() => import('@/components/SuccessConfetti'), {
  ssr: false,
});

// Dynamically import EventFeed (uses date-fns, fine SSR but safer)
const EventFeed = dynamic(() => import('@/components/EventFeed'), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-[#1c2333] bg-[#0d1117] h-32 animate-pulse" />
  ),
});

export default function HomePage() {
  const {
    wallet,
    handleConnect,
    handleDisconnect,
    walletError,
    setWalletError,

    poll,
    pollOptions,
    pollLoading,
    pollError,
    loadPoll,

    userHasVoted,
    votingOptionIndex,
    handleVote,

    txState,
    explorerLink,

    events,
  } = usePoll();

  return (
    <main className="min-h-screen bg-[#050810] bg-grid relative">
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-stellar-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-500/4 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-xl mx-auto px-4 py-10 sm:py-16">

        {/* Hero */}
        <Hero />

        {/* Wallet */}
        <div className="mb-4">
          <WalletSection
            wallet={wallet}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            walletError={walletError}
            onDismissError={() => setWalletError(null)}
            userHasVoted={userHasVoted}
          />
        </div>

        {/* Stats Bar */}
        <div className="mb-4">
          <StatsBar poll={poll} />
        </div>

        {/* Poll Card */}
        <div className="mb-4">
          <PollCard
            poll={poll}
            pollOptions={pollOptions}
            pollLoading={pollLoading}
            pollError={pollError}
            userHasVoted={userHasVoted}
            walletConnected={wallet.connected}
            votingOptionIndex={votingOptionIndex}
            txState={txState}
            onVote={handleVote}
          />
        </div>

        {/* Transaction Status */}
        {txState.status !== 'idle' && (
          <div className="mb-4">
            <TxStatusPanel txState={txState} explorerLink={explorerLink} />
          </div>
        )}

        {/* Live Activity Feed */}
        <div className="mb-4">
          <EventFeed events={events} />
        </div>

        {/* Admin Panel */}
        <div className="mb-8">
          <AdminPanel wallet={wallet} onPollCreated={loadPoll} />
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-[#8b949e] space-y-1 pb-4">
          <p>
            Built for{' '}
            <span className="text-stellar-400">Stellar Journey to Mastery — Yellow Belt</span>
          </p>
          <p className="font-mono opacity-50">
            Soroban Smart Contract · Stellar Testnet · StellarWalletsKit
          </p>
        </footer>
      </div>

      {/* Confetti on vote success */}
      <SuccessConfetti />
    </main>
  );
}
